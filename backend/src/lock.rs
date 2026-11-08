use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    fs,
    io::Write,
    path::PathBuf,
    sync::Mutex,
    time::Instant,
};
use tauri::{Emitter, Manager};

static APP_LOCK: Mutex<Option<LockRuntime>> = Mutex::new(None);

#[derive(Clone, PartialEq, Serialize, Deserialize)]
struct LockOptions {
    timeout_secs: u64,
    on_minimize: bool,
}

impl Default for LockOptions {
    fn default() -> Self {
        Self {
            timeout_secs: 300,
            on_minimize: true,
        }
    }
}

#[derive(Clone, PartialEq, Serialize, Deserialize)]
struct LockConfig {
    enabled: bool,
    hash: String,
    salt: String,
    biometric: bool,
    options: LockOptions,
}

impl Default for LockConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            hash: String::new(),
            salt: String::new(),
            biometric: false,
            options: LockOptions::default(),
        }
    }
}

#[derive(Clone)]
struct LockRuntime {
    config: LockConfig,
    locked: bool,
    unlocked_at: Option<Instant>,
}

fn lock_path() -> Result<PathBuf, String> {
    let appdata = std::env::var_os("APPDATA")
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "APPDATA_not_found".to_string())?;

    Ok(PathBuf::from(appdata).join("Falo").join("lock.json"))
}

fn load_config() -> Result<LockConfig, String> {
    let bytes = match fs::read(lock_path()?) {
        Ok(bytes) => bytes,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            return Ok(LockConfig::default());
        }
        Err(error) => return Err(error.to_string()),
    };

    let config: LockConfig = serde_json::from_slice(&bytes).map_err(|error| error.to_string())?;

    if config.enabled && (!is_hex(&config.hash, 64) || !is_hex(&config.salt, 32)) {
        return Err("invalid_lock_config".into());
    }

    // 本实现没有原生生物识别验证器，不允许磁盘配置启用认证旁路。
    if config.biometric {
        return Err("biometric_unavailable".into());
    }

    Ok(config)
}

fn save_config(config: &LockConfig) -> Result<(), String> {
    let path = lock_path()?;
    let parent = path
        .parent()
        .ok_or_else(|| "invalid_lock_path".to_string())?;

    fs::create_dir_all(parent).map_err(|error| error.to_string())?;

    let temporary_path = parent.join(format!("lock.{}.tmp", new_salt()?));
    let bytes = serde_json::to_vec_pretty(config).map_err(|error| error.to_string())?;

    let result = (|| -> Result<(), String> {
        let mut file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temporary_path)
            .map_err(|error| error.to_string())?;

        file.write_all(&bytes).map_err(|error| error.to_string())?;
        file.sync_all().map_err(|error| error.to_string())?;
        drop(file);

        fs::rename(&temporary_path, &path).map_err(|error| error.to_string())?;
        Ok(())
    })();

    if result.is_err() {
        let _ = fs::remove_file(&temporary_path);
    }

    result
}

fn with_lock(
    operation: impl FnOnce(&mut LockRuntime) -> Result<Value, String>,
) -> Result<Value, String> {
    let mut guard = APP_LOCK
        .lock()
        .map_err(|_| "lock_state_poisoned".to_string())?;

    if guard.is_none() {
        let config = load_config()?;
        let locked = config.enabled;

        *guard = Some(LockRuntime {
            config,
            locked,
            unlocked_at: None,
        });
    }

    let runtime = guard
        .as_mut()
        .ok_or_else(|| "lock_state_unavailable".to_string())?;

    // 超时采用命令访问时检查；timeout_secs == 0 表示不自动锁定。
    if !runtime.config.enabled {
        runtime.locked = false;
        runtime.unlocked_at = None;
    } else if !runtime.locked && runtime.config.options.timeout_secs > 0 {
        if let Some(unlocked_at) = runtime.unlocked_at {
            if unlocked_at.elapsed().as_secs() >= runtime.config.options.timeout_secs {
                runtime.locked = true;
                runtime.unlocked_at = None;
            }
        }
    }

    let mut candidate = runtime.clone();
    let result = operation(&mut candidate)?;

    if candidate.config != runtime.config {
        save_config(&candidate.config)?;
    }

    *runtime = candidate;
    Ok(result)
}

