use serde_json::{json, Value};
use std::{
    fs::{self, OpenOptions},
    io::Write,
    path::PathBuf,
    process::Command,
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{Emitter, Manager};
use tauri_plugin_notification::NotificationExt;

// Cargo.toml 需包含 tauri-plugin-notification = "2"；
// 在应用 Builder 上注册 .plugin(tauri_plugin_notification::init())。
const CURRENT_VERSION: &str = "2.6.5";
const UPDATE_ENDPOINT: &str = "/v1/update?channel=windows&version=2.6.5";

static SETTINGS_LOCK: Mutex<()> = Mutex::new(());
static LOG_LOCK: Mutex<()> = Mutex::new(());
static UPDATE_LOCK: Mutex<bool> = Mutex::new(false);

fn default_settings() -> Value {
    json!({
        "theme": "system",
        "always_on_top": false,
        "focus_mode": false,
        "engine": "auto",
        "source_lang": "auto",
        "target_lang": "zh-CN",
        "accounts": {},
        "update_snoozed_until": 0
    })
}

fn settings_path() -> Result<PathBuf, String> {
    let appdata = std::env::var_os("APPDATA")
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "APPDATA 环境变量不可用".to_string())?;

    Ok(PathBuf::from(appdata)
        .join("Falo")
        .join("settings.json"))
}

fn unix_seconds() -> Result<u64, String> {
    Ok(SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs())
}

fn load_settings_unlocked() -> Result<Value, String> {
    let path = settings_path()?;
    let mut settings = default_settings();

    let bytes = match fs::read(&path) {
        Ok(bytes) => bytes,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            return Ok(settings);
        }
        Err(error) => return Err(error.to_string()),
    };

    let stored: Value = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
    let stored_object = stored
        .as_object()
        .ok_or_else(|| "settings.json 的根节点必须是对象".to_string())?;

    let settings_object = settings
        .as_object_mut()
        .ok_or_else(|| "默认设置格式错误".to_string())?;

    for (key, value) in stored_object {
        settings_object.insert(key.clone(), value.clone());
    }

    validate_settings(&settings)?;
    Ok(settings)
}

fn validate_settings(settings: &Value) -> Result<(), String> {
    for key in ["theme", "engine", "source_lang", "target_lang"] {
        if settings.get(key).and_then(|v| v.as_str()).is_none() {
            return Err(format!("设置项 {key} 必须是字符串"));
        }
    }

    for key in ["always_on_top", "focus_mode"] {
        if settings.get(key).and_then(|v| v.as_bool()).is_none() {
            return Err(format!("设置项 {key} 必须是布尔值"));
        }
    }

    if settings
        .get("accounts")
        .and_then(|v| v.as_object())
        .is_none()
    {
        return Err("设置项 accounts 必须是对象".into());
    }

    Ok(())
}

fn save_settings_unlocked(settings: &Value) -> Result<(), String> {
    validate_settings(settings)?;

    let path = settings_path()?;
    let parent = path
        .parent()
        .ok_or_else(|| "设置文件路径无效".to_string())?;

    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let bytes = serde_json::to_vec_pretty(settings).map_err(|e| e.to_string())?;

    // 当前进程内的读写由 SETTINGS_LOCK 串行化。
    let mut file = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(path)
        .map_err(|e| e.to_string())?;

    file.write_all(&bytes).map_err(|e| e.to_string())?;
    file.sync_all().map_err(|e| e.to_string())?;
    Ok(())
}

fn read_settings() -> Result<Value, String> {
    let _guard = SETTINGS_LOCK.lock().map_err(|e| e.to_string())?;
    load_settings_unlocked()
}

fn change_settings<F>(change: F) -> Result<Value, String>
where
    F: FnOnce(&mut Value) -> Result<(), String>,
{
    let _guard = SETTINGS_LOCK.lock().map_err(|e| e.to_string())?;
    let mut settings = load_settings_unlocked()?;
    change(&mut settings)?;
    save_settings_unlocked(&settings)?;
    Ok(settings)
}

