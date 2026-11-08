// desktop.rs
//
// Cargo.toml:
// tauri = { version = "2", features = ["tray-icon"] }
// tauri-plugin-opener = "2"
// serde_json = "1"
// tempfile = "3"
//
// 在 Builder::setup 中调用 desktop::init(app.handle().clone())?，
// 并将下面八个命令加入 tauri::generate_handler![...]。
// 设置页和账号切换由前端监听 "open-settings"、"cycle-account-tab" 事件。
// 系统托盘默认 ID 为 "main"，可通过 payload.tray_id 覆盖。

use crate::api::AppState;
use std::{
    io::Write,
    path::PathBuf,
    sync::{Mutex, OnceLock},
};
use tauri::{Emitter, Manager};

static APP_HANDLE: OnceLock<tauri::AppHandle> = OnceLock::new();
static PROFILE_NAME: Mutex<String> = Mutex::new(String::new());
static TEMP_DIR_PATH: Mutex<Option<PathBuf>> = Mutex::new(None);

pub fn init(app: tauri::AppHandle) -> Result<(), String> {
    if APP_HANDLE.set(app).is_err() {
        return Err("upstream: desktop module is already initialized".into());
    }
    Ok(())
}

fn app_handle() -> Result<&'static tauri::AppHandle, String> {
    match APP_HANDLE.get() {
        Some(app) => Ok(app),
        None => Err("upstream: call desktop::init during application setup".into()),
    }
}

fn main_window() -> Result<tauri::WebviewWindow, String> {
    let app = app_handle()?;
    app.get_webview_window("main")
        .ok_or_else(|| "upstream: main window is unavailable".to_string())
}

#[allow(dead_code)]
fn tray_icon(id: &str) -> Result<tauri::tray::TrayIcon, String> {
    match app_handle()?.tray_by_id(id) {
        Some(tray) => Ok(tray),
        None => Err(format!("upstream: tray icon '{id}' is unavailable")),
    }
}

#[allow(dead_code)]
pub fn profile_name() -> Result<String, String> {
    let name = PROFILE_NAME.lock().map_err(|e| e.to_string())?;
    Ok(name.clone())
}

// 供下载、导出等后端流程读取；不修改进程级环境变量。
#[allow(dead_code)]
pub fn temp_dir_path() -> Result<PathBuf, String> {
    let path = TEMP_DIR_PATH.lock().map_err(|e| e.to_string())?;
    match path.as_ref() {
        Some(path) => Ok(path.clone()),
        None => Ok(std::env::temp_dir()),
    }
}

fn validate_writable_directory(path: PathBuf) -> Result<PathBuf, String> {
    let canonical = std::fs::canonicalize(path).map_err(|e| e.to_string())?;
    let metadata = std::fs::metadata(&canonical).map_err(|e| e.to_string())?;

    if !metadata.is_dir() {
        return Err("upstream: temp path must be an existing directory".into());
    }

    let mut probe = tempfile::Builder::new()
        .prefix(".watranschat-write-probe-")
        .tempfile_in(&canonical)
        .map_err(|e| e.to_string())?;

    probe
        .as_file_mut()
        .write_all(b"WATransChat")
        .map_err(|e| e.to_string())?;
    probe.as_file_mut().flush().map_err(|e| e.to_string())?;
    probe.close().map_err(|e| e.to_string())?;

    Ok(canonical)
}

/// 对接前端未读消息数量更新，将主窗口标题设为带数量的 WATransChat 标题。
#[tauri::command]
pub async fn set_unread_count(
    state: tauri::State<'_, AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let _ = state;

    let count = match payload.get("count").and_then(|v| v.as_u64()) {
        Some(count) => count,
        None => {
            let value = payload.get("count").and_then(|v| v.as_str()).unwrap_or("0");
            value.parse::<u64>().map_err(|e| e.to_string())?
        }
    };

    let title = if count == 0 {
        "WATransChat".to_owned()
    } else {
        format!("[{count}] WATransChat")
    };

    main_window()?
        .set_title(&title)
        .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "ok": true,
        "count": count,
        "title": title
    }))
}

/// 对接前端当前账号名称更新，保存名称并通知主窗口刷新账号显示。
#[tauri::command]
pub async fn set_profile_name(
    state: tauri::State<'_, AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let _ = state;

    let name = payload
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_owned();

    let window = main_window()?;
    let mut stored_name = PROFILE_NAME.lock().map_err(|e| e.to_string())?;

    window
        .emit("profile-name-changed", serde_json::json!({ "name": &name }))
        .map_err(|e| e.to_string())?;
    *stored_name = name.clone();

    Ok(serde_json::json!({
        "ok": true,
        "name": name
    }))
}

