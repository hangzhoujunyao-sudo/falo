use std::sync::RwLock;
use std::time::Duration;

use reqwest::header::{ACCEPT, AUTHORIZATION, USER_AGENT};
use reqwest::{Client, Method, Response, StatusCode, Url};
use serde_json::{Map, Value};

const REQUEST_TIMEOUT: Duration = Duration::from_secs(15);
const USER_AGENT_VALUE: &str = "Falo/2.6.5";
const RESPONSE_SNIPPET_LIMIT: usize = 200;

/// 未配置服务地址时使用本机自托管服务（仓库 `server/`）。
pub const DEFAULT_API_BASE: &str = "http://127.0.0.1:8787/";
/// 覆盖服务地址的环境变量，优先于已保存的地址。
pub const API_BASE_ENV: &str = "FALO_API_BASE";

/// 取 `invoke(cmd, args)` 的完整实参对象。
///
/// Tauri 按参数名匹配顶层键，前端各命令的键名并不统一，所以命令统一读原始请求体。
/// 顶层 camelCase 键会补一份 snake_case 别名（`deviceId` → `device_id`）。
pub fn invoke_args(invoke: &tauri::ipc::Request<'_>) -> Value {
    match invoke.body() {
        tauri::ipc::InvokeBody::Json(Value::Object(args)) => {
            Value::Object(with_snake_case_aliases(args))
        }
        _ => Value::Null,
    }
}

fn with_snake_case_aliases(args: &Map<String, Value>) -> Map<String, Value> {
    let mut out = args.clone();
    for (key, value) in args {
        let alias = snake_case(key);
        if alias != *key && !out.contains_key(&alias) {
            out.insert(alias, value.clone());
        }
    }
    out
}

fn snake_case(key: &str) -> String {
    let mut out = String::with_capacity(key.len() + 4);
    for ch in key.chars() {
        if ch.is_ascii_uppercase() {
            if !out.is_empty() {
                out.push('_');
            }
            out.push(ch.to_ascii_lowercase());
        } else {
            out.push(ch);
        }
    }
    out
}

/// 把前端键名补成后端读取的键名：`(前端键, 后端键)`；后端键已存在时不覆盖。
pub fn alias_args(mut payload: Value, aliases: &[(&str, &str)]) -> Value {
    if let Some(object) = payload.as_object_mut() {
        for (from, to) in aliases {
            if object.contains_key(*to) {
                continue;
            }
            if let Some(value) = object.get(*from).cloned() {
                object.insert((*to).to_string(), value);
            }
        }
    }
    payload
}

fn is_loopback(url: &Url) -> bool {
    matches!(
        url.host_str(),
        Some("127.0.0.1") | Some("localhost") | Some("[::1]")
    )
}

pub struct ApiClient {
    base: RwLock<String>,
    token: RwLock<Option<String>>,
    http: Client,
    generation: std::sync::atomic::AtomicU64,
}

impl ApiClient {
    pub fn new(default_base: impl Into<String>) -> Self {
        let base = default_base.into();
        let base = Self::normalize_base(&base).unwrap_or(base);
        Self {
            generation: std::sync::atomic::AtomicU64::new(0),
            base: RwLock::new(base),
            token: RwLock::new(None),
            http: Client::builder()
                .redirect(reqwest::redirect::Policy::none())
                .build()
                .expect("HTTP client initialization failed"),
        }
    }

    /// 校验并规范化服务基础地址（补全末尾 `/`）。
    pub fn normalize_base(url: &str) -> Result<String, String> {
        Ok(Self::validate_base(url)?.to_string())
    }

    /// 设置服务基础地址，返回规范化后的地址。
    pub fn set_base(&self, url: &str) -> Result<String, String> {
        let validated = Self::normalize_base(url)?;
        let mut base = self.base.write().map_err(|e| e.to_string())?;
        *base = validated.clone();
        Ok(validated)
    }

    pub fn base(&self) -> String {
        self.base
            .read()
            .map(|base| base.clone())
            .unwrap_or_default()
    }

