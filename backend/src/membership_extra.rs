use serde_json::{json, Value};
use tauri_plugin_opener::OpenerExt;

// 后端路由约定：POST /login 使用 action=login|logout；
// POST /devices 使用 action=logout；POST /seat/pick 使用 action=apply；
// GET /devices、GET /seat/pick 支持 challenge 查询参数。
// opener 插件须在应用启动时注册：.plugin(tauri_plugin_opener::init())。

fn normalize_membership_response(mut response: Value) -> Result<Value, String> {
    let object = response
        .as_object_mut()
        .ok_or_else(|| "会员接口返回值必须是 JSON 对象".to_string())?;

    object.entry("ok").or_insert(json!(false));
    object.entry("plan").or_insert(Value::Null);
    object.entry("expires_at").or_insert(Value::Null);
    object.entry("seats").or_insert(json!(0));
    object.entry("devices").or_insert(json!([]));

    // 保留 pay_url、challenge、status 等接口附加字段。
    let devices = object
        .get_mut("devices")
        .and_then(|value| value.as_array_mut())
        .ok_or_else(|| "会员接口返回的 devices 必须是数组".to_string())?;

    for device in devices {
        let device = device
            .as_object_mut()
            .ok_or_else(|| "会员接口返回的设备必须是 JSON 对象".to_string())?;

        device.entry("id").or_insert(json!(""));
        device.entry("name").or_insert(json!(""));
        device.entry("last_seen").or_insert(Value::Null);
    }

    Ok(response)
}

fn encode_membership_query(value: &str) -> String {
    const HEX: &[u8; 16] = b"0123456789ABCDEF";

    let mut encoded = String::new();
    for byte in value.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(char::from(byte));
            }
            _ => {
                encoded.push('%');
                encoded.push(char::from(HEX[(byte >> 4) as usize]));
                encoded.push(char::from(HEX[(byte & 0x0F) as usize]));
            }
        }
    }
    encoded
}

/// 对应前端“会员登录”动作。
#[tauri::command]
pub async fn membership_login(
    state: tauri::State<'_, crate::api::AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let account = payload
        .get("account")
        .and_then(|v| v.as_str())
        .map_or("", |v| v);
    let email = payload
        .get("email")
        .and_then(|v| v.as_str())
        .map_or("", |v| v);
    let password = payload
        .get("password")
        .and_then(|v| v.as_str())
        .map_or("", |v| v);
    let code = payload
        .get("code")
        .and_then(|v| v.as_str())
        .map_or("", |v| v);
    let challenge = payload
        .get("challenge")
        .and_then(|v| v.as_str())
        .map_or("", |v| v);
    let device_id = payload
        .get("device_id")
        .and_then(|v| v.as_str())
        .map_or("", |v| v);
    let device_name = payload
        .get("device_name")
        .and_then(|v| v.as_str())
        .map_or("WATransChat", |v| v);

    let response = state
        .api
        .post_json(
            "/v1/membership/login",
            json!({
                "action": "login",
                "account": account,
                "email": email,
                "password": password,
                "code": code,
                "challenge": challenge,
                "device_id": device_id,
                "device_name": device_name
            }),
        )
        .await
        .map_err(|e| e.to_string())?;

    normalize_membership_response(response)
}

/// 对应前端“退出会员登录”动作。
#[tauri::command]
pub async fn membership_logout(
    state: tauri::State<'_, crate::api::AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let device_id = payload
        .get("device_id")
        .and_then(|v| v.as_str())
        .map_or("", |v| v);

    let response = state
        .api
        .post_json(
            "/v1/membership/login",
            json!({
                "action": "logout",
                "device_id": device_id
            }),
        )
        .await
        .map_err(|e| e.to_string())?;

    normalize_membership_response(response)
}

/// 对应前端“查询或刷新会员状态”动作。
#[tauri::command]
pub async fn membership_status(
    state: tauri::State<'_, crate::api::AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let _ = payload;

    let response = state
        .api
        .get_json("/v1/membership/status")
        .await
        .map_err(|e| e.to_string())?;

    normalize_membership_response(response)
}

