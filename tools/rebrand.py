# -*- coding: utf-8 -*-
"""把重建版整体改名 + 换图标 + 换主色。

新品牌：Falo（中文名「飞译」）
- 原 WATransChat / WhatsNow / whatsnow → Falo / falo
- 原 WhatsApp 字样保留（那是平台名，不是产品名）
- 图标：靛紫渐变圆角方块 + 白色 F 字形
- 主色：绿色系 → 靛紫系（四个主题各改一组 accent 变量）
"""
import os
import re

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FE = os.path.join(ROOT, "frontend")
CS = os.path.join(ROOT, "content-scripts")

TEXT_EXT = {".js", ".html", ".css", ".json", ".md", ".rs", ".toml", ".ps1", ".yml", ".yaml"}

REPL = [
    ("WATRANSCHAT", "FALO"),
    ("WATransChat", "Falo"),
    ("watranschat", "falo"),
    ("WATransChat", "Falo"),
    ("WhatsNow", "Falo"),
    ("whatsnow", "falo"),
    ("watsnow", "falo"),
    ("WATrans", "Falo"),
    ("Watrans", "Falo"),
    ("watrans", "falo"),
    ("app.falo.desktop", "app.falo.desktop"),
]

# 主题色：绿 → 靛紫 / 青 / 紫
COLORS = {
    "#087a60": "#4f46e5", "#05634e": "#4338ca", "#d9eee7": "#e0e7ff",
    "#55d2aa": "#818cf8", "#77e2bf": "#a5b4fc", "#153f32": "#312e81",
    "#44d6c7": "#22d3ee", "#70e8dc": "#67e8f9", "#103d44": "#164e63",
    "#4bd394": "#a78bfa", "#72e2ae": "#c4b5fd", "#15452f": "#3b0764",
    "#25d366": "#6366f1", "#128c7e": "#4f46e5", "#075e54": "#312e81",
}


def rebrand_text(path: str) -> bool:
    try:
        text = open(path, encoding="utf-8", errors="surrogateescape").read()
    except OSError:
        return False
    orig = text
    for a, b in REPL:
        text = text.replace(a, b)
    for a, b in COLORS.items():
        text = re.sub(re.escape(a), b, text, flags=re.I)
    if text != orig:
        open(path, "w", encoding="utf-8", errors="surrogateescape", newline="\n").write(text)
        return True
    return False


def make_icon():
    S = 512
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # 渐变底：逐行插值
    top, bottom = (99, 102, 241), (139, 92, 246)   # indigo-500 → violet-500
    for y in range(S):
        t = y / (S - 1)
        c = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        d.line([(0, y), (S, y)], fill=c + (255,))
    # 圆角遮罩
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=112, fill=255)
    img.putalpha(mask)

    # 白色 F（几何绘制，避免依赖字体）
    f = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    fd = ImageDraw.Draw(f)
    white = (255, 255, 255, 255)
    fd.rounded_rectangle([150, 132, 214, 380], radius=10, fill=white)     # 竖
    fd.rounded_rectangle([150, 132, 340, 196], radius=10, fill=white)     # 上横
    fd.rounded_rectangle([150, 240, 312, 304], radius=10, fill=white)     # 中横
    img.alpha_composite(f)

    # 右下角双向箭头（译意）
    a = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ad = ImageDraw.Draw(a)
    ad.rounded_rectangle([268, 336, 392, 352], radius=8, fill=white)
    ad.polygon([(392, 318), (392, 370), (420, 344)], fill=white)
    img.alpha_composite(a)

    out = {}
    for name, size in (("icon.png", 512), ("128x128.png", 128), ("32x32.png", 32), ("titlebar-icon.png", 32)):
        p = os.path.join(FE, name)
        img.resize((size, size), Image.LANCZOS).save(p)
        out[name] = size
    img.save(os.path.join(FE, "app-icon.png"))
    img.save(os.path.join(FE, "app-icon.ico"),
             sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)])
    out["app-icon.png"] = 512
    return out


def make_svg():
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6366f1"/>
      <stop offset="1" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  <g fill="#ffffff">
    <rect x="150" y="132" width="64" height="248" rx="10"/>
    <rect x="150" y="132" width="190" height="64" rx="10"/>
    <rect x="150" y="240" width="162" height="64" rx="10"/>
    <rect x="268" y="336" width="124" height="16" rx="8"/>
    <polygon points="392,318 392,370 420,344"/>
  </g>
</svg>
'''
    open(os.path.join(FE, "app-icon.svg"), "w", encoding="utf-8", newline="\n").write(svg)


def main():
    changed = []
    for base, _, files in os.walk(ROOT):
        if ".git" in base or "target" in base:
            continue
        for name in files:
            p = os.path.join(base, name)
            if os.path.splitext(name)[1].lower() in TEXT_EXT and rebrand_text(p):
                changed.append(os.path.relpath(p, ROOT))
    print("改名文件数:", len(changed))
    for c in changed[:15]:
        print("  ", c)
    make_svg()
    print("图标:", make_icon())


if __name__ == "__main__":
    main()
