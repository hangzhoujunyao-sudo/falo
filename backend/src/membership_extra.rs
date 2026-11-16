use crate::{api::AppState, membership::call};
use serde_json::{json, Value};

#[tauri::command]
pub async fn membership_login(
    state: tauri::State<'_, AppState>,
    request: tauri::ipc::Request<'_>,
) -> Result<Value, String> {
    let mut payload = crate::api::invoke_args(&request);
    if !payload.is_object() {
        payload = json!({});
    }
    payload["action"] = json!("login");
    let result = call(&state, "/v1/membership/login", payload, false).await;
    result
}

#[tauri::command]
pub async fn membership_logout(
    state: tauri::State<'_, AppState>,
    request: tauri::ipc::Request<'_>,
) -> Result<Value, String> {
    let mut payload = crate::api::invoke_args(&request);
    if !payload.is_object() {
        payload = json!({});
    }
    payload["action"] = json!("logout");
    let result = call(&state, "/v1/membership/login", payload, false).await;
    state.api.set_token(None);
    crate::phrases::clear_session_cache();
    result
}

#[tauri::command]
pub async fn membership_status(
    state: tauri::State<'_, AppState>,
    request: tauri::ipc::Request<'_>,
) -> Result<Value, String> {
    let mut payload = crate::api::invoke_args(&request);
    if !payload.is_object() {
        payload = json!({});
    }
    if !state.api.has_token() {
        return Ok(json!({"ok":true,"logged_in":false,"api_base":state.api.base()}));
    }
    let result = call(&state, "/v1/membership/status", payload, true).await;
    result
}

#[tauri::command]
pub async fn membership_open_pay(
    state: tauri::State<'_, AppState>,
    request: tauri::ipc::Request<'_>,
) -> Result<Value, String> {
    let mut payload = crate::api::invoke_args(&request);
    if !payload.is_object() {
        payload = json!({});
    }
    let result = call(&state, "/v1/membership/pay", payload, false).await;
    result
}

#[tauri::command]
pub async fn membership_logout_device(
    state: tauri::State<'_, AppState>,
    request: tauri::ipc::Request<'_>,
) -> Result<Value, String> {
    let mut payload = crate::api::invoke_args(&request);
    if !payload.is_object() {
        payload = json!({});
    }
    payload["action"] = json!("logout");
    if let Some(device) = payload.get("device").cloned() {
        payload["device_id"] = device
            .get("device_id")
            .or_else(|| device.get("id"))
            .cloned()
            .unwrap_or(Value::Null);
    }
    let result = call(&state, "/v1/membership/devices", payload, false).await;
    result
}

#[tauri::command]
pub async fn membership_devices_by_challenge(
    state: tauri::State<'_, AppState>,
    request: tauri::ipc::Request<'_>,
) -> Result<Value, String> {
    let mut payload = crate::api::invoke_args(&request);
    if !payload.is_object() {
        payload = json!({});
    }
    let _ = (state, payload);
    Err("请在已登录设备管理席位，或联系管理员".into())
}

#[tauri::command]
pub async fn membership_logout_device_by_challenge(
    state: tauri::State<'_, AppState>,
    request: tauri::ipc::Request<'_>,
) -> Result<Value, String> {
    let mut payload = crate::api::invoke_args(&request);
    if !payload.is_object() {
        payload = json!({});
    }
    let _ = (state, payload);
    Err("请在已登录设备管理席位，或联系管理员".into())
}

#[tauri::command]
pub async fn membership_apply_seat_pick(
    state: tauri::State<'_, AppState>,
    request: tauri::ipc::Request<'_>,
) -> Result<Value, String> {
    let mut payload = crate::api::invoke_args(&request);
    if !payload.is_object() {
        payload = json!({});
    }
    let _ = (state, payload);
    Err("请在已登录设备管理席位，或联系管理员".into())
}

#[tauri::command]
pub async fn seat_pick_status(
    state: tauri::State<'_, AppState>,
    request: tauri::ipc::Request<'_>,
) -> Result<Value, String> {
    let mut payload = crate::api::invoke_args(&request);
    if !payload.is_object() {
        payload = json!({});
    }
    let _ = (state, payload);
    Ok(json!({"ok":true,"required":false}))
}
