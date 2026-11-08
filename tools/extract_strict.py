import brotli, hashlib, json, os, re
EXE = r"C:\Users\Administrator\AppData\Local\WATransChat\watranschat.exe"
OUT = r"..\frontend"
data = open(EXE,"rb").read()
START, END = 0x7B0000, 0x8BC000
CANDS = {0x1b,0x5b,0x8b,0x9b,0xcb,0xdb,0x0b,0x4b,0x2b,0x6b,0xab,0xeb}

def decompress_at(off, cap=8*1024*1024):
    dec = brotli.Decompressor(); out = bytearray(); pos = off
    while pos < END:
        chunk = data[pos:pos+4096]
        if not chunk: break
        try:
            out += dec.process(chunk)
        except Exception:
            return None                     # 严格：出错即丢弃
        pos += len(chunk)
        if dec.is_finished():
            return bytes(out)
        if len(out) > cap: return None
    return None

MARK = (b"<!doctype html", b"<!DOCTYPE html", b"<svg", b"<?xml", b"/*!", b"/*", b"//", b":root", b"@charset", b"function", b"\"use strict\"", b"const ", b"import ")
found, seen = [], set()
for off in range(START, END):
    if data[off] not in CANDS: continue
    blob = decompress_at(off)
    if not blob or len(blob) < 300: continue
    try:
        text = blob.decode("utf-8")         # 严格 UTF-8
    except UnicodeDecodeError:
        continue
    if not text.lstrip().startswith(tuple(m.decode() for m in MARK)):
        continue
    h = hashlib.sha1(blob).hexdigest()
    if h in seen: continue
    seen.add(h)
    head = text[:300]
    if "<!doctype html" in head.lower() or "<html" in head.lower():
        t = re.search(r"<title>([^<]{0,40})", head)
        title = t.group(1) if t else ""
        name = "index.html" if off > 0x8B0000 else ("page_%s.html" % ("%X" % off))
        if "登录" in title or "login" in title.lower(): name = "login.html"
        if "标签" in title or "tab" in title.lower(): name = "tabs.html"
        if "锁" in title or "lock" in title.lower(): name = "lock.html"
    elif "SheetJS" in head:
        name = "vendor_xlsx.full.min.js"
    elif head.lstrip().startswith("<svg") or head.lstrip().startswith("<?xml"):
        name = "svg_%X.svg" % off
    elif head.lstrip().startswith(":root") or head.lstrip().startswith("@charset") or (head.lstrip().startswith("/*") and "{" in head):
        name = "css_%X.css" % off
    else:
        name = "js_%X.js" % off
    p = os.path.join(OUT, name)
    open(p,"wb").write(blob)
    found.append({"offset": hex(off), "file": name, "bytes": len(blob), "title": head[:60].replace("\n"," ")})
    print("  0x%06X %-30s %7.1f KB  %s" % (off, name, len(blob)/1024, head[:40].replace("\n"," ")))
json.dump(found, open(os.path.join(OUT,"manifest.json"),"w",encoding="utf-8"), ensure_ascii=False, indent=2)
print("\n严格模式：%d 个资源，%.1f KB" % (len(found), sum(f["bytes"] for f in found)/1024))
