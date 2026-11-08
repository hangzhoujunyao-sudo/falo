# -*- coding: utf-8 -*-
"""用中转站并发生成 WATransChat 的 Rust 后端（Tauri 2）。

5 个分组并行请求，各自只输出一个 ```rust 代码块；回来后再做静态检查与拼装。
"""
import concurrent.futures as cf
import json
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "gpt_breaker"))
import client  # noqa: E402

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
MODEL = "gpt-6.1-sol"

COMMON = """你是 Rust + Tauri 2 后端工程师。为「WATransChat」（WhatsApp Web 翻译插件）写可编译的 Rust 代码。

硬性要求：
- 只输出一个 ```rust 代码块，不要解释、不要寒暄、不要目录。
- 目标 tauri 2.x；命令一律 `#[tauri::command] pub async fn name(state: tauri::State<'_, AppState>, payload: serde_json::Value) -> Result<serde_json::Value, String>`。
- `AppState`、`ApiClient`（reqwest）定义在 `crate::api`，你可以直接用：`state.api.get_json(path).await`、`state.api.post_json(path, body).await`。
- 不要 unwrap/expect；错误统一 `map_err(|e| e.to_string())?`。
- 每个命令都要写 `///` 一行说明它对接的前端动作，再用 `serde_json::json!` 返回结构化结果。
- 缺字段就用 `payload.get("x").and_then(|v| v.as_str())` 读取并给默认值。
- 代码里不要出现 TODO 注释堆砌；能实现多少实现多少，落不到的用 `Err("upstream: <reason>".into())`。

已知接口（来自闭源客户端的字符串恢复，只作参考）：
- 会员：membership_auth / membership_list_plans / membership_register / membership_renew /
  membership_logout_others / membership_list_devices / membership_set_api_base
- 翻译：translate_text / quality_translate / translate_test / probe_engine_latency /
  fetch_inline_button_config / fetch_fx_rates
- 短语：common_phrases_pull / common_phrases_push / followup_todos_pull / followup_todos_push
- 桌面：set_unread_count / set_profile_name / open_external_url / notify / open_settings /
  cycle_account_tab / set_icon_as_template / set_temp_dir_path
- 远端域名：translate.yandex.net、open.er-api.com、cdn.jsdelivr.net（currency-api）
"""

GROUPS = {
    "membership.rs": """写 `membership.rs`，实现：
membership_auth、membership_list_plans、membership_register、membership_renew、
membership_logout_others、membership_list_devices、membership_set_api_base。
auth 里要处理 `device_id`、`license_key`，返回 `{ ok, plan, expires_at, seats }`；
list_plans 返回 `{ plans: [{id,name,price,period,features[]}] }`（上游没给就返回内置的三档示例）；
register 用 `email`+`code`；set_api_base 写入 state 并做 URL 校验（必须 http/https）。
""",
    "translate.rs": """写 `translate.rs`，实现：
translate_text、quality_translate、translate_test、probe_engine_latency、
fetch_inline_button_config、fetch_fx_rates。
translate_text 入参 `{ text, from, to, engine }`，返回 `{ translated, engine, ms }`；
engine 支持 `google_web|yandex|deepl|openai`，用 match 分发，HTTP 用 `crate::api::ApiClient`；
quality_translate 走二次润色（可用 engine=openai 的路径），返回 `{ translated, score }`；
probe_engine_latency 并发探活三个域名用 `Instant` 计时返回 `{ engine: ms }`；
fetch_fx_rates 打 open.er-api.com 的 latest/USD 并返回 `{ base, rates }`；
fetch_inline_button_config 返回内置按钮配置 `{ buttons: [{id,label,action}] }`。
""",
    "phrases.rs": """写 `phrases.rs`，实现：
common_phrases_pull、common_phrases_push、followup_todos_pull、followup_todos_push。
短语结构 `{ id, text, lang, tags[] }`，todo 结构 `{ id, text, due, done }`。
pull 从 `state.api` 取 `GET /v1/phrases` 与 `/v1/todos`，push 用 `POST`；
本地再用 `Mutex<Vec<Phrase>>` 做离线缓存，网络失败时返回缓存并带 `"cached": true`。
""",
    "desktop.rs": """写 `desktop.rs`，实现：
set_unread_count、set_profile_name、open_external_url、notify、open_settings、
cycle_account_tab、set_icon_as_template、set_temp_dir_path。
窗口相关用 `tauri::Window`（`app.get_webview_window("main")`），
set_unread_count 设置标题徽标 `[n] WATransChat`；notify 用 `window.emit("notification", payload)`；
open_external_url 只允许 http/https（解析后校验 scheme），用 `tauri_plugin_opener` 或 `std::process::Command` 二选一，
选 `Command` 时 Windows 用 `cmd /C start`；set_temp_dir_path 校验目录存在、可写。
""",
    "api.rs": """写 `api.rs`，提供：
`pub struct ApiClient { base: RwLock<String>, http: reqwest::Client }`，
方法 `new(default_base)`、`set_base(url) -> Result<(), String>`（校验 scheme/host）、
`get_json(path) -> Result<serde_json::Value, String>`、`post_json(path, body) -> Result<serde_json::Value, String>`，
带 15s 超时、`User-Agent: WATransChat-OSS/2.6.5`、错误里带上状态码与响应片段（截断 200 字符）。
`pub struct AppState { pub api: ApiClient }`，并在 `impl AppState { pub fn new() -> Self }`。
""",
}


def code_of(text: str) -> str:
    m = re.search(r"```(?:rust)?\s*(.*?)```", text, re.S)
    return (m.group(1) if m else text).strip()


def gen(name: str, brief: str):
    prompt = COMMON + "\n\n本次任务：\n" + brief
    r = client.chat([{"role": "user", "content": prompt}], model=MODEL, max_tokens=3200, temperature=0.3)
    if not r["ok"]:
        return name, None, r["error"][:200]
    code = code_of(r["text"])
    return name, code, None


def main():
    os.makedirs(SRC, exist_ok=True)
    results = {}
    with cf.ThreadPoolExecutor(max_workers=len(GROUPS)) as ex:
        futs = {ex.submit(gen, n, b): n for n, b in GROUPS.items()}
        for fut in cf.as_completed(futs):
            name, code, err = fut.result()
            if err:
                print("  [%s] 失败：%s" % (name, err))
                continue
            results[name] = code
            print("  [%s] %d 行" % (name, code.count("\n") + 1))

    for name, code in results.items():
        path = os.path.join(SRC, name)
        open(path, "w", encoding="utf-8", newline="\n").write(code + "\n")

    # 语法体检（粗略）：括号平衡 + 命令数量
    for name in sorted(results):
        code = results[name]
        bal = {c: code.count(c) for c in "{}()[]"}
        ok = bal["{"] == bal["}"] and bal["("] == bal[")"] and bal["["] == bal["]"]
        cmds = len(re.findall(r"#\[tauri::command\]", code))
        print("%-16s 括号平衡=%s 命令=%d 行=%d" % (name, ok, cmds, code.count("\n") + 1))

    json.dump({k: len(v) for k, v in results.items()},
              open(os.path.join(ROOT, "codegen.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
