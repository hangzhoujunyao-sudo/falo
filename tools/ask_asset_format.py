# -*- coding: utf-8 -*-
"""把资产表的原始字节喂给中转站模型，让它判断格式并给解析代码。"""
import concurrent.futures as cf
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "gpt_breaker"))
import client  # noqa: E402

EXE = r"C:\Users\Administrator\AppData\Local\WATransChat\watranschat.exe"
data = open(EXE, "rb").read()

RECORDS = [("/main.js", 0x85B887, 8), ("/style.css", 0x853D9B, 10),
           ("/app-icon.svg", 0x861FF4, 13), ("/vendor/xlsx.full.min.js", 0x819137, 25)]


def dump(off, plen, n=96):
    s = off + plen
    return {"before": data[max(0, off - 24):off].hex(),
            "path": data[off:off + plen].decode("latin1"),
            "after": data[s:s + n].hex()}


facts = "\n".join("记录 %d:\n  path 之前 24B: %s\n  path: %s\n  之后 96B: %s"
                  % (i, d["before"], d["path"], d["after"])
                  for i, d in enumerate(dump(o, p) for _, o, p in RECORDS))

BASE = """我在逆向一个 Windows 原生程序里的「内嵌前端资源表」，想把它解出来。

已知事实：
- 程序是 Tauri 2.11.2（Rust + WebView2），exe 9.8 MB，x64。
- 资源表在 .rdata 段，路径是明文（/main.js、/style.css、/app-icon.svg、/vendor/xlsx.full.min.js…），
  路径前一个字节常是 0x00，路径后紧跟一段高熵数据（Shannon 熵 7.95 bit/byte）。
- 我按 skip=0..40 字节逐个试过 brotli / zlib / gzip / lzma / zstd，全部失败（无解压成功）。
- 记录之间距离约 26 KB，记录尾部常见 ...00 结尾；同样的明文注入脚本（另一批资源）在文件里是完全不压缩的。

样本（hex）：
%s

请回答三件事：
1. 这更像哪种存储：brotli 带自定义字典 / 整体加密（AES/ChaCha）/ 混淆打包器 / 我漏掉的 Tauri 特性？
   给出判断依据（首字节模式、熵、长度关系）。
2. 如果是加密，密钥通常从哪来（内嵌常量 / 机器码派生 / 头部随机数），怎么定位。
3. 给出下一步可执行的 Python 代码（可以多段），要求能直接跑：包括「如何用已知明文校验」
   （比如 /app-icon.svg 是 SVG，开头应为 '<svg' 或 '<?xml'）。
不要泛泛而谈，给具体偏移、算法名、代码。
"""


def ask(tag, extra=""):
    prompt = BASE % facts + ("\n\n额外要求：" + extra if extra else "")
    r = client.chat([{"role": "user", "content": prompt}], model="gpt-6.1-sol", max_tokens=2200, temperature=0.4)
    return tag, (r["text"] if r["ok"] else "ERR " + r["error"][:200])


if __name__ == "__main__":
    jobs = {
        "A_格式判断": "重点给判断与依据，代码可以短。",
        "B_可执行代码": "重点给能跑的 Python：完整解析器 + 已知明文校验 + 失败时的暴力枚举策略。",
        "C_密钥定位": "重点教我怎么在 exe 里找解密材料：特征字节、常见常量、如何用已知明文反推 keystream。",
    }
    with cf.ThreadPoolExecutor(max_workers=3) as ex:
        for tag, text in ex.map(lambda kv: ask(*kv), jobs.items()):
            path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "%s.md" % tag)
            open(path, "w", encoding="utf-8").write(text)
            print("=" * 70)
            print(tag, "->", path, len(text), "字符")
            print(text[:500].replace("\n", " "))