    /// 设置登录令牌；只随发往已配置服务的请求发送，不会发给第三方接口。
    pub fn set_token(&self, token: Option<String>) {
        if let Ok(mut slot) = self.token.write() {
            *slot = token.filter(|token| !token.is_empty());
            self.generation
                .fetch_add(1, std::sync::atomic::Ordering::SeqCst);
        }
    }

    pub fn session_generation(&self) -> u64 {
        self.generation.load(std::sync::atomic::Ordering::SeqCst)
    }

    pub fn has_token(&self) -> bool {
        self.token
            .read()
            .map(|token| token.is_some())
            .unwrap_or(false)
    }

    pub async fn get_json(&self, path: &str) -> Result<Value, String> {
        self.request_json(Method::GET, path, None).await
    }

    pub async fn post_json(&self, path: &str, body: Value) -> Result<Value, String> {
        self.request_json(Method::POST, path, Some(body)).await
    }

    fn validate_base(raw: &str) -> Result<Url, String> {
        let raw = raw.trim();
        if raw.is_empty() {
            return Err("upstream: API base is not configured".into());
        }

        let mut url = Url::parse(raw).map_err(|e| e.to_string())?;

        if !matches!(url.scheme(), "http" | "https") {
            return Err("upstream: API base scheme must be http or https".into());
        }
        if url.host_str().is_none() || url.cannot_be_a_base() {
            return Err("upstream: API base must contain a valid host".into());
        }
        if url.scheme() == "http" && !is_loopback(&url) {
            return Err("远程服务地址必须使用 HTTPS".into());
        }
        if !url.username().is_empty() || url.password().is_some() {
            return Err("upstream: API base must not contain credentials".into());
        }
        if url.query().is_some() || url.fragment().is_some() {
            return Err("upstream: API base must not contain a query or fragment".into());
        }
        if !url.path().ends_with('/') {
            let path = format!("{}/", url.path());
            url.set_path(&path);
        }

        Ok(url)
    }

    /// 相对路径解析到已配置的服务（带登录令牌）；
    /// 绝对地址视为第三方接口（翻译、汇率等），不带令牌。
    fn resolve(&self, endpoint: &str) -> Result<(Url, bool), String> {
        let endpoint = endpoint.trim();

        if endpoint.starts_with("http://") || endpoint.starts_with("https://") {
            let url = Url::parse(endpoint).map_err(|e| e.to_string())?;
            if url.scheme() != "https" && !is_loopback(&url) {
                return Err("upstream: third-party endpoint must use https".into());
            }
            if !url.username().is_empty() || url.password().is_some() {
                return Err("upstream: endpoint must not contain credentials".into());
            }
            return Ok((url, false));
        }

        // 锁仅用于复制配置，不跨越网络请求的 await。
        let raw_base = self.base.read().map_err(|e| e.to_string())?.clone();
        let base = Self::validate_base(&raw_base)?;

        if endpoint.starts_with("//") || endpoint.contains('\\') || endpoint.contains('#') {
            return Err("upstream: endpoint must be a relative API path".into());
        }

        // 前导斜线不覆盖基础地址中可能存在的 /api/ 等路径前缀。
        let relative = endpoint.trim_start_matches('/');
        let url = base.join(relative).map_err(|e| e.to_string())?;

        if url.origin() != base.origin() {
            return Err("upstream: endpoint must use the configured API origin".into());
        }

        Ok((url, true))
    }

    async fn request_json(
        &self,
        method: Method,
        path: &str,
        body: Option<Value>,
    ) -> Result<Value, String> {
        let (url, own_service) = self.resolve(path)?;

        let mut request = self
            .http
            .request(method, url)
            .timeout(REQUEST_TIMEOUT)
            .header(USER_AGENT, USER_AGENT_VALUE)
            .header(ACCEPT, "application/json");

        if own_service {
            let token = self.token.read().map_err(|e| e.to_string())?.clone();
            if let Some(token) = token {
                request = request.header(AUTHORIZATION, format!("Bearer {token}"));
            }
        }

        if let Some(body) = body {
            request = request.json(&body);
        }

        let response = request.send().await.map_err(|e| e.to_string())?;
        Self::decode_response(response).await
    }