fn set_account_field(
    settings: &mut Value,
    account_id: &str,
    field: &str,
    value: Value,
) -> Result<(), String> {
    let accounts = settings
        .get_mut("accounts")
        .and_then(|v| v.as_object_mut())
        .ok_or_else(|| "accounts 设置格式错误".to_string())?;

    let account = accounts
        .entry(account_id.to_string())
        .or_insert_with(|| json!({}));

    let account_object = account
        .as_object_mut()
        .ok_or_else(|| format!("账户 {account_id} 的设置必须是对象"))?;

    account_object.insert(field.to_string(), value);
    Ok(())
}

fn emit_main(app: &tauri::AppHandle, event: &str, value: Value) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "找不到 main 窗口".to_string())?;

    window.emit(event, value).map_err(|e| e.to_string())
}

fn normalized_update(response: &Value) -> Value {
    let version = response
        .get("version")
        .and_then(|v| v.as_str())
        .map_or(CURRENT_VERSION, |v| v);

    let notes = response
        .get("notes")
        .and_then(|v| v.as_str())
        .map_or("", |v| v);

    let url = response
        .get("url")
        .and_then(|v| v.as_str())
        .map_or("", |v| v);

    let has_update = response
        .get("has_update")
        .and_then(|v| v.as_bool())
        .map_or_else(
            || {
                let parse = |text: &str| -> Option<Vec<u64>> {
                    text.trim_start_matches('v')
                        .split('.')
                        .map(|part| part.parse::<u64>().ok())
                        .collect()
                };

                match (parse(version), parse(CURRENT_VERSION)) {
                    (Some(remote), Some(current)) if remote.len() == current.len() => {
                        remote > current
                    }
                    _ => false,
                }
            },
            |v| v,
        );

    json!({
        "has_update": has_update,
        "version": version,
        "notes": notes,
        "url": url
    })
}

fn windows_command(program: PathBuf) -> Command {
    #[allow(unused_mut)]
    let mut command = Command::new(program);

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }

    command
}

fn windows_system_directory() -> Result<PathBuf, String> {
    if !cfg!(target_os = "windows") {
        return Err("此功能仅支持 Windows".into());
    }

    let root = std::env::var_os("SystemRoot")
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "SystemRoot 环境变量不可用".to_string())?;

    Ok(PathBuf::from(root).join("System32"))
}

fn decode_command_output(bytes: &[u8]) -> String {
    let is_utf16 =
        bytes.starts_with(&[0xff, 0xfe]) || bytes.iter().take(128).any(|byte| *byte == 0);

    if is_utf16 {
        let start = if bytes.starts_with(&[0xff, 0xfe]) {
            2
        } else {
            0
        };

        let units: Vec<u16> = bytes[start..]
            .chunks_exact(2)
            .map(|pair| u16::from_le_bytes([pair[0], pair[1]]))
            .collect();

        String::from_utf16_lossy(&units)
    } else {
        String::from_utf8_lossy(bytes).into_owned()
    }
}

fn valid_machine_identifier(value: &str) -> bool {
    let parts: Vec<&str> = value.split('-').collect();
    let lengths = [8_usize, 4, 4, 4, 12];

    parts.len() == lengths.len()
        && parts.iter().zip(lengths).all(|(part, length)| {
            part.len() == length && part.bytes().all(|byte| byte.is_ascii_hexdigit())
        })
        && value.bytes().any(|byte| byte != b'0' && byte != b'-')
        && !value
            .bytes()
            .all(|byte| byte == b'f' || byte == b'F' || byte == b'-')
}

fn machine_fingerprint() -> Result<Value, String> {
    let system_directory = windows_system_directory()?;

    let wmic_result = windows_command(system_directory.join("wbem").join("wmic.exe"))
        .args(["csproduct", "get", "uuid"])
        .output();

    if let Ok(output) = wmic_result {
        if output.status.success() {
            let text = decode_command_output(&output.stdout);
            if let Some(uuid) = text
                .split_whitespace()
                .find(|value| valid_machine_identifier(value))
            {
                return Ok(json!({
                    "fingerprint": uuid.to_ascii_lowercase(),
                    "source": "csproduct_uuid"
                }));
            }
        }
    }

    for registry_view in ["/reg:64", "/reg:32"] {
        let output = windows_command(system_directory.join("reg.exe"))
            .args([
                "query",
                r"HKLM\SOFTWARE\Microsoft\Cryptography",
                "/v",
                "MachineGuid",
                registry_view,
            ])
            .output();

        if let Ok(output) = output {
            if !output.status.success() {
                continue;
            }

            let text = decode_command_output(&output.stdout);
            for line in text.lines() {
                let mut parts = line.split_whitespace();

                let name = parts.next().map_or("", |v| v);
                let kind = parts.next().map_or("", |v| v);
                let value = parts.next().map_or("", |v| v);

                if name.eq_ignore_ascii_case("MachineGuid")
                    && kind.eq_ignore_ascii_case("REG_SZ")
                    && valid_machine_identifier(value)
                {
                    return Ok(json!({
                        "fingerprint": value.to_ascii_lowercase(),
                        "source": "machine_guid"
                    }));
                }
            }
        }
    }

    Err("无法读取 csproduct UUID 或注册表 MachineGuid".into())
}

