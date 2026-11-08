# -*- coding: utf-8 -*-
"""Tauri 命令名是**无分隔拼接**的（membership_authmembership_list_plans...），
用词表做最长匹配切分，得到干净的命令面。"""
import json
import re

EXE = r"C:\Users\Administrator\AppData\Local\WATransChat\watranschat.exe"
data = open(EXE, "rb").read()
blob = data[0x572A00:0x574200].decode("latin1")

# 只保留 snake_case 字符，切成候选流
stream = re.sub(r"[^a-z0-9_]", " ", blob)
vocab = """
membership auth login logout register unregister list plans plan devices device delete revoke
set get update refresh check verify activate deactivate renew cancel order pay payment invoice
api base url key token secret server endpoint switch reset save load sync pull push upload
common phrases phrase favorite favorites history recent cache clear
translate text test engine engines quality latency probe benchmark detect languages lang
source target auto detect swap speak voice stt tts record audio mic
seat seats pick pending use in out release hold expire expiry subscription end date status
open external link browser folder file path dir temp icon template tray menu sort background
color theme dark light window close minimize hide show toggle top always on top
unread count badge profile name avatar status note remark quick contacts backup restore
notification notifications click action permission request check version update dialog
shortcut hotkey bind unbind keyboard close current minute
whatsapp webview account tab tabs lang list settings options general advanced about
""".split()
vocab = sorted(set(w for w in vocab if w), key=len, reverse=True)

def segment(chunk):
    out, i = [], 0
    while i < len(chunk):
        if chunk[i] == "_":
            i += 1
            continue
        for w in vocab:
            if chunk.startswith(w, i):
                out.append(w)
                i += len(w)
                break
        else:
            # 吃掉不认识的片段到下一个下划线
            j = chunk.find("_", i)
            if j < 0:
                break
            out.append(chunk[i:j])
            i = j
    return out

names, seen = [], set()
for chunk in stream.split():
    if "_" not in chunk or len(chunk) < 5:
        continue
    parts = segment(chunk)
    if len(parts) < 2:
        continue
    # 滑动组合出 2~4 词的名字
    for n in (2, 3, 4):
        for i in range(len(parts) - n + 1):
            name = "_".join(parts[i:i + n])
            if len(name) < 6 or name in seen:
                continue
            seen.add(name)
            names.append(name)

# 过滤明显噪声
NOISE = ("needle", "m128", "m256", "bytes", "sizeof", "alignof", "core_", "_test_")
clean = [n for n in names if not any(x in n for x in NOISE)]

OUT = r"C:\Users\Administrator\Documents\deepseek-harness\default-workspace\wats_oss\docs\commands-clean.json"
json.dump(clean, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("候选命令：", len(clean))
for n in clean[:80]:
    print("  ", n)
