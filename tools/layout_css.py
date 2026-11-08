# -*- coding: utf-8 -*-
"""写入 Falo 的界面覆盖样式（幂等：先删旧块再追加）。

块内包含：
- 导航分组 / 子项胶囊
- 工作台（workbench）两栏布局
- Overview：环形状态块 + 专注滑块
"""
import os

FE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
CSS = os.path.join(FE, "style.css")
BEGIN = "/* ===== FALO-OVERRIDES-BEGIN ====="
END = "/* ===== FALO-OVERRIDES-END ===== */"

BLOCK = BEGIN + """
   导航分组 / 子项
   ============================================================ */
.nav-group {
  margin: 14px 12px 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--rail-muted);
  opacity: 0.72;
}
.nav-group:first-of-type { margin-top: 2px; }
.nav-sub {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 2px 10px 6px 34px;
}
.nav-sub .sub-pill {
  padding: 3px 9px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: color-mix(in srgb, var(--rail-text) 8%, transparent);
  color: var(--rail-muted);
  font-size: 11px;
  line-height: 1.5;
  cursor: pointer;
}
.nav-sub .sub-pill:hover { color: var(--rail-text); }
.nav-sub .sub-pill.active {
  background: color-mix(in srgb, var(--accent) 26%, transparent);
  border-color: color-mix(in srgb, var(--accent) 45%, transparent);
  color: var(--rail-text);
}

/* ============================================================
   工作台
   ============================================================ */
.wb-hero {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
  padding: 22px 24px;
  border: 1px solid color-mix(in srgb, var(--accent) 26%, var(--border));
  border-radius: 18px;
  background:
    radial-gradient(120% 140% at 100% 0%, color-mix(in srgb, var(--accent-soft) 70%, transparent), transparent 60%),
    var(--surface);
}
.wb-hero-text { flex: 1 1 420px; min-width: 0; }
.wb-hero h2 { margin: 4px 0 6px; font-size: 26px; line-height: 1.25; }
.wb-hero p { margin: 0 0 14px; color: var(--muted); max-width: 56ch; }
.wb-actions { display: flex; flex-wrap: wrap; gap: 10px; }
.wb-ring-wrap { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.wb-ring-wrap small { color: var(--muted); font-size: 11px; }

.ring {
  --p: 0;
  display: grid;
  place-items: center;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: conic-gradient(var(--accent) calc(var(--p) * 1%), color-mix(in srgb, var(--border) 70%, transparent) 0);
  position: relative;
}
.ring::before {
  content: "";
  position: absolute;
  inset: 9px;
  border-radius: 50%;
  background: var(--surface);
}
.ring > b, .ring > strong {
  position: relative;
  font-size: 22px;
  line-height: 1;
}

.wb-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 16px;
}
.wb-grid > .section-surface { flex: 1 1 320px; min-width: 300px; margin: 0; }
.wb-status { list-style: none; margin: 6px 0 0; padding: 0; display: grid; gap: 10px; }
.wb-status li {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 13px;
  color: var(--muted);
}
.wb-status li strong { margin-left: auto; color: var(--text); font-size: 14px; }
.wb-status .dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: color-mix(in srgb, var(--border) 90%, transparent);
}
.wb-status .dot.ok { background: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent); }
.wb-sessions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.wb-session {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-soft);
  color: var(--text);
  font-size: 12px;
  cursor: pointer;
}
.wb-session:hover { border-color: color-mix(in srgb, var(--accent) 45%, var(--border)); }
.wb-session i {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--accent);
}
.wb-empty { color: var(--muted); font-size: 12px; margin: 8px 0 0; }

/* ============================================================
   Overview：环形状态块 + 专注滑块
   ============================================================ */
.overview-layout {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  align-items: flex-start;
  margin-top: 16px;
}
.overview-layout > .overview-block { flex: 1 1 56%; min-width: 360px; }
.overview-layout > .overview-side { flex: 1 1 30%; min-width: 240px; }
.overview-block { margin: 0; }
.overview-side { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.side-title {
  margin: 0 2px 2px;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--muted);
}
.ring-grid { display: flex; flex-wrap: wrap; gap: 12px; }
.ring-card {
  flex: 1 1 130px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 12px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  cursor: pointer;
  text-align: center;
}
.ring-card:hover { border-color: color-mix(in srgb, var(--accent) 45%, var(--border)); }
.ring-card .ring { width: 76px; height: 76px; }
.ring-card .ring::before { inset: 7px; }
.ring-card span.label { font-size: 12px; color: var(--muted); }
.ring-card strong.value { font-size: 15px; color: var(--text); }

.focus-controls { display: grid; gap: 14px; margin-top: 4px; }
.focus-slider-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.focus-slider-row input[type="range"] {
  flex: 1 1 220px;
  min-width: 160px;
  accent-color: var(--accent);
}
.focus-slider-value { font-variant-numeric: tabular-nums; color: var(--text); font-weight: 600; }
.chip-row { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  min-height: 34px;
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-soft);
  color: var(--text);
  font-size: 12px;
  cursor: pointer;
}
.chip:hover { border-color: color-mix(in srgb, var(--accent) 45%, var(--border)); }
.chip.active {
  background: color-mix(in srgb, var(--accent) 16%, var(--surface));
  border-color: var(--accent);
  color: var(--text);
}

.welcome-card {
  grid-template-columns: 84px minmax(0, 1fr);
  padding: 20px 22px;
  gap: 18px;
}
.welcome-card .welcome-mark {
  width: 84px;
  height: 84px;
  border-radius: 20px;
  justify-self: start;
}

@media (max-width: 940px) {
  .overview-layout > .overview-block,
  .overview-layout > .overview-side { flex-basis: 100%; }
}
""" + END + "\n"


def main():
    css = open(CSS, encoding="utf-8").read()
    if BEGIN in css:
        head = css.split(BEGIN)[0]
        css = head
    css = css.rstrip() + "\n\n" + BLOCK
    open(CSS, "w", encoding="utf-8", newline="\n").write(css)
    print("style.css 覆盖块已写入（%d 行）" % BLOCK.count("\n"))


if __name__ == "__main__":
    main()
