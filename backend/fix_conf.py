import json
p = "tauri.conf.json"
c = json.load(open(p, encoding="utf-8"))
c["bundle"]["icon"] = ["icons/32x32.png", "icons/128x128.png", "icons/icon.ico"]
c["bundle"]["targets"] = ["nsis"]
json.dump(c, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("tauri.conf.json 更新")