/// 对应前端“购买或续费会员并打开支付页面”动作。
#[tauri::command]
pub async fn membership_open_pay(
    state: tauri::State<'_, crate::api::AppState>,
    app: tauri::AppHandle,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let plan = payload
        .get("plan")
        .and_then(|v| v.as_str())
        .map_or("", |v| v);
    let seats = payload
        .get("seats")
        .and_then(|v| v.as_u64())
        .map_or(1, |v| v);

    if seats == 0 {
        return Err("购买席位数必须大于 0".into());
    }

    let response = state
        .api
        .post_json(
            "/v1/membership/pay",
            json!({
                "plan": plan,
                "seats": seats
            }),
        )
        .await
        .map_err(|e| e.to_string())?;

    let response = normalize_membership_response(response)?;

    if !response
        .get("ok")
        .and_then(|v| v.as_bool())
        .map_or(false, |v| v)
    {
        return Ok(response);
    }

    let pay_url = response
        .get("pay_url")
        .and_then(|v| v.as_str())
        .map_or("", |v| v);

    let authority = pay_url
        .strip_prefix("https://")
        .map_or("", |v| v.split(['/', '?', '#']).next().map_or("", |v| v));

    if authority.is_empty()
        || authority.contains('@')
        || pay_url
            .chars()
            .any(|c| c.is_whitespace() || c.is_control() || c == '\\')
    {
        return Err("会员接口返回的 pay_url 必须是有效的 HTTPS 支付地址".into());
    }

    app.opener()
        .open_url(pay_url, None::<&str>)
        .map_err(|e| e.to_string())?;

    Ok(response)
}

/// 对应前端“使用登录挑战查询已占用席位的设备”动作。
#[tauri::command]
pub async fn membership_devices_by_challenge(
    state: tauri::State<'_, crate::api::AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let challenge = payload
        .get("challenge")
        .and_then(|v| v.as_str())
        .map_or("", |v| v);

    if challenge.trim().is_empty() {
        return Err("缺少 challenge".into());
    }

    let path = format!(
        "/v1/membership/devices?challenge={}",
        encode_membership_query(challenge)
    );

    let response = state.api.get_json(&path).await.map_err(|e| e.to_string())?;

    normalize_membership_response(response)
}

/// 对应前端“从会员设备列表退出指定设备”动作。
#[tauri::command]
pub async fn membership_logout_device(
    state: tauri::State<'_, crate::api::AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let device_id = payload
        .get("device_id")
        .and_then(|v| v.as_str())
        .map_or("", |v| v);

    if device_id.trim().is_empty() {
        return Err("缺少 device_id".into());
    }

    let response = state
        .api
        .post_json(
            "/v1/membership/devices",
            json!({
                "action": "logout",
                "device_id": device_id
            }),
        )
        .await
        .map_err(|e| e.to_string())?;

    normalize_membership_response(response)
}

/// 对应前端“使用登录挑战退出指定设备以释放席位”动作。
#[tauri::command]
pub async fn membership_logout_device_by_challenge(
    state: tauri::State<'_, crate::api::AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let challenge = payload
        .get("challenge")
        .and_then(|v| v.as_str())
        .map_or("", |v| v);
    let device_id = payload
        .get("device_id")
        .and_then(|v| v.as_str())
        .map_or("", |v| v);

    if challenge.trim().is_empty() {
        return Err("缺少 challenge".into());
    }
    if device_id.trim().is_empty() {
        return Err("缺少 device_id".into());
    }

    let response = state
        .api
        .post_json(
            "/v1/membership/devices",
            json!({
                "action": "logout",
                "challenge": challenge,
                "device_id": device_id
            }),
        )
        .await
        .map_err(|e| e.to_string())?;

    normalize_membership_response(response)
}

/// 对应前端“提交席位选择”动作，device_ids 为所选设备 ID 列表。
#[tauri::command]
pub async fn membership_apply_seat_pick(
    state: tauri::State<'_, crate::api::AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let challenge = payload
        .get("challenge")
        .and_then(|v| v.as_str())
        .map_or("", |v| v);
    let device_ids = payload
        .get("device_ids")
        .and_then(|v| v.as_array())
        .map_or_else(Vec::new, |v| v.clone());

    if device_ids.is_empty() {
        return Err("请选择至少一个设备".into());
    }

    for device_id in &device_ids {
        let device_id = device_id.as_str().map_or("", |v| v);
        if device_id.trim().is_empty() {
            return Err("device_ids 必须由非空字符串组成".into());
        }
    }

    let mut body = json!({
        "action": "apply",
        "device_ids": device_ids
    });

    if !challenge.trim().is_empty() {
        body["challenge"] = json!(challenge);
    }

    let response = state
        .api
        .post_json("/v1/membership/seat/pick", body)
        .await
        .map_err(|e| e.to_string())?;

    normalize_membership_response(response)
}

/// 对应前端“查询或轮询席位选择状态”动作。
#[tauri::command]
pub async fn seat_pick_status(
    state: tauri::State<'_, crate::api::AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let challenge = payload
        .get("challenge")
        .and_then(|v| v.as_str())
        .map_or("", |v| v);

    let path = if challenge.trim().is_empty() {
        "/v1/membership/seat/pick".to_string()
    } else {
        format!(
            "/v1/membership/seat/pick?challenge={}",
            encode_membership_query(challenge)
        )
    };

    let response = state.api.get_json(&path).await.map_err(|e| e.to_string())?;

    normalize_membership_response(response)
}
