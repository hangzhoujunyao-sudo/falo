 1:1
    var TRANSLATION_ENGINES = [
      "google_web",
      "google",
      "google_chrome",
      "bing",
      "yandex",
      "volc",
      "deeplx",
      "backup",
      "deepl",
      "deepseek",
      "volc_deepseek",
      "qwen",
      "hunyuan",
      "glm",
      "chatgpt",
      "openai_custom",
      "deepseek_custom",
    ];
    var CHAT_HISTORY_TRANSLATION_ENGINES = [
      "google_web",
      "google",
      "google_chrome",
      "bing",
      "yandex",
      "volc",
      "deeplx",
      "backup",
      "deepl",
      "chatgpt",
      "openai_custom",
      "deepseek_custom",
    ];
    var PRO_RETRANSLATE_ENGINE_ORDER = [
      "volc_deepseek",
      "chatgpt",
      "openai_custom",
      "deepseek_custom",
      "deeplx",
      "deepseek",
      "volc",
      "deepl",
      "qwen",
      "hunyuan",
      "glm",
      "google_web",
      "google",
      "google_chrome",
      "bing",
      "yandex",
      "backup",
    ];
    var RETRANSLATE_SVG =
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path></svg>';
    var scanTimer = null;
    var STYLE_ID = "whatsnow-translate-style-v2";
    var started = false;
    var pendingCfg = null;
    var busyHosts = typeof WeakSet !== "undefined" ? new WeakSet() : null;
    var queue = [];
    var active = 0;
    var MAX_ACTIVE = 4;
    var rowIo = null;
    var panelMo = null;
    var observedPanel = null;
    var observedRows = typeof WeakSet !== "undefined" ? new WeakSet() : null;
    var waIntersectingMessageRows = typeof Set !== "undefined" ? new Set() : null;
    var PLUGIN_UI_SELECTOR =
      ".translated-text, .wa-retranslate-btn, .wa-translating-status, .wa-chat-switch-engine-btn";
    var CHAT_HISTORY_PRO_ENGINES = ["deepl", "chatgpt", "openai_custom", "deepseek_custom"];
    var lastScanLogAt = 0;

    function docRoot() {
      return document.head || document.documentElement || document.body || null;
    }

    function isPluginUiNode(node) {
      if (!node) return true;
      try {
        if (node.nodeType === 1) {
          if (node.matches && node.matches(PLUGIN_UI_SELECTOR)) return true;
          if (node.closest && node.closest(PLUGIN_UI_SELECTOR)) return true;
          return false;
        }
        var parent = node.parentElement;
        if (!parent) return true;
        return !!(parent.closest && parent.closest(PLUGIN_UI_SELECTOR));
      } catch (_) {
        return false;
      }
    }

    function mutationsAreOnlyPluginUi(mutations) {
      if (!mutations || !mutations.length) return false;
      var sawNode = false;
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (!m) continue;
        var lists = [m.addedNodes, m.removedNodes];
        for (var li = 0; li < lists.length; li++) {
          var nodes = lists[li];
          if (!nodes || !nodes.length) continue;
          for (var j = 0; j < nodes.length; j++) {
            sawNode = true;
            if (!isPluginUiNode(nodes[j])) return false;
          }
        }
      }
      return sawNode;
    }

    function collectTextElementsForVisibleScan(searchRoot) {
      var SELECTOR = 'span[data-testid~="selectable-text"]';
      try {
        if (waIntersectingMessageRows) {
          waIntersectingMessageRows.forEach(function (row) {
            if (!row || !row.isConnected) waIntersectingMessageRows.delete(row);
          });
        }
      } catch (_) {}

      if (waIntersectingMessageRows && waIntersectingMessageRows.size > 0) {
        var list = [];
        var seen = typeof Set !== "undefined" ? new Set() : null;
        waIntersectingMessageRows.forEach(function (row) {
          if (!row || !row.isConnected) return;
          if (searchRoot && searchRoot !== document && !searchRoot.contains(row)) return;
          var spans;
          try {
            spans = row.querySelectorAll(SELECTOR);
          } catch (_) {
            return;
          }
          for (var i = 0; i < spans.length; i++) {
            var el = spans[i];
            if (!el) continue;
            if (seen) {
              if (seen.has(el)) continue;
              seen.add(el);
            }
            list.push(el);
          }
        });
        if (list.length > 0) return list;
      }
      try {
        return Array.prototype.slice.call((searchRoot || document).querySelectorAll(SELECTOR));
      } catch (_) {
        return [];
      }
    }

    function resetIntersectionObserver() {
      try {
        if (rowIo) rowIo.disconnect();
      } catch (_) {}
      rowIo = null;
      observedRows = typeof WeakSet !== "undefined" ? new WeakSet() : null;
      try {
        if (waIntersectingMessageRows) waIntersectingMessageRows.clear();
      } catch (_) {}
    }

    function normalizeTextColor(v) {
      var s = String(v || "").trim();
      if (/^#[0-9a-fA-F]{6}$/.test(s)) return s;
      if (/^#[0-9a-fA-F]{3}$/.test(s)) {
        return (
          "#" +
          s.charAt(1) +
          s.charAt(1) +
          s.charAt(2) +
          s.charAt(2) +
          s.charAt(3) +
          s.charAt(3)
        );
      }
      return "#333333";
    }

    function normalizeFontSize(v) {
      var n = parseInt(v, 10);
      if (!Number.isFinite(n)) return 14;
      return Math.min(28, Math.max(10, n));
    }

    // WATransChat parity: user color/size win over dark-theme defaults.
    // Apply to already-rendered nodes immediately when Settings change.
    function refreshTranslatedAppearance() {
      var color = normalizeTextColor(cfg.textColor);
      var size = normalizeFontSize(cfg.fontSize);
      var sizeCss = size + "px";
      cfg.textColor = color;
      cfg.fontSize = size;
      try {
        document.documentElement.style.setProperty("--whatsnow-tr-color", color);
        document.documentElement.style.setProperty("--whatsnow-tr-font-size", sizeCss);
      } catch (_) {}
      try {
        document.querySelectorAll(".translated-text").forEach(function (el) {
          el.style.fontSize = sizeCss;
          el.style.lineHeight = "1.5";
        });
        document
          .querySelectorAll(
            ".translated-text > .selectable-text.copyable-text:not(.wa-translating-status)"
          )
          .forEach(function (el) {
            el.style.color = color;
            el.style.fontSize = sizeCss;
            el.style.lineHeight = "1.5";
          });
      } catch (_) {}
    }

    function ensureStyle() {
      try {
        var existing = document.getElementById(STYLE_ID);
        if (existing) {
          refreshTranslatedAppearance();
          return true;
        }
        var parent = docRoot();
        if (!parent) return false;
        var s = document.createElement("style");
        s.id = STYLE_ID;
        // Color/size via CSS vars so Settings updates take effect without reload.
        // Do NOT force a dark-mode color — that fought the user's translation color.
        s.textContent =
          ".translated-text{display:block;margin:4px 0 0 0;" +
          "font-size:var(--whatsnow-tr-font-size,14px);line-height:1.5}" +
          ".translated-text > .selectable-text.copyable-text{" +
          "user-select:text;border-top:1px dashed #bbb;margin:4px 0 0 0;padding:4px 0 0 0;" +
          "white-space:pre-wrap;color:var(--whatsnow-tr-color,#333333);" +
          "font-size:var(--whatsnow-tr-font-size,14px);line-height:1.5;" +
          "min-width:100px;box-sizing:border-box}" +
          "body.dark .translated-text > .selectable-text.copyable-text," +
          ".dark .translated-text > .selectable-text.copyable-text{border-top-color:#555}" +
          ".translated-text > .selectable-text.wa-translating-status{opacity:0.7}" +
          /* WATransChat