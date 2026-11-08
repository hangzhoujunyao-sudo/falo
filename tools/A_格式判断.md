我会先核对 Tauri 的资源嵌入源码，重点确认数据边界、压缩方式，以及路径旁的数据是否真属于该路径。样本里有个很强的线索：前三条的开头都能按标准 Brotli 头解析出长度；第四条路径末尾的 `[` 正好是 `0x5b`，可能把压缩流首字节吞进了路径。接下来应优先检查截取边界，尤其是是否把流结束后的字节也交给了解压器。**最像 Tauri 的标准 Brotli 资源嵌入，首先怀疑截取边界错误，而不是 AES/ChaCha 或自定义字典。** 你的样本有比“高熵”更强的证据：四条数据都能对应到合理的 Brotli 头，第四条还疑似把首字节误算进了路径。以下是头部解析结论，尚不等于完整流已通过解压验证。([rfc-editor.org](https://www.rfc-editor.org/rfc/rfc7932.html))

**1. 判断与具体依据**

我核对了 **`tauri-v2.11.2` 标签源码**：资源构建时调用 `brotli::BrotliCompress`，运行时调用 `brotli::BrotliDecompress`；这条标准路径没有传入自定义字典，也没有资源加解密步骤。资源映射的类型是 `phf::Map<&'static str, &'static [u8]>`。([raw.githubusercontent.com](https://raw.githubusercontent.com/tauri-apps/tauri/tauri-v2.11.2/crates/tauri-codegen/src/embedded_assets.rs))

设 `P` 是路径首字符 `/` 的**文件偏移**。按你提供的字节，优先测试：

| 候选路径 | 压缩流起点 | 流前四字节 | 按 Brotli 头解析的输出长度 |
|---|---:|---|---:|
| `/main.js` | `P + 0x08` | `5b 93 00 42` | 131,220 B |
| `/style.css` | `P + 0x0A` | `1b a0 ce 8c` | 52,897 B |
| `/app-icon.svg` | `P + 0x0D` | `5b 7e f0 0c` | 847,999 B |
| `/vendor/xlsx.full.min.js` | `P + 0x18` | **`5b 3e 74 9d`** | 881,727 B |

这些长度由样本按 RFC 7932 规则计算：`0x1b`、`0x5b` 的低四位均为 `1011`，表示 `WBITS=22`；随后均为 `ISLAST=1`、`ISLASTEMPTY=0`。`0x1b` 用四个 nibble 编码 `MLEN-1`，`0x5b` 用五个。因此，若后续流有效，它们都是只有一个数据 meta-block 的流，表中就是完整输出长度。([rfc-editor.org](https://www.rfc-editor.org/rfc/rfc7932.html))

例如：

```text
5b 93 00 42 → (0x420093 & 0xFFFFF) + 1 = 131220
1b a0 ce 8c →  0xCEA0                  + 1 = 52897
```

**第四条最关键：`[` 就是 `0x5b`。** 我的首选假设是，真实路径结束于 `.js`，随后紧接 `5b 3e 74 9d ...`。如果此前从 `3e` 开始，再执行 `skip=0..40`，始终补不回已经丢失的 `5b`。这是假设，可以直接用下面代码验证。

对其他现象，我会这样解释：

- **熵 7.95 不能区分压缩与加密。** Brotli 本来就组合了 LZ77 与 Huffman 编码，高熵本身不构成加密证据。这里更有辨识力的是一致的头部字段和可解析长度。([rfc-editor.org](https://www.rfc-editor.org/rfc/rfc7932.html))
- **约 26 KB 是路径位置间距，不能直接当资源长度。** Tauri 源码存的是路径到字节切片的映射，不是按零结尾顺序解析的记录格式；物理相邻关系仍须验证。特别是“SVG 输出约 848 KB”值得检查，但不能仅凭大小判定错误。([raw.githubusercontent.com](https://raw.githubusercontent.com/tauri-apps/tauri/tauri-v2.11.2/crates/tauri-utils/src/assets.rs))
- **尾部 `00` 不应作为终止符。** Brotli 最后一个字节可有零填充位，但没有“遇到 `00` 就结束”的规则；路径前的那段随机数据也不能直接认作 IV。([rfc-editor.org](https://www.rfc-editor.org/rfc/rfc7932.html))

你先前的失败还有一种具体原因：**截得太长**。Google Python Brotli 的一次性 `decompress()` 在成功解码后仍有剩余输入时也会报错；截得太短当然也不能完整解压。因此“起点正确，但一直截到下一路径或文件末尾”仍可能失败。([raw.githubusercontent.com](https://raw.githubusercontent.com/google/brotli/master/python/_brotli.c))

**2. 如果最终证明确实加密，怎么找密钥**

当前不建议先投入找密钥。若正确边界仍失败，应从**资源获取函数的数据流**往回追：

1. 找路径的交叉引用，定位 `assets.get()` 对应的资源指针和长度。
2. 检查这段数据进入 Brotli 解码前，是否经过额外变换。标准 Tauri 路径是直接解压。([raw.githubusercontent.com](https://raw.githubusercontent.com/tauri-apps/tauri/tauri-v2.11.2/crates/tauri-utils/src/assets.rs))
3. 若发现 `BCryptDecrypt`，在入口观察 `pbInput/cbInput`、`pbIV/cbIV`，然后追溯 `hKey` 的创建处，例如 `BCryptGenerateSymmetricKey` 或 `BCryptImportKey`。这些参数能确定实际密文边界及密钥来源。([learn.microsoft.com](https://learn.microsoft.com/en-us/windows/win32/api/bcrypt/nf-bcrypt-bcryptdecrypt))

不要先把“路径前 24 B”解释为密钥或 nonce。**头部随机数通常只是待验证的 IV/nonce 候选，不等于密钥**；例如 ChaCha20-Poly1305 的密钥是 32 B，nonce 是 12 B，两者用途不同。常量、派生过程、外部输入中究竟是哪一种，必须追到实际密钥参数才能确认。([cryptography.io](https://cryptography.io/en/latest/hazmat/primitives/aead/))

同样，`<svg` 是很好的**候选明文验证条件**，但不能据此恢复安全 AES/ChaCha 的密钥。对 AEAD，应首先要求认证标签通过，再检查内容；错误密钥、nonce、AAD 或密文都可能使认证失败。([cryptography.io](https://cryptography.io/en/latest/hazmat/primitives/aead/))

**3. 下一步直接跑这段：不猜结束位置，让 Brotli 自己报告流结束**

安装、运行：

```bash
python -m pip install Brotli
python extract.py program.exe
```

下面逐字节输入是为了精确找流尾，避免把下一块数据一起送入解码器；使用官方绑定的 `process()` 和 `is_finished()`。代码从完整 EXE 读取，不要只拿贴出的 96 B 测完整解压。([raw.githubusercontent.com](https://raw.githubusercontent.com/google/brotli/master/python/_brotli.c))

```python
# extract.py
import sys
from pathlib import Path
import xml.etree.ElementTree as ET
import brotli

blob = Path(sys.argv[1]).read_bytes()
paths = [
    b"/main.js", b"/style.css", b"/app-icon.svg",
    b"/vendor/xlsx.full.min.js",  # 注意：不包含 [
]

def header_length(h):
    # 仅解析本题出现的 1b/5b 头，不冒充通用 Brotli 解析器。
    if len(h) < 4 or h[0] not in (0x1b, 0x5b):
        return None
    nbits = 16 if h[0] == 0x1b else 20
    return (int.from_bytes(h[1:4], "little") & ((1 << nbits) - 1)) + 1

def decode_at(start):
    d = brotli.Decompressor()
    out = bytearray()
    for pos in range(start, len(blob)):
        out.extend(d.process(blob[pos:pos + 1]))
        if len(out) > 64 * 1024 * 1024:
            raise ValueError("输出超过本脚本设定的 64 MiB 上限")
        if d.is_finished():
            return bytes(out), pos + 1
    raise ValueError("直到 EOF 仍未完成：可能起点错误或数据被截断")

def svg_check(raw):
    # 前缀只是提示；XML 解析及根元素检查更有用。
    clean = raw.removeprefix(b"\xef\xbb\xbf").lstrip()
    prefix_ok = clean.startswith((b"<svg", b"<?xml"))
    try:
        root = ET.fromstring(raw)
        return prefix_ok, root.tag.split("}")[-1] == "svg"
    except ET.ParseError:
        return prefix_ok, False

for path in paths:
    cursor = 0
    while True:
        p = blob.find(path, cursor)
        if p < 0:
            break
        cursor = p + 1
        start = p + len(path)  # 不额外跳过 NUL，不吞掉 '['
        expected = header_length(blob[start:start + 4])
        print(f"\n{path.decode()} path=0x{p:X}, start=0x{start:X}")
        print("header:", blob[start:start + 8].hex(), "expected:", expected)

        try:
            raw, end = decode_at(start)
        except (brotli.error, ValueError) as e:
            print("FAIL:", e)
            continue

        print(f"OK: input=[0x{start:X},0x{end:X}), "
              f"compressed={end-start}, output={len(raw)}")
        print("length_match:", expected == len(raw),
              "prefix:", repr(raw[:100]))

        # 保留偏移，避免把“相邻路径”未经验证就当成准确文件名。
        target = Path("out") / f"{p:X}" / path.decode().lstrip("/")
        if path.endswith(b".svg"):
            prefix_ok, xml_ok = svg_check(raw)
            print("SVG prefix:", prefix_ok, "SVG XML root:", xml_ok)
            if not xml_ok:
                target = target.with_suffix(target.suffix + ".bin")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(raw)
        print("saved:", target)
```

看结果时，优先判断这三件事：

- **流正常结束且输出长度匹配表格**：强力支持标准 Brotli，之前主要是边界问题。
- **流正常结束，但 SVG 校验失败**：检查输出前 100 B，并回查映射里的实际 value 指针；“路径之后紧邻的数据属于该路径”可能不成立。
- **从表中起点立即报错**：下一步应核对实际资源切片的指针和长度，而不是继续在路径之后盲目增加 `skip`。Tauri 的权威边界来自映射中的字节切片。([raw.githubusercontent.com](https://raw.githubusercontent.com/tauri-apps/tauri/tauri-v2.11.2/crates/tauri-utils/src/assets.rs))