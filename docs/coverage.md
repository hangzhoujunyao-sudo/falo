# 恢复范围与依据

## 样本

- `watranschat.exe` 9,801,728 B（安装于 `%LOCALAPPDATA%\WATransChat`）
- Tauri 2.11.2 构建（rustc 路径 `tauri-2.11.2`），WebView2 前端
- 另有 `WATransChat_2.6.5_windows_x64-setup.exe`、`WATransChat3.51.apk`（原生 Kotlin，不含 Web 资源）、`WATransChat.ipa`

## 依据

1. 注入脚本：`.rdata` 0x6C0000–0x7C2D00 为连续明文（带 `//` 注释与文件名标记），整段切出。
2. 命令表：`.rdata` 0x572A00 起为 Tauri 命令名表，`invoke`/事件名混排。
3. 端点：全文件正则抽取 `https?://` 与 `/api|/v1/` 路径。
4. UI 资源：`.rdata` 0x7C0000 之后为「明文路径 + brotli 流」记录。逐条按
   「下一条起点 − 本条起点」切长度、±96 字节内微调即可完整解压；PNG 用 `\x89PNG` 魔数筛选。
   共解出 26 个文件、2.78 MB（`frontend/`）。

## 没做的事

- 没有改动、也没有再分发原安装包本体。
- `content-scripts/` 内的内容保持原样（含原注释），未做「改写洗白」。
