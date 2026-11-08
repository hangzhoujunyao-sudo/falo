use std::sync::RwLock;
use std::time::Duration;

use reqwest::header::{ACCEPT, USER_AGENT};
use reqwest::{Client, Method, Response, Url};
use serde_json::Value;

const REQUEST_TIMEOUT: Duration = Duration::from_secs(15);
const USER_AGENT_VALUE: &str = "WATransChat-OSS/2.6.5";
const RESPONSE_SNIPPET_LIMIT: usize = 200;

pub struct ApiClient {
    base: RwLock<String>,
    http: Client,
}

impl ApiClient {
    /// 创建客户端；默认地址在实际请求前校验。
    pub fn new(default_base: impl Into<String>) -> Self {
        Self {
            base: RwLock::new(default_base.into()),
            http: Client::new(),
        }
    }

    /// 设置会员、翻译等上游接口使用的 HTTP(S) 基础地址。
    #[allow(dead_code)]
    pub fn set_base(&self, url: &str) -> Result<(), String> {
        let validated = Self::validate_base(url)?;
        let mut base = self.base.write().map_err(|e| e.to_string())?;
        *base = validated.to_string();
        Ok(())
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

    fn resolve_url(&self, path: &str) -> Result<Url, String> {
        // 锁仅用于复制配置，不跨越网络请求的 await。
        let raw_base = {
            let base = self.base.read().map_err(|e| e.to_string())?;
            base.clone()
        };

        let base = Self::validate_base(&raw_base)?;
        let path = path.trim();

        if path.starts_with("//") || path.contains('\\') || path.contains('#') {
            return Err("upstream: endpoint must be a relative API path".into());
        }

        let relative = path.trim_start_matches('/');
        if Url::parse(relative).is_ok() {
            return Err("upstream: endpoint must not be an absolute URL".into());
        }

        // 前导斜线不覆盖基础地址中可能存在的 /api/ 等路径前缀。
        let url = base.join(relative).map_err(|e| e.to_string())?;

        if url.origin() != base.origin() {
            return Err("upstream: endpoint must use the configured API origin".into());
        }

        Ok(url)
    }

    async fn request_json(
        &self,
        method: Method,
        path: &str,
        body: Option<Value>,
    ) -> Result<Value, String> {
        let url = self.resolve_url(path)?;

        let mut request = self
            .http
            .request(method, url)
            .timeout(REQUEST_TIMEOUT)
            .header(USER_AGENT, USER_AGENT_VALUE)
            .header(ACCEPT, "application/json");

        if let Some(body) = body {
            request = request.json(&body);
        }

        // 连接、DNS 或 TLS 失败时尚无 HTTP 状态码和响应正文。
        let response = request.send().await.map_err(|e| e.to_string())?;
        Self::decode_response(response).await
    }

    async fn decode_response(mut response: Response) -> Result<Value, String> {
        let status = response.status();
        let mut body = Vec::new();

        loop {
            match response.chunk().await {
                Ok(Some(chunk)) => body.extend_from_slice(&chunk),
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
            return Err(format!(
                "upstream: HTTP {}; response: {}",
                status,
                Self::response_snippet(&body)
            ));
        }

        match serde_json::from_slice::<Value>(&body) {
            Ok(value) => Ok(value),
            Err(error) => Err(format!(
                "upstream: HTTP {}; invalid JSON: {}; response: {}",
                status,
                error,
                Self::response_snippet(&body)
            )),
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
    pub fn new() -> Self {
        Self {
            // 未知闭源会员服务地址；配置前请求会返回明确错误。
            api: ApiClient::new(""),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
