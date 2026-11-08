use crate::api::AppState;
use reqwest::Url;
use serde_json::{json, Value};

// 字符串恢复结果未包含 HTTP 路由；这里约定使用 /membership/*，需与服务端确认。
// 仅依赖 AppState 已公开的 api.get_json / api.post_json，不假定其他字段存在。

const AUTH_PATH: &str = "/membership/auth";
const PLANS_PATH: &str = "/membership/list_plans";
const REGISTER_PATH: &str = "/membership/register";
const RENEW_PATH: &str = "/membership/renew";
const LOGOUT_OTHERS_PATH: &str = "/membership/logout_others";
const DEVICES_PATH: &str = "/membership/list_devices";

fn require_nonempty(value: &str, field: &str) -> Result<(), String> {
    if value.trim().is_empty() {
        return Err(format!("upstream: missing {field}"));
    }
    Ok(())
}

fn response_body(response: &Value) -> Result<&Value, String> {
    if !response.is_object() {
        return Err("upstream: expected a JSON object".into());
    }

    if let Some(error) = response.get("error").filter(|value| !value.is_null()) {
        return Err(format!("upstream: {error}"));
    }

    match response.get("data") {
        Some(data) if data.is_object() => Ok(data),
        Some(data) if !data.is_null() => Err("upstream: expected data to be a JSON object".into()),
        _ => Ok(response),
    }
}

fn response_ok(response: &Value, body: &Value) -> Result<bool, String> {
    response
        .get("ok")
        .and_then(|value| value.as_bool())
        .or_else(|| body.get("ok").and_then(|value| value.as_bool()))
        .ok_or_else(|| "upstream: missing boolean ok".into())
}

fn ensure_not_rejected(response: &Value, body: &Value) -> Result<(), String> {
    let rejected = [response, body]
        .iter()
        .any(|value| value.get("ok").and_then(|v| v.as_bool()) == Some(false));

    if rejected {
        let message = body
            .get("message")
            .and_then(|value| value.as_str())
            .or_else(|| response.get("message").and_then(|value| value.as_str()))
            .unwrap_or_default();

        return Err(format!("upstream: request rejected: {message}"));
    }

    Ok(())
}

fn example_plans() -> Value {
    // 示例价格为 0，不代表真实报价；示例 ID 不应提交给付费接口。
    json!([
        {
            "id": "example_basic",
            "name": "基础版（示例，非实际报价）",
            "price": 0,
            "period": "month",
            "features": ["基础文本翻译", "单设备使用"]
        },
        {
            "id": "example_pro",
            "name": "专业版（示例，非实际报价）",
            "price": 0,
            "period": "month",
            "features": ["基础文本翻译", "高质量翻译", "多设备使用"]
        },
        {
            "id": "example_team",
            "name": "团队版（示例，非实际报价）",
            "price": 0,
            "period": "year",
            "features": ["专业版功能", "团队席位", "设备管理"]
        }
    ])
}

fn normalize_plans(plans: &[Value]) -> Result<Vec<Value>, String> {
    plans
        .iter()
        .map(|plan| {
            if !plan.is_object() {
                return Err("upstream: invalid plan entry".into());
            }

            let id = plan.get("id").and_then(|value| value.as_str());
            let name = plan.get("name").and_then(|value| value.as_str());
            let price = plan.get("price").filter(|value| value.is_number());
            let period = plan.get("period").and_then(|value| value.as_str());
            let features = plan.get("features").and_then(|value| value.as_array());

            match (id, name, price, period, features) {
                (Some(id), Some(name), Some(price), Some(period), Some(features))
                    if !id.is_empty()
                        && !name.is_empty()
                        && features.iter().all(Value::is_string) =>
                {
                    Ok(json!({
                        "id": id,
                        "name": name,
                        "price": price,
                        "period": period,
                        "features": features
                    }))
                }
                _ => Err("upstream: invalid plan fields".into()),
            }
        })
        .collect()
}

fn write_api_base_to_state(_state: &AppState, _api_base: &Url) -> Result<(), String> {
    // 已知接口只提供 HTTP 请求方法，无法据此安全修改 AppState。
    // 在 crate::api 提供内部可变的 base URL 字段或 setter 后，
    // 应在此更新实际用于请求的 base URL，成功后再返回 Ok(())。
    Err(
        "upstream: AppState/ApiClient exposes no API base URL setter; \
         cannot write api_base into state"
            .into(),
    )
}

/// 对接前端会员激活或登录动作，提交设备标识和许可证并返回会员状态。
#[tauri::command]
pub async fn membership_auth(
    state: tauri::State<'_, AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let device_id = payload
        .get("device_id")
        .and_then(|v| v.as_str())
        .unwrap_or_default();
    let license_key = payload
        .get("license_key")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .trim();

    require_nonempty(device_id, "device_id")?;
    require_nonempty(license_key, "license_key")?;

    let response = state
        .api
        .post_json(
            AUTH_PATH,
            json!({
                "device_id": device_id,
                "license_key": license_key
            }),
        )
        .await
        .map_err(|e| e.to_string())?;

    let body = response_body(&response)?;
    let ok = response_ok(&response, body)?;

    if ok
        && (body.get("plan").is_none_or(Value::is_null)
            || body.get("expires_at").is_none_or(Value::is_null)
            || body.get("seats").and_then(Value::as_u64).is_none())
    {
        return Err("upstream: incomplete membership status".into());
    }

    Ok(json!({
        "ok": ok,
        "plan": body.get("plan").cloned().unwrap_or_default(),
        "expires_at": body.get("expires_at").cloned().unwrap_or_default(),
        "seats": body.get("seats").and_then(Value::as_u64).unwrap_or_default()
    }))
}

