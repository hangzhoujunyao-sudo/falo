# -*- coding: utf-8 -*-
"""信息架构 v2 + 组件重画（在完整版 index.html 上执行，幂等）。

1) 导航：13 项平铺 → 6 组（工作台 / 连接 / 翻译 / 通知与外观 / 账户与安全 / 关于），
   组内用胶囊子项跳转，12 个旧面板全部保留可达
2) 新增「工作台」面板作为默认落地页：连接状态环 + 状态列表 + 最近会话 + 一键开始翻译
3) Overview：三列指标卡 → 环形状态块；专注预设 → 滑块 + 胶囊
"""
import os
import re

FE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
HTML = os.path.join(FE, "index.html")
html = open(HTML, encoding="utf-8").read()

# ---------------------------------------------------------------- 1) 导航
NAV = """<nav class="settings-nav">
          <p class="nav-group">工作台</p>
          <button type="button" class="nav-item active" data-panel-target="workbench">
            <span class="nav-icon" aria-hidden="true">◉</span>
            <span>工作台</span>
          </button>

          <p class="nav-group">连接</p>
          <button type="button" class="nav-item" data-panel-target="accounts">
            <span class="nav-icon" aria-hidden="true">◎</span>
            <span data-i18n="nav.accounts">Accounts</span>
          </button>
          <div class="nav-sub">
            <button type="button" class="sub-pill" data-panel-target="accounts">账户</button>
            <button type="button" class="sub-pill" data-panel-target="devices">设备</button>
          </div>

          <p class="nav-group">翻译</p>
          <button type="button" class="nav-item" data-panel-target="translation">
            <span class="nav-icon" aria-hidden="true">文</span>
            <span data-i18n="nav.translation">Translation</span>
          </button>

          <p class="nav-group">通知与外观</p>
          <button type="button" class="nav-item" data-panel-target="notifications">
            <span class="nav-icon" aria-hidden="true">◐</span>
            <span data-i18n="nav.notifications">Notifications</span>
          </button>
          <div class="nav-sub">
            <button type="button" class="sub-pill" data-panel-target="notifications">通知</button>
            <button type="button" class="sub-pill" data-panel-target="focus">专注</button>
            <button type="button" class="sub-pill" data-panel-target="appearance">外观</button>
            <button type="button" class="sub-pill" data-panel-target="interface">界面</button>
            <button type="button" class="sub-pill" data-panel-target="preferences">偏好</button>
          </div>

          <p class="nav-group">账户与安全</p>
          <button type="button" class="nav-item" data-panel-target="security">
            <span class="nav-icon" aria-hidden="true">◇</span>
            <span data-i18n="nav.security">Security</span>
          </button>
          <div class="nav-sub">
            <button type="button" class="sub-pill" data-panel-target="membership">会员</button>
            <button type="button" class="sub-pill" data-panel-target="backup">备份</button>
            <button type="button" class="sub-pill" data-panel-target="security">安全</button>
          </div>

          <p class="nav-group">关于</p>
          <button type="button" class="nav-item" data-panel-target="about">
            <span class="nav-icon" aria-hidden="true">i</span>
            <span data-i18n="nav.about">About</span>
          </button>
        </nav>"""

m = re.search(r'<nav class="settings-nav">.*?</nav>', html, re.S)
html = html[:m.start()] + NAV + html[m.end():]

