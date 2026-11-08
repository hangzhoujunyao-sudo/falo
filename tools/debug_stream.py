import brotli
p = r"C:\Users\Administrator\AppData\Local\WATransChat\watranschat.exe"
d = open(p,"rb").read()
for off in (0x85B88F, 0x853DA5, 0x8B4038, 0x81914F):
    dec = brotli.Decompressor(); out=bytearray(); pos=off; step=4096; err=None
    while pos < 0x8BC000:
        chunk = d[pos:pos+step]
        try:
            out += dec.process(chunk)
        except Exception as e:
            err = str(e); break
        pos += len(chunk)
        if dec.is_finished(): break
        if len(out) > 4*1024*1024: break
    print("0x%X out=%d finished=%s err=%s" % (off, len(out), dec.is_finished(), err))
    print("   head:", bytes(out[:80]).decode("utf-8","ignore").replace("\n"," "))
