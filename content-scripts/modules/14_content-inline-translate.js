 1:1) ----------
  // Extension: circular 开/关; placement from wa_inline_button_config
  // (server /extension/latest → selectors/ref/position). Live default 4.89:
  //   selectors: [data-testid=conversation-compose-box-input]
  //   ref: parent, position: afterend
  var INLINE_LS_KEY = "inlineTranslateDisabled";
  var INLINE_BTN_CFG_LS_KEY = "wa_inline_button_config";
  var translateButtonObserver = null;
  var translateBtnObserverTimer = null;

  /** Production default from serial.babyamy.store/api/extension/latest (device=chrome). */
  function defaultInlineButtonConfig() {
    return {
      selectors: ["[data-testid='conversation-compose-box-input']"],
      ref: "parent",
      closestSelector: "",
      position: "afterend",
    };
  }

  function applyWaInlineButtonConfigFromStorage(storedJson) {
    try {
      if (storedJson) {
        var o = typeof storedJson === "string" ? JSON.parse(storedJson) : storedJson;
        if (o && typeof o === "object") {
          var sels = o.selectors;
          if (!Array.isArray(sels) || !sels.length) {
            sels = defaultInlineButtonConfig().selectors;
          }
          window.__waInlineButtonConfig = {
            selectors: sels
              .filter(function (x) {
                return typeof x === "string" && String(x).trim();
              })
              .map(function (s) {
                return String(s).trim();
              }),
            ref: String(o.ref || "parent").toLowerCase(),
            closestSelector: String(o.closestSelector || ""),
            position: String(o.position || "afterend").toLowerCase(),
          };
          return;
        }
      }
    } catch (_) {}
    window.__waInlineButtonConfig = defaultInlineButtonConfig();
  }

  // Boot: localStorage (extension chrome.storage mirror), else production default.
  // Migrate only known-bad Lexical anchors — do NOT reject other server selectors.
  function inlineButtonConfigLooksStale(conf) {
    try {
      if (!conf || !Array.isArray(conf.selectors) || !conf.selectors.length) return true;
      var joined = conf.selectors.join(" ");
      if (joined.indexOf("lexical-rich-text-input") >= 0) return true;
      return false;
    } catch (_) {
      return true;
    }
  }
  try {
    applyWaInlineButtonConfigFromStorage(localStorage.getItem(INLINE_BTN_CFG_LS_KEY));
  } catch (_) {
    window.__waInlineButtonConfig = defaultInlineButtonConfig();
  }
  if (!window.__waInlineButtonConfig || inlineButtonConfigLooksStale(window.__waInlineButtonConfig)) {
    window.__waInlineButtonConfig = defaultInlineButtonConfig();
    try {
      localStorage.setItem(
        INLINE_BTN_CFG_LS_KEY,
        JSON.stringify(window.__waInlineButtonConfig)
      );
    } catch (_) {}
  }

  if (typeof window.__inlineTranslateDisabled === "undefined") {
    try {
      window.__inlineTranslateDisabled = localStorage.getItem(INLINE_LS_KEY) === "1";
    } catch (_) {
      window.__inlineTranslateDisabled = false;
    }
  }

  function isTranslateButtonSettingOn() {
    var c = cfg();
    // Extension enableTranslateButton ≡ inlineBtn; compose is WATransChat's
    // "输入框翻译按钮" label — treat either as show-switch.
    return !!(c.inlineBtn || c.compose);
  }

  /** Persist current placement (extension mirrors chrome.storage ← /extension/latest). */
  function persistInlineButtonConfig() {
    try {
      localStorage.setItem(
        INLINE_BTN_CFG_LS_KEY,
        JSON.stringify(window.__waInlineButtonConfig || defaultInlineButtonConfig())
      );
    } catch (_) {}
  }

  /** Host GET /api/extension/latest (CSP blocks page fetch) — same as extension background. */
  function refreshInlineButtonConfigFromServer() {
    try {
      if (window.__waInlineButtonConfigRefreshing) return;
      var invoke =
        (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) ||
        (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke);
      if (typeof invoke !== "function") return;
      window.__waInlineButtonConfigRefreshing = true;
      invoke("fetch_inline_button_config", {})
        .then(function (cfg) {
          window.__waInlineButtonConfigRefreshing = false;
          if (!cfg || !cfg.ok || !Array.isArray(cfg.selectors) || !cfg.selectors.length) {
            return;
          }
          applyWaInlineButtonConfigFromStorage({
            selectors: cfg.selectors,
            ref: cfg.ref,
            closestSelector: cfg.closestSelector,
            position: cfg.position,
          });
          persistInlineButtonConfig();
          // Re-place if a button is already shown (selector may have changed).
          try {
            document.querySelectorAll(".wa-inline-translate-btn").forEach(function (b) {
              b.remove();
            });
          } catch (_) {}
          if (isTranslateButtonSettingOn()) {
            try {
              createInlineTranslateButtonForInput();
            } catch (_) {}
          }
        })
        .catch(function () {
          window.__waInlineButtonConfigRefreshing = false;
        });
    } catch (_) {
      window.__waInlineButtonConfigRefreshing = false;
    }
  }

  function getInlineTranslateButtonText(disabled) {
    var ui = getUiLang();
    if (disabled) return ui === "en" ? "OFF" : "关";
    return ui === "en" ? "ON" : "开";
  }

  function getInlineTranslateButtonAriaLabel(disabled) {
    var ui = getUiLang();
    if (disabled) {
      return ui === "en"
        ? "Input translation off, click to turn on"
        : "输入框翻译已关闭，点击开启";
    }
    return ui === "en"
      ? "Input translation on, click to turn off"
      : "输入框翻译已开启，点击关闭";
  }

  function updateInlineTranslateButtonVisual(btn) {
    if (!btn) return;
    var disabled = !!window.__inlineTranslateDisabled;
    var ariaLabel = getInlineTranslateButtonAriaLabel(disabled);
    btn.textContent = getInlineTranslateButtonText(disabled);
    btn.setAttribute("aria-label", ariaLabel);
    btn.title = ariaLabel;
    if (disabled) {
      btn.style.background = "linear-gradient(135deg, #d7dae3, #b0b8c9)";
      btn.style.color = "#4b5563";
      btn.style.cursor = "not-allowed";
      btn.setAttribute("data-state", "disabled");
    } else {
      btn.style.background = "linear-gradient(135deg, #667eea, #764ba2)";
      btn.style.color = "#fff";
      btn.style.cursor = "pointer";
      btn.setAttribute("data-state", "enabled");
    }
  }

  function setInlineTranslateDisabled(disabled) {
    window.__inlineTranslateDisabled = !!disabled;
    try {
      localStorage.setItem(INLINE_LS_KEY, window.__inlineTranslateDisabled ? "1" : "0");
    } catch (_) {}
    document.querySelectorAll(".wa-inline-translate-btn").forEach(updateInlineTranslateButtonVisual);
    // Extension: 开/关 only sets the flag — NOT autoSendInputTranslation.
    try {
      if (typeof window.__whatsnowRefreshComposerHint === "function") {
        window.__whatsnowRefreshComposerHint();
      }
    } catch (_) {}
  }

  function findInlineButtonAnchor() {
    var conf = window.__waInlineButtonConfig || defaultInlineButtonConfig();
    var list = conf.selectors;
    if (!Array.isArray(list) || !list.length) {
      list = defaultInlineButtonConfig().selectors;
    }
    // Prefer footer/main conversation compose — never pick a hidden/side match.
    var roots = [];
    try {
      var footer = document.querySelector("footer");
      if (footer) roots.push(footer);
    } catch (_) {}
    try {
      var main = document.querySelector("#main");
      if (main) roots.push(main);
    } catch (_) {}
    roots.push(document);
    for (var i = 0; i < list.length; i++) {
      try {
        var sel = String(list[i] || "").trim();
        if (!sel) continue;
        for (var r = 0; r < roots.length; r++) {
          var el = roots[r].querySelector(sel);
          if (el) return el;
        }
      } catch (_) {}
    }
    return null;
  }

  function resolveInlineButtonInsertRef(anchor) {
    var conf = window.__waInlineButtonConfig || {};
    var mode = String(conf.ref || "anchor").toLowerCase();
    if (mode === "parent") {
      return anchor.parentElement || anchor;
    }
    if (mode === "closest" && conf.closestSelector) {
      try {
        var c = anchor.closest(conf.closestSelector);
        if (c) return c;
      } catch (_) {}
    }
    return anchor;
  }

  function getInlineButtonInsertPosition() {
    var ok = { beforebegin: 1, afterbegin: 1, beforeend: 1, afterend: 1 };
    var conf = window.__waInlineButtonConfig || {};
    var p = String(conf.position || "afterend").toLowerCase();
    return ok[p] ? p : "afterend";
  }

  function removeTranslateButtons() {
    document.querySelectorAll(".wa-inline-translate-btn").forEach(function (btn) {
      btn.remove();
    });
    if (translateButtonObserver) {
      try {
        translateButtonObserver.disconnect();
      } catch (_) {}
      translateButtonObserver = null;
    }
    if (window.__waInlineTranslateBtnInterval) {
      try {
        clearInterval(window.__waInlineTranslateBtnInterval);
      } catch (_) {}
      window.__waInlineTranslateBtnInterval = null;
    }
    window.__waInlineTranslateInited = false;
    // Extension: removing the switch resets disabled so send-hook translates again.
    window.__inlineTranslateDisabled = false;
    try {
      localStorage.removeItem(INLINE_LS_KEY);
    } catch (_) {}
    try {
      if (typeof window.__whatsnowRefreshComposerHint === "function") {
        window.__whatsnowRefreshComposerHint();
      }
    } catch (_) {}
  }

  function createInlineTranslateButtonForInput() {
    try {
      // Remove legacy absolute 译 button from older WATransChat builds
      try {
        var legacy = document.getElementById("whatsnow-tr-btn");
        if (legacy) legacy.remove();
      } catch (_) {}

      var targetInput = findInlineButtonAnchor();
      if (!targetInput || !targetInput.parentElement) return;

      var insertRef = resolveInlineButtonInsertRef(targetInput);
      if (!insertRef) return;

      var pos = getInlineButtonInsertPosition();
      var dedupeRoot =
        pos === "afterbegin" || pos === "beforeend"
          ? insertRef
          : insertRef.parentElement;
      if (!dedupeRoot) return;

      var existingBtn = dedupeRoot.querySelector(".wa-inline-translate-btn");
      if (existingBtn && existingBtn.__attachedTarget === targetInput) {
        updateInlineTranslateButtonVisual(existingBtn);
        return;
      }
      if (existingBtn) existingBtn.remove();

      // Do NOT force parent flex — extension inserts via insertAdjacentElement only.
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "wa-inline-translate-btn";
      btn.style.cssText =
        "border:none;padding:0;width:36px;height:36px;border-radius:50%;" +
        "background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;" +
        "font-weight:700;font-size:16px;display:flex;align-items:center;" +
        "justify-content:center;cursor:pointer;box-shadow:none;position:static;" +
        "margin-left:8px;flex-shrink:0;align-self:center;transform:none;" +
        "transition:box-shadow 0.15s ease,transform 0.15s ease,filter 0.15s ease;";

      btn.addEventListener("mouseenter", function () {
        if (window.__inlineTranslateDisabled) return;
        btn.style.filter = "brightness(1.05)";
      });
      btn.addEventListener("mouseleave", function () {
        btn.style.filter = "none";
      });
      btn.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        setInlineTranslateDisabled(!window.__inlineTranslateDisabled);
      });

      updateInlineTranslateButtonVisual(btn);

      if (typeof insertRef.insertAdjacentElement === "function") {
        insertRef.insertAdjacentElement(pos, btn);
      } else if (targetInput.nextSibling) {
        targetInput.parentNode.insertBefore(btn, targetInput.nextSibling);
      } else {
        targetInput.parentElement.appendChild(btn);
      }
      btn.__attachedTarget = targetInput;
    } catch (error) {
      console.error('创建"译"按钮失败:', error);
    }
  }

  function initTranslateButton() {
    function tryAddButton() {
      if (!canCore() || !isTranslateButtonSettingOn()) return;
      createInlineTranslateButtonForInput();
    }
    tryAddButton();
    var bus =
      (window.__whatsnowTranslateHelpers &&
        window.__whatsnowTranslateHelpers.domMutationBus) ||
      window.__whatsnowDomMutationBus;
    if (bus && typeof bus.register === "function") {
      if (translateButtonObserver) {
        try {
          translateButtonObserver.disconnect();
        } catch (_) {}
        translateButtonObserver = null;
      }
      if (window.__waInlineTranslateBtnInterval) {
        try {
          clearInterval(window.__waInlineTranslateBtnInterval);
        } catch (_) {}
        window.__waInlineTranslateBtnInterval = null;
      }
      bus.register(tryAddButton, { id: "inline-translate" });
      return;
    }
    if (translateButtonObserver) {
      try {
        translateButtonObserver.disconnect();
      } catch (_) {}
    }
    translateBtnObserverTimer = null;
    translateButtonObserver = new MutationObserver(function () {
      if (translateBtnObserverTimer) return;
      translateBtnObserverTimer = setTimeout(function () {
        translateBtnObserverTimer = null;
        tryAddButton();
      }, 300);
    });
    try {
      if (document.body) {
        translateButtonObserver.observe(document.body, {
          childList: true,
          subtree: true,
        });
      }
    } catch (_) {}
    if (!window.__waInlineTranslateBtnInterval) {
      window.__waInlineTranslateBtnInterval = setInterval(tryAddButton, 2000);
    }
  }

  function ensureInlineTranslateBtn() {
    if (!canCore() || !isTranslateButtonSettingOn()) {
      removeTranslateButtons();
      return;
    }
    if (!window.__waInlineTranslateInited) {
      window.__waInlineTranslateInited = true;
      persistInlineButtonConfig();
      refreshInlineButtonConfigFromServer();
      initTranslateButton();
    } else {
      createInlineTranslateButtonForInput();
    }
  }

  try {
    window.__whatsnowSetInlineTranslateDisabled = setInlineTranslateDisabled;
    window.__whatsnowTranslateHelpers = Object.assign(
      window.__whatsnowTranslateHelpers || {},
      {
        setInlineTranslateDisabled: setInlineTranslateDisabled,
        createInlineTranslateButtonForInput: createInlineTranslateButtonForInput,
        applyWaInlineButtonConfigFromStorage: applyWaInlineButtonConfigFromStorage,
        refreshInlineButtonConfigFromServer: refreshInlineButtonConfigFromServer,
      }
    );
  } catch (_) {}

  // ---------- Quick remark (