/// 对接前端外部链接点击，解析并仅允许通过系统浏览器打开 HTTP 或 HTTPS 地址。
#[tauri::command]
pub async fn open_external_url(
    state: tauri::State<'_, AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let _ = state;

    let raw_url = payload
        .get("url")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim();

    let url = tauri::Url::parse(raw_url).map_err(|e| e.to_string())?;

    if !matches!(url.scheme(), "http" | "https") {
        return Err("upstream: only http and https URLs are allowed".into());
    }
    if url.host_str().is_none() {
        return Err("upstream: external URL must contain a host".into());
    }

    let normalized_url = url.to_string();
    let target = normalized_url.clone();

    tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        tauri_plugin_opener::open_url(target, None::<&str>).map_err(|e| e.to_string())?;
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())??;

    Ok(serde_json::json!({
        "ok": true,
        "url": normalized_url,
        "opened": true
    }))
}

/// 对接前端通知请求，将原始通知载荷通过 notification 事件发送给主窗口。
#[tauri::command]
pub async fn notify(
    state: tauri::State<'_, AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let _ = state;

    main_window()?
        .emit("notification", &payload)
        .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "ok": true,
        "event": "notification",
        "dispatched": true,
        "payload": payload
    }))
}

/// 对接前端打开设置动作，显示并聚焦主窗口后发送设置页导航事件。
#[tauri::command]
pub async fn open_settings(
    state: tauri::State<'_, AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let _ = state;

    let section = payload
        .get("section")
        .and_then(|v| v.as_str())
        .unwrap_or("general");

    let window = main_window()?;
    window.unminimize().map_err(|e| e.to_string())?;
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    window
        .emit(
            "open-settings",
            serde_json::json!({
                "section": section,
                "payload": &payload
            }),
        )
        .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "ok": true,
        "event": "open-settings",
        "dispatched": true,
        "section": section
    }))
}

/// 对接前端循环切换账号标签动作，向主窗口发送向前或向后的切换请求。
#[tauri::command]
pub async fn cycle_account_tab(
    state: tauri::State<'_, AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let _ = state;

    let requested_direction = payload
        .get("direction")
        .and_then(|v| v.as_str())
        .unwrap_or("next");

    let (direction, delta) = match requested_direction {
        "next" => ("next", 1_i32),
        "previous" | "prev" => ("previous", -1_i32),
        _ => return Err("upstream: direction must be next, previous, or prev".into()),
    };

    main_window()?
        .emit(
            "cycle-account-tab",
            serde_json::json!({
                "direction": direction,
                "delta": delta
            }),
        )
        .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "ok": true,
        "event": "cycle-account-tab",
        "dispatched": true,
        "direction": direction,
        "delta": delta
    }))
}

/// 对接前端托盘图标模板模式设置，在 macOS 上修改指定托盘图标的模板标志。
#[tauri::command]
pub async fn set_icon_as_template(
    state: tauri::State<'_, AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let _ = state;

    #[cfg(target_os = "macos")]
    {
        let tray_id = payload
            .get("tray_id")
            .and_then(|v| v.as_str())
            .unwrap_or("main");

        let is_template = match payload.get("is_template").and_then(|v| v.as_bool()) {
            Some(value) => value,
            None => {
                let value = payload
                    .get("is_template")
                    .and_then(|v| v.as_str())
                    .unwrap_or("true");
                value.parse::<bool>().map_err(|e| e.to_string())?
            }
        };

        tray_icon(tray_id)?
            .set_icon_as_template(is_template)
            .map_err(|e| e.to_string())?;

        Ok(serde_json::json!({
            "ok": true,
            "tray_id": tray_id,
            "is_template": is_template,
            "applied": true
        }))
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = payload;
        Err("upstream: template tray icons are supported only on macOS".into())
    }
}

/// 对接前端临时目录设置，验证目录存在且实际可写，并在 Linux 上同步托盘临时目录。
#[tauri::command]
pub async fn set_temp_dir_path(
    state: tauri::State<'_, AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let _ = state;

    let requested_path = payload.get("path").and_then(|v| v.as_str()).unwrap_or("");

    let path = if requested_path.is_empty() {
        std::env::temp_dir()
    } else {
        PathBuf::from(requested_path)
    };

    let canonical = tauri::async_runtime::spawn_blocking(move || validate_writable_directory(path))
        .await
        .map_err(|e| e.to_string())??;

    let mut stored_path = TEMP_DIR_PATH.lock().map_err(|e| e.to_string())?;

    #[cfg(target_os = "linux")]
    {
        let tray_id = payload
            .get("tray_id")
            .and_then(|v| v.as_str())
            .unwrap_or("main");

        tray_icon(tray_id)?
            .set_temp_dir_path(Some(canonical.as_path()))
            .map_err(|e| e.to_string())?;
    }

    *stored_path = Some(canonical.clone());

    Ok(serde_json::json!({
        "ok": true,
        "path": canonical,
        "writable": true,
        "scope": "application",
        "tray_applied": cfg!(target_os = "linux")
    }))
}
