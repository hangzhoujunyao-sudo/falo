use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{fs, path::PathBuf, sync::Mutex};
use tauri::{Emitter, Manager};

#[derive(Clone, Serialize, Deserialize)]
struct Account {
    id: String,
    name: String,
    color: String,
    proxy: String,
    notifications: bool,
    /// Unix 时间戳，单位为秒。
    created_at: u64,
}

struct AccountStore {
    directory: PathBuf,
    accounts: Vec<Account>,
}

static ACCOUNT_STORE: Mutex<Option<AccountStore>> = Mutex::new(None);

fn validate_account_id(id: &str) -> Result<(), String> {
    if id.is_empty()
        || id.len() > 64
        || !id
            .bytes()
            .all(|c| c.is_ascii_alphanumeric() || c == b'-' || c == b'_')
    {
        return Err("账号 id 必须为 1–64 位英文字母、数字、连字符或下划线".into());
    }
    Ok(())
}

fn payload_account_id(payload: &Value) -> Result<String, String> {
    let id = payload
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim();

    validate_account_id(id)?;
    Ok(id.to_owned())
}

fn unix_seconds() -> Result<u64, String> {
    Ok(std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs())
}

impl AccountStore {
    fn load() -> Result<Self, String> {
        let appdata = std::env::var_os("APPDATA")
            .filter(|value| !value.is_empty())
            .ok_or_else(|| "未找到 APPDATA 环境变量".to_string())?;

        let directory = PathBuf::from(appdata).join("Falo");
        if !directory.is_absolute() {
            return Err("APPDATA 必须是绝对路径".into());
        }

        fs::create_dir_all(&directory).map_err(|e| e.to_string())?;

        let path = directory.join("accounts.json");
        let accounts: Vec<Account> = match fs::read(&path) {
            Ok(bytes) => serde_json::from_slice(&bytes)
                .map_err(|e| format!("读取 accounts.json 失败：{e}"))?,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Vec::new(),
            Err(e) => return Err(e.to_string()),
        };

        for (index, account) in accounts.iter().enumerate() {
            validate_account_id(&account.id)?;
            if account.name.trim().is_empty() {
                return Err("accounts.json 中存在空账号名称".into());
            }
            if accounts[..index]
                .iter()
                .any(|previous| previous.id == account.id)
            {
                return Err(format!("accounts.json 中存在重复账号 id：{}", account.id));
            }
        }

        let store = Self {
            directory,
            accounts,
        };

        if !path.exists() {
            store.write_accounts(&store.accounts)?;
        }

        Ok(store)
    }

    fn write_accounts(&self, accounts: &[Account]) -> Result<(), String> {
        let bytes = serde_json::to_vec_pretty(accounts).map_err(|e| e.to_string())?;
        let temporary = self.directory.join("accounts.json.tmp");
        let destination = self.directory.join("accounts.json");

        fs::write(&temporary, bytes).map_err(|e| e.to_string())?;
        fs::rename(&temporary, &destination).map_err(|e| e.to_string())?;
        Ok(())
    }

    fn commit(&mut self, accounts: Vec<Account>) -> Result<(), String> {
        // 磁盘写入成功后才替换缓存，避免保存失败导致缓存与文件不一致。
        self.write_accounts(&accounts)?;
        self.accounts = accounts;
        Ok(())
    }

    fn find(&self, id: &str) -> Result<Account, String> {
        self.accounts
            .iter()
            .find(|account| account.id == id)
            .cloned()
            .ok_or_else(|| format!("账号不存在：{id}"))
    }
}

fn with_account_store<T>(
    operation: impl FnOnce(&mut AccountStore) -> Result<T, String>,
) -> Result<T, String> {
    let mut cache = ACCOUNT_STORE.lock().map_err(|e| e.to_string())?;

    if cache.is_none() {
        *cache = Some(AccountStore::load()?);
    }

    match cache.as_mut() {
        Some(store) => operation(store),
        None => Err("账号缓存初始化失败".into()),
    }
}

fn next_account_id(store: &AccountStore) -> Result<String, String> {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_nanos();

    let mut suffix = 0_u64;

    loop {
        let id = format!("{timestamp}-{suffix}");
        if !store.accounts.iter().any(|account| account.id == id) {
            return Ok(id);
        }
        suffix = suffix
            .checked_add(1)
            .ok_or_else(|| "无法生成账号 id".to_string())?;
    }
}

fn parse_proxy(proxy: &str) -> Result<Option<tauri::Url>, String> {
    if proxy.is_empty() {
        return Ok(None);
    }

    let url = tauri::Url::parse(proxy).map_err(|e| e.to_string())?;
    if !matches!(url.scheme(), "http" | "socks5") || url.host_str().is_none() {
        return Err("代理地址必须是有效的 http:// 或 socks5:// URL".into());
    }
    if !url.username().is_empty() || url.password().is_some() {
        return Err("此实现不支持包含用户名或密码的代理地址".into());
    }

    Ok(Some(url))
}

