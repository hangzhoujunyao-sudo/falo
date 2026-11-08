import brotli, re
p = r"backend\target\debug\falo-oss.exe"
d = open(p, "rb").read()
print("exe size", len(d))
CAND = {0x1b,0x5b,0x8b,0x9b,0xcb,0xdb,0x0b,0x4b,0x2b,0x6b,0xab,0xeb}
found_css = found_html = False
checked = 0
for off in range(0, len(d)):
    if d[off] not in CAND: continue
    dec = brotli.Decompressor(); out = bytearray(); pos = off
    ok = False
    while pos < len(d):
        chunk = d[pos:pos+2048]
        if not chunk: break
        try: out += dec.process(chunk)
        except Exception: break
        pos += len(chunk)
        if dec.is_finished(): ok = True; break
        if len(out) > 2*1024*1024: break
    if len(out) < 500: continue
    checked += 1
    try: text = bytes(out).decode("utf-8")
    except UnicodeDecodeError: continue
    if "overview-layout" in text or "nav-group" in text:
        found_css = True
        print("命中 CSS/HTML @0x%X  长度 %d  overview-layout=%s nav-group=%s" % (off, len(text), "overview-layout" in text, "nav-group" in text))
        break
print("扫描候选流:", checked, "| 命中:", found_css)
