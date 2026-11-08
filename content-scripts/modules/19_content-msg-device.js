 + styles.css
 * Infer contact client type (iOS / Android / Web) from WhatsApp message id prefixes.
 * Bubble hover badge + conversation header avatar badge.
 */
(function () {
  "use strict";
  if (window.__faloMsgDeviceInstalled) return;
  window.__faloMsgDeviceInstalled = true;

  function cfg() {
    try {
      var h = window.__faloTranslateHelpers;
      if (h && h.getCfg) return h.getCfg() || {};
    } catch (_) {}
    return window.__faloTranslateCfg || {};
  }

  function canCore() {
    try {
      return !!(window.__faloCan && window.__faloCan("core_translate"));
    } catch (_) {}
    return false;
  }

  function featureOn() {
    if (!canCore()) return false;
    var c = cfg();
    return c.showDevice !== false;
  }

  var STYLE_ID = "falo-msg-device-style";
  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var parent = document.head || document.documentElement;
    if (!parent) return;
    var s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent =
      '[data-testid="msg-container"]:has(> .wa-msg-device-badge),' +
      'div[role="row"] > div[data-id]:has(.wa-msg-device-badge),' +
      'div[role="row"]:has(.wa-msg-device-badge){position:relative;overflow:visible!important}' +
      ".wa-msg-device-badge{display:none;position:absolute;z-index:250;box-sizing:border-box;" +
      "align-items:center;justify-content:center;margin:0;padding:0 6px;height:18px;border-radius:9px;" +
      "font-size:11px;font-weight:500;line-height:18px;letter-spacing:0.02em;color:#8696a0;" +
      "background:rgba(255,255,255,0.78);border:1px solid rgba(11,20,26,0.08);" +
      "box-shadow:0 1px 2px rgba(11,20,26,0.05);white-space:nowrap;user-select:none;pointer-events:none}" +
      ".wa-msg-device-badge.wa-msg-device-in{left:auto;right:calc(100% + 6px);top:50%;transform:translateY(-50%)}" +
      ".wa-msg-device-badge.wa-msg-device-out{right:auto;left:calc(100% + 6px);top:50%;transform:translateY(-50%)}" +
      'div[role="row"] > div[data-id]:hover .wa-msg-device-badge,' +
      '[data-testid="msg-container"]:hover > .wa-msg-device-badge{display:inline-flex!important}' +
      "body.dark .wa-msg-device-badge,html[data-color-mode=\"dark\"] .wa-msg-device-badge," +
      ".dark .wa-msg-device-badge{color:#8696a0;background:rgba(17,27,33,0.78);" +
      "border-color:rgba(255,255,255,0.08);box-shadow:0 1px 2px rgba(0,0,0,0.18)}" +
      ".wa-header-avatar-device-host{position:relative!important;overflow:visible!important}" +
      'header[data-testid="conversation-header"] [role="button"]:has(.wa-header-avatar-device-host),' +
      'header[data-testid="conversation-header"] [role="button"]:has(.wa-header-device-badge){overflow:visible!important}' +
      ".wa-header-device-badge{position:absolute!important;right:-4px;bottom:-4px;z-index:5;" +
      "display:inline-flex!important;align-items:center;justify-content:center;box-sizing:border-box;" +
      "min-width:16px;max-width:56px;height:16px;padding:0 4px;margin:0!important;border-radius:8px;" +
      "border:1.5px solid #fff;font-size:9px;font-weight:500;line-height:1;letter-spacing:0;color:#667781;" +
      "background:#e9edef;box-shadow:0 1px 2px rgba(11,20,26,0.12);white-space:nowrap;overflow:hidden;" +
      "text-overflow:ellipsis;user-select:none;pointer-events:none}" +
      "body.dark .wa-header-device-badge,html[data-color-mode=\"dark\"] .wa-header-device-badge," +
      ".dark .wa-header-device-badge{color:#8696a0;background:#2a3942;border-color:#111b21}";
    parent.appendChild(s);
  }

  function getConversationRoot() {
    return (
      document.querySelector('[data-testid="conversation-panel-messages"]') ||
      document.querySelector('[data-scrolltracepolicy="wa.web.conversation.messages"]') ||
      document.querySelector('[data-testid="conversation-panel-body"]')
    );
  }

  function getChatMessageRows(root) {
    var panel = root || getConversationRoot();
    if (!panel) return [];
    return Array.from(panel.querySelectorAll("[data-id]")).filter(function (el) {
      try {
        if (!el || !panel.contains(el)) return false;
        var parentWithId =
          el.parentElement &&
          el.parentElement.closest &&
          el.parentElement.closest("[data-id]");
        if (parentWithId && panel.contains(parentWithId)) return false;
        if (el.querySelector('[data-testid="call-log-system-message"]')) return false;
        return true;
      } catch (_) {
        return false;
      }
    });
  }

  function getMsgDirectionPrimary(msgEl) {
    if (!msgEl) return "unknown";
    try {
      if (msgEl.querySelector('[data-testid="tail-out"], [data-icon="tail-out"]')) return "out";
      if (msgEl.querySelector('[data-testid="tail-in"], [data-icon="tail-in"]')) return "in";
      if (
        msgEl.querySelector(
          '[data-icon="msg-check"], [data-icon="msg-dblcheck"], [data-icon="msg-time"],' +
            '[data-icon="status-check"], [data-icon="status-dblcheck"], [data-icon="status-time"],' +
            '[data-testid="msg-check"], [data-testid="msg-dblcheck"]'
        )
      ) {
        return "out";
      }
    } catch (_) {}
    return "unknown";
  }

  function detectAlignDirection(msgEl) {
    try {
      var el = (msgEl && msgEl.querySelector('[data-testid="msg-container"]')) || msgEl;
      for (var i = 0; i < 6 && el; i += 1) {
        var s = window.getComputedStyle(el);
        if (s.alignItems === "flex-end" || s.justifyContent === "flex-end") return "out";
        if (s.alignItems === "flex-start" || s.justifyContent === "flex-start") return "in";
        el = el.parentElement;
      }
    } catch (_) {}
    return "";
  }

  function hasOutgoingBubbleTint(msgEl) {
    try {
      var container = msgEl && msgEl.querySelector('[data-testid="msg-container"]');
      if (!container) return false;
      var nodes = container.querySelectorAll("div");
      var limit = Math.min(nodes.length, 48);
      for (var i = 0; i < limit; i += 1) {
        var bg = window.getComputedStyle(nodes[i]).backgroundColor || "";
        if (
          bg === "rgb(217, 253, 211)" ||
          bg === "rgb(213, 249, 207)" ||
          bg === "rgb(5, 97, 98)" ||
          bg === "rgb(0, 92, 75)"
        ) {
          return true;
        }
        var m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
        if (!m) continue;
        var r = Number(m[1]);
        var g = Number(m[2]);
        var b = Number(m[3]);
        if (g > 200 && r > 170 && b > 170 && g >= r && g >= b && g - Math.min(r, b) >= 20) {
          return true;
        }
      }
    } catch (_) {}
    return false;
  }

  function detectVisualDirection(msgEl) {
    try {
      var container =
        (msgEl && msgEl.querySelector('[data-testid="msg-container"]')) || msgEl;
      var panel = getConversationRoot();
      if (!container || !panel) return "";
      var cr = container.getBoundingClientRect();
      var pr = panel.getBoundingClientRect();
      if (!(pr.width > 0) || !(cr.width > 0)) return "";
      return cr.left + cr.width / 2 > pr.left + pr.width / 2 ? "out" : "in";
    } catch (_) {
      return "";
    }
  }

  function resolveMsgDirection(msgEl) {
    var primary = getMsgDirectionPrimary(msgEl);
    if (primary === "out" || primary === "in") return primary;
    var align = detectAlignDirection(msgEl);
    if (align) return align;
    if (hasOutgoingBubbleTint(msgEl)) return "out";
    var visual = detectVisualDirection(msgEl);
    if (visual) return visual;
    return "unknown";
  }

  var currentUiLang = "zh";
  var BADGE_CLASS = "wa-msg-device-badge";
  var HEADER_BADGE_CLASS = "wa-header-device-badge";
  var MARK_ATTR = "data-wa-device-marked";
  var ANDROID_ID_MIN_LEN = 26;

  function deviceLabel(device, uiLang) {
    var ui = String(uiLang || currentUiLang || "zh");
    if (device === "ios") return "iPhone";
    if (device === "android") return "Android";
    if (device === "web") return "Web";
    return ui.indexOf("zh") === 0 ? "未知" : "Unknown";
  }

  function deviceShortLabel(device, uiLang) {
    return deviceLabel(device, uiLang);
  }

  function extractMessageIdPart(dataId) {
    var raw = String(dataId || "").trim();
    if (!raw) return "";
    var parts = raw.split("_");
    return parts.length ? String(parts[parts.length - 1] || "").trim() : "";
  }

  /**
   * WhatsApp client heuristics from message id:
   * - 3EB… → Web
   * - 2A… / 3A… → iOS
   * - length > 26 → Android
   */
  function detectDeviceFromMessageId(messageId) {
    var id = String(messageId || "").trim();
    if (!id) return "";
    if (id.indexOf("3EB") === 0) return "web";
    var prefix2 = id.substring(0, 2);
    if (prefix2 === "2A" || prefix2 === "3A") return "ios";
    if (id.length > ANDROID_ID_MIN_LEN) return "android";
    return "";
  }

  function detectDeviceFromMsgEl(msgEl) {
    if (!msgEl) return "";
    try {
      var dataId = msgEl.getAttribute && msgEl.getAttribute("data-id");
      return detectDeviceFromMessageId(extractMessageIdPart(dataId));
    } catch (_) {
      return "";
    }
  }

  function ensureBadgeEl(host, className) {
    var badge = host.querySelector(":scope > ." + className);
    if (badge) return badge;
    badge = document.createElement("span");
    badge.className = className;
    badge.setAttribute("aria-hidden", "true");
    return badge;
  }

  function findBadgeHost(msgEl) {
    if (!msgEl) return null;
    try {
      var container = msgEl.querySelector('[data-testid="msg-container"]');
      if (container) return container;
    } catch (_) {}
    return msgEl;
  }

  function mountBadgeOnMessage(msgEl, device) {
    if (!msgEl || !device) return;
    var host = findBadgeHost(msgEl);
    if (!host) return;

    try {
      msgEl.querySelectorAll("." + BADGE_CLASS).forEach(function (el) {
        try {
          el.remove();
        } catch (_) {}
      });
    } catch (_) {}

    var dir = resolveMsgDirection(msgEl);
    var isOut = dir === "out";
    var badge = ensureBadgeEl(host, BADGE_CLASS);
    badge.setAttribute("data-wa-device", device);
    badge.classList.toggle("wa-msg-device-out", isOut);
    badge.classList.toggle("wa-msg-device-in", !isOut);
    badge.textContent = deviceLabel(device);
    badge.title =
      currentUiLang.indexOf("zh") === 0
        ? "根据消息 ID 推断的发送端设备"
        : "Client device inferred from message id";

    if (!badge.isConnected) {
      host.appendChild(badge);
    }
    try {
      msgEl.setAttribute(MARK_ATTR, device);
    } catch (_) {}
  }

  function removeStrayHeaderDeviceBadges(keepHost) {
    try {
      document
        .querySelectorAll('header[data-testid="conversation-header"] .' + HEADER_BADGE_CLASS)
        .forEach(function (el) {
          try {
            if (keepHost && keepHost.contains(el)) return;
            el.remove();
          } catch (_) {}
        });
      document
        .querySelectorAll(
          'header[data-testid="conversation-header"] .wa-header-avatar-device-host'
        )
        .forEach(function (el) {
          try {
            if (keepHost && el === keepHost) return;
            if (!el.querySelector(":scope > ." + HEADER_BADGE_CLASS)) {
              el.classList.remove("wa-header-avatar-device-host");
            }
          } catch (_) {}
        });
    } catch (_) {}
  }

  function findHeaderAvatarHost() {
    var header = document.querySelector('header[data-testid="conversation-header"]');
    if (!header) return null;
    try {
      var info = header.querySelector('[data-testid="conversation-info-header"]');
      var sized = Array.from(header.querySelectorAll('[style*="--x-height"]')).find(function (el) {
        try {
          if (info && info.contains(el)) return false;
          var h =
            parseFloat((el.style && el.style.getPropertyValue("--x-height")) || "") ||
            parseFloat(
              (String(el.getAttribute("style") || "").match(/--x-height:\s*(\d+)/) || [])[1] || ""
            ) ||
            0;
          return h >= 32;
        } catch (_) {
          return false;
        }
      });
      if (sized) return sized;

      var profileBtn = Array.from(header.querySelectorAll('[role="button"]')).find(function (btn) {
        try {
          if (info && info.contains(btn)) return false;
          return !!(btn.querySelector("svg") || btn.querySelector("img"));
        } catch (_) {
          return false;
        }
      });
      if (profileBtn) {
        return (
          profileBtn.querySelector('[style*="--x-height"]') ||
          (profileBtn.querySelector("svg") && profileBtn.querySelector("svg").parentElement) ||
          profileBtn
        );
      }

      var svg = header.querySelector('svg[height="40"], svg[width="40"]');
      if (svg && !(info && info.contains(svg))) {
        return svg.closest('[style*="--x-height"]') || svg.parentElement || svg;
      }
    } catch (_) {}
    return null;
  }

  function updateHeaderDeviceBadge(device) {
    var host = findHeaderAvatarHost();
    removeStrayHeaderDeviceBadges(host);
    if (!host) return;

    var badge = host.querySelector(":scope > ." + HEADER_BADGE_CLASS);
    if (!device) {
      if (badge) {
        try {
          badge.remove();
        } catch (_) {}
      }
      try {
        host.classList.remove("wa-header-avatar-device-host");
      } catch (_) {}
      return;
    }

    try {
      host.classList.add("wa-header-avatar-device-host");
    } catch (_) {}
    if (!badge) {
      badge = document.createElement("span");
      badge.className = HEADER_BADGE_CLASS;
      host.appendChild(badge);
    }
    badge.setAttribute("data-wa-device", device);
    var ui = currentUiLang || "zh";
    badge.textContent = deviceShortLabel(device, ui);
    badge.title =
      deviceLabel(device, ui) +
      " · " +
      (ui.indexOf("zh") === 0
        ? "根据最近入站消息 ID 推断的设备"
        : "Device inferred from latest incoming message id");
  }

  function findLatestIncomingDevice(rows) {
    var list = Array.isArray(rows) ? rows : getChatMessageRows();
    for (var i = list.length - 1; i >= 0; i -= 1) {
      var row = list[i];
      if (resolveMsgDirection(row) !== "in") continue;
      var device = detectDeviceFromMsgEl(row);
      if (device) return device;
    }
    return "";
  }

  function clearAllDeviceBadges() {
    try {
      document.querySelectorAll("." + BADGE_CLASS).forEach(function (el) {
        try {
          el.remove();
        } catch (_) {}
      });
      document.querySelectorAll("[" + MARK_ATTR + "]").forEach(function (el) {
        try {
          el.removeAttribute(MARK_ATTR);
        } catch (_) {}
      });
      updateHeaderDeviceBadge("");
    } catch (_) {}
  }

  function scanMessageDevices() {
    if (!featureOn()) {
      clearAllDeviceBadges();
      return;
    }
    ensureStyles();
    var rows = getChatMessageRows();
    var latestIn = "";
    for (var i = 0; i < rows.length; i += 1) {
      var row = rows[i];
      var device = detectDeviceFromMsgEl(row);
      if (!device) continue;
      if (resolveMsgDirection(row) === "in") latestIn = device;
      var marked = row.getAttribute && row.getAttribute(MARK_ATTR);
      var existing = row.querySelector("." + BADGE_CLASS);
      var dir = resolveMsgDirection(row);
      var dirOk = !!(
        existing &&
        ((dir === "out" && existing.classList.contains("wa-msg-device-out")) ||
          (dir !== "out" && existing.classList.contains("wa-msg-device-in")))
      );
      if (marked === device && existing && dirOk) continue;
      mountBadgeOnMessage(row, device);
    }
    updateHeaderDeviceBadge(latestIn || findLatestIncomingDevice(rows));
  }

  function refreshAllDeviceLabels() {
    try {
      document.querySelectorAll("." + BADGE_CLASS).forEach(function (el) {
        var device = el.getAttribute("data-wa-device") || "";
        if (!device) return;
        el.textContent = deviceLabel(device);
      });
      document.querySelectorAll("." + HEADER_BADGE_CLASS).forEach(function (el) {
        var device = el.getAttribute("data-wa-device") || "";
        if (!device) return;
        el.textContent = deviceShortLabel(device);
        el.title =
          deviceLabel(device) +
          " · " +
          (currentUiLang.indexOf("zh") === 0
            ? "根据最近入站消息 ID 推断的设备"
            : "Device inferred from latest incoming message id");
      });
    } catch (_) {}
  }

  var scanTimer = null;
  function scheduleScan() {
    if (scanTimer) return;
    scanTimer = setTimeout(function () {
      scanTimer = null;
      try {
        scanMessageDevices();
      } catch (_) {}
    }, 350);
  }

  try {
    var bus =
      (window.__faloTranslateHelpers &&
        window.__faloTranslateHelpers.domMutationBus) ||
      window.__faloDomMutationBus;
    if (bus && typeof bus.register === "function") {
      bus.register(scheduleScan, { id: "msg-device" });
    } else {
      var observer = new MutationObserver(function () {
        scheduleScan();
      });
      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      } else {
        document.addEventListener("DOMContentLoaded", function () {
          try {
            observer.observe(document.body, { childList: true, subtree: true });
          } catch (_) {}
        });
      }
    }
  } catch (_) {}

  scheduleScan();
  setInterval(function () {
    try {
      scanMessageDevices();
    } catch (_) {}
  }, 2500);

  window.addEventListener("falo-translate-config", function () {
    scheduleScan();
  });

  try {
    window.__faloMsgDevice = {
      detectDeviceFromMessageId: detectDeviceFromMessageId,
      extractMessageIdPart: extractMessageIdPart,
      refreshLabels: refreshAllDeviceLabels,
      scan: scanMessageDevices,
    };
    window.__faloTranslateHelpers = Object.assign(window.__faloTranslateHelpers || {}, {
      detectWaMsgDevice: detectDeviceFromMessageId,
      extractWaMsgIdPart: extractMessageIdPart,
      refreshWaMsgDeviceLabels: refreshAllDeviceLabels,
      scanWaMsgDevices: scanMessageDevices,
    });
  } catch (_) {}
})();