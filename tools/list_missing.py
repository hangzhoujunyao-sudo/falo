import re, glob, os, json
names = {}
for f in glob.glob("frontend/*.js") + glob.glob("content-scripts/**/*.js", recursive=True):
    t = open(f, encoding="utf-8", errors="ignore").read()
    for m in re.finditer(r'invoke\(\s*["\']([a-z][a-z0-9_]{3,60})["\']', t):
        names.setdefault(m.group(1), set()).add(os.path.basename(f))
backend = set()
for f in glob.glob("backend/src/*.rs"):
    t = open(f, encoding="utf-8", errors="ignore").read()
    backend |= set(re.findall(r"#\[tauri::command\]\s*\n\s*pub async fn (\w+)", t))
missing = {k: sorted(v) for k, v in names.items() if k not in backend}
json.dump(missing, open("docs/commands-missing.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("缺", len(missing))
print("\n".join(sorted(missing)))
