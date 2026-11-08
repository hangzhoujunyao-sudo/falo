# -*- coding: utf-8 -*-
"""补齐剩余资源（含 PNG）并扫描尾段找无锚点的流。"""
import brotli
import json
import os
import re

EXE = r"C:\Users\Administrator\AppData\Local\WATransChat\watranschat.exe"
OUT = r"C:\Users\Administrator\Documents\deepseek-harness\default-workspace\wats_oss\frontend"
data = open(EXE, "rb").read()


def stream(s, cap=9 * 1024 * 1024):
    dec = brotli.Decompressor()
    out = bytearray()
    pos = s
    while pos < 0x8BC000:
        chunk = data[pos:pos + 1024]
        try:
            out += dec.process(chunk)
        except Exception:
            break
        pos += len(chunk)
        if dec.is_finished():
            return bytes(out)
        if len(out) > cap:
            return None
    return bytes(out) if len(out) > 100 else None


def acceptable(b: bytes) -> bool:
    if not b or len(b) < 100:
        return False
    if b[:4] == b"\x89PNG":
        return True
    head = b[:16].lstrip()
    for sig in (b"<!doct", b"<html", b"<svg", b"<?xml", b"//", b"/*", b"const ", b"function",
                b"import ", b"self.", b"(() =>", b":root", b"@charset", b"{", b"["):
        if head.startswith(sig):
            return True
    return False


PAT = re.compile(
    rb"(?<![A-Za-z0-9_./\-])(/?(?:[A-Za-z0-9_\-.]+/)*[A-Za-z0-9_\-.]+\.(?:png|ico|js|css|html|json|svg))"
    rb"(?![A-Za-z0-9_./\-])"
)
have = {x["path"] for x in json.load(open(os.path.join(OUT, "manifest.json"), encoding="utf-8"))}
add = []
for m in PAT.finditer(data, 0x7B0000, 0x8BC000):
    p = m.group(1).decode("latin1")
    key = p if p.startswith("/") else "/" + p
    if key in have or len(p) > 80 or any(len(s) > 40 for s in p.split("/")):
        continue
    for s in range(max(0, m.end() - 6), m.end() + 96):
        b = stream(s)
        if not acceptable(b):
            continue
        name = key.lstrip("/").replace("/", "_")
        open(os.path.join(OUT, name), "wb").write(b)
        add.append((key, len(b), s))
        have.add(key)
        break

for k, n, s in add:
    print("  补 %-24s %7.1f KB @0x%X" % (k, n / 1024, s))

extra = 0
CAND = {0x1b, 0x5b, 0x8b, 0x9b, 0xcb, 0xdb, 0x0b, 0x4b, 0x2b, 0x6b, 0xab, 0xeb}
for off in range(0x8B0000, 0x8BC000):
    if data[off] not in CAND:
        continue
    b = stream(off)
    if not b or len(b) < 500:
        continue
    head = b[:120]
    is_html = b"<!doctype" in head.lower() or b"<html" in head.lower()
    is_js = head.startswith(b"//") or head.startswith(b"/*") or head.startswith(b"const") or head.startswith(b"function")
    if not (is_html or is_js):
        continue
    name = ("tail_%X.html" % off) if is_html else ("tail_%X.js" % off)
    p = os.path.join(OUT, name)
    if os.path.exists(p):
        continue
    open(p, "wb").write(b)
    print("  尾段 %-18s %7.1f KB @0x%X  %s" % (name, len(b) / 1024, off,
                                               head[:44].decode("utf-8", "ignore").replace("\n", " ")))
    extra += 1

print("锚点补充 %d，尾段 %d" % (len(add), extra))
