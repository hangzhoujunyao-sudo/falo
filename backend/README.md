# backend —— Tauri 2 (Rust) 重建

## 一句话

前端实际调用 **65 条命令**，这里 **74 条全部实现**（多出的 9 条来自二进制命令表恢复、当前版本前端未调用）；
语法层已用 `rustfmt` 全量校验，前后端命令面对齐由 `tools/diff_commands.py` 检查，**缺口 0**。

## 代码怎么来的

1. **命令面**：从恢复出来的前端 JS 里正则 `invoke("…")` 抽名字（65 条，可验证），
   再用 `.rdata` 命令表补上 9 条；
2. **实现**：按前缀分成 8 组，用中转站（`gpt-6.1-sol`）**并发**生成，每组只收一个 ```rust 代码块；
3. **拼装**：`wire.py` 扫每个 `#[tauri::command]` 自动重写 `main.rs` 的 `generate_handler!`，
   避免手抄漏条。

## 模块

| 文件 | 行数 | 命令数 | 内容 |
|---|---|---|---|
| `api.rs` | 184 | — | `ApiClient`（15s 超时 / UA / 错误截断 200 字）+ `AppState` |
| `accounts.rs` | 549 | 10 | 账号增删改查、多开窗口、标签列表、切换 |
| `lock.rs` | 630 | 10 | 应用锁：设/改/重置密码、生物识别、状态、锁定事件 |
| `settings_cmds.rs` | 1144 | 20 | 设置读写、更新检查/下载、代理、主题、置顶、专注模式、指纹、日志、通知 |
| `membership.rs` | 412 | 7 | auth / list_plans / register / renew / logout_others / list_devices / set_api_base |
| `membership_extra.rs` | 341 | 9 | login / logout / status / open_pay / devices_by_challenge / seat_pick … |
| `translate.rs` | 522 | 6 | translate_text / quality_translate / translate_test / probe_engine_latency / inline_button / fx_rates |
| `phrases.rs` | 253 | 4 | 常用短语、跟进待办 pull/push（离线缓存） |
| `desktop.rs` | 364 | 8 | 未读角标、昵称、外链、通知、设置页、切 tab、图标、临时目录 |
| `main.rs` | — | 74 | 入口 + `generate_handler!` + `desktop::init` |

合计约 **4.4k 行**。

## 校验流水线

```powershell
python wire.py                      # 扫命令 → 重写 main.rs
rustfmt --edition 2021 src/*.rs     # 语法体检（全部 OK）
python ..\tools\diff_commands.py    # 前端 invoke 名单 ↔ 后端实现（缺口 0）
cargo check                          # 类型检查（需链接器）
```

## 编译状态

- `rustfmt`：10 个文件全部通过，已统一格式化。
- `cargo check`（GNU 工具链 + MinGW）：**通过，0 error 0 warning**。
- `cargo build`：**通过**，产出 `target/debug/watranschat-oss.exe`（288 MB，debug），
  启动后能渲染恢复出来的设置界面（见仓库根 `frontend_running.png`）。
- 需要 `windres`：把 winlibs 的 `mingw64\bin` 加进 PATH 即可（tauri-winres 会调用）。

  ```powershell
  winget install -e --id BrechtSanders.WinLibs.POSIX.UCRT
  rustup toolchain install stable-x86_64-pc-windows-gnu --profile minimal
  $env:PATH = "$env:USERPROFILE\.cargo\bin;<winlibs>\mingw64\bin;$env:PATH"
  cd backend && cargo +stable-x86_64-pc-windows-gnu check
  ```

## 已知与原始实现的差异

- 远端**路径**是约定值（`/v1/membership/*`、`/v1/phrases`），原始闭源客户端用的路径没恢复，
  对接真实服务时要按抓包改常量；
- 存储位置统一放 `%APPDATA%/WATransChat/*.json`，原版用的可能是 SQLite；
- 会员/应用锁的**加密细节**是重建版（SHA-256 十六进制），不是原版算法。
