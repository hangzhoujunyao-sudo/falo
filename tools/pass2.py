import brotli, json, os, re
EXE = r"C:\Users\Administrator\AppData\Local\WATransChat\watranschat.exe"
OUT = r"..\frontend"
data = open(EXE,"rb").read()
PAT = re.compile(rb"(?<![A-Za-z0-9_./\-])(/?(?:[A-Za-z0-9_\-.]+/)*[A-Za-z0-9_\-.]+\.(?:js|css|html|json|png|svg|ico|woff2|ttf))(?![A-Za-z0-9_./\-])")
have = set(x["path"] for x in json.load(open(os.path.join(OUT,"manifest.json"),encoding="utf-8")))
MARK = ("<!doctype html","<!DOCTYPE html","<svg","<?xml","/*","//",":root","@charset","function",'"use strict"',"const ","import ","self.","(() =>","{","[")

def stream(s, cap=9*1024*1024):
    dec = brotli.Decompressor(); out = bytearray(); pos = s
    while pos < 0x8BC000:
        chunk = data[pos:pos+1024]
        try:
            out += dec.process(chunk)
        except Exception:
            break
        pos += len(chunk)
        if dec.is_finished(): return bytes(out)
        if len(out) > cap: return None
    return bytes(out) if len(out) > 150 else None

todo = []
for m in PAT.finditer(data, 0x7B0000, 0x8BC000):
    p = m.group(1).decode("latin1")
    key = p if p.startswith("/") else "/"+p
    if len(p) > 80 or any(len(s) > 40 for s in p.split("/")) or key in have: continue
    if key not in [t[0] for t in todo]:
        todo.append((key, m.end()))

print("待补:", [t[0] for t in todo])
ok=0
for path, e0 in todo:
    blob=None
    for s in range(max(0,e0-6), e0+80):
        b = stream(s)
        if not b: continue
        try: text=b.decode("utf-8")
        except UnicodeDecodeError: continue
        if text.lstrip().startswith(MARK):
            blob=b; break
    if not blob: continue
    name = path.lstrip("/").replace("/","_")
    open(os.path.join(OUT,name),"wb").write(blob)
    have.add(path); ok+=1
    print("  补 %-26s %7.1f KB  %s" % (path, len(blob)/1024, blob[:40].decode("utf-8","ignore").replace("\n"," ")))
print("补充:", ok)