struct UpdateGuard;

impl UpdateGuard {
    fn acquire() -> Result<Self, String> {
        let mut running = UPDATE_LOCK.lock().map_err(|e| e.to_string())?;
        if *running {
            return Err("已有更新任务正在运行".into());
        }

        *running = true;
        Ok(Self)
    }
}

impl Drop for UpdateGuard {
    fn drop(&mut self) {
        if let Ok(mut running) = UPDATE_LOCK.lock() {
            *running = false;
        }
    }
}

fn download_and_start_installer(url: String) -> Result<Value, String> {
    let system_directory = windows_system_directory()?;
    let temp = std::env::var_os("TEMP")
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "TEMP 环境变量不可用".to_string())?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_nanos();

    let directory = PathBuf::from(temp).join(format!(
        "Falo-update-{}-{timestamp}",
        std::process::id()
    ));

    fs::create_dir(&directory).map_err(|e| e.to_string())?;
    let installer = directory.join("Falo-setup.exe");

    // URL 和路径通过环境变量传递，避免把远端字符串拼入 PowerShell 源码。
    // 仅启动通过 Windows Authenticode 验证的安装程序。
    let script = r#"
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try {
    $uri = [Uri]$env:FALO_UPDATE_URL
    if (-not $uri.IsAbsoluteUri -or
        $uri.Scheme -ne 'https' -or
        [string]::IsNullOrWhiteSpace($uri.Host) -or
        -not [string]::IsNullOrEmpty($uri.UserInfo)) {
        throw '更新地址必须是无用户凭据的绝对 HTTPS 地址'
    }

    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

    Invoke-WebRequest `
        -UseBasicParsing `
        -Uri $uri.AbsoluteUri `
        -OutFile $env:FALO_INSTALLER `
        -TimeoutSec 900

    if ((Get-Item -LiteralPath $env:FALO_INSTALLER).Length -le 0) {
        throw '下载的安装程序为空'
    }

    $signature = Get-AuthenticodeSignature -LiteralPath $env:FALO_INSTALLER
    if ($signature.Status -ne 'Valid') {
        throw ('安装程序签名验证失败: ' + $signature.Status)
    }

    $process = Start-Process `
        -FilePath $env:FALO_INSTALLER `
        -PassThru `
        -ErrorAction Stop

    Write-Output $process.Id
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}
"#;

    let result = windows_command(
        system_directory
            .join("WindowsPowerShell")
            .join("v1.0")
            .join("powershell.exe"),
    )
    .args([
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        script,
    ])
    .env("FALO_UPDATE_URL", &url)
    .env("FALO_INSTALLER", &installer)
    .output();

    let output = match result {
        Ok(output) => output,
        Err(error) => {
            let _ = fs::remove_file(&installer);
            let _ = fs::remove_dir(&directory);
            return Err(error.to_string());
        }
    };

    if !output.status.success() {
        let detail = decode_command_output(&output.stderr);
        let _ = fs::remove_file(&installer);
        let _ = fs::remove_dir(&directory);

        return Err(if detail.trim().is_empty() {
            format!("更新程序执行失败: {}", output.status)
        } else {
            detail.trim().to_string()
        });
    }

    let stdout = decode_command_output(&output.stdout);
    let process_id = stdout
        .lines()
        .rev()
        .find_map(|line| line.trim().parse::<u32>().ok());

    Ok(json!({
        "ok": true,
        "started": true,
        "status": "installing",
        "process_id": process_id,
        "installer": installer.to_string_lossy().into_owned()
    }))
}

/// 对应前端动作：读取设置面板中的全部设置。
#[tauri::command]
pub async fn get_settings(
    state: tauri::State<'_, crate::api::AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let _ = (state, payload);
    read_settings()
}

/// 对应前端动作：保存设置面板，并立即应用窗口置顶设置。
#[tauri::command]
pub async fn set_settings(
    state: tauri::State<'_, crate::api::AppState>,
    app: tauri::AppHandle,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let _ = state;

    let patch = match payload.get("settings") {
        Some(value) => value,
        None => &payload,
    };

    let patch_object = patch
        .as_object()
        .ok_or_else(|| "settings 必须是对象".to_string())?;

    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "找不到 main 窗口".to_string())?;

    let _guard = SETTINGS_LOCK.lock().map_err(|e| e.to_string())?;
    let mut settings = load_settings_unlocked()?;
    let object = settings
        .as_object_mut()
        .ok_or_else(|| "设置格式错误".to_string())?;

    for (key, value) in patch_object {
        object.insert(key.clone(), value.clone());
    }

    validate_settings(&settings)?;

    let previous_top = window.is_always_on_top().map_err(|e| e.to_string())?;
    let desired_top = settings
        .get("always_on_top")
        .and_then(|v| v.as_bool())
        .map_or(false, |v| v);

    if previous_top != desired_top {
        window
            .set_always_on_top(desired_top)
            .map_err(|e| e.to_string())?;
    }

    if let Err(error) = save_settings_unlocked(&settings) {
        if previous_top != desired_top {
            if let Err(rollback_error) = window.set_always_on_top(previous_top) {
                return Err(format!("{error}；恢复窗口置顶状态失败：{rollback_error}"));
            }
        }
        return Err(error);
    }

    window
        .emit("settings-changed", settings.clone())
        .map_err(|e| e.to_string())?;

    Ok(settings)
}

/// 对应前端动作：检查 Windows 渠道是否存在可用更新。
#[tauri::command]
pub async fn check_for_update(
    state: tauri::State<'_, crate::api::AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let _ = payload;
    let response = state
        .api
        .get_json(UPDATE_ENDPOINT)
        .await
        .map_err(|e| e.to_string())?;

    Ok(normalized_update(&response))
}

/// 对应前端动作：关闭主窗口内的更新提示面板。
#[tauri::command]
pub async fn update_close(
    state: tauri::State<'_, crate::api::AppState>,
    app: tauri::AppHandle,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let _ = (state, payload);
    emit_main(&app, "update-close", json!({ "closed": true }))?;
    Ok(json!({ "ok": true }))
}

/// 对应前端动作：从服务端确认更新地址，下载安装包并启动安装。
#[tauri::command]
pub async fn update_download_and_install(
    state: tauri::State<'_, crate::api::AppState>,
    app: tauri::AppHandle,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let _ = payload;
    let _update_guard = UpdateGuard::acquire()?;

    // 安装地址只取自服务端检查结果，不接受前端传入的可执行文件地址。
    let response = state
        .api
        .get_json(UPDATE_ENDPOINT)
        .await
        .map_err(|e| e.to_string())?;

    let update = normalized_update(&response);
    let has_update = update
        .get("has_update")
        .and_then(|v| v.as_bool())
        .map_or(false, |v| v);

    if !has_update {
        return Ok(json!({
            "ok": true,
            "started": false,
            "status": "up_to_date"
        }));
    }

    let url = update
        .get("url")
        .and_then(|v| v.as_str())
        .map_or("", |v| v)
        .trim()
        .to_string();

    if !url.starts_with("https://") || url.len() > 8192 {
        return Err("服务端返回了无效的 HTTPS 更新地址".into());
    }

    emit_main(&app, "update-status", json!({ "status": "downloading" }))?;

    let task =
        tauri::async_runtime::spawn_blocking(move || download_and_start_installer(url)).await;

    let result = match task {
        Ok(result) => result,
        Err(error) => Err(error.to_string()),
    };

    match result {
        Ok(value) => {
            // 安装程序已启动；事件投递失败不应把已启动的安装报告为失败。
            let _ = emit_main(&app, "update-status", value.clone());
            Ok(value)
        }
        Err(error) => {
            let _ = emit_main(
                &app,
                "update-status",
                json!({ "status": "error", "message": &error }),
            );
            Err(error)
        }
    }
}

/// 对应前端动作：按更新界面请求调整主窗口尺寸。
#[tauri::command]
pub async fn update_resize(
    state: tauri::State<'_, crate::api::AppState>,
    app: tauri::AppHandle,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let _ = state;

    let width = payload
        .get("width")
        .and_then(|v| v.as_f64())
        .map_or(480.0, |v| v);

    let height = payload
        .get("height")
        .and_then(|v| v.as_f64())
        .map_or(600.0, |v| v);

    if !width.is_finite()
        || !height.is_finite()
        || !(240.0..=4096.0).contains(&width)
        || !(160.0..=4096.0).contains(&height)
    {
        return Err("窗口尺寸超出允许范围".into());
    }

    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "找不到 main 窗口".to_string())?;

    window
        .set_size(tauri::LogicalSize::new(width, height))
        .map_err(|e| e.to_string())?;

    Ok(json!({ "ok": true, "width": width, "height": height }))
}

/// 对应前端动作：稍后提醒更新，并保存下次提醒时间。
#[tauri::command]
pub async fn update_snooze(
    state: tauri::State<'_, crate::api::AppState>,
    app: tauri::AppHandle,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let _ = state;

    let minutes = payload
        .get("minutes")
        .and_then(|v| v.as_u64())
        .map_or(1440, |v| v)
        .clamp(1, 43_200);

    let until = unix_seconds()?
        .checked_add(minutes * 60)
        .ok_or_else(|| "更新提醒时间溢出".to_string())?;

    change_settings(|settings| {
        let object = settings
            .as_object_mut()
            .ok_or_else(|| "设置格式错误".to_string())?;
        object.insert("update_snoozed_until".into(), json!(until));
        Ok(())
    })?;

    let result = json!({ "ok": true, "snoozed_until": until });
    emit_main(&app, "update-snoozed", result.clone())?;
    Ok(result)
}

/// 对应前端动作：通过后端检测代理连接。
#[tauri::command]
pub async fn check_proxy(
    state: tauri::State<'_, crate::api::AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let proxy = payload
        .get("proxy")
        .and_then(|v| v.as_str())
        .map_or("", |v| v);

    let timeout_ms = payload
        .get("timeout_ms")
        .and_then(|v| v.as_u64())
        .map_or(10_000, |v| v)
        .clamp(1000, 60_000);

    let body = json!({
        "proxy": proxy,
        "timeout_ms": timeout_ms
    });

    match tokio::time::timeout(
        std::time::Duration::from_millis(timeout_ms + 2000),
        state.api.post_json("/v1/proxy/check", body),
    )
    .await
    {
        Ok(result) => result.map_err(|e| e.to_string()),
        Err(_) => Err("代理检测超时".into()),
    }
}

/// 对应前端动作：读取当前主题设置。
#[tauri::command]
pub async fn get_theme(
    state: tauri::State<'_, crate::api::AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let _ = (state, payload);
    let settings = read_settings()?;

    let theme = settings
        .get("theme")
        .and_then(|v| v.as_str())
        .map_or("system", |v| v);

    Ok(json!({ "theme": theme }))
}

/// 对应前端动作：读取主窗口当前实际置顶状态。
#[tauri::command]
pub async fn get_always_on_top(
    state: tauri::State<'_, crate::api::AppState>,
    app: tauri::AppHandle,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let _ = (state, payload);

    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "找不到 main 窗口".to_string())?;

    let enabled = window.is_always_on_top().map_err(|e| e.to_string())?;
    Ok(json!({ "always_on_top": enabled }))
}

/// 对应前端动作：切换或显式设置窗口置顶，并持久化。
#[tauri::command]
pub async fn toggle_always_on_top(
    state: tauri::State<'_, crate::api::AppState>,
    app: tauri::AppHandle,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let _ = state;

    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "找不到 main 窗口".to_string())?;

    let _guard = SETTINGS_LOCK.lock().map_err(|e| e.to_string())?;
    let mut settings = load_settings_unlocked()?;
    let previous = window.is_always_on_top().map_err(|e| e.to_string())?;

    let enabled = payload
        .get("always_on_top")
        .and_then(|v| v.as_bool())
        .or_else(|| payload.get("enabled").and_then(|v| v.as_bool()))
        .map_or(!previous, |v| v);

    let object = settings
        .as_object_mut()
        .ok_or_else(|| "设置格式错误".to_string())?;
    object.insert("always_on_top".into(), json!(enabled));

    window
        .set_always_on_top(enabled)
        .map_err(|e| e.to_string())?;

    if let Err(error) = save_settings_unlocked(&settings) {
        if let Err(rollback_error) = window.set_always_on_top(previous) {
            return Err(format!("{error}；恢复窗口置顶状态失败：{rollback_error}"));
        }
        return Err(error);
    }

    let result = json!({ "always_on_top": enabled });
    window
        .emit("always-on-top-changed", result.clone())
        .map_err(|e| e.to_string())?;

    Ok(result)
}

/// 对应前端动作：读取专注模式及指定账户的有效通知状态。
#[tauri::command]
pub async fn get_productivity_status(
    state: tauri::State<'_, crate::api::AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let _ = state;

    let account_id = payload
        .get("account_id")
        .and_then(|v| v.as_str())
        .map_or("default", |v| v);

    let settings = read_settings()?;
    let focus_mode = settings
        .get("focus_mode")
        .and_then(|v| v.as_bool())
        .map_or(false, |v| v);

    let account_notifications = settings
        .get("accounts")
        .and_then(|v| v.get(account_id))
        .and_then(|v| v.get("notifications_enabled"))
        .and_then(|v| v.as_bool())
        .map_or(true, |v| v);

    Ok(json!({
        "account_id": account_id,
        "focus_mode": focus_mode,
        "account_notifications_enabled": account_notifications,
        "notifications_enabled": account_notifications && !focus_mode
    }))
}

/// 对应前端动作：启用或关闭专注模式。
#[tauri::command]
pub async fn set_focus_mode(
    state: tauri::State<'_, crate::api::AppState>,
    app: tauri::AppHandle,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let _ = state;

    let enabled = payload
        .get("focus_mode")
        .and_then(|v| v.as_bool())
        .or_else(|| payload.get("enabled").and_then(|v| v.as_bool()))
        .map_or(false, |v| v);

    change_settings(|settings| {
        let object = settings
            .as_object_mut()
            .ok_or_else(|| "设置格式错误".to_string())?;
        object.insert("focus_mode".into(), json!(enabled));
        Ok(())
    })?;

    let result = json!({ "ok": true, "focus_mode": enabled });
    emit_main(&app, "focus-mode-changed", result.clone())?;
    Ok(result)
}

/// 对应前端动作：保存指定账户的通知开关。
#[tauri::command]
pub async fn set_account_notifications(
    state: tauri::State<'_, crate::api::AppState>,
    app: tauri::AppHandle,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let _ = state;

    let account_id = payload
        .get("account_id")
        .and_then(|v| v.as_str())
        .map_or("default", |v| v);

    let enabled = payload
        .get("enabled")
        .and_then(|v| v.as_bool())
        .map_or(true, |v| v);

    change_settings(|settings| {
        set_account_field(
            settings,
            account_id,
            "notifications_enabled",
            json!(enabled),
        )
    })?;

    let result = json!({
        "ok": true,
        "account_id": account_id,
        "enabled": enabled
    });

    emit_main(&app, "account-notifications-changed", result.clone())?;
    Ok(result)
}

/// 对应前端动作：保存指定账户的代理地址与启用状态。
#[tauri::command]
pub async fn set_account_proxy(
    state: tauri::State<'_, crate::api::AppState>,
    app: tauri::AppHandle,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let _ = state;

    let account_id = payload
        .get("account_id")
        .and_then(|v| v.as_str())
        .map_or("default", |v| v);

    let proxy = payload
        .get("proxy")
        .and_then(|v| v.as_str())
        .map_or("", |v| v)
        .trim();

    let enabled = payload
        .get("enabled")
        .and_then(|v| v.as_bool())
        .map_or(!proxy.is_empty(), |v| v);

    if enabled && proxy.is_empty() {
        return Err("启用账户代理时必须提供代理地址".into());
    }

    let proxy_settings = json!({
        "enabled": enabled,
        "url": proxy
    });

    change_settings(|settings| {
        set_account_field(settings, account_id, "proxy", proxy_settings.clone())
    })?;

    // 事件不包含代理地址，避免将地址中的凭据广播给其他监听者。
    emit_main(
        &app,
        "account-proxy-changed",
        json!({ "account_id": account_id, "enabled": enabled }),
    )?;

    Ok(json!({
        "ok": true,
        "account_id": account_id,
        "proxy": proxy_settings
    }))
}

/// 对应前端动作：读取设备指纹，优先使用 WMIC，失败后读取 MachineGuid。
#[tauri::command]
pub async fn get_account_fingerprint(
    state: tauri::State<'_, crate::api::AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let _ = (state, payload);

    tauri::async_runtime::spawn_blocking(machine_fingerprint)
        .await
        .map_err(|e| e.to_string())?
}

/// 对应前端动作：将联系人备份请求原样转发到后端。
#[tauri::command]
pub async fn contacts_backup_call(
    state: tauri::State<'_, crate::api::AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    state
        .api
        .post_json("/v1/contacts/backup", payload)
        .await
        .map_err(|e| e.to_string())
}

/// 对应前端动作：向临时目录中的 falo.log 追加一行日志。
#[tauri::command]
pub async fn dlog(
    state: tauri::State<'_, crate::api::AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let _ = state;

    let level = payload
        .get("level")
        .and_then(|v| v.as_str())
        .map_or("info", |v| v);

    let message = payload
        .get("message")
        .and_then(|v| v.as_str())
        .map_or("", |v| v);

    let context = payload.get("context").cloned().map_or(Value::Null, |v| v);

    let record = json!({
        "timestamp": unix_seconds()?,
        "level": level,
        "message": message,
        "context": context
    });

    // JSON 编码会转义消息中的换行，确保每次调用只追加一行。
    let mut line = serde_json::to_vec(&record).map_err(|e| e.to_string())?;
    line.push(b'\n');

    let temp = std::env::var_os("TEMP")
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "TEMP 环境变量不可用".to_string())?;

    let directory = PathBuf::from(temp);
    let _guard = LOG_LOCK.lock().map_err(|e| e.to_string())?;
    fs::create_dir_all(&directory).map_err(|e| e.to_string())?;

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(directory.join("falo.log"))
        .map_err(|e| e.to_string())?;

    file.write_all(&line).map_err(|e| e.to_string())?;
    file.flush().map_err(|e| e.to_string())?;

    Ok(json!({ "ok": true }))
}

/// 对应前端动作：发送一条系统测试通知。
#[tauri::command]
pub async fn test_notification(
    state: tauri::State<'_, crate::api::AppState>,
    app: tauri::AppHandle,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let _ = state;

    let title = payload
        .get("title")
        .and_then(|v| v.as_str())
        .map_or("Falo", |v| v);

    let body = payload
        .get("body")
        .and_then(|v| v.as_str())
        .map_or("这是一条测试通知。", |v| v);

    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|e| e.to_string())?;

    Ok(json!({ "ok": true }))
}

/// 对应前端动作：使用当前翻译设置执行翻译质量测试。
#[tauri::command]
pub async fn quality_translate_test(
    state: tauri::State<'_, crate::api::AppState>,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let settings = read_settings()?;

    let text = payload
        .get("text")
        .and_then(|v| v.as_str())
        .map_or("Hello, how are you?", |v| v);

    let engine = payload
        .get("engine")
        .and_then(|v| v.as_str())
        .or_else(|| settings.get("engine").and_then(|v| v.as_str()))
        .map_or("auto", |v| v);

    let source_lang = payload
        .get("source_lang")
        .and_then(|v| v.as_str())
        .or_else(|| settings.get("source_lang").and_then(|v| v.as_str()))
        .map_or("auto", |v| v);

    let target_lang = payload
        .get("target_lang")
        .and_then(|v| v.as_str())
        .or_else(|| settings.get("target_lang").and_then(|v| v.as_str()))
        .map_or("zh-CN", |v| v);

    let timeout_ms = payload
        .get("timeout_ms")
        .and_then(|v| v.as_u64())
        .map_or(30_000, |v| v)
        .clamp(1000, 120_000);

    let body = json!({
        "text": text,
        "engine": engine,
        "source_lang": source_lang,
        "target_lang": target_lang
    });

    match tokio::time::timeout(
        std::time::Duration::from_millis(timeout_ms),
        state.api.post_json("/v1/translate/test", body),
    )
    .await
    {
        Ok(result) => result.map_err(|e| e.to_string()),
        Err(_) => Err("翻译质量测试超时".into()),
    }
}