fn status(runtime: &LockRuntime) -> Value {
    json!({
        "enabled": runtime.config.enabled,
        "locked": runtime.config.enabled && runtime.locked,
        "biometric": runtime.config.biometric,
        "timeout_secs": runtime.config.options.timeout_secs
    })
}

fn require_unlocked(runtime: &LockRuntime) -> Result<(), String> {
    if runtime.config.enabled && runtime.locked {
        return Err("app_locked".into());
    }

    Ok(())
}

fn verify_password(config: &LockConfig, password: &str) -> Result<(), String> {
    if !config.enabled {
        return Err("lock_disabled".into());
    }

    let actual = password_hash(&config.salt, password);
    let expected = config.hash.as_bytes();
    let actual = actual.as_bytes();

    if expected.len() != actual.len() {
        return Err("bad_password".into());
    }

    let difference = expected
        .iter()
        .zip(actual.iter())
        .fold(0u8, |difference, (left, right)| {
            difference | (*left ^ *right)
        });

    if difference != 0 {
        return Err("bad_password".into());
    }

    Ok(())
}

fn install_password(config: &mut LockConfig, password: &str) -> Result<(), String> {
    if password.is_empty() {
        return Err("empty_password".into());
    }

    let salt = new_salt()?;
    let hash = password_hash(&salt, password);

    config.enabled = true;
    config.salt = salt;
    config.hash = hash;
    Ok(())
}

fn password_hash(salt: &str, password: &str) -> String {
    let mut input = Vec::with_capacity(salt.len() + 1 + password.len());
    input.extend_from_slice(salt.as_bytes());
    input.push(b':');
    input.extend_from_slice(password.as_bytes());
    hex(&sha256(&input))
}

fn hex(bytes: &[u8]) -> String {
    const DIGITS: &[u8; 16] = b"0123456789abcdef";

    let mut result = String::with_capacity(bytes.len() * 2);
    for &byte in bytes {
        result.push(char::from(DIGITS[usize::from(byte >> 4)]));
        result.push(char::from(DIGITS[usize::from(byte & 0x0f)]));
    }
    result
}

fn is_hex(value: &str, length: usize) -> bool {
    value.len() == length
        && value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}

#[cfg(windows)]
fn new_salt() -> Result<String, String> {
    #[link(name = "bcrypt")]
    extern "system" {
        fn BCryptGenRandom(
            algorithm: *mut std::ffi::c_void,
            buffer: *mut u8,
            buffer_length: u32,
            flags: u32,
        ) -> i32;
    }

    let mut bytes = [0u8; 16];

    // BCRYPT_USE_SYSTEM_PREFERRED_RNG：由 Windows 系统提供安全随机数。
    let result =
        unsafe { BCryptGenRandom(std::ptr::null_mut(), bytes.as_mut_ptr(), 16, 0x0000_0002) };

    if result < 0 {
        return Err("salt_generation_failed".into());
    }

    Ok(hex(&bytes))
}

#[cfg(unix)]
fn new_salt() -> Result<String, String> {
    let mut bytes = [0u8; 16];
    let mut file = fs::File::open("/dev/urandom").map_err(|error| error.to_string())?;
    file.read_exact(&mut bytes)
        .map_err(|error| error.to_string())?;
    Ok(hex(&bytes))
}

#[cfg(not(any(windows, unix)))]
fn new_salt() -> Result<String, String> {
    Err("secure_random_unavailable".into())
}

