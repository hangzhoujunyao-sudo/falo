# frontend（已恢复）

这里的文件是从 `falo.exe` 的 `.rdata` 里把 **brotli 流**逐条解出来的，
不是手写、也不是占位页。

## 怎么解出来的（关键点）

1. 资源在 `.rdata` 里按「明文路径 + brotli 流」记录排列，例如
   `/main.js` @`0x85B88F`、`/style.css` @`0x853DA5`、`/index.html` @`0x8B4038`。
2. **不能** 用 `brotli.decompress(整个缓冲区)`：尾随字节会让解码器直接 `decoder failed`。
   必须按记录边界切：长度 = 下一条记录起点 − 本记录起点，再在 ±96 字节里微调，
   直到整段恰好解压成功（`tools/extract_by_anchor.py`）。
3. 路径末字节偶尔会被当成路径字符（`/main.js[` 里的 `[` = `0x5B` 其实是流首字节），
   所以起点要在 `path_end-2 … +2` 里试。
4. PNG 这类二进制资源用同样的流，只是接受条件换成 `\x89PNG` 魔数（`tools/pass3.py`）。

## 恢复清单（26 个文件，2.78 MB）

| 文件 | 大小 | 内容 |
|---|---|---|
| `index.html` | 67 KB | 设置主界面（`data-i18n` 全量键、titlebar 拖拽区） |
| `main.js` | 128 KB | 设置页逻辑，65 处 `invoke()` |
| `style.css` | 52 KB | 主界面样式（Inter 字体栈、light/dark 变量） |
| `login.html/js/css` | 48 KB | 登录 / 会员页 |
| `tabs.html/js` | 33 KB | 账号标签页 |
| `lock.js/css` | 13 KB | 应用锁 |
| `confirm.js` / `hotkey.js` / `update-dialog.*` | 20 KB | 对话框、快捷键、更新提示 |
| `i18n.js` + `country-dial-codes.json` | 78 KB | 多语言运行时 + 国家区号 |
| `falo-lang-list.js` / `falo-engine-list.js` | 33 KB | 语言表 / 引擎表 |
| `Tq_contacts-backup.js` / `settings-backup.js` | 34 KB | 通讯录备份 / 设置备份 |
| `content.js` | 278 KB | 注入到 WhatsApp Web 的主脚本（与 `../content-scripts/` 同源） |
| `vendor_xlsx.full.min.js` | 861 KB | SheetJS（表格导入导出） |
| `app-icon.svg` / `app-icon.png` / `titlebar-icon.png` | 1.1 MB | 图标 |

`manifest.json` 记录每个文件的字节数。

## 还差什么

- `d/lock.html`（应用锁的内嵌页）没有独立记录，逻辑应在 `lock.js` 里内联生成。
- 原版 `tauri.conf.json` 的 CSP / capabilities 没恢复，重建时按 Tauri 2 默认值给。
- 这些文件里的 `invoke("…")` 就是 `../backend/` 要实现的命令面，二者可对照。