/// 对应前端“添加账号”：保存账号资料并更新内存缓存。
#[tauri::command]
pub async fn add_account(
    state: tauri::State<'_, crate::api::AppState>,
    payload: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let payload = payload.unwrap_or(serde_json::Value::Null);
    let _ = state;

    let requested_id = payload
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_owned();

    let name = payload
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("WhatsApp")
        .trim()
        .to_owned();

    let color = payload
        .get("color")
        .and_then(|v| v.as_str())
        .unwrap_or("#6366f1")
        .to_owned();

    let proxy = payload
        .get("proxy")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_owned();

    let notifications = payload
        .get("notifications")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);

    if name.is_empty() {
        return Err("账号名称不能为空".into());
    }
    parse_proxy(&proxy)?;

    with_account_store(|store| {
        let id = if requested_id.is_empty() {
            next_account_id(store)?
        } else {
            validate_account_id(&requested_id)?;
            requested_id
        };

        if store.accounts.iter().any(|account| account.id == id) {
            return Err(format!("账号 id 已存在：{id}"));
        }

        let account = Account {
            id,
            name,
            color,
            proxy,
            notifications,
            created_at: unix_seconds()?,
        };

        let mut accounts = store.accounts.clone();
        accounts.push(account.clone());
        store.commit(accounts)?;

        Ok(json!(account))
    })
}

/// 对应前端“关闭账号标签页”：关闭账号窗口并保留账号及登录资料。
#[tauri::command]
pub async fn close_account(
    state: tauri::State<'_, crate::api::AppState>,
    app: tauri::AppHandle,
    payload: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let payload = payload.unwrap_or(serde_json::Value::Null);
    let _ = state;
    let id = payload_account_id(&payload)?;
    let label = format!("acct-{id}");

    with_account_store(|_store| {
        let closed = if let Some(window) = app.get_webview_window(&label) {
            window.destroy().map_err(|e| e.to_string())?;
            true
        } else {
            false
        };

        Ok(json!({
            "id": id,
            "label": label,
            "closed": closed
        }))
    })
}

/// 对应前端“打开账号”：创建独立 WebView2 数据目录的 WhatsApp 窗口，已打开时聚焦。
#[tauri::command]
pub async fn open_account(
    state: tauri::State<'_, crate::api::AppState>,
    app: tauri::AppHandle,
    payload: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let payload = payload.unwrap_or(serde_json::Value::Null);
    let _ = state;
    let id = payload_account_id(&payload)?;

    // 此闭包内没有 await；串行处理创建、关闭和删除，防止重复创建相同 label。
    with_account_store(|store| {
        let account = store.find(&id)?;
        let label = format!("acct-{id}");

        if let Some(window) = app.get_webview_window(&label) {
            window.set_focus().map_err(|e| e.to_string())?;
            return Ok(json!({
                "id": id,
                "label": label,
                "opened": true,
                "created": false
            }));
        }

        let profile = store.directory.join("profiles").join(&id);
        fs::create_dir_all(&profile).map_err(|e| e.to_string())?;

        let url = tauri::Url::parse("https://web.whatsapp.com/").map_err(|e| e.to_string())?;

        let mut builder = tauri::WebviewWindowBuilder::new(
            &app,
            label.as_str(),
            tauri::WebviewUrl::External(url),
        )
        .title(&account.name)
        .inner_size(1100.0, 800.0)
        .data_directory(profile);

        if let Some(proxy) = parse_proxy(&account.proxy)? {
            builder = builder.proxy_url(proxy);
        }

        builder.build().map_err(|e| e.to_string())?;

        Ok(json!({
            "id": id,
            "label": label,
            "opened": true,
            "created": true
        }))
    })
}

/// 对应前端“移除账号”：关闭对应窗口并删除本地账号记录。
#[tauri::command]
pub async fn remove_account(
    state: tauri::State<'_, crate::api::AppState>,
    app: tauri::AppHandle,
    payload: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let payload = payload.unwrap_or(serde_json::Value::Null);
    let _ = state;
    let id = payload_account_id(&payload)?;

    with_account_store(|store| {
        store.find(&id)?;

        let label = format!("acct-{id}");
        if let Some(window) = app.get_webview_window(&label) {
            window.destroy().map_err(|e| e.to_string())?;
        }

        let accounts = store
            .accounts
            .iter()
            .filter(|account| account.id != id)
            .cloned()
            .collect();

        store.commit(accounts)?;

        // WebView2 可能仍占用数据目录；此命令仅移除记录，保留 profiles 下的登录资料。
        Ok(json!({
            "id": id,
            "removed": true
        }))
    })
}

