# -*- coding: utf-8 -*-
"""按资源路径锚点切片：WATransChat 的资源在 .rdata 里是「路径 + 头部 + 明文内容」顺序排列。"""
import json
import os
import re

EXE = r"C:\Users\Administrator\AppData\Local\WATransChat\watranschat.exe"
ROOT = r"C:\Users\Administrator\Documents\deepseek-harness\default-workspace\wats_oss"

data = open(EXE, "rb").read()
region_start, region_end = 0x6B0000, 0x8BC000
region = data[region_start:region_end]

PAT = re.compile(
    rb"(?<![A-Za-z0-9_./\-])(/?(?:[A-Za-z0-9_\-.]+/)*[A-Za-z0-9_\-.]+"
    rb"\.(?:js|css|html|json|png|svg|ico|woff2|ttf))(?![A-Za-z0-9_./\-])"
)

anchors = []
for m in PAT.finditer(region):
    path = m.group(1).decode("latin1")
    if len(path) > 80 or any(len(s) > 40 for s in path.split("/")):
        continue
    anchors.append((region_start + m.start(), region_start + m.end(), path))

# 同路径只留第一次出现
uniq, seen = [], set()
for a in anchors:
    key = a[2] if a[2].startswith("/") else "/" + a[2]
    if key in seen:
        continue
    seen.add(key)
    uniq.append((a[0], a[1], key))

uniq.sort()
print("锚点:", len(uniq))

TEXT = {".js", ".css", ".html", ".json", ".svg"}
CLEAN_TAIL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]+[^\n]{0,400}$", re.S)

os.makedirs(ROOT, exist_ok=True)
manifest = []
for i, (s, e, path) in enumerate(uniq):
    nxt = uniq[i + 1][0] if i + 1 < len(uniq) else region_end
    blob = data[e:nxt]
    ext = os.path.splitext(path)[1].lower()
    if ext in TEXT:
        text = blob.decode("utf-8", "ignore")
        # 去掉二进制尾巴：从最后一个「像代码」的字符处截断
        cut = len(text)
        for m in re.finditer(r"[\x00-\x08\x0b\x0c\x0e-\x1f\ufffd]", text):
            if m.start() > 64:
                cut = m.start()
                break
        text = text[:cut].rstrip("\x00 ")
        if len(text.strip()) < 40:
            continue
        payload = text.encode("utf-8")
    else:
        continue  # 图片等二进制本次先跳过

    rel = path.lstrip("/")
    dst = os.path.join(ROOT, "frontend", rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, "wb") as f:
        f.write(payload)
    manifest.append({"path": path, "file": rel, "bytes": len(payload), "offset": hex(s)})

json.dump(manifest, open(os.path.join(ROOT, "docs", "assets.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=2)
print("落盘:", len(manifest), "个，共 %.1f KB" % (sum(m["bytes"] for m in manifest) / 1024))
for m in sorted(manifest, key=lambda x: -x["bytes"])[:30]:
    print("  %-40s %8.1f KB" % (m["file"], m["bytes"] / 1024))
