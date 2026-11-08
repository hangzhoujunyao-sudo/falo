import ctypes, subprocess, time
from ctypes import wintypes
from PIL import Image

EXE = r"backend\target\debug\falo-oss.exe"
user32, gdi32 = ctypes.windll.user32, ctypes.windll.gdi32
user32.SetProcessDPIAware()
p = subprocess.Popen([EXE])
time.sleep(9)

EnumProc = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
rows = []
def cb(hwnd, _l):
    n = user32.GetWindowTextLengthW(hwnd)
    if n:
        b = ctypes.create_unicode_buffer(n+1); user32.GetWindowTextW(hwnd, b, n+1)
        r = wintypes.RECT(); user32.GetWindowRect(hwnd, ctypes.byref(r))
        if b.value.strip() == "Falo" and (r.right-r.left) > 300:
            rows.append((hwnd, r.right-r.left, r.bottom-r.top, (r.left,r.top,r.right,r.bottom)))
    return True
user32.EnumWindows(EnumProc(cb), 0)
print("windows:", rows[:2])
if not rows:
    p.kill(); raise SystemExit("no window")
hwnd, w, h, box = rows[0]
hdc = user32.GetWindowDC(hwnd); mem = gdi32.CreateCompatibleDC(hdc)
bmp = gdi32.CreateCompatibleBitmap(hdc, w, h); gdi32.SelectObject(mem, bmp)
user32.PrintWindow(hwnd, mem, 2)
class BIH(ctypes.Structure):
    _fields_=[("biSize",wintypes.DWORD),("biWidth",wintypes.LONG),("biHeight",wintypes.LONG),
              ("biPlanes",wintypes.WORD),("biBitCount",wintypes.WORD),("biCompression",wintypes.DWORD),
              ("biSizeImage",wintypes.DWORD),("biXPelsPerMeter",wintypes.LONG),("biYPelsPerMeter",wintypes.LONG),
              ("biClrUsed",wintypes.DWORD),("biClrImportant",wintypes.DWORD)]
bi = BIH(); bi.biSize=ctypes.sizeof(BIH); bi.biWidth=w; bi.biHeight=-h; bi.biPlanes=1; bi.biBitCount=32
buf = ctypes.create_string_buffer(w*h*4)
gdi32.GetDIBits(mem, bmp, 0, h, buf, ctypes.byref(bi), 0)
Image.frombuffer("RGBA",(w,h),buf,"raw","BGRA",0,1).convert("RGB").save("brand_new.png")
print("saved brand_new.png", w, h)
gdi32.DeleteObject(bmp); gdi32.DeleteDC(mem); user32.ReleaseDC(hwnd, hdc)
p.kill()
