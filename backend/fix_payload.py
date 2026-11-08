# -*- coding: utf-8 -*-
"""让所有命令的 payload 变成可选。

前端大量 `invoke("get_settings")` 不带参数，而生成的命令要求必填 payload →
Tauri 直接报 `missing required key payload`。改成 Option<Value> 并在函数体首行解包。
"""
import glob
import os
import re

SRC = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend", "src")
UNPACK = "    let payload = payload.unwrap_or(serde_json::Value::Null);\n"

changed = 0
for path in sorted(glob.glob(os.path.join(SRC, "*.rs"))):
    text = open(path, encoding="utf-8").read()
    orig = text

    # 1) 参数类型：payload: serde_json::Value / payload: Value → Option<...>
    text = re.sub(r"payload:\s*serde_json::Value", "payload: Option<serde_json::Value>", text)
    text = re.sub(r"payload:\s*Value\b", "payload: Option<Value>", text)

    # 2) 函数体首行解包（只处理带 #[tauri::command] 的函数）
    def fix(m):
        header = m.group(1)
        body_start = m.group(2)
        if "payload.unwrap_or(" in m.group(0):
            return m.group(0)
        return header + "{\n" + UNPACK + body_start

    text = re.sub(
        r"(#\[tauri::command\][^{;]*?fn\s+\w+\s*\([^)]*\)\s*->\s*[^{;]+)\{(\n?)",
        lambda m: m.group(1) + "{\n" + ("" if "payload.unwrap_or(" in m.group(0) else UNPACK),
        text,
        flags=re.S,
    )

    if text != orig:
        open(path, "w", encoding="utf-8", newline="\n").write(text)
        changed += 1
        print("  patched", os.path.basename(path))

print("修改文件:", changed)
