# -*- coding: utf-8 -*-
"""补齐前端实际调用的 49 条命令（前端 invoke() 名单见 docs/commands-missing.json）。"""
import concurrent.futures as cf
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "gpt_breaker"))
import client  # noqa: E402

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "src")
MODEL = "gpt-6.1-sol"

COMMON = """为 WATransChat（Tauri 2 + WebView2）写 Rust 命令实现。

硬性要求：
- 只输出一个 ```rust 代码块，不要解释。
- 每个命令：`#[tauri::command] pub async fn <name>(state: tauri::State<'_, crate::api::AppState>, app: tauri::AppHandle, payload: serde_json::Value) -> Result<serde_json::Value, String>`；
  不需要 app 时可省略 `app` 参数。
- 允许用：`state.api.get_json(path)` / `state.api.post_json(path, body)`、`app.get_webview_window("main")`、
  `window.emit("event", value)`、`serde_json::json!`、`std::{fs, path::PathBuf, sync::Mutex}`、`tokio::time`。
- 不要 unwrap/expect/panic/todo!；错误用 `Err("...".into())` 或 `map_err(|e| e.to_string())?`。
- 每个命令上方写一行 `///` 说明它对应前端的哪个动作。
- 读参数一律 `payload.get("k").and_then(|v| v.as_str())` 之类，缺省给默认值。
"""

GROUPS = {
    "accounts.rs": """实现账号相关命令（浏览器密码库里没有，用本地 JSON 文件 + 内存缓存即可）：
add_account, close_account, open_account, remove_account, rename_account,
list_accounts, list_account_tabs, list_open_account_tabs, open_accounts_settings, switch_account。
账号结构 `{ id, name, color, proxy, notifications, created_at }`，存 `%APPDATA%/WATransChat/accounts.json`；
open_account 用 `tauri::WebviewWindowBuilder` 新建窗口（label = `acct-<id>`，url = https://web.whatsapp.com/）；
list_open_account_tabs 返回当前所有 `acct-*` 窗口的 label 与标题；switch_account 只做 set_focus。
""",
    "lock.rs": """实现应用锁相关命令（本地文件存 salt+hash，用简单 SHA-256 十六进制即可）：
change_app_lock_password, disable_app_lock, get_lock_status, lock_app, reset_app_lock,
set_app_lock_options, set_app_lock_password, set_biometric_enabled, unlock_biometric, unlock_password。
状态存 `%APPDATA%/WATransChat/lock.json`：{ enabled, hash, salt, biometric, options:{timeout_secs, on_minimize} }；
unlock_password 校验失败要返回 `Err("bad_password")`；get_lock_status 返回 `{ enabled, locked, biometric, timeout_secs }`；
lock_app 触发窗口 `emit("app-locked", true)`。
""",
    "settings_cmds.rs": """实现设置与更新相关命令：
get_settings, set_settings, check_for_update, update_close, update_download_and_install,
update_resize, update_snooze, check_proxy, get_theme, get_always_on_top, toggle_always_on_top,
get_productivity_status, set_focus_mode, set_account_notifications, set_account_proxy,
get_account_fingerprint, contacts_backup_call, dlog, test_notification, quality_translate_test。
设置文件 `%APPDATA%/WATransChat/settings.json`，结构自由但要含 { theme, always_on_top, focus_mode, engine, source_lang, target_lang }；
check_for_update 打 `state.api.get_json("/v1/update?channel=windows&version=2.6.5")`，返回 `{ has_update, version, notes, url }`；
get_account_fingerprint 用 `std::process::Command` 调 `wmic csproduct get uuid` 失败则回退读取 `MachineGuid`；
contacts_backup_call 把 payload 透传给 `state.api.post_json("/v1/contacts/backup", payload)`；
dlog 写一行到 `%TEMP%/watranschat.log`；test_notification 用 `app.notification().builder()`。
""",
    "membership_extra.rs": """实现会员相关命令（补齐原表里缺的）：
membership_login, membership_logout, membership_status, membership_open_pay,
membership_devices_by_challenge, membership_logout_device, membership_logout_device_by_challenge,
membership_apply_seat_pick, seat_pick_status。
统一走 `state.api`：`/v1/membership/login`、`/v1/membership/status`、`/v1/membership/devices`、`/v1/membership/pay`、
`/v1/membership/seat/pick`；返回结构 `{ ok, plan, expires_at, seats, devices:[{id,name,last_seen}] }`；
membership_open_pay 把 `pay_url` 交给 `tauri_plugin_opener` 打开。
""",
}


def code_of(text: str) -> str:
    m = re.search(r"```(?:rust)?\s*(.*?)```", text, re.S)
    return (m.group(1) if m else text).strip()


def gen(name, brief):
    r = client.chat([{"role": "user", "content": COMMON + "\n\n任务：\n" + brief}],
                    model=MODEL, max_tokens=3600, temperature=0.3)
    if not r["ok"]:
        return name, None, r["error"][:160]
    return name, code_of(r["text"]), None


if __name__ == "__main__":
    out = {}
    with cf.ThreadPoolExecutor(max_workers=4) as ex:
        for name, code, err in ex.map(lambda kv: gen(*kv), GROUPS.items()):
            if err:
                print("  [%s] 失败 %s" % (name, err))
                continue
            out[name] = code
            print("  [%s] %d 行" % (name, code.count("\n") + 1))
    for name, code in out.items():
        open(os.path.join(SRC, name), "w", encoding="utf-8", newline="\n").write(code + "\n")
