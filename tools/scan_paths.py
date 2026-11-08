import re
p = r"C:\Users\Administrator\AppData\Local\WATransChat\watranschat.exe"
d = open(p, "rb").read()
region = d[0x6c0000:0x8c0000]
pat = re.compile(rb"(?<![A-Za-z0-9_./\-])(/?(?:[A-Za-z0-9_\-.]+/)*[A-Za-z0-9_\-.]+\.(?:js|css|html|json|png|svg|ico|woff2|ttf))(?![A-Za-z0-9_./\-])")
seen={}
for m in pat.finditer(region):
    path = m.group(1).decode("latin1")
    if len(path) > 80: continue
    if any(len(seg) > 40 for seg in path.split("/")): continue
    key = path if path.startswith("/") else "/"+path
    if key not in seen:
        seen[key] = 0x6c0000 + m.start()
print("valid candidates:", len(seen))
for k in sorted(seen, key=lambda x: seen[x]):
    print("0x%06X %s" % (seen[k], k))