fn sha256(input: &[u8]) -> [u8; 32] {
    const K: [u32; 64] = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4,
        0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe,
        0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
        0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
        0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
        0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
        0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116,
        0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
        0xc67178f2,
    ];

    let mut state = [
        0x6a09e667u32,
        0xbb67ae85,
        0x3c6ef372,
        0xa54ff53a,
        0x510e527f,
        0x9b05688c,
        0x1f83d9ab,
        0x5be0cd19,
    ];

    let bit_length = (input.len() as u64).wrapping_mul(8);
    let mut message = input.to_vec();
    message.push(0x80);

    while message.len() % 64 != 56 {
        message.push(0);
    }
    message.extend_from_slice(&bit_length.to_be_bytes());

    for block in message.chunks_exact(64) {
        let mut words = [0u32; 64];

        for (index, bytes) in block.chunks_exact(4).enumerate() {
            words[index] = u32::from_be_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]);
        }

        for index in 16..64 {
            let x = words[index - 15];
            let y = words[index - 2];
            let s0 = x.rotate_right(7) ^ x.rotate_right(18) ^ (x >> 3);
            let s1 = y.rotate_right(17) ^ y.rotate_right(19) ^ (y >> 10);

            words[index] = words[index - 16]
                .wrapping_add(s0)
                .wrapping_add(words[index - 7])
                .wrapping_add(s1);
        }

        let [mut a, mut b, mut c, mut d, mut e, mut f, mut g, mut h] = state;

        for index in 0..64 {
            let sum1 = e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25);
            let choice = (e & f) ^ ((!e) & g);
            let temporary1 = h
                .wrapping_add(sum1)
                .wrapping_add(choice)
                .wrapping_add(K[index])
                .wrapping_add(words[index]);

            let sum0 = a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22);
            let majority = (a & b) ^ (a & c) ^ (b & c);
            let temporary2 = sum0.wrapping_add(majority);

            h = g;
            g = f;
            f = e;
            e = d.wrapping_add(temporary1);
            d = c;
            c = b;
            b = a;
            a = temporary1.wrapping_add(temporary2);
        }

        for (value, addition) in state.iter_mut().zip([a, b, c, d, e, f, g, h]) {
            *value = value.wrapping_add(addition);
        }
    }

    let mut digest = [0u8; 32];
    for (index, word) in state.iter().enumerate() {
        digest[index * 4..index * 4 + 4].copy_from_slice(&word.to_be_bytes());
    }
    digest
}

/// 对应前端“修改应用锁密码”：校验旧密码后保存新 salt 和密码哈希。
#[tauri::command]
pub async fn change_app_lock_password(
    state: tauri::State<'_, crate::api::AppState>,
    payload: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let payload = payload.unwrap_or(serde_json::Value::Null);
    let _ = state;
    let old_password = payload
        .get("old_password")
        .and_then(|v| v.as_str())
        .or_else(|| payload.get("current_password").and_then(|v| v.as_str()))
        .or_else(|| payload.get("password").and_then(|v| v.as_str()))
        .unwrap_or_default();
    let new_password = payload
        .get("new_password")
        .and_then(|v| v.as_str())
        .unwrap_or_default();

    with_lock(|runtime| {
        verify_password(&runtime.config, old_password)?;
        install_password(&mut runtime.config, new_password)?;
        Ok(json!({ "success": true }))
    })
}

/// 对应前端“关闭应用锁”：校验密码后清除密码、生物识别和锁定状态。
#[tauri::command]
pub async fn disable_app_lock(
    state: tauri::State<'_, crate::api::AppState>,
    payload: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let payload = payload.unwrap_or(serde_json::Value::Null);
    let _ = state;
    let password = payload
        .get("password")
        .and_then(|v| v.as_str())
        .unwrap_or_default();

    with_lock(|runtime| {
        if runtime.config.enabled {
            verify_password(&runtime.config, password)?;
        }

        runtime.config.enabled = false;
        runtime.config.hash.clear();
        runtime.config.salt.clear();
        runtime.config.biometric = false;
        runtime.locked = false;
        runtime.unlocked_at = None;
        Ok(json!({ "success": true }))
    })
}

/// 对应前端“查询应用锁状态”：返回启用、锁定、生物识别和超时设置。
#[tauri::command]
pub async fn get_lock_status(
    state: tauri::State<'_, crate::api::AppState>,
    payload: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let payload = payload.unwrap_or(serde_json::Value::Null);
    let _ = (state, payload);
    with_lock(|runtime| Ok(status(runtime)))
}

/// 对应前端“立即锁定”：锁定应用并向主窗口发送 app-locked 事件。
#[tauri::command]
pub async fn lock_app(
    state: tauri::State<'_, crate::api::AppState>,
    app: tauri::AppHandle,
    payload: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let payload = payload.unwrap_or(serde_json::Value::Null);
    let _ = (state, payload);
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main_window_not_found".to_string())?;

    let result = with_lock(|runtime| {
        if !runtime.config.enabled {
            return Err("lock_disabled".into());
        }

        runtime.locked = true;
        runtime.unlocked_at = None;
        Ok(json!({ "success": true }))
    })?;

    window
        .emit("app-locked", true)
        .map_err(|error| error.to_string())?;

    Ok(result)
}

