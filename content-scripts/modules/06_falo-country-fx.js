)
  // ---------------------------------------------------------------------------
  (function setupHelperModules() {
    function cfg() {
      return window.__faloTranslateCfg || {};
    }
    function canCore() {
      try {
        return !!(window.__faloCan && window.__faloCan("core_translate"));
      } catch (_) {}
      return false;
    }

    // Strip legacy simplified bars if a hot reload left them behind.
    function scrubLegacyUi() {
      try {
        ["falo-phrases-bar", "falo-tr-btn", "falo-country-tip"].forEach(function (id) {
          var el = document.getElementById(id);
          if (el) el.remove();
        });
        document
          .querySelectorAll(
            ".falo-customer-lang-btn, .falo-customer-lang-popup, .falo-followup-btn"
          )
          .forEach(function (el) {
            try {
              el.remove();
            } catch (_) {}
          });
      } catch (_) {}
    }

    // Business badge — lightweight markers
    function annotateListExtras() {
      var c = cfg();
      if (!canCore()) return;
      if (c.showBusinessBadge || c.showBadge) {
        document.querySelectorAll('[data-testid="cell-frame-container"]').forEach(function (cell) {
          if (cell.getAttribute("data-wn-badge")) return;
          var biz = cell.querySelector('[data-testid="business-name"], [data-testid="business"]');
          if (!biz) return;
          cell.setAttribute("data-wn-badge", "1");
          var mark = document.createElement("span");
          var badge = "商";
          try {
            var i18n = window.__faloPageI18n;
            if (i18n && i18n.t) {
              badge = i18n.t(i18n.getUiLang ? i18n.getUiLang() : "zh", "bizBadge", "商");
            }
          } catch (_) {}
          mark.textContent = badge;
          mark.style.cssText =
            "margin-left:4px;font-size:10px;padding:0 4px;border-radius:4px;background:#6366f1;color:#fff;";
          try {
            biz.appendChild(mark);
          } catch (_) {}
        });
      }
    }

    scrubLegacyUi();
    setInterval(function () {
      try {
        scrubLegacyUi();
        annotateListExtras();
      } catch (_) {}
    }, 2500);
  })();

  // Phase 3 AI/voice: 1:1 page modules (