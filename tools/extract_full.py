# -*- coding: utf-8 -*-
"""完整重解：按锚点定位 brotli 流，逐字节喂到 is_finished()，拿到**完整**资源。

之前用「遇到二进制就截断」的方式，导致 index.html 少了尾部（<script> 标签），
JS 根本没跑，所以界面是死的。
"""
import brotli
import json
import os
import re

EXE = r"C:\Users\Administrator\AppData\Local\WATransChat\watranschat.exe"
OUT = r"C:\Users\Administrator\Documents\deepseek-harness\default-workspace\falo\frontend_raw"
data = open(EXE, "rb").read()
START, END = 0x6B0000, 0x8BC000

PAT = re.compile(
    rb"(?<![A-Za-z0-9_./\-])(/?(?:[A-Za-z0-9_\-.]+/)*[A-Za-z0-9_\-.]+"
    rb"\.(?:js|css|html|json|png|svg|ico|woff2|ttf))(?![A-Za-z0-9_./\-])"
)
anchors = []
for m in PAT.finditer(data, START, END):
    p = m.group(1).decode("latin1")
    if len(p) > 80 or any(len(s) > 40 for s in p.split("/")):
        continue
    key = p if p.startswith("/") else "/" + p
    if key in [a[2] for a in anchors]:
        continue
    anchors.append((m.start(), m.end(), key))
anchors.sort()

TEXT = {".js", ".css", ".html", ".json", ".svg"}


def stream_full(off, cap=16 * 1024 * 1024):
    dec = brotli.Decompressor()
    out = bytearray()
    i = off
    while i < END:
        try:
            out += dec.process(data[i:i + 1])
        except Exception:
            return None
        i += 1
        if dec.is_finished():
            return bytes(out)
        if len(out) > cap:
            return None
    return None


os.makedirs(OUT, exist_ok=True)
written = []
for s0, e0, path in anchors:
    ext = os.path.splitext(path)[1].lower()
    for start in (e0, e0 - 1, e0 + 1):
        blob = stream_full(start)
        if not blob or len(blob) < 300:
            continue
        if ext in TEXT:
            try:
                blob.decode("utf-8")
            except UnicodeDecodeError:
                continue
        rel = path.lstrip("/").replace("/", "_")
        open(os.path.join(OUT, rel), "wb").write(blob)
        written.append((rel, len(blob)))
        print("  %-30s %8.1f KB" % (rel, len(blob) / 1024))
        break

json.dump(written, open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=2)
print("\n共 %d 个：%.1f KB" % (len(written), sum(n for _, n in written) / 1024))
