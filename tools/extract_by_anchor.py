# -*- coding: utf-8 -*-
"""按「记录锚点 + 精确长度」解 brotli：长度用下一条记录的起点反推，
再在 ±64 字节内微调，直到整段恰好解压成功。

这样既不会把尾随字节喂进解码器（会 decoder failed），也不会拿到半截流。
"""
import brotli
import hashlib
import json
import os
import re

EXE = r"C:\Users\Administrator\AppData\Local\WATransChat\watranschat.exe"
OUT = r"C:\Users\Administrator\Documents\deepseek-harness\default-workspace\wats_oss\frontend"
data = open(EXE, "rb").read()

PAT = re.compile(
    rb"(?<![A-Za-z0-9_./\-])(/?(?:[A-Za-z0-9_\-.]+/)*[A-Za-z0-9_\-.]+"
    rb"\.(?:js|css|html|json|png|svg|ico|woff2|ttf))(?![A-Za-z0-9_./\-])"
)
anchors = []
for m in PAT.finditer(data, 0x7B0000, 0x8BC000):
    p = m.group(1).decode("latin1")
    if len(p) > 80 or any(len(s) > 40 for s in p.split("/")):
        continue
    key = p if p.startswith("/") else "/" + p
    anchors.append((m.start(), m.end(), key))

uniq, seen = [], set()
for a in anchors:
    if a[2] in seen:
        continue
    seen.add(a[2])
    uniq.append(a)
uniq.sort()
print("锚点:", len(uniq))

MARK = ("<!doctype html", "<!DOCTYPE html", "<svg", "<?xml", "/*", "//", ":root",
        "@charset", "function", '"use strict"', "const ", "import ", "self.", "(() =>")


def try_decode(s, length):
    if length < 16:
        return None
    try:
        return brotli.decompress(data[s:s + length])
    except Exception:
        return None


os.makedirs(OUT, exist_ok=True)
got = []
for i, (s0, e0, path) in enumerate(uniq):
    nxt = uniq[i + 1][0] if i + 1 < len(uniq) else 0x8BC000
    best = None
    for start in (e0, e0 - 1, e0 + 1, e0 - 2, e0 + 2):
        for delta in range(0, 96):
            L = (nxt - start) - delta
            blob = try_decode(start, L)
            if not blob or len(blob) < 120:
                continue
            try:
                text = blob.decode("utf-8")
            except UnicodeDecodeError:
                continue
            if not text.lstrip().startswith(MARK):
                continue
            best = (start, L, blob, text)
            break
        if best:
            break
    if not best:
        continue
    start, L, blob, text = best
    name = path.lstrip("/").replace("/", "_")
    dst = os.path.join(OUT, name)
    open(dst, "wb").write(blob)
    got.append({"path": path, "offset": hex(start), "compressed": L, "bytes": len(blob),
                "head": text[:60].replace("\n", " ")})
    print("  %-26s %7.1f KB (compressed %6d)  %s" % (path, len(blob) / 1024, L,
                                                     text[:44].replace("\n", " ")))

json.dump(got, open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=2)
print("\n成功 %d / %d，合计 %.1f KB" % (len(got), len(uniq), sum(g["bytes"] for g in got) / 1024))
