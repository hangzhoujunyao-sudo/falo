import ctypes, subprocess, time
from ctypes import wintypes
from PIL import Image
EXE = r"backend\target\debug\falo-oss.exe"
u, g = ctypes.windll.user32, ctypes.windll.gdi32
u.SetProcessDPIAware()
subprocess.run(["taskkill","/F","/IM","falo-oss.exe"], capture_output=True); time.sleep(2)
p = subprocess.Popen([EXE]); time.sleep(11)

EP = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
found=[]
def cb(h,_):
    pid=wintypes.DWORD(); u.GetWindowThreadProcessId(h, ctypes.byref(pid))
    if pid.value==p.pid and u.GetWindowTextLengthW(h):
        r=wintypes.RECT(); u.GetWindowRect(h, ctypes.byref(r))
        if r.right-r.left>800: found.append((h,r))
    return True
u.EnumWindows(EP(cb),0); h,rect=found[0]

u.ShowWindow(h, 9)                      # SW_RESTORE
u.SetForegroundWindow(h); u.BringWindowToTop(h)
time.sleep(1.0)

def grab(n):
    w,hh=rect.right-rect.left, rect.bottom-rect.top
    hdc=u.GetWindowDC(h); mem=g.CreateCompatibleDC(hdc)
    bmp=g.CreateCompatibleBitmap(hdc,w,hh); g.SelectObject(mem,bmp)
    u.PrintWindow(h,mem,2)
    class B(ctypes.Structure):
        _fields_=[("biSize",wintypes.DWORD),("biWidth",wintypes.LONG),("biHeight",wintypes.LONG),
                  ("biPlanes",wintypes.WORD),("biBitCount",wintypes.WORD),("biCompression",wintypes.DWORD),
                  ("biSizeImage",wintypes.DWORD),("biXPelsPerMeter",wintypes.LONG),("biYPelsPerMeter",wintypes.LONG),
                  ("biClrUsed",wintypes.DWORD),("biClrImportant",wintypes.DWORD)]
    b=B(); b.biSize=ctypes.sizeof(B); b.biWidth=w; b.biHeight=-hh; b.biPlanes=1; b.biBitCount=32
    buf=ctypes.create_string_buffer(w*hh*4)
    g.GetDIBits(mem,bmp,0,hh,buf,ctypes.byref(b),0)
    Image.frombuffer("RGBA",(w,hh),buf,"raw","BGRA",0,1).convert("RGB").save(n)
    g.DeleteObject(bmp); g.DeleteDC(mem); u.ReleaseDC(h,hdc)

def click(x,y):
    u.SetCursorPos(int(x),int(y)); time.sleep(0.4)
    u.mouse_event(0x0002,0,0,0,0); time.sleep(0.12)
    u.mouse_event(0x0004,0,0,0,0); time.sleep(1.5)

# 翻译（nav 第 3 组）：预览坐标 (123,455) → 物理 (185,683)
click(rect.left+185, rect.top+683)
grab("shot_translation.png")
print("after click 翻译")
p.kill()