/// 对应前端“重置应用锁”：校验现有密码后恢复全部应用锁默认设置。
#[tauri::command]
pub async fn reset_app_lock(
    state: tauri::State<'_, crate::api::AppState>,
    payload: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let payload = payload.unwrap_or(serde_json::Value::Null);
    let _ = state;
    let password = payload
        .get("password")
        .and_then(|v| v.as_str())
        .unwrap_or_default();

    with_lock(|runtime| {
        if runtime.config.enabled {
            verify_password(&runtime.config, password)?;
        }

        runtime.config = LockConfig::default();
        runtime.locked = false;
        runtime.unlocked_at = None;
        Ok(json!({ "success": true }))
    })
}

/// 对应前端“保存应用锁选项”：更新 timeout_secs 和 on_minimize 设置。
#[tauri::command]
pub async fn set_app_lock_options(
    state: tauri::State<'_, crate::api::AppState>,
    payload: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let payload = payload.unwrap_or(serde_json::Value::Null);
    let _ = state;
    let options = payload
        .get("options")
        .filter(|v| v.is_object())
        .unwrap_or(&payload);
    let timeout_secs = options.get("timeout_secs").and_then(|v| v.as_u64());
    let on_minimize = options.get("on_minimize").and_then(|v| v.as_bool());

    with_lock(|runtime| {
        require_unlocked(runtime)?;

        runtime.config.options.timeout_secs =
            timeout_secs.unwrap_or(runtime.config.options.timeout_secs);
        runtime.config.options.on_minimize =
            on_minimize.unwrap_or(runtime.config.options.on_minimize);

        Ok(json!({
            "success": true,
            "options": runtime.config.options
        }))
    })
}

/// 对应前端“设置应用锁密码”：首次启用应用锁并保存 salt 和 SHA-256 哈希。
#[tauri::command]
pub async fn set_app_lock_password(
    state: tauri::State<'_, crate::api::AppState>,
    payload: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let payload = payload.unwrap_or(serde_json::Value::Null);
    let _ = state;
    let password = payload
        .get("password")
        .and_then(|v| v.as_str())
        .unwrap_or_default();

    with_lock(|runtime| {
        if runtime.config.enabled {
            return Err("lock_already_enabled".into());
        }

        install_password(&mut runtime.config, password)?;
        runtime.config.biometric = false;
        runtime.locked = false;
        runtime.unlocked_at = Some(Instant::now());
        Ok(json!({ "success": true }))
    })
}

/// 对应前端“切换生物识别”：允许关闭；未接入原生验证器时拒绝启用。
#[tauri::command]
pub async fn set_biometric_enabled(
    state: tauri::State<'_, crate::api::AppState>,
    payload: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let payload = payload.unwrap_or(serde_json::Value::Null);
    let _ = state;
    let enabled = payload
        .get("enabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    with_lock(|runtime| {
        require_unlocked(runtime)?;

        if enabled {
            if !runtime.config.enabled {
                return Err("lock_disabled".into());
            }
            return Err("biometric_unavailable".into());
        }

        runtime.config.biometric = false;
        Ok(json!({ "success": true, "biometric": false }))
    })
}

/// 对应前端“生物识别解锁”：缺少 Windows Hello 原生验证器时拒绝解锁。
#[tauri::command]
pub async fn unlock_biometric(
    state: tauri::State<'_, crate::api::AppState>,
    payload: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let payload = payload.unwrap_or(serde_json::Value::Null);
    let _ = (state, payload);

    with_lock(|runtime| {
        if !runtime.config.enabled {
            return Err("lock_disabled".into());
        }
        if !runtime.config.biometric {
            return Err("biometric_disabled".into());
        }

        // 不信任 payload 中的 success、verified 等前端认证结果。
        Err("biometric_unavailable".into())
    })
}

/// 对应前端“密码解锁”：校验密码，失败返回 bad_password，成功更新内存锁状态。
#[tauri::command]
pub async fn unlock_password(
    state: tauri::State<'_, crate::api::AppState>,
    payload: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let payload = payload.unwrap_or(serde_json::Value::Null);
    let _ = state;
    let password = payload
        .get("password")
        .and_then(|v| v.as_str())
        .unwrap_or_default();

    with_lock(|runtime| {
        verify_password(&runtime.config, password)?;
        runtime.locked = false;
        runtime.unlocked_at = Some(Instant::now());
        Ok(json!({ "success": true, "locked": false }))
    })
}
