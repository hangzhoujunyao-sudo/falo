import re, json, glob
files = ["content-scripts/watrans-content-bundle.js"] + glob.glob("content-scripts/modules/*")
cmds = {}
pat = re.compile(r"invoke\(\s*[\"']([a-z][a-z0-9_]{3,60})[\"']")
pat2 = re.compile(r"[\"']([a-z][a-z0-9_]{3,60})[\"']\s*,\s*\{")  # 粗糙兜底
for f in files:
    t = open(f, encoding="utf-8", errors="ignore").read()
    for m in pat.finditer(t):
        cmds.setdefault(m.group(1), set()).add(f.split("/")[-1])
print("invoke() 里出现的命令：", len(cmds))
for k in sorted(cmds):
    print("  %-34s %s" % (k, ",".join(sorted(cmds[k]))[:40]))
json.dump({k: sorted(v) for k, v in cmds.items()}, open("docs/commands-invoke.json","w",encoding="utf-8"), ensure_ascii=False, indent=2)