# ---------------------------------------------------------------- 2) 工作台面板
WORKBENCH = '''<section class="settings-panel active" data-panel="workbench" aria-labelledby="panel_title">
          <div class="wb-hero">
            <div class="wb-hero-text">
              <p class="eyebrow">Falo 工作台</p>
              <h2>连接、翻译、专注，一个屏幕搞定</h2>
              <p>左边选要管的东西；这里看当前连接、最近会话和常用动作。改完记得点右上角保存。</p>
              <div class="wb-actions">
                <button type="button" class="primary-action" data-jump-panel="translation">开始翻译</button>
                <button type="button" class="secondary" data-jump-panel="accounts">管理账号</button>
                <button type="button" class="secondary" data-jump-panel="focus">开启专注</button>
              </div>
            </div>
            <div class="wb-ring-wrap">
              <span class="ring" style="--p: 0"><b id="wb_ring_value">0</b></span>
              <small>活跃会话</small>
            </div>
          </div>

          <div class="wb-grid">
            <section class="section-surface">
              <div class="section-heading">
                <div>
                  <p class="eyebrow">状态</p>
                  <h2>连接与偏好</h2>
                </div>
              </div>
              <ul class="wb-status">
                <li><span class="dot" id="wb_dot_accounts"></span>账号 <strong id="wb_accounts">—</strong></li>
                <li><span class="dot ok"></span>主题 <strong id="wb_theme">Dark</strong></li>
                <li><span class="dot" id="wb_dot_focus"></span>专注 <strong id="wb_focus">Ready</strong></li>
                <li><span class="dot ok"></span>运行方式 <strong>本地桌面</strong></li>
              </ul>
            </section>
            <section class="section-surface">
              <div class="section-heading">
                <div>
                  <p class="eyebrow">最近</p>
                  <h2>最近会话</h2>
                </div>
                <p>点一下直接跳过去。</p>
              </div>
              <div class="wb-sessions" id="wb_sessions">
                <p class="wb-empty">还没有会话 —— 先去「连接 → 账户」添加一个。</p>
              </div>
            </section>
          </div>
        </section>

        '''

start = html.index('<section class="settings-panel active" data-panel="overview"')
html = html[:start] + WORKBENCH + html[start:]
html = html.replace('<section class="settings-panel active" data-panel="overview"',
                    '<section class="settings-panel" data-panel="overview"', 1)

# ---------------------------------------------------------------- 3) Overview 组件
RING_GRID = '''<div class="ring-grid">
              <button type="button" class="ring-card" data-jump-panel="accounts">
                <span class="ring" style="--p: 12"><b id="overview_accounts">—</b></span>
                <span class="label" data-i18n="overview.metric.spaces">Connected spaces</span>
                <small data-i18n="overview.metric.spacesHint">Manage accounts</small>
              </button>
              <button type="button" class="ring-card" data-jump-panel="focus">
                <span class="ring" style="--p: 45"><b id="overview_focus">Ready</b></span>
                <span class="label" data-i18n="overview.metric.attention">Attention mode</span>
                <small data-i18n="overview.metric.attentionHint">Start a focus session</small>
              </button>
              <button type="button" class="ring-card" data-jump-panel="appearance">
                <span class="ring" style="--p: 70"><b id="overview_theme">Dark</b></span>
                <span class="label" data-i18n="overview.metric.style">Current style</span>
                <small data-i18n="overview.metric.styleHint">Personalize Falo</small>
              </button>
            </div>'''

old_metrics = re.search(r'<div class="metric-grid">.*?</div>\s*</div>', html, re.S)
if old_metrics:
    # metric-grid 内含三个 button 与一个收尾 div，稳妥地用起止标记替换
    block = old_metrics.group(0)
    html = html.replace(block, RING_GRID, 1)

FOCUS = '''<div class="focus-controls">
                <div class="focus-slider-row">
                  <input type="range" id="focus_slider" min="5" max="120" step="5" value="30"
                         aria-label="Focus duration in minutes" />
                  <span class="focus-slider-value" id="focus_slider_value">30 分钟</span>
                  <button type="button" class="primary-action" id="focus_slider_apply">开始专注</button>
                </div>
                <div class="chip-row">
                  <button type="button" class="chip" data-focus-minutes="15">15 分钟</button>
                  <button type="button" class="chip" data-focus-minutes="30">30 分钟</button>
                  <button type="button" class="chip" data-focus-minutes="60">1 小时</button>
                  <button type="button" class="chip" data-focus-minutes="120">2 小时</button>
                </div>
              </div>'''

old_presets = re.search(r'<div class="focus-presets compact-presets"[^>]*>.*?</div>', html, re.S)
if old_presets:
    html = html.replace(old_presets.group(0), FOCUS, 1)

# 额外脚本
if 'falo-extra.js' not in html:
    html = html.replace('</body>', '  <script src="falo-extra.js"></script>\n  </body>', 1)

open(HTML, "w", encoding="utf-8", newline="\n").write(html)
print("index.html：导航 6 组 / 工作台面板 / 环形卡 / 专注滑块 已写入")
