use crate::api::{ApiClient, AppState};
use serde_json::{json, Value};

pub fn set_base(state: &AppState, base: &str) -> Result<String, String> {
    let normalized = ApiClient::normalize_base(base)?;
    if normalized != state.api.base() {
        let mut session = crate::session::load();
        session.api_base = normalized.clone();
        crate::session::save(&session)?;
        state.api.set_token(None);
        crate::phrases::clear_session_cache();
        state.api.set_base(&normalized)?;
    }
    Ok(normalized)
}

pub async fn call(
    state: &AppState,
    path: &str,
    mut payload: Value,
    get: bool,
) -> Result<Value, String> {
    if !payload.is_object() {
        payload = json!({});
    }
    if let Some(base) = payload
        .get("api_base")
        .and_then(Value::as_str)
        .filter(|s| !s.trim().is_empty())
    {
        set_base(state, base)?;
    }
    if payload
        .get("device_id")
        .and_then(Value::as_str)
        .unwrap_or("")
        .is_empty()
    {
        payload["device_id"] = json!(crate::session::device_id()?);
    }
    if payload.get("device_name").is_none() {
        payload["device_name"] = json!("飞译桌面端");
    }
    let mut result = if get {
        state.api.get_json(path).await?
    } else {
        state.api.post_json(path, payload.clone()).await?
    };
    if let Some(token) = result.get("token").and_then(Value::as_str) {
        crate::phrases::clear_session_cache();
        state.api.set_token(Some(token.to_string()));
    }
    if let Some(object) = result.as_object_mut() {
        object.remove("token");
        object.insert("api_base".into(), json!(state.api.base()));
    }
    if payload.get("action").and_then(Value::as_str) == Some("logout") && path.ends_with("/login") {
        state.api.set_token(None);
    }
    Ok(result)
}

#[tauri::command]
pub async fn membership_set_api_base(
    state: tauri::State<'_, AppState>,
    request: tauri::ipc::Request<'_>,
) -> Result<Value, String> {
    let mut payload = crate::api::invoke_args(&request);
    if !payload.is_object() {
        payload = json!({});
    }
    let base = payload
        .get("api_base")
        .and_then(Value::as_str)
        .ok_or("缺少服务地址")?;
    Ok(json!({"ok":true,"api_base":set_base(&state, base)?}))
}

#[tauri::command]
pub async fn membership_list_plans(
    state: tauri::State<'_, AppState>,
    request: tauri::ipc::Request<'_>,
) -> Result<Value, String> {
    let mut payload = crate::api::invoke_args(&request);
    if !payload.is_object() {
        payload = json!({});
    }
    let result = call(&state, "/membership/list_plans", payload, true).await;
    result
}

#[tauri::command]
pub async fn membership_list_devices(
    state: tauri::State<'_, AppState>,
    request: tauri::ipc::Request<'_>,
) -> Result<Value, String> {
    let mut payload = crate::api::invoke_args(&request);
    if !payload.is_object() {
        payload = json!({});
    }
    let result = call(&state, "/v1/membership/devices", payload, true).await;
    result
}

#[tauri::command]
pub async fn membership_logout_others(
    state: tauri::State<'_, AppState>,
    request: tauri::ipc::Request<'_>,
) -> Result<Value, String> {
    let mut payload = crate::api::invoke_args(&request);
    if !payload.is_object() {
        payload = json!({});
    }
    let result = call(&state, "/membership/logout_others", payload, false).await;
    result
}

#[tauri::command]
pub async fn membership_auth(
    state: tauri::State<'_, AppState>,
    request: tauri::ipc::Request<'_>,
) -> Result<Value, String> {
    let mut payload = crate::api::invoke_args(&request);
    if !payload.is_object() {
        payload = json!({});
    }
    let result = call(&state, "/membership/auth", payload, false).await;
    result
}

#[tauri::command]
pub async fn membership_register(
    state: tauri::State<'_, AppState>,
    request: tauri::ipc::Request<'_>,
) -> Result<Value, String> {
    let mut payload = crate::api::invoke_args(&request);
    if !payload.is_object() {
        payload = json!({});
    }
    let result = call(&state, "/membership/register", payload, false).await;
    result
}

#[tauri::command]
pub async fn membership_renew(
    state: tauri::State<'_, AppState>,
    request: tauri::ipc::Request<'_>,
) -> Result<Value, String> {
    let mut payload = crate::api::invoke_args(&request);
    if !payload.is_object() {
        payload = json!({});
    }
    let result = call(&state, "/membership/renew", payload, false).await;
    result
}
