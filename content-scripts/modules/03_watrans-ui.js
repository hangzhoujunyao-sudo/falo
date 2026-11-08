 (.wa-inline-translate-btn).
    // Keep this as a legacy cleanup only — never recreate #whatsnow-tr-btn.
    function updateComposeButton() {
      try {
        var legacy = document.getElementById("whatsnow-tr-btn");
        if (legacy && legacy.parentNode) legacy.parentNode.removeChild(legacy);
      } catch (_) {}
    }

    function buildLexicalComposerStateJson(text) {
      var lines = String(text == null ? "" : text).split(/\r\n|\n|\r/);
      var children = [];
      for (var i = 0; i < lines.length; i++) {
        if (i > 0) children.push({ type: "linebreak", version: 1 });
        if (lines[i]) {
          children.push({
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
            text: lines[i],
            type: "text",
            version: 1,
          });
        }
      }
      return {
        root: {
          children: [
            {
              children: children,
              direction: null,
              format: "",
              indent: 0,
              type: "paragraph",
              version: 1,
            },
          ],
          direction: null,
          format: "",
          indent: 0,
          type: "root",
          version: 1,
        },
      };
    }

    function setEditableText(el, text) {
      if (!el) return;
      var raw = text == null ? "" : String(text);
      try {
        el.focus();
      } catch (_) {}
      try {
        var lex = el.__lexicalEditor;
        if (lex && typeof lex.parseEditorState === "function" && typeof lex.setEditorState === "function") {
          var state = lex.parseEditorState(JSON.stringify(buildLexicalComposerStateJson(raw)));
          lex.setEditorState(state);
          try {
            el.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true }));
          } catch (_) {}
          return;
        }
      } catch (_) {}
      try {
        var h = window.__whatsnowTranslateHelpers;
        if (h && typeof h.setComposerTextViaLexical === "function" && h.setComposerTextViaLexical(el, raw)) {
          try {
            el.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true }));
          } catch (_) {}
          return;
        }
        if (h && typeof h.pasteReplaceText === "function") {
          h.pasteReplaceText(el, raw);
          return;
        }
      } catch (_) {}
      try {
        document.execCommand("selectAll", false, null);
        document.execCommand("insertText", false, raw);
      } catch (_) {
        el.textContent = raw;
        el.dispatchEvent(new InputEvent("input", { bubbles: true }));
      }
    }

    function translateCompose() {
      if (!cfg.enabled || !cfg.compose || !canTranslate()) return;
      var input = findComposeInput(findComposeRoot());
      if (!input) return;
      var text = "";
      try {
        var hRead = window.__whatsnowTranslateHelpers || {};
        if (typeof hRead.readComposerTextFromEl === "function") {
          text = String(hRead.readComposerTextFromEl(input) || "").trim();
        }
      } catch (_) {}
      if (!text) text = String(input.innerText || input.textContent || "").trim();
      if (!text) return;
      var btn = document.getElementById("whatsnow-tr-btn");
      if (btn) {
        btn.disabled = true;
        btn.classList.add("busy");
      }
      var dest = "en";
      try {
        var h = window.__whatsnowTranslateHelpers || {};
        if (typeof h.loadSessionLanguageSettings === "function") {
          h.loadSessionLanguageSettings();
        }
        var pref =
          typeof h.getCurrentTargetLangPref === "function"
            ? h.getCurrentTargetLangPref()
            : "";
        if (pref && pref !== "auto" && pref !== "unknown" && pref !== "SAME_LANGUAGE") {
          dest = pref;
        } else if (
          cfg.defaultCustomerLang &&
          cfg.defaultCustomerLang !== "auto" &&
          cfg.defaultCustomerLang !== "unknown"
        ) {
          dest = cfg.defaultCustomerLang;
        } else if (typeof h.getTargetLangForSend === "function") {
          var sendLang = h.getTargetLangForSend();
          if (sendLang && sendLang !== "SAME_LANGUAGE") dest = sendLang;
        }
      } catch (_) {
        if (cfg.defaultCustomerLang && cfg.defaultCustomerLang !== "auto") {
          dest = cfg.defaultCustomerLang;
        }
      }
      var composeEngine = cfg.engine || "google_web";
      try {
        var h2 = window.__whatsnowTranslateHelpers || {};
        var engPref =
          typeof h2.getCurrentEnginePref === "function" ? h2.getCurrentEnginePref() : "";
        if (engPref) composeEngine = engPref;
      } catch (_) {}
      invokeChecked("translate_text", {
        text: text,
        targetLang: dest,
        engine: composeEngine,
        sourceLang: cfg.sourceLang || "auto",
      })
        .then(function (out) {
          if (typeof out === "string" && out.trim()) setEditableText(input, out.trim());
        })
        .catch(function (err) {
          invoke("dlog", {
            msg: ("translate compose fail: " + (err && err.message ? err.message : err)).slice(0, 280),
          });
        })
        .then(function () {
          if (btn) {
            btn.disabled = false;
            btn.classList.remove("busy");
          }
        });
    }

    function start() {
      if (started) return;
      if (!docRoot()) return;
      started = true;
      try {
        var bus = window.__whatsnowDomMutationBus;
        if (bus && typeof bus.register === "function") {
          bus.register(function () {
            ensurePanelObservers();
            scheduleScan(250);
            updateComposeButton();
          }, { id: "native-translate" });
        } else {
          var mo = new MutationObserver(function () {
            ensurePanelObservers();
            scheduleScan(250);
            updateComposeButton();
          });
          var obsTarget = document.body || document.documentElement;
          if (obsTarget) mo.observe(obsTarget, { childList: true, subtree: true });
        }
      } catch (_) {}
      setInterval(function () {
        try {
          if (document.visibilityState === "hidden") return;
          ensurePanelObservers();
          restoreCachedTranslationsSync();
          scheduleScan(0);
          updateComposeButton();
        } catch (_) {}
      }, 2500);
      try {
        document.addEventListener("visibilitychange", function () {
          if (document.visibilityState === "visible") {
            ensurePanelObservers();
            try {
              restoreCachedTranslationsSync();
            } catch (_) {}
            scheduleScan(0);
          }
        });
      } catch (_) {}
      try {
        window.addEventListener("focus", function () {
          ensurePanelObservers();
          try {
            restoreCachedTranslationsSync();
          } catch (_) {}
          scheduleScan(0);
        });
      } catch (_) {}
      ensurePanelObservers();
      try {
        warmMemCacheFromDb();
      } catch (_) {}
      var boot = pendingCfg || window.__whatsnowTranslateBoot;
      if (boot) applyConfig(boot);
      else applyConfig({ enabled: true, incoming: true, compose: true, targetLang: "zh-CN" });
      invoke("dlog", { msg: "translate: bridge ready (WATransChat $)" });
    }

    function tryStart() {
      try {
        start();
      } catch (e) {
        invoke("dlog", { msg: ("translate start err: " + e).slice(0, 280) });
      }
      if (!started) setTimeout(tryStart, 200);
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", tryStart);
    }
    setTimeout(tryStart, 0);
    setTimeout(tryStart, 500);
    setTimeout(tryStart, 1500);

    // Expose helpers for send-hook / customer-lang / Phase 2 modules.
    window.__whatsnowTranslateHelpers = {
      getCfg: function () {
        return cfg;
      },
      canTranslate: canTranslate,
      setEditableText: setEditableText,
      findComposeInput: findComposeInput,
      findComposeRoot: findComposeRoot,
      normalizeLangFamily: normalizeLangFamily,
      detectLang: detectLang,
      isSameAsUserLang: isSameAsUserLang,
      scheduleScan: scheduleScan,
      invokeTranslate: function (text, targetLang, engine, sourceLang) {
        if (!canTranslate()) {
          return Promise.reject(new Error("未登录或订阅已过期"));
        }
        return invokeChecked("translate_text", {
          text: text,
          targetLang: targetLang || cfg.targetLang,
          engine: engine || cfg.engine || "google_web",
          sourceLang: sourceLang || cfg.sourceLang || "auto",
        });
      },
    };
  })();

  // Send-hook (Enter / Send intercept, Lexical, dual-lock) lives in
  //