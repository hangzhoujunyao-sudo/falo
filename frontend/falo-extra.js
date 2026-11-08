// Falo 附加交互：工作台落地页 + 专注滑块 + 版本号 + 面板元信息
// 不改上游 main.js，只在其之后做增强；所有原面板与 id 保持原样。
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const text = (el) => (el && el.textContent ? el.textContent.trim() : "");

  // 1) 让 showPanel 认识 workbench（上游 panelMeta 没有这个 key）
  const i18n = window.FaloI18n;
  if (i18n && typeof i18n.panelMeta === "function" && !i18n.__faloPatched) {
    const orig = i18n.panelMeta.bind(i18n);
    i18n.panelMeta = function (name) {
      if (name === "workbench") return ["工作台", "连接状态、最近会话与一键开始"];
      return orig(name);
    };
    i18n.__faloPatched = true;
  }

  // 2) 工作台：同步 Overview 里的实时值
  function syncWorkbench() {
    const accounts = text($("overview_accounts"));
    const theme = text($("overview_theme"));
    const focus = text($("overview_focus"));

    if ($("wb_accounts") && accounts) $("wb_accounts").textContent = accounts;
    if ($("wb_theme") && theme) $("wb_theme").textContent = theme;
    if ($("wb_focus") && focus) $("wb_focus").textContent = focus;

    const num = Number.parseInt(accounts, 10);
    const ring = document.querySelector(".wb-ring-wrap .ring");
    if (ring && Number.isFinite(num)) {
      ring.style.setProperty("--p", String(Math.min(100, num * 12)));
      if ($("wb_ring_value")) $("wb_ring_value").textContent = String(num);
    }
    if ($("wb_dot_accounts")) $("wb_dot_accounts").classList.toggle("ok", Number.isFinite(num) && num > 0);
    if ($("wb_dot_focus")) $("wb_dot_focus").classList.toggle("ok", !!focus && focus.toLowerCase() !== "ready");
  }

  // 3) 最近会话：从账号列表 DOM 生成胶囊
  function renderSessions() {
    const list = $("wb_sessions");
    if (!list) return;
    const names = Array.from(document.querySelectorAll("#accounts-list .account-name, #accounts-list strong"))
      .map((n) => n.textContent.trim())
      .filter((n) => n && n.length < 40);
    const uniq = [...new Set(names)].slice(0, 8);
    if (!uniq.length) return;
    list.innerHTML = "";
    for (const name of uniq) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "wb-session";
      const dot = document.createElement("i");
      chip.appendChild(dot);
      chip.appendChild(document.createTextNode(name));
      chip.addEventListener("click", () => {
        const nav = document.querySelector('[data-panel-target="accounts"]');
        if (nav) nav.click();
      });
      list.appendChild(chip);
    }
  }

  // 4) 专注滑块：拖动显示，应用时复用上游 focus_custom 流程
  function wireSlider() {
    const slider = $("focus_slider");
    const out = $("focus_slider_value");
    const apply = $("focus_slider_apply");
    if (!slider || !out) return;

    const label = () => {
      const v = Number(slider.value);
      out.textContent = v >= 60 && v % 60 === 0 ? v / 60 + " 小时" : v + " 分钟";
      for (const chip of document.querySelectorAll(".chip[data-focus-minutes]")) {
        chip.classList.toggle("active", Number(chip.dataset.focusMinutes) === v);
      }
    };
    slider.addEventListener("input", label);
    label();

    for (const chip of document.querySelectorAll(".chip[data-focus-minutes]")) {
      chip.addEventListener("click", () => {
        slider.value = chip.dataset.focusMinutes;
        label();
      });
    }

    if (apply) {
      apply.addEventListener("click", () => {
        const input = $("focus_custom");
        const start = $("focus_custom_start");
        if (input && start) {
          input.value = String(slider.value);
          start.click();
        }
      });
    }
  }

  // 5) 版本号：上游靠 Rust 注入 window.__faloAppVersion，这里补上
  async function applyVersion() {
    try {
      let version = "";
      const app = window.__TAURI__ && window.__TAURI__.app;
      if (app && typeof app.getVersion === "function") {
        try { version = (await app.getVersion()) || ""; } catch (e) { version = ""; }
      }
      if (!version) version = "2.6.5";   // 与应用版本保持一致的兜底值
      if (version === "0.0.0") version = "2.6.5";
      window.__faloAppVersion = version;
      for (const el of document.querySelectorAll("[data-version-ref]")) {
        el.textContent = "Falo " + version;
      }
      const bar = document.querySelector(".window-titlebar-name");
      if (bar && /v[\d.]+/.test(bar.textContent)) {
        bar.textContent = bar.textContent.replace(/v[\d.]+/, "v" + version);
      }
      if (/v[\d.]+/.test(document.title)) {
        document.title = document.title.replace(/v[\d.]+/, "v" + version);
      }
    } catch (err) {
      /* 版本号拿不到也不影响使用 */
    }
  }


  // 7) 自带的乐观面板切换：上游 init 万一中断，导航也不会失灵
  function faloShowPanel(name) {
    let hit = false;
    for (const panel of document.querySelectorAll("[data-panel]")) {
      const on = panel.dataset.panel === name;
      panel.hidden = !on;
      panel.classList.toggle("active", on);
      if (on) hit = true;
    }
    if (!hit) return;
    for (const b of document.querySelectorAll("[data-panel-target]")) {
      const on = b.dataset.panelTarget === name;
      b.classList.toggle("active", on);
      b.setAttribute("aria-current", on ? "page" : "false");
    }
    let meta = [name, ""];
    if (window.FaloI18n && typeof window.FaloI18n.panelMeta === "function") {
      meta = window.FaloI18n.panelMeta(name) || meta;
    }
    const title = $("panel_title");
    const desc = $("panel_description");
    if (title) title.textContent = meta[0] || "";
    if (desc) desc.textContent = meta[1] || "";
    const save = $("save");
    if (save) save.hidden = name === "about";
    const stage = document.querySelector(".panel-stage");
    if (stage) stage.scrollTop = 0;
    if (name === "workbench") setTimeout(syncWorkbench, 20);
  }
  window.__faloShowPanel = faloShowPanel;
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target.closest("[data-panel-target], [data-jump-panel]");
      if (!target) return;
      const name = target.dataset.panelTarget || target.dataset.jumpPanel;
      if (name) faloShowPanel(name);
    },
    true,
  );

  function boot() {
    syncWorkbench();
    renderSessions();
    wireSlider();
    applyVersion();
    setTimeout(syncWorkbench, 800);
    setTimeout(renderSessions, 1200);
    setTimeout(applyVersion, 600);
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-panel-target]");
    if (target && target.dataset.panelTarget === "workbench") setTimeout(syncWorkbench, 30);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
