import brotli
p = r"backend\target\debug\falo-oss.exe"
d = open(p,"rb").read()
CAND = {0x1b,0x5b,0x8b,0x9b,0xcb,0xdb,0x0b,0x4b,0x2b,0x6b,0xab,0xeb}
needles = [b"wb-hero", b"falo-extra", b"withGlobalTauri", b"data-panel=\"workbench\""]
hits = {n:0 for n in needles}
for off in range(0, len(d)):
    if d[off] not in CAND: continue
    dec = brotli.Decompressor(); out = bytearray(); pos = off
    while pos < len(d):
        chunk = d[pos:pos+2048]
        try: out += dec.process(chunk)
        except Exception: break
        pos += len(chunk)
        if dec.is_finished(): break
        if len(out) > 1_500_000: break
    if len(out) < 200: continue
    for n in needles:
        if n in out: hits[n] += 1
print(hits)
