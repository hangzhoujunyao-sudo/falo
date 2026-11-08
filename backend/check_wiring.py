import re, os, json
src = "src"
mods = {f[:-3]: open(os.path.join(src,f), encoding="utf-8").read() for f in os.listdir(src) if f.endswith(".rs")}
main = mods["main"]
handlers = re.findall(r"(\w+)::(\w+),", main)
print("handler 条目:", len(handlers))
missing = []
for m, fn in handlers:
    code = mods.get(m)
    if code is None:
        missing.append("%s (模块缺失)" % m); continue
    if not re.search(r"pub async fn %s\b" % fn, code):
        missing.append("%s::%s" % (m, fn))
print("缺失:", missing or "无")
# 每个模块内的命令定义
for m in ("membership","translate","phrases","desktop"):
    fns = re.findall(r"#\[tauri::command\]\s*\npub async fn (\w+)", mods[m])
    print("%-11s %d 个命令: %s" % (m, len(fns), ", ".join(fns)))
# 检查 crate::api 的符号是否都存在
api = mods["api"]
need = set(re.findall(r"crate::api::(\w+)", "\n".join(mods[m] for m in ("membership","translate","phrases","desktop"))))
have = set(re.findall(r"pub (?:struct|fn|enum|trait) (\w+)", api))
print("被引用的 api 符号:", sorted(need), "| 缺失:", sorted(need - have) or "无")
