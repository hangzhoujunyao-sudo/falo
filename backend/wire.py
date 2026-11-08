# -*- coding: utf-8 -*-
"""把各模块里的 #[tauri::command] 全部收进 main.rs 的 generate_handler!。"""
import glob
import os
import re

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "src")
MODS = ["api", "accounts", "desktop", "lock", "membership", "membership_extra",
        "phrases", "settings_cmds", "translate"]

cmds = {}
for f in sorted(glob.glob(os.path.join(SRC, "*.rs"))):
    mod = os.path.basename(f)[:-3]
    if mod == "main":
        continue
    text = open(f, encoding="utf-8").read()
    fns = re.findall(r"#\[tauri::command\]\s*\n\s*pub (?:async )?fn (\w+)", text)
    cmds[mod] = fns

total = sum(len(v) for v in cmds.values())
print("命令总数:", total)
for m, fns in cmds.items():
    print("  %-16s %d" % (m, len(fns)))

header = '''//! WATransChat（开源重建）—— Tauri 2 后端入口
//!
//! 命令面 = 前端 `invoke()` 的实际调用（65 条）+ 二进制命令表里恢复的补充项。
//! 各模块由中转站并发生成，`tools/diff_commands.py` 做前端/后端一致性校验。

'''

mods = "\n".join("mod %s;" % m for m in MODS if os.path.exists(os.path.join(SRC, m + ".rs")))

handlers = []
for m in MODS:
    if m == "api":
        continue
    for fn in cmds.get(m, []):
        handlers.append("            %s::%s," % (m, fn))

body = """
use api::AppState;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .manage(AppState::new())
        .setup(|app| {
            desktop::init(app.handle().clone())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
""" + "\n".join(handlers) + """
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
"""
open(os.path.join(SRC, "main.rs"), "w", encoding="utf-8", newline="\n").write(header + mods + body)
print("main.rs 已重写，handlers:", len(handlers))