/// 对接前端套餐列表加载动作，上游未提供套餐时返回三档明确标注的示例。
#[tauri::command]
pub async fn membership_list_plans(
    state: tauri::State<'_, AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let _ = payload;

    let response = state
        .api
        .get_json(PLANS_PATH)
        .await
        .map_err(|e| e.to_string())?;

    let body = response_body(&response)?;
    ensure_not_rejected(&response, body)?;

    match body.get("plans") {
        None | Some(Value::Null) => Ok(json!({ "plans": example_plans() })),
        Some(Value::Array(plans)) if plans.is_empty() => Ok(json!({ "plans": example_plans() })),
        Some(Value::Array(plans)) => {
            let plans = normalize_plans(plans)?;
            Ok(json!({ "plans": plans }))
        }
        _ => Err("upstream: plans must be an array".into()),
    }
}

/// 对接前端邮箱验证码注册动作，提交邮箱和验证码并返回注册结果。
#[tauri::command]
pub async fn membership_register(
    state: tauri::State<'_, AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let email = payload
        .get("email")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .trim();
    let code = payload
        .get("code")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .trim();

    require_nonempty(email, "email")?;
    require_nonempty(code, "code")?;

    let response = state
        .api
        .post_json(REGISTER_PATH, json!({ "email": email, "code": code }))
        .await
        .map_err(|e| e.to_string())?;

    let body = response_body(&response)?;
    let ok = response_ok(&response, body)?;

    Ok(json!({
        "ok": ok,
        "data": body
    }))
}

/// 对接前端会员续费动作，提交许可证、设备标识和目标套餐并返回续费结果。
#[tauri::command]
pub async fn membership_renew(
    state: tauri::State<'_, AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let license_key = payload
        .get("license_key")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .trim();
    let device_id = payload
        .get("device_id")
        .and_then(|v| v.as_str())
        .unwrap_or_default();
    let plan_id = payload
        .get("plan_id")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .trim();

    require_nonempty(license_key, "license_key")?;
    require_nonempty(device_id, "device_id")?;
    require_nonempty(plan_id, "plan_id")?;

    if plan_id.starts_with("example_") {
        return Err("upstream: example plans cannot be purchased or renewed".into());
    }

    let response = state
        .api
        .post_json(
            RENEW_PATH,
            json!({
                "license_key": license_key,
                "device_id": device_id,
                "plan_id": plan_id
            }),
        )
        .await
        .map_err(|e| e.to_string())?;

    let body = response_body(&response)?;
    let ok = response_ok(&response, body)?;

    Ok(json!({
        "ok": ok,
        "data": body
    }))
}

/// 对接前端退出其他设备动作，提交许可证和当前设备标识并返回处理结果。
#[tauri::command]
pub async fn membership_logout_others(
    state: tauri::State<'_, AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let license_key = payload
        .get("license_key")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .trim();
    let device_id = payload
        .get("device_id")
        .and_then(|v| v.as_str())
        .unwrap_or_default();

    require_nonempty(license_key, "license_key")?;
    require_nonempty(device_id, "device_id")?;

    let response = state
        .api
        .post_json(
            LOGOUT_OTHERS_PATH,
            json!({
                "license_key": license_key,
                "device_id": device_id
            }),
        )
        .await
        .map_err(|e| e.to_string())?;

    let body = response_body(&response)?;
    let ok = response_ok(&response, body)?;

    Ok(json!({
        "ok": ok,
        "data": body
    }))
}

/// 对接前端会员设备列表加载动作，提交许可证和当前设备标识并返回设备列表。
#[tauri::command]
pub async fn membership_list_devices(
    state: tauri::State<'_, AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let license_key = payload
        .get("license_key")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .trim();
    let device_id = payload
        .get("device_id")
        .and_then(|v| v.as_str())
        .unwrap_or_default();

    require_nonempty(license_key, "license_key")?;
    require_nonempty(device_id, "device_id")?;

    // 使用 POST 避免把许可证放入 URL 查询参数。
    let response = state
        .api
        .post_json(
            DEVICES_PATH,
            json!({
                "license_key": license_key,
                "device_id": device_id
            }),
        )
        .await
        .map_err(|e| e.to_string())?;

    let body = response_body(&response)?;
    ensure_not_rejected(&response, body)?;

    let devices = body
        .get("devices")
        .and_then(Value::as_array)
        .ok_or_else(|| "upstream: missing devices array".to_string())?;

    Ok(json!({
        "devices": devices
    }))
}

/// 对接前端修改会员 API 地址动作，校验 HTTP/HTTPS 地址并尝试写入共享状态。
#[tauri::command]
pub async fn membership_set_api_base(
    state: tauri::State<'_, AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let api_base = payload
        .get("api_base")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .trim();

    require_nonempty(api_base, "api_base")?;

    let mut url = Url::parse(api_base).map_err(|e| e.to_string())?;

    if !matches!(url.scheme(), "http" | "https") {
        return Err("upstream: api_base must use http or https".into());
    }
    if url.host_str().is_none() {
        return Err("upstream: api_base must include a host".into());
    }
    if !url.username().is_empty() || url.password().is_some() {
        return Err("upstream: api_base must not contain embedded credentials".into());
    }
    if url.query().is_some() || url.fragment().is_some() {
        return Err("upstream: api_base must not contain a query or fragment".into());
    }

    // 保留路径前缀，并统一为目录 URL，方便 ApiClient 后续拼接相对路由。
    if !url.path().ends_with('/') {
        let path = format!("{}/", url.path());
        url.set_path(&path);
    }

    write_api_base_to_state(state.inner(), &url)?;

    Ok(json!({
        "ok": true,
        "api_base": url.as_str()
    }))
}