    async fn decode_response(mut response: Response) -> Result<Value, String> {
        let status = response.status();
        let mut body = Vec::new();

        loop {
            match response.chunk().await {
                Ok(Some(chunk)) => {
                    if body.len() + chunk.len() > 4 * 1024 * 1024 {
                        return Err("响应超过 4 MB 限制".into());
                    }
                    body.extend_from_slice(&chunk)
                }
                Ok(None) => break,
                Err(error) => {
                    return Err(format!(
                        "upstream: HTTP {}; response body read failed: {}; response: {}",
                        status,
                        error,
                        Self::response_snippet(&body)
                    ));
                }
            }
        }

        if !status.is_success() {
            return Err(Self::http_error(status, &body));
        }

        serde_json::from_slice::<Value>(&body).map_err(|error| {
            format!(
                "upstream: HTTP {}; invalid JSON: {}; response: {}",
                status,
                error,
                Self::response_snippet(&body)
            )
        })
    }

    /// 错误体是 `{"error": "..."}` 时返回 `HTTP <状态码>: <消息>`，前端按这个格式做本地化。
    fn http_error(status: StatusCode, body: &[u8]) -> String {
        let message = serde_json::from_slice::<Value>(body)
            .ok()
            .and_then(|value| {
                ["error", "message"].iter().find_map(|key| {
                    value
                        .get(*key)
                        .and_then(Value::as_str)
                        .map(str::trim)
                        .filter(|text| !text.is_empty())
                        .map(|text| {
                            text.chars()
                                .take(RESPONSE_SNIPPET_LIMIT)
                                .collect::<String>()
                        })
                })
            });

        match message {
            Some(message) => format!("HTTP {}: {}", status.as_u16(), message),
            None => format!(
                "upstream: HTTP {}; response: {}",
                status,
                Self::response_snippet(body)
            ),
        }
    }

    fn response_snippet(body: &[u8]) -> String {
        String::from_utf8_lossy(body)
            .chars()
            .take(RESPONSE_SNIPPET_LIMIT)
            .collect()
    }
}

pub struct AppState {
    pub api: ApiClient,
}

impl AppState {
    /// 服务地址优先级：环境变量 `FALO_API_BASE` > 上次保存的地址 > 本机默认地址。
    pub fn new() -> Self {
        let saved = crate::session::load();
        let base = std::env::var(API_BASE_ENV)
            .ok()
            .filter(|value| !value.trim().is_empty())
            .or_else(|| Some(saved.api_base.clone()).filter(|value| !value.trim().is_empty()))
            .unwrap_or_else(|| DEFAULT_API_BASE.to_string());

        let api = ApiClient::new(base);
        Self { api }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn argument_aliases_preserve_explicit_values() {
        let args = json!({"sourceLang":"en","source_lang":"fr","deviceId":"abc"});
        let normalized = with_snake_case_aliases(args.as_object().unwrap());
        assert_eq!(normalized["source_lang"], "fr");
        assert_eq!(normalized["device_id"], "abc");
        assert_eq!(
            alias_args(json!({"current":"secret"}), &[("current", "password")])["password"],
            "secret"
        );
    }

    #[test]
    fn service_url_and_token_routing() {
        assert!(ApiClient::normalize_base("http://example.com").is_err());
        assert!(ApiClient::normalize_base("https://user:pass@example.com").is_err());
        let client = ApiClient::new("http://127.0.0.1:8787/api/");
        let (url, own) = client.resolve("/v1/phrases").unwrap();
        assert_eq!(url.as_str(), "http://127.0.0.1:8787/api/v1/phrases");
        assert!(own);
        assert!(!client.resolve("https://example.com/translate").unwrap().1);
        assert!(client.resolve("//example.com/steal").is_err());
        assert!(client.resolve("http://example.com/steal").is_err());
    }
}
