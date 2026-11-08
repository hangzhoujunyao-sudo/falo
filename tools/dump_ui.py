import ctypes, re, os, sys
from ctypes import wintypes
sys.path.insert(0, ".")
import scan_mem as sm

TARGET_PID = 3228
TARGET_BASE = 0x2F701000000
OUT = r"wats_oss\frontend"
os.makedirs(OUT, exist_ok=True)

h = sm.kernel32.OpenProcess(sm.PROCESS_QUERY_INFORMATION | sm.PROCESS_VM_READ, False, TARGET_PID)
data = sm.read_region(h, TARGET_BASE, 2*1024*1024, cap=2*1024*1024)
sm.kernel32.CloseHandle(h)
print("region bytes:", len(data))

# 把区域拆成「可打印文本 run」
runs = []
i = 0
n = len(data)
while i < n:
    if 32 <= data[i] < 127 or data[i] in (9,10,13) or data[i] >= 0x80:
        j = i; bad = 0
        while j < n:
            b = data[j]
            if 32 <= b < 127 or b in (9,10,13) or b >= 0x80:
                bad = 0
            else:
                bad += 1
                if bad > 4:
                    break
            j += 1
        if j - i > 20000:
            runs.append((i, data[i:j-bad]))
        i = j
    else:
        i += 1

print("大文本 run:", [(hex(s), round(len(c)/1024), "KB") for s,c in runs][:10])
for idx, (start, blob) in enumerate(runs):
    text = blob.decode("utf-8", "ignore")
    name = "ui_bundle_%d.js" % idx
    if "<style" in text[:2000] or text.lstrip().startswith("."):
        name = "ui_bundle_%d.css" % idx
    open(os.path.join(OUT, name), "w", encoding="utf-8").write(text)
    print("写", name, len(text)//1024, "KB | head:", text[:100].replace("\n"," "))