/// 对应前端“重命名账号”：保存新名称并更新已打开窗口的标题。
#[tauri::command]
pub async fn rename_account(
    state: tauri::State<'_, crate::api::AppState>,
    app: tauri::AppHandle,
    payload: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let payload = payload.unwrap_or(serde_json::Value::Null);
    let _ = state;
    let id = payload_account_id(&payload)?;

    let requested_name = payload.get("name").and_then(|v| v.as_str()).map(str::trim);

    with_account_store(|store| {
        let previous = store.find(&id)?;
        let name = requested_name.unwrap_or(previous.name.as_str());

        if name.is_empty() {
            return Err("账号名称不能为空".into());
        }

        let mut updated = previous.clone();
        updated.name = name.to_owned();

        let mut accounts = store.accounts.clone();
        let target = accounts
            .iter_mut()
            .find(|account| account.id == id)
            .ok_or_else(|| format!("账号不存在：{id}"))?;
        *target = updated.clone();

        let window = app.get_webview_window(&format!("acct-{id}"));
        if let Some(window) = window.as_ref() {
            window.set_title(&updated.name).map_err(|e| e.to_string())?;
        }

        if let Err(save_error) = store.commit(accounts) {
            if let Some(window) = window.as_ref() {
                if let Err(restore_error) = window.set_title(&previous.name) {
                    return Err(format!("{save_error}；恢复窗口标题失败：{restore_error}"));
                }
            }
            return Err(save_error);
        }

        Ok(json!(updated))
    })
}

/// 对应前端“获取账号列表”：返回本地缓存中的全部账号资料。
#[tauri::command]
pub async fn list_accounts(
    state: tauri::State<'_, crate::api::AppState>,
    payload: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let payload = payload.unwrap_or(serde_json::Value::Null);
    let _ = (state, payload);
    with_account_store(|store| Ok(json!(store.accounts)))
}

/// 对应前端“获取账号标签页列表”：返回全部账号、窗口 label、标题及打开状态。
#[tauri::command]
pub async fn list_account_tabs(
    state: tauri::State<'_, crate::api::AppState>,
    app: tauri::AppHandle,
    payload: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let payload = payload.unwrap_or(serde_json::Value::Null);
    let _ = (state, payload);

    with_account_store(|store| {
        let windows = app.webview_windows();
        let mut tabs = Vec::with_capacity(store.accounts.len());

        for account in &store.accounts {
            let label = format!("acct-{}", account.id);
            let window = windows.get(&label);
            let title = match window {
                Some(window) => window.title().map_err(|e| e.to_string())?,
                None => account.name.clone(),
            };

            tabs.push(json!({
                "id": account.id,
                "name": account.name,
                "color": account.color,
                "proxy": account.proxy,
                "notifications": account.notifications,
                "created_at": account.created_at,
                "label": label,
                "title": title,
                "is_open": window.is_some()
            }));
        }

        Ok(json!(tabs))
    })
}

/// 对应前端“获取已打开账号标签页”：枚举当前所有 acct-* 窗口并返回 label 与标题。
#[tauri::command]
pub async fn list_open_account_tabs(
    state: tauri::State<'_, crate::api::AppState>,
    app: tauri::AppHandle,
    payload: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let payload = payload.unwrap_or(serde_json::Value::Null);
    let _ = (state, payload);

    let mut windows: Vec<_> = app
        .webview_windows()
        .into_iter()
        .filter(|(label, _)| label.starts_with("acct-"))
        .collect();

    windows.sort_by(|left, right| left.0.cmp(&right.0));

    let mut tabs = Vec::with_capacity(windows.len());
    for (label, window) in windows {
        let title = window.title().map_err(|e| e.to_string())?;
        tabs.push(json!({
            "label": label,
            "title": title
        }));
    }

    Ok(json!(tabs))
}

/// 对应前端“打开账号设置”：聚焦主窗口并发送 open-accounts-settings 事件。
#[tauri::command]
pub async fn open_accounts_settings(
    state: tauri::State<'_, crate::api::AppState>,
    app: tauri::AppHandle,
    payload: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let payload = payload.unwrap_or(serde_json::Value::Null);
    let _ = state;

    let id = payload
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim();

    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "主窗口不存在".to_string())?;

    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    window
        .emit("open-accounts-settings", json!({ "id": id }))
        .map_err(|e| e.to_string())?;

    Ok(json!({ "ok": true }))
}

/// 对应前端“切换账号”：仅聚焦指定账号窗口。
#[tauri::command]
pub async fn switch_account(
    state: tauri::State<'_, crate::api::AppState>,
    app: tauri::AppHandle,
    payload: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let payload = payload.unwrap_or(serde_json::Value::Null);
    let _ = state;
    let id = payload_account_id(&payload)?;
    let label = format!("acct-{id}");

    let window = app
        .get_webview_window(&label)
        .ok_or_else(|| format!("账号窗口尚未打开：{id}"))?;

    window.set_focus().map_err(|e| e.to_string())?;

    Ok(json!({
        "id": id,
        "label": label,
        "focused": true
    }))
}
