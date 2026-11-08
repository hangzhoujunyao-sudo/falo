# -*- coding: utf-8 -*-
"""从运行中的 WebView2 进程内存里抓取已加载的前端（HTML/JS/CSS 明文）。

Tauri 把资源压进二进制，但 WebView2 加载后必然是明文躺在渲染进程内存里。
做法：按进程枚举已提交可读区域，搜索 Web 资源的特征串，命中即落盘。
"""
import ctypes
import os
import re
import sys
import time
from ctypes import wintypes

OUT = r"C:\Users\Administrator\Documents\deepseek-harness\default-workspace\wats_oss\frontend"
os.makedirs(OUT, exist_ok=True)

kernel32 = ctypes.windll.kernel32
PROCESS_QUERY_INFORMATION = 0x0400
PROCESS_VM_READ = 0x0010
MEM_COMMIT = 0x1000
PAGE_NOACCESS = 0x01
PAGE_GUARD = 0x100


class MEMORY_BASIC_INFORMATION64(ctypes.Structure):
    _fields_ = [
        ("BaseAddress", ctypes.c_ulonglong),
        ("AllocationBase", ctypes.c_ulonglong),
        ("AllocationProtect", wintypes.DWORD),
        ("__alignment1", wintypes.DWORD),
        ("RegionSize", ctypes.c_ulonglong),
        ("State", wintypes.DWORD),
        ("Protect", wintypes.DWORD),
        ("Type", wintypes.DWORD),
        ("__alignment2", wintypes.DWORD),
    ]


def pids_by_name(name):
    out = []
    kernel32.CreateToolhelp32Snapshot.restype = wintypes.HANDLE
    TH32CS_SNAPPROCESS = 0x2

    class PROCESSENTRY32W(ctypes.Structure):
        _fields_ = [("dwSize", wintypes.DWORD), ("cntUsage", wintypes.DWORD),
                    ("th32ProcessID", wintypes.DWORD), ("th32DefaultHeapID", ctypes.POINTER(ctypes.c_ulong)),
                    ("th32ModuleID", wintypes.DWORD), ("cntThreads", wintypes.DWORD),
                    ("th32ParentProcessID", wintypes.DWORD), ("pcPriClassBase", ctypes.c_long),
                    ("dwFlags", wintypes.DWORD), ("szExeFile", ctypes.c_wchar * 260)]

    snap = kernel32.CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)
    entry = PROCESSENTRY32W()
    entry.dwSize = ctypes.sizeof(PROCESSENTRY32W)
    ok = kernel32.Process32FirstW(snap, ctypes.byref(entry))
    while ok:
        if entry.szExeFile.lower() == name:
            out.append(entry.th32ProcessID)
        ok = kernel32.Process32NextW(snap, ctypes.byref(entry))
    kernel32.CloseHandle(snap)
    return out


MARKERS = [
    (b"<!doctype html", "html"),
    (b"<!DOCTYPE html", "html"),
    (b"createRoot", "js"),
    (b"__TAURI_INTERNALS__", "js"),
    (b"function", "js"),
]

def read_region(h, base, size, cap=8 * 1024 * 1024):
    n = min(size, cap)
    buf = ctypes.create_string_buffer(n)
    read = ctypes.c_size_t(0)
    if kernel32.ReadProcessMemory(h, ctypes.c_void_p(base), buf, n, ctypes.byref(read)):
        return buf.raw[:read.value]
    return None


def scan_pid(pid):
    h = kernel32.OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, False, pid)
    if not h:
        return []
    hits = []
    addr = 0
    mbi = MEMORY_BASIC_INFORMATION64()
    while addr < 0x7FFFFFFFFFFF:
        if kernel32.VirtualQueryEx(wintypes.HANDLE(h), ctypes.c_void_p(addr),
                                   ctypes.byref(mbi), ctypes.sizeof(mbi)) == 0:
            break
        size = mbi.RegionSize
        if (mbi.State == MEM_COMMIT and mbi.Protect not in (PAGE_NOACCESS, 0)
                and not (mbi.Protect & PAGE_GUARD) and 0 < size <= 64 * 1024 * 1024):
            data = read_region(h, mbi.BaseAddress, size)
            if data:
                for marker, kind in MARKERS:
                    idx = data.find(marker)
                    if idx >= 0:
                        hits.append((pid, mbi.BaseAddress, kind, marker, data[max(0, idx - 64): idx + 2 * 1024 * 1024]))
                        break
        addr = mbi.BaseAddress + size
    kernel32.CloseHandle(h)
    return hits


def main():
    pids = pids_by_name("msedgewebview2.exe")
    print("webview2 进程:", pids)
    all_hits = []
    for pid in pids:
        hits = scan_pid(pid)
        print("  pid %d -> %d 命中" % (pid, len(hits)))
        all_hits += hits

    n = 0
    for pid, base, kind, marker, blob in all_hits:
        # 尽量切到文本边界
        text = blob.decode("utf-8", "ignore")
        start = text.find("<")
        if start < 0:
            start = 0
        text = text[start:]
        dst = os.path.join(OUT, "dump_%d_%X_%s.%s" % (pid, base, marker.decode("latin1", "ignore")[:6].replace("<", "lt"), kind))
        open(dst, "w", encoding="utf-8").write(text)
        print("  写 %s  %.1f KB" % (os.path.basename(dst), len(text) / 1024))
        n += 1
    print("共", n, "个")


if __name__ == "__main__":
    main()
