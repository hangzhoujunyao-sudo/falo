# -*- coding: utf-8 -*-
"""真正的资产提取：.rdata 里每个资源都是一条 **brotli 流**，从头解就行。

关键教训：
- 不能用 brotli.decompress(整个缓冲区)：尾随字节会让它报 decoder failed。
  必须用 Decompressor 流式喂，`is_finished()` 为准。
- 路径末字节 adjacent 到流首字节，偶尔会被当成路径字符（'[' = 0x5B）吞掉，
  所以起点要在 path_end-1..+2 里试。
"""
import brotli
import hashlib
import json
import os
import re

EXE = r"C:\Users\Administrator\AppData\Local\WATransChat\watranschat.exe"
OUT = r"C:\Users\Administrator\Documents\deepseek-harness\default-workspace\wats_oss\frontend"
data = open(EXE, "rb").read()
START, END = 0x7B0000, 0x8BC000

# brotli 首字节候选（窗口位编码）
CANDS = {0x1b, 0x5b, 0x8b, 0x9b, 0xcb, 0xdb, 0x0b, 0x4b, 0x2b, 0x6b, 0xab, 0xeb}


def decompress_at(off, cap=16 * 1024 * 1024):
    dec = brotli.Decompressor()
    out = bytearray()
    pos = off
    while pos < END:
        chunk = data[pos:pos + 4096]          # 小块喂，避免把尾随字节当输入
        if not chunk:
            break
        try:
            out += dec.process(chunk)
        except Exception:
            # 结束时再喂会报错；已有产出就接受
            return bytes(out) if len(out) > 100 else None
        pos += len(chunk)
        if dec.is_finished():
            return bytes(out)
        if len(out) > cap:
            return None
    return None


def textish(b):
    if not b:
        return False
    head = b[:400]
    ok = sum(1 for x in head if 9 <= x <= 13 or 32 <= x < 127 or x >= 0x80)
    return ok / len(head) > 0.9


def name_for(blob, off):
    head = blob[:400].decode("utf-8", "ignore")
    if head.lstrip().lower().startswith("<!doctype html") or head.lstrip().lower().startswith("<html"):
        title = re.search(r"<title>([^<]{0,60})", head)
        t = title.group(1) if title else ""
        if "登录" in t or "login" in t.lower():
            return "login.html"
        if "标签" in t or "tab" in t.lower():
            return "tabs.html"
        if "锁" in t or "lock" in t.lower():
            return "lock.html"
        return "index.html" if off > 0x8B0000 else "page_%X.html" % off
    if head.lstrip().startswith("<?xml") or head.lstrip().startswith("<svg"):
        return "icon_%X.svg" % off
    if "SheetJS" in head:
        return "vendor/xlsx.full.min.js"
    if re.match(r"\s*:root\s*\{|\s*/\*", head) and "{" in head[:200]:
        return "style_%X.css" % off
    if "function" in head or "const " in head or "=>" in head:
        return "script_%X.js" % off
    return "asset_%X.txt" % off


os.makedirs(OUT, exist_ok=True)
found, seen = [], set()
for off in range(START, END):
    if data[off] not in CANDS:
        continue
    blob = decompress_at(off)
    if not blob or len(blob) < 200:
        continue
    h = hashlib.sha1(blob).hexdigest()
    if h in seen:
        continue
    if not (textish(blob) or blob[:4] == b"\x89PNG"):
        continue
    seen.add(h)
    name = name_for(blob, off)
    dst = os.path.join(OUT, name)
    n = 1
    base, ext = os.path.splitext(dst)
    while os.path.exists(dst):
        n += 1
        dst = "%s_%d%s" % (base, n, ext)
    open(dst, "wb").write(blob)
    found.append({"offset": hex(off), "file": os.path.relpath(dst, OUT), "bytes": len(blob)})
    print("  0x%06X -> %-34s %8.1f KB" % (off, os.path.relpath(dst, OUT), len(blob) / 1024))

json.dump(found, open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=2)
total = sum(f["bytes"] for f in found)
print("\n共 %d 个资源，%.1f KB" % (len(found), total / 1024))
