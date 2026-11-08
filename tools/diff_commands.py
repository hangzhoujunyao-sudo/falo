import re, glob, os
names = {}
for f in glob.glob("frontend/*.js") + glob.glob("content-scripts/**/*.js", recursive=True):
    t = open(f, encoding="utf-8", errors="ignore").read()
    for m in re.finditer(r'invoke\(\s*["\']([a-z][a-z0-9_]{3,60})["\']', t):
        names.setdefault(m.group(1), set()).add(os.path.basename(f))
print("前端 invoke 命令总数:", len(names))
backend = set()
for f in glob.glob("backend/src/*.rs"):
    t = open(f, encoding="utf-8", errors="ignore").read()
    for m in re.finditer(r"#\[tauri::command\]\s*\n\s*pub async fn (\w+)", t):
        backend.add(m.group(1))
print("后端已生成命令:", len(backend))
missing = sorted(set(names) - backend)
print("前端有、后端缺:", len(missing))
for n in missing:
    print("  -", n, " <-", ",".join(sorted(names[n]))[:50])
extra = sorted(backend - set(names))
print("后端有、前端未调用:", extra)
