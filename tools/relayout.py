# -*- coding: utf-8 -*-
"""重排左侧导航 + 重构 Overview 页布局（与上游排版明显不同）。

1) 导航：从 13 项平铺改成 4 组（核心 / 偏好 / 账户与安全 / 其他），顺序也换掉
2) Overview：原来是「横幅 → 三列指标 → 快捷预设」竖向堆叠，
   改成「横幅 → 左：快捷预设卡（2×2） / 右：指标卡竖排」
"""
import re

P = r"C:\Users\Administrator\Documents\deepseek-harness\default-workspace\falo\frontend\index.html"
html = open(P, encoding="utf-8").read()

# ---------------------------------------------------------------- 1) 导航
m = re.search(r'<nav class="settings-nav">(.*?)</nav>', html, re.S)
nav_inner = m.group(1)
buttons = {}
for b in re.finditer(r'<button type="button" class="nav-item[^"]*" data-panel-target="(\w+)">\s*'
                     r'<span class="nav-icon" aria-hidden="true">([^<]*)</span>\s*'
                     r'<span data-i18n="([^"]+)">([^<]*)</span>\s*</button>', nav_inner):
    key, icon, i18n, label = b.groups()
    buttons[key] = (icon, i18n, label)

GROUPS = [
    ("核心", ["overview", "translation", "accounts", "focus"]),
    ("偏好", ["notifications", "appearance", "interface", "preferences"]),
    ("账户与安全", ["devices", "membership", "backup", "security"]),
    ("其他", ["about"]),
]

parts = ['<nav class="settings-nav">']
for title, keys in GROUPS:
    parts.append('          <p class="nav-group">%s</p>' % title)
    for k in keys:
        icon, i18n, label = buttons[k]
        active = " active" if k == "overview" else ""
        parts.append(
            '          <button type="button" class="nav-item%s" data-panel-target="%s">\n'
            '            <span class="nav-icon" aria-hidden="true">%s</span>\n'
            '            <span data-i18n="%s">%s</span>\n'
            '          </button>' % (active, k, icon, i18n, label))
parts.append('        </nav>')
new_nav = "\n".join(parts)
html = html[:m.start()] + new_nav + html[m.end():]

# ---------------------------------------------------------------- 2) Overview
start = html.index('<section class="settings-panel active" data-panel="overview"')
end = html.index('<section class="settings-panel" data-panel="accounts"')
new_overview = '''<section class="settings-panel active" data-panel="overview" aria-labelledby="panel_title">
          <div class="welcome-card">
            <img src="app-icon.svg" alt="" aria-hidden="true" class="welcome-mark" />
            <div>
              <p class="eyebrow" data-i18n="overview.eyebrow">Your communication cockpit</p>
              <h2 data-i18n="overview.headline">Keep conversations close, without losing your focus.</h2>
              <p>
                <span data-i18n="overview.body">Switch accounts, quiet interruptions, and personalize every Falo window from one compact workspace.</span>
              </p>
            </div>
          </div>

          <div class="overview-layout">
            <section class="section-surface overview-block">
              <div class="section-heading">
                <div>
                  <p class="eyebrow" data-i18n="overview.quickEyebrow">Quick start</p>
                  <h2 data-i18n="overview.focusPresets">Focus presets</h2>
                </div>
                <p data-i18n="overview.focusPresetsHint">Pause native notifications while every chat stays connected.</p>
              </div>
              <div class="focus-presets compact-presets" aria-label="Quick focus duration">
                <button type="button" class="preset-button" data-focus-minutes="15">
                  <strong>15</strong><span data-i18n="unit.minutes">minutes</span>
                </button>
                <button type="button" class="preset-button" data-focus-minutes="30">
                  <strong>30</strong><span data-i18n="unit.minutes">minutes</span>
                </button>
                <button type="button" class="preset-button" data-focus-minutes="60">
                  <strong>1</strong><span data-i18n="unit.hour">hour</span>
                </button>
                <button type="button" class="preset-button" data-focus-minutes="120">
                  <strong>2</strong><span data-i18n="unit.hours">hours</span>
                </button>
              </div>
            </section>

            <aside class="overview-side">
              <p class="side-title" data-i18n="overview.sideTitle">At a glance</p>
              <div class="metric-stack">
                <button type="button" class="metric-card" data-jump-panel="accounts">
                  <span class="metric-label" data-i18n="overview.metric.spaces">Connected spaces</span>
                  <strong id="overview_accounts">—</strong>
                  <small data-i18n="overview.metric.spacesHint">Manage accounts</small>
                </button>
                <button type="button" class="metric-card" data-jump-panel="focus">
                  <span class="metric-label" data-i18n="overview.metric.attention">Attention mode</span>
                  <strong id="overview_focus">Ready</strong>
                  <small data-i18n="overview.metric.attentionHint">Start a focus session</small>
                </button>
                <button type="button" class="metric-card" data-jump-panel="appearance">
                  <span class="metric-label" data-i18n="overview.metric.style">Current style</span>
                  <strong id="overview_theme">Dark</strong>
                  <small data-i18n="overview.metric.styleHint">Personalize Falo</small>
                </button>
              </div>
            </aside>
          </div>
        </section>

        '''
html = html[:start] + new_overview + html[end:]

open(P, "w", encoding="utf-8", newline="\n").write(html)
print("index.html 已重排：导航 4 组 %d 项；overview 改为左右两栏" % sum(len(k) for _, k in GROUPS))
