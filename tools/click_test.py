import ctypes, subprocess, time
from ctypes import wintypes
from PIL import Image

EXE = r"backend\target\debug\falo-oss.exe"
user32, gdi32 = ctypes.windll.user32, ctypes.windll.gdi32
user32.SetProcessDPIAware()
subprocess.run(["taskkill","/F","/IM","falo-oss.exe"], capture_output=True)
time.sleep(2)
p = subprocess.Popen([EXE])
time.sleep(11)

EnumProc = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
found = []
def cb(hwnd, _l):
    pid = wintypes.DWORD(); user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    if pid.value == p.pid and user32.GetWindowTextLengthW(hwnd):
        r = wintypes.RECT(); user32.GetWindowRect(hwnd, ctypes.byref(r))
        if r.right - r.left > 800: found.append((hwnd, r))
    return True
user32.EnumWindows(EnumProc(cb), 0)
hwnd, rect = found[0]
print("window rect:", rect.left, rect.top, rect.right, rect.bottom)

def grab(name):
    w, h = rect.right-rect.left, rect.bottom-rect.top
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
    Image.frombuffer("RGBA",(w,h),buf,"raw","BGRA",0,1).convert("RGB").save(name)
    gdi32.DeleteObject(bmp); gdi32.DeleteDC(mem); user32.ReleaseDC(hwnd, hdc)

def click(px, py):
    user32.SetCursorPos(int(px), int(py))
    time.sleep(0.3)
    user32.mouse_event(0x0002, 0, 0, 0, 0)   # LEFTDOWN
    time.sleep(0.08)
    user32.mouse_event(0x0004, 0, 0, 0, 0)   # LEFTUP
    time.sleep(1.2)

# 「翻译」导航项：图像坐标 (185, 683)【缩放 1.5 后的物理像素】
click(rect.left + 185, rect.top + 683)
grab("shot_translation.png")
print("clicked 翻译, saved shot_translation.png")

# 再点「账户」（连接组）
click(rect.left + 185, rect.top + 468)
grab("shot_accounts.png")
print("clicked 账户, saved shot_accounts.png")
p.kill()
