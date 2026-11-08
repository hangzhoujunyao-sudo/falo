 (副本89).
 * chrome.storage / __waext → __whatsnowTranslateCfg + Tauri translate_text.
 */
(function () {
  "use strict";
  if (window.__whatsnowSendHookInstalled) return;

  function cfg() {
    try {
      var h = window.__whatsnowTranslateHelpers;
      if (h && h.getCfg) return h.getCfg() || {};
    } catch (_) {}
    return window.__whatsnowTranslateCfg || {};
  }
  function canCore() {
    // WATransChat parity: require core_translate; never allow when logged out.
    try {
      if (typeof window.__whatsnowCan === "function") {
        return !!window.__whatsnowCan("core_translate");
      }
    } catch (_) {}
    try {
      var h = window.__whatsnowTranslateHelpers;
      if (h && h.canTranslate) return !!h.canTranslate();
    } catch (_) {}
    return false;
  }
  // Install even when logged out so a later login (caps inject) can gate per-send.
  // Per-call canCore() skips translate and lets native send through.
  window.__whatsnowSendHookInstalled = true;

  var currentUiLang = "zh";
  try {
    var c0 = cfg();
    if (c0 && c0.uiLang) currentUiLang = String(c0.uiLang);
  } catch (_) {}

  function normalizeUiLang(x) {
    try {
      var i18n = window.__whatsnowPageI18n;
      if (i18n && i18n.normalize) return i18n.normalize(x);
    } catch (_) {}
    return String(x || "zh").toLowerCase().indexOf("en") === 0 ? "en" : "zh";
  }
  function tPage(l, k, fb) {
    try {
      var i18n = window.__whatsnowPageI18n;
      if (i18n && i18n.t) return i18n.t(l, k, fb);
    } catch (_) {}
    return fb;
  }
  function tPageFill(l, k, fb, vars) {
    try {
      var i18n = window.__whatsnowPageI18n;
      if (i18n && i18n.fill) return i18n.fill(l, k, fb, vars);
    } catch (_) {}
    var s = String(fb || "");
    if (vars && typeof vars === "object") {
      Object.keys(vars).forEach(function (kk) {
        s = s.split("{" + kk + "}").join(String(vars[kk]));
      });
    }
    return s;
  }

  function normalizeLangFamily(code) {
    try {
      var h = window.__whatsnowTranslateHelpers;
      if (h && h.normalizeLangFamily) return h.normalizeLangFamily(code);
    } catch (_) {}
    var c = String(code || "").toLowerCase();
    if (c.indexOf("zh") === 0) return "zh";
    if (c.indexOf("en") === 0) return "en";
    return c.split("-")[0] || c;
  }

  var PRO_ONLY_OUTBOUND_ENGINES = [
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
  var FREE_CYCLE_ENGINES = [
    "google_web",
    "google",
    "google_chrome",
    "bing",
    "yandex",
    "volc",
    "deeplx",
    "backup",
  ];

  function isProRealtime() {
    try {
      if (typeof window.__whatsnowCan === "function") {
        if (window.__whatsnowCan("pro_engines") || window.__whatsnowCan("ai_proxy")) return true;
      }
      var c = window.__whatsnowCaps;
      if (c && (c.isPro || c.isPremium)) return true;
    } catch (_) {}
    return false;
  }

  function clampOutboundEngine(eng) {
    var id = String(eng || "").trim() || "google_web";
    if (!isProRealtime() && PRO_ONLY_OUTBOUND_ENGINES.indexOf(id) >= 0) {
      return "google_web";
    }
    return id;
  }

  function getOutboundEngineList() {
    try {
      var api = window.__whatsnowEngineList;
      if (api && api.GLOBAL_INPUT_ENGINES) return api.GLOBAL_INPUT_ENGINES.slice();
    } catch (_) {}
    return FREE_CYCLE_ENGINES.concat(PRO_ONLY_OUTBOUND_ENGINES);
  }

  function resolveCurrentOutboundEngine() {
    try {
      ensureSessionLanguageForCurrentChat();
      if (currentEnginePref && String(currentEnginePref).trim()) {
        return clampOutboundEngine(currentEnginePref);
      }
    } catch (_) {}
    try {
      var c = cfg();
      if (c && c.engine) return clampOutboundEngine(c.engine);
    } catch (_) {}
    return "google_web";
  }

  function saveOutboundEngineSelection(engineId) {
    var next = clampOutboundEngine(engineId);
    if (!next) return false;
    try {
      var identifier = "";
      try {
        identifier = String(getCurrentCustomerIdentifier() || "");
      } catch (_) {}
      if (
        identifier &&
        identifier.indexOf("refreshed") < 0 &&
        identifier.indexOf("default-contact") < 0
      ) {
        var map = readCustomerLanguageSettingsMap() || {};
        var old = map[identifier] || {};
        map[identifier] = Object.assign({}, old, { engine: next, timestamp: Date.now() });
        writeCustomerLanguageSettingsMap(map);
      } else {
        // Persist as global compose engine via settings window path is async;
        // update live cfg + boot for this session.
        try {
          var live = window.__whatsnowTranslateCfg || {};
          live.engine = next;
          window.__whatsnowTranslateCfg = live;
          if (window.__whatsnowTranslateBoot) window.__whatsnowTranslateBoot.engine = next;
        } catch (_) {}
      }
      currentEnginePref = next;
      try {
        if (typeof refreshComposerTargetLangHint2 === "function") refreshComposerTargetLangHint2();
      } catch (_) {}
      return true;
    } catch (_) {
      return false;
    }
  }

  /** WATransChat switchToNextOutboundEngine — cycle compose engine with Pro gate. */
  function switchToNextOutboundEngine(done) {
    var finish = function (result) {
      try {
        if (typeof done === "function") done(result);
      } catch (_) {}
    };
    var all = getOutboundEngineList();
    var current = resolveCurrentOutboundEngine();
    var idx = Math.max(0, all.indexOf(current));
    var isPro = isProRealtime();
    var candidates = [];
    for (var step = 1; step <= all.length; step++) {
      var eng = all[(idx + step) % all.length];
      if (!eng || eng === current) continue;
      if (!isPro && PRO_ONLY_OUTBOUND_ENGINES.indexOf(eng) >= 0) continue;
      candidates.push(eng);
    }
    if (!candidates.length) {
      for (var i = 0; i < FREE_CYCLE_ENGINES.length; i++) {
        var fe = FREE_CYCLE_ENGINES[i];
        if (fe && fe !== current) candidates.push(fe);
      }
    }
    var next = candidates[0] || null;
    if (!next) {
      finish({ ok: false, engine: current, name: getEngineDisplayName(current, currentUiLang) });
      return;
    }
    var saved = saveOutboundEngineSelection(next);
    finish({
      ok: !!saved,
      engine: next,
      name: getEngineDisplayName(next, currentUiLang),
    });
  }

  function translate(sourceLang, targetLang, text, cb) {
    if (!canCore()) {
      if (typeof cb === "function") cb(null, "未登录或订阅已过期");
      return;
    }
    var helpers = window.__whatsnowTranslateHelpers;
    var c = cfg();
    var engine = resolveCurrentOutboundEngine();
    var p =
      helpers && helpers.invokeTranslate
        ? helpers.invokeTranslate(text, targetLang, engine, sourceLang || c.sourceLang || "auto")
        : (window.__TAURI__ &&
            window.__TAURI__.core &&
            window.__TAURI__.core.invoke("translate_text", {
              text: text,
              targetLang: targetLang,
              engine: engine,
              sourceLang: sourceLang || c.sourceLang || "auto",
            }));
    if (!p || typeof p.then !== "function") {
      if (typeof cb === "function") cb(null, "translate_missing");
      return;
    }
    p.then(function (out) {
      if (typeof cb === "function") cb(typeof out === "string" ? out : null, null);
    }).catch(function (err) {
      if (typeof cb === "function")
        cb(null, String(err && err.message ? err.message : err));
    });
  }

  // Per-chat session prefs (extension currentTargetLangPref / currentEnginePref).
  // Cleared on every chat switch — never sticky across contacts.
  var currentTargetLangPref = "";
  var currentEnginePref = "";
  var currentCustomerIdentifier = "";
  var currentPhoneNumber = "";
  var lastLoadedCustomerId = null;
  var CUSTOMER_LANG_LS_KEY = "customerLanguageSettings";

  function extractPhoneNumberFromText(text) {
    if (!text || typeof text !== "string") return "";
    var match = text.match(/\+[\d\s\-\(\)]+/);
    if (!match || !match[0]) return "";
    var cleaned = match[0].replace(/[\s\-\(\)]/g, "");
    if (cleaned.replace(/\D/g, "").length < 7) return "";
    return cleaned;
  }

  function extractCustomerNameFromComposerLabel(text) {
    if (!text || typeof text !== "string") return "";
    var normalized = text.trim();
    if (!normalized) return "";
    var quotePairs = [
      ["\u201c", "\u201d"],
      ['"', '"'],
      ["\u300c", "\u300d"],
      ["\u300e", "\u300f"],
      ["\u00ab", "\u00bb"],
    ];
    function cleanupCandidate(value) {
      var candidate = String(value || "")
        .trim()
        .replace(/\s+/g, " ");
      if (!candidate) return "";
      if (extractPhoneNumberFromText(candidate)) return "";
      return candidate;
    }
    for (var i = 0; i < quotePairs.length; i++) {
      var open = quotePairs[i][0];
      var close = quotePairs[i][1];
      var start = normalized.indexOf(open);
      if (start < 0) continue;
      var end = normalized.indexOf(close, start + open.length);
      if (end <= start) continue;
      var candidate = cleanupCandidate(normalized.slice(start + open.length, end));
      if (candidate) return candidate;
    }
    return "";
  }

  function getComposerAriaLabelText() {
    try {
      var editorEl =
        document.querySelector(
          'div[data-testid="conversation-compose-box-input"][contenteditable="true"][aria-label]'
        ) ||
        document.querySelector('div[role="textbox"][contenteditable="true"][aria-label]');
      var label = editorEl && editorEl.getAttribute("aria-label");
      return typeof label === "string" ? label.trim() : "";
    } catch (_) {}
    return "";
  }

  function getConversationHeaderChatTitleText() {
    try {
      var header = document.querySelector('header[data-testid="conversation-header"]');
      if (!header) return "";
      var byTestId = header.querySelector(
        'span[data-testid="conversation-info-header-chat-title"]'
      );
      if (byTestId) {
        var t = (byTestId.getAttribute("title") || byTestId.textContent || "").trim();
        if (t) return t;
      }
      var byDir = header.querySelector(
        '[data-testid="conversation-info-header"] span[dir="auto"]'
      );
      if (byDir) {
        var t2 = (byDir.getAttribute("title") || byDir.textContent || "").trim();
        if (t2) return t2;
      }
    } catch (_) {}
    return "";
  }

  function extractCustomerIdentifierFromHeaderTitleText(titleText) {
    if (!titleText || typeof titleText !== "string") return "";
    var t = titleText.trim();
    if (!t) return "";
    if (t.indexOf("+") >= 0) {
      var phone = extractPhoneNumberFromText(t);
      if (phone) return phone;
    }
    var lower = t.toLowerCase();
    if (
      t.length > 1 &&
      t.length <= 50 &&
      t.indexOf("wds-ic-") < 0 &&
      t.indexOf("-ic-") < 0 &&
      t.indexOf("ic-") !== 0 &&
      t.indexOf("search-refreshed") < 0 &&
      t.indexOf("more-refreshed") < 0 &&
      t.indexOf("default-contact-refreshed") < 0 &&
      t.indexOf("refreshed") < 0 &&
      !/^\d+$/.test(t) &&
      t.indexOf("+") < 0 &&
      /[\u4e00-\u9fa5A-Za-z]/.test(t) &&
      t !== "\u5728\u7ebf" &&
      lower !== "online" &&
      lower !== "typing" &&
      lower.indexOf("last seen") < 0 &&
      t !== "\u6b63\u5728\u8f93\u5165"
    ) {
      return t;
    }
    return "";
  }

  function isValidCustomerIdentifier(id) {
    if (!id || typeof id !== "string") return false;
    if (id.indexOf("refreshed") >= 0) return false;
    if (id.indexOf("default-contact") >= 0) return false;
    return true;
  }

  function getCurrentCustomerIdentifier() {
    try {
      if (typeof window.__whatsnowGetCustomerIdentifier === "function") {
        var external = window.__whatsnowGetCustomerIdentifier() || "";
        if (external && isValidCustomerIdentifier(external)) {
          currentCustomerIdentifier = external;
          var ph = extractPhoneNumberFromText(external);
          if (ph) currentPhoneNumber = ph;
          return external;
        }
      }
    } catch (_) {}
    try {
      var composerLabel = getComposerAriaLabelText();
      var phoneFromComposer = extractPhoneNumberFromText(composerLabel);
      if (phoneFromComposer) {
        currentPhoneNumber = phoneFromComposer;
        currentCustomerIdentifier = phoneFromComposer;
        return phoneFromComposer;
      }
      var nameFromComposer = extractCustomerNameFromComposerLabel(composerLabel);
      if (nameFromComposer) {
        currentCustomerIdentifier = nameFromComposer;
        return nameFromComposer;
      }
      var fromHeader = extractCustomerIdentifierFromHeaderTitleText(
        getConversationHeaderChatTitleText()
      );
      if (fromHeader) {
        currentCustomerIdentifier = fromHeader;
        var ph2 = extractPhoneNumberFromText(fromHeader);
        if (ph2) currentPhoneNumber = ph2;
        return fromHeader;
      }
    } catch (_) {}
    return currentCustomerIdentifier || currentPhoneNumber || "";
  }

  function readCustomerLanguageSettingsMap() {
    try {
      var raw = localStorage.getItem(CUSTOMER_LANG_LS_KEY);
      if (!raw) return {};
      var map = JSON.parse(raw);
      return map && typeof map === "object" && !Array.isArray(map) ? map : {};
    } catch (_) {
      return {};
    }
  }

  function writeCustomerLanguageSettingsMap(map) {
    var next = map && typeof map === "object" && !Array.isArray(map) ? map : {};
    try {
      localStorage.setItem(CUSTOMER_LANG_LS_KEY, JSON.stringify(next));
    } catch (e) {
      console.error("写入 customerLanguageSettings(localStorage) 失败:", e);
    }
    return next;
  }

  function entryTargetLang(conf) {
    if (!conf || typeof conf !== "object") return "";
    if (typeof conf.targetLang === "string" && conf.targetLang.trim()) {
      return conf.targetLang.trim();
    }
    // Legacy WATransChat field
    if (typeof conf.lang === "string" && conf.lang.trim()) return conf.lang.trim();
    return "";
  }

  function setCurrentTargetLangPref(value) {
    currentTargetLangPref =
      value && String(value).trim() ? String(value).trim() : "";
    try {
      if (typeof refreshComposerTargetLangHint === "function") {
        refreshComposerTargetLangHint();
      }
    } catch (_) {}
  }

  function setCurrentEnginePref(value) {
    currentEnginePref =
      value && String(value).trim() ? String(value).trim() : "";
    try {
      window.__whatsnowCustomerEngine = currentEnginePref || "";
    } catch (_) {}
  }

  function getCurrentTargetLangPref() {
    return currentTargetLangPref || "";
  }

  function getCurrentEnginePref() {
    return currentEnginePref || "";
  }

  function loadSessionLanguageSettings() {
    var identifier = getCurrentCustomerIdentifier();
    // Reset first — never carry previous chat's override.
    currentTargetLangPref = "";
    currentEnginePref = "";
    try {
      window.__whatsnowCustomerLang = "";
      window.__whatsnowCustomerEngine = "";
    } catch (_) {}

    if (!isValidCustomerIdentifier(identifier)) {
      lastLoadedCustomerId = identifier || "";
      try {
        if (typeof refreshComposerTargetLangHint === "function") {
          refreshComposerTargetLangHint();
        }
      } catch (_) {}
      return;
    }

    try {
      var map = readCustomerLanguageSettingsMap();
      var conf = map[identifier];
      if (conf) {
        var tl = entryTargetLang(conf);
        if (tl && tl !== "auto" && tl !== "unknown") {
          currentTargetLangPref = tl;
        } else {
          currentTargetLangPref = "";
        }
        if (typeof conf.engine === "string" && conf.engine) {
          currentEnginePref = conf.engine;
        } else {
          currentEnginePref = "";
        }
      } else {
        currentTargetLangPref = "";
        currentEnginePref = "";
      }
    } catch (_) {
      currentTargetLangPref = "";
      currentEnginePref = "";
    }

    try {
      window.__whatsnowCustomerLang = currentTargetLangPref || "";
      window.__whatsnowCustomerEngine = currentEnginePref || "";
    } catch (_) {}

    lastLoadedCustomerId = identifier;
    try {
      if (typeof refreshComposerTargetLangHint === "function") {
        refreshComposerTargetLangHint();
      }
    } catch (_) {}
  }

  function ensureSessionLanguageForCurrentChat() {
    var id = getCurrentCustomerIdentifier() || "";
    if (id !== lastLoadedCustomerId) {
      loadSessionLanguageSettings();
    }
  }

  function clearCustomerTargetLanguageValue() {
    try {
      var identifier = getCurrentCustomerIdentifier();
      if (isValidCustomerIdentifier(identifier)) {
        try {
          var map = readCustomerLanguageSettingsMap();
          if (map[identifier]) {
            var old = map[identifier] || {};
            var next = Object.assign({}, old);
            delete next.targetLang;
            delete next.lang;
            if (!next.engine) {
              delete map[identifier];
            } else {
              map[identifier] = next;
            }
            writeCustomerLanguageSettingsMap(map);
          }
        } catch (e) {
          console.error("清除customerLanguageSettings(targetLang)失败:", e);
        }
      }
      setCurrentTargetLangPref("");
    } catch (e) {
      console.error("清除客户语言设置失败:", e);
    }
  }

  function saveCustomerTargetLanguageValue(targetLang, engine) {
    try {
      var identifier = getCurrentCustomerIdentifier();
      if (!targetLang || targetLang === "auto" || targetLang === "unknown") {
        clearCustomerTargetLanguageValue();
        if (engine) {
          // Keep engine override if provided while clearing lang.
          if (isValidCustomerIdentifier(identifier)) {
            var map0 = readCustomerLanguageSettingsMap();
            var old0 = map0[identifier] || {};
            map0[identifier] = Object.assign({}, old0, {
              engine: engine,
              timestamp: Date.now(),
            });
            delete map0[identifier].targetLang;
            delete map0[identifier].lang;
            writeCustomerLanguageSettingsMap(map0);
            setCurrentEnginePref(engine);
          }
        }
        return;
      }

      if (!isValidCustomerIdentifier(identifier)) {
        // Invalid id: write global default only (extension defaultTargetLang).
        try {
          window.defaultTargetLang = targetLang;
          var boot = window.__whatsnowTranslateBoot || {};
          boot.defaultCustomerLang = targetLang;
          window.__whatsnowTranslateBoot = boot;
          var c = cfg();
          if (window.__whatsnowApplyTranslateConfig) {
            window.__whatsnowApplyTranslateConfig(
              Object.assign({}, c, { defaultCustomerLang: targetLang })
            );
          }
        } catch (_) {}
        setCurrentTargetLangPref(targetLang);
        return;
      }

      var map = readCustomerLanguageSettingsMap();
      var old = map[identifier] || {};
      var entry = Object.assign({}, old, {
        targetLang: targetLang,
        timestamp: Date.now(),
      });
      delete entry.lang;
      delete entry.updatedAt;
      if (engine) entry.engine = engine;
      map[identifier] = entry;
      writeCustomerLanguageSettingsMap(map);
      setCurrentTargetLangPref(targetLang);
      if (engine) setCurrentEnginePref(engine);
    } catch (e) {
      console.error("保存客户语言设置失败:", e);
    }
  }

  function getCountryInfo() {
    try {
      if (typeof window.__whatsnowGetCountryInfo === "function") {
        return window.__whatsnowGetCountryInfo() || {};
      }
    } catch (_) {}
    return {};
  }

  // Full composer placeholder hint is defined after getTargetLangForSend (hoisted).
  // Early call sites use updateComposerHintOnce / refreshComposerTargetLangHint2.

  var autoSendInputTranslationCache = true;
  try {
    var boot0 = window.__whatsnowTranslateBoot || cfg() || {};
    if (typeof boot0.autoSend === "boolean") {
      autoSendInputTranslationCache = boot0.autoSend !== false;
    } else {
      autoSendInputTranslationCache = cfg().autoSend !== false;
    }
  } catch (_) {}
  try {
    var rawSrc =
      (cfg() && cfg().sourceLang) ||
      (window.__whatsnowTranslateBoot && window.__whatsnowTranslateBoot.sourceLang) ||
      window.userSourceLangSetting;
    window.userSourceLangSetting =
      rawSrc && String(rawSrc).trim() ? String(rawSrc).trim() : "auto";
    window.userSourceLang = rawSrc && rawSrc !== "auto" ? rawSrc : "zh-CN";
  } catch (_) {
    window.userSourceLangSetting = "auto";
    window.userSourceLang = "zh-CN";
  }
  try {
    var dtl =
      (cfg() && cfg().defaultCustomerLang) ||
      (window.__whatsnowTranslateBoot && window.__whatsnowTranslateBoot.defaultCustomerLang) ||
      window.defaultTargetLang;
    window.defaultTargetLang =
      dtl && String(dtl).trim() ? String(dtl).trim() : "auto";
  } catch (_) {
    window.defaultTargetLang = "auto";
  }

  window.addEventListener("whatsnow-translate-config", function (ev) {
    try {
      var d = (ev && ev.detail) || cfg();
      if (typeof d.autoSend === "boolean") autoSendInputTranslationCache = d.autoSend !== false;
      if (d.sourceLang != null) {
        var v = d.sourceLang;
        window.userSourceLangSetting = v && String(v).trim() ? String(v).trim() : "auto";
        window.userSourceLang = v && v !== "auto" ? v : "zh-CN";
        document.querySelectorAll("[data-wa-same-lang-skip]").forEach(function (el) {
          try {
            el.removeAttribute("data-wa-same-lang-skip");
          } catch (_) {}
        });
        try {
          refreshComposerTargetLangHint2();
        } catch (_) {}
      }
      if (d.defaultCustomerLang != null) {
        window.defaultTargetLang =
          d.defaultCustomerLang && String(d.defaultCustomerLang).trim()
            ? String(d.defaultCustomerLang).trim()
            : "auto";
        try {
          refreshComposerTargetLangHint2();
        } catch (_) {}
      }
      if (d.engine != null) {
        try {
          refreshComposerTargetLangHint2();
        } catch (_) {}
      }
    } catch (_) {}
  });

  var chrome = window.chrome || {};
  chrome.storage = chrome.storage || {};
  chrome.storage.local = chrome.storage.local || {};
  chrome.storage.local.get = function (keys, cb) {
    var c = cfg();
    var out = {};
    var list = Array.isArray(keys) ? keys : keys ? Object.keys(keys) : [];
    list.forEach(function (k) {
      if (k === "sourceLang") out[k] = c.sourceLang || window.userSourceLangSetting || "auto";
      else if (k === "autoSendInputTranslation") out[k] = c.autoSend !== false;
      else if (k === "defaultTargetLang") out[k] = c.defaultCustomerLang || "auto";
    });
    if (typeof cb === "function") cb(out);
  };
  chrome.storage.onChanged = chrome.storage.onChanged || {
    addListener: function () {},
  };


// ========== 原生输入框拦截发送：先翻译再发送（对齐 Android：双标志 + 清空输入框 + 去重防抖）==========
// 仅在程序化触发「真实发送」点击前后短暂为 true，用于让捕获阶段监听放行本次点击，避免二次翻译
let waTranslatingAndSending = false;
// 从用户触发发送到译文写入/发送完成整段流程为 true，用于吞掉等待译文期间的重复点击，避免未 preventDefault 时把原文发出去
let waOutboundSendLocked = false;
// 当前输入框翻译请求序号：用于丢弃过期回调，避免重复写入
let waTranslateRequestSeq = 0;
// Ctrl+Enter / 同语言直发：绕过翻译的短时窗口（勿在首个 click 监听里立刻清掉，
// 文档级捕获 + per-button 会对同一次 click 各跑一遍）
let waBypassTranslateOnce = false;
let waBypassTranslateClearTimer = null;
/** 程序化点发送并放行拦截（对齐译文发送后的 waTranslatingAndSending） */
function triggerNativeSendBypassTranslate(scopeEl) {
  waBypassTranslateOnce = true;
  waTranslatingAndSending = true;
  try {
    if (waBypassTranslateClearTimer) {
      clearTimeout(waBypassTranslateClearTimer);
      waBypassTranslateClearTimer = null;
    }
  } catch (_) {}
  try {
    clickSendButton(scopeEl);
  } finally {
    waBypassTranslateClearTimer = setTimeout(() => {
      waBypassTranslateClearTimer = null;
      waTranslatingAndSending = false;
      waBypassTranslateOnce = false;
    }, 200);
  }
}
function beginWaTranslateTask() {
  waTranslateRequestSeq += 1;
  waOutboundSendLocked = true;
  return waTranslateRequestSeq;
}
function isWaTranslateTaskActive(taskId) {
  return taskId === waTranslateRequestSeq;
}
function endWaTranslateTask(taskId) {
  if (isWaTranslateTaskActive(taskId)) {
    waOutboundSendLocked = false;
  }
}
/** 同一次手势/多监听重复触发时丢弃，避免双发 */
function waConsumeSendGestureOrDup() {
  const gestureNow = Date.now();
  if (!window.__waSendGestureHandledUntil) window.__waSendGestureHandledUntil = 0;
  if (gestureNow < window.__waSendGestureHandledUntil) return true;
  window.__waSendGestureHandledUntil = gestureNow + 1200;
  return false;
}
/** 短时间去抖，避免连点触发多条发送管线 */
function waSendDebounceHit() {
  const nowTs = Date.now();
  if (!window.__waEventLockTs) window.__waEventLockTs = 0;
  if (nowTs - window.__waEventLockTs < 400) return true;
  window.__waEventLockTs = nowTs;
  return false;
}
// settings: whatsnow-translate-config (see preamble)

// autoSendInputTranslationCache initialized in preamble from cfg()

// 获取 WhatsApp 发送框（或媒体 caption 输入框）的“当前编辑器”
// WhatsApp 在不同模式（普通文本/图片 caption）下，页面可能同时存在多个 contenteditable，
// 需要优先选择：聚焦的、可见的、且当前有内容的编辑器，否则读取到空串就不会触发翻译拦截。
// 对齐 WATransChat：配文时必须写/发配文面板，绝不能落到背后会话输入框（否则只发文字丢图）。
function getMediaCaptionRoot() {
  try {
    return document.querySelector('[data-testid="media-caption-input-container"]') || null;
  } catch (_) {
    return null;
  }
}

function getMediaCaptionEditorEl() {
  try {
    const root = getMediaCaptionRoot();
    if (!root || !isElementVisible(root)) return null;
    if (root.getAttribute('contenteditable') === 'true') return root;
    const nested =
      root.querySelector('[contenteditable="true"][data-lexical-editor="true"]') ||
      root.querySelector('[contenteditable="true"][role="textbox"]') ||
      root.querySelector('[contenteditable="true"]');
    return nested && isElementVisible(nested) ? nested : null;
  } catch (_) {
    return null;
  }
}

function isMediaCaptionComposerOpen() {
  return !!getMediaCaptionEditorEl();
}

function isAllowedChatComposerEl(el) {
  if (!el || !el.getAttribute) return false;
  try {
    const testid = el.getAttribute('data-testid') || '';
    // 联系人信息「备注」等非消息框：绝不能当成会话输入框（Enter 会误触发翻译发送）
    if (
      testid === 'note-input-field' ||
      testid === 'text-input' ||
      testid === 'contact-first-name-input' ||
      testid === 'contact-last-name-input' ||
      (el.closest && (
        el.closest('[data-testid="notes-section"]') ||
        el.closest('[data-testid="chat-info-drawer"]') ||
        el.closest('[data-testid="contact-info-drawer"]') ||
        el.closest('[data-testid="save-contact-drawer"]') ||
        el.closest('[data-testid="contact-info-header"]')
      ))
    ) {
      return false;
    }
    if (
      testid === 'conversation-compose-box-input' ||
      testid === 'media-caption-input-container' ||
      testid === 'edit-message-composer'
    ) {
      return true;
    }
    if (el.closest && el.closest('[data-testid="media-caption-input-container"]')) {
      return el.getAttribute('contenteditable') === 'true';
    }
    if (el.closest('footer') && el.getAttribute('contenteditable') === 'true') {
      return true;
    }
    if (
      el.getAttribute('contenteditable') === 'true' &&
      (el.getAttribute('data-lexical-editor') === 'true' || el.getAttribute('role') === 'textbox') &&
      el.closest && (
        el.closest('[data-testid="media-editor"]') ||
        el.closest('[data-testid="draw-overlay"]')
      )
    ) {
      return true;
    }
  } catch (_) {}
  return false;
}

function getNativeComposerElement(scopeEl) {
  // 配文面板打开时必须优先配文框，否则译文会写到背后会话框并单独发文字、丢图
  const captionEd = getMediaCaptionEditorEl();
  if (captionEd && isAllowedChatComposerEl(captionEd)) return captionEd;

  const selectors = [
    '[data-testid="conversation-compose-box-input"][contenteditable="true"]',
    '[data-testid="edit-message-composer"][contenteditable="true"]',
    'footer div[contenteditable="true"][data-lexical-editor="true"]',
    'div[role="textbox"][contenteditable="true"][data-lexical-editor="true"]',
    'div[contenteditable="true"][data-lexical-editor="true"]'
  ];

  const scopes = [];
  try {
    if (scopeEl && scopeEl.closest) {
      const footer = scopeEl.closest('footer');
      if (footer) scopes.push(footer);
      const editModal = scopeEl.closest('[data-testid="edit-message-modal"]');
      if (editModal) scopes.push(editModal);
    }
  } catch (_) {}
  scopes.push(document);

  const all = [];
  scopes.forEach((scope) => {
    selectors.forEach((sel) => {
      try {
        all.push(...Array.from(scope.querySelectorAll(sel)));
      } catch (_) {}
    });
  });

  const uniq = Array.from(new Set(all)).filter(isAllowedChatComposerEl);
  if (!uniq.length) return null;

  const visible = uniq.filter(isElementVisible);
  const editorCandidates = visible.length ? visible : uniq;

  const active = document.activeElement;
  if (active) {
    const focused = editorCandidates.find((el) => el === active || el.contains(active));
    if (focused) return focused;
  }

  const withText = editorCandidates.find((el) => {
    try {
      const t = readComposerTextFromEl(el);
      return !!t.trim();
    } catch (_) {
      return false;
    }
  });
  if (withText) return withText;

  try {
    const cx = (window.innerWidth || 0) / 2;
    const cy = (window.innerHeight || 0) / 2;
    editorCandidates.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      const ad = Math.abs(ar.left + ar.width / 2 - cx) + Math.abs(ar.top + ar.height / 2 - cy);
      const bd = Math.abs(br.left + br.width / 2 - cx) + Math.abs(br.top + br.height / 2 - cy);
      return ad - bd;
    });
  } catch (_) {}

  return editorCandidates[0] || null;
}

function getLexicalEditor(el) {
  try {
    if (!el) return null;
    const lex = el.__lexicalEditor;
    return lex && typeof lex.setEditorState === 'function' && typeof lex.parseEditorState === 'function'
      ? lex
      : null;
  } catch (_) {
    return null;
  }
}

/** 中文等 IME 选词期间勿当发送 */
function isImeComposingEvent(e, editorEl) {
  try {
    if (e && (e.isComposing || e.keyCode === 229 || e.key === 'Process')) return true;
  } catch (_) {}
  try {
    const lex = getLexicalEditor(editorEl || getNativeComposerElement());
    if (lex && typeof lex.isComposing === 'function' && lex.isComposing()) return true;
  } catch (_) {}
  return false;
}

/**
 * 读取输入框文本。
 * 不要用 __lexicalTextContent：多 <p> 时它常在段间塞 \n\n，翻译后再写回就会空行翻倍。
 * 按 DOM：段内 <br> → \n，段与段之间只拼一个 \n（空段自然形成空行）。
 */
function readComposerTextFromEl(el) {
  if (!el) return '';
  try {
    const paras = Array.from(el.children || []).filter(
      (c) => c && String(c.tagName || '').toLowerCase() === 'p'
    );
    if (paras.length) {
      return paras
        .map((p) => {
          try {
            return String(p.innerText || p.textContent || '')
              .replace(/\r\n/g, '\n')
              .replace(/\r/g, '\n')
              .replace(/\n$/, '');
          } catch (_) {
            return '';
          }
        })
        .join('\n');
    }
  } catch (_) {}
  try {
    return String(el.innerText || el.textContent || '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
  } catch (_) {
    return '';
  }
}

function readComposerText(scopeEl) {
  const ed = getNativeComposerElement(scopeEl);
  return ed ? readComposerTextFromEl(ed) : '';
}

/**
 * Lexical 写入：用 linebreak 节点表示换行（软换行）。
 * 若用 paste 塞 \n，WhatsApp 常建成多个 <p>，读出/发出就会变成双倍空行。
 */
function buildLexicalStateJson(text) {
  const lines = String(text == null ? '' : text).split(/\r\n|\n|\r/);
  const children = [];
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) children.push({ type: 'linebreak', version: 1 });
    const line = lines[i];
    if (line) {
      children.push({
        detail: 0,
        format: 0,
        mode: 'normal',
        style: '',
        text: line,
        type: 'text',
        version: 1
      });
    }
  }
  return {
    root: {
      children: [{
        children,
        direction: null,
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1
      }],
      direction: null,
      format: '',
      indent: 0,
      type: 'root',
      version: 1
    }
  };
}

function setComposerTextViaLexical(editorEl, text) {
  const lex = getLexicalEditor(editorEl);
  if (!lex) return false;
  try {
    const state = lex.parseEditorState(JSON.stringify(buildLexicalStateJson(text)));
    lex.setEditorState(state);
    return true;
  } catch (_) {
    return false;
  }
}

/** 优先 Lexical；失败再走 MAIN 桥接（若有） */
async function setComposerTextPreferMain(editorEl, text) {
  if (setComposerTextViaLexical(editorEl, text)) return true;
  try {
    const api = globalThis.__waext;
    const fn = (api && typeof api.setComposerTextMain === 'function')
      ? api.setComposerTextMain
      : (typeof globalThis.__waextSetComposerTextMain === 'function' ? globalThis.__waextSetComposerTextMain : null);
    if (fn) {
      const r = await fn(text, 2500);
      if (r && r.ok) return true;
    }
  } catch (_) {}
  return false;
}

function resolveSendButtonEl(el) {
  if (!el || !el.closest) return null;
  // 清空输入框后 WhatsApp 会重建发送键，脱离文档的节点不能再 click
  try {
    if (el.isConnected === false) return null;
  } catch (_) {}
  try {
    if (el.isContentEditable || el.getAttribute('role') === 'textbox') return null;
  } catch (_) {}
  try {
    const btn = el.closest('button') || el.closest('[role="button"]') || null;
    if (!btn) return null;
    try {
      if (btn.isConnected === false) return null;
    } catch (_) {}
    // 排除输入框本身被误判为按钮的情况
    try {
      if (btn.isContentEditable || btn.getAttribute('role') === 'textbox') return null;
    } catch (_) {}
    return btn;
  } catch (_) {
    return null;
  }
}

function findSendButtonInRoot(root) {
  if (!root || !root.querySelector) return null;
  try {
    const icon =
      root.querySelector('[data-icon="wds-ic-send-filled"]') ||
      root.querySelector('[data-icon="ic-send-filled"]') ||
      root.querySelector('[data-icon^="wds-ic-send"]') ||
      root.querySelector('[data-testid="wds-ic-send-filled"]');
    if (icon) {
      return icon.closest('button') || icon.closest('[role="button"]') || icon;
    }
  } catch (_) {}
  // 新版：无 data-icon，仅 SVG <title>ic-send-filled</title>
  try {
    const titles = root.querySelectorAll('svg title');
    for (let i = 0; i < titles.length; i++) {
      if (isSendIconName(titles[i].textContent)) {
        const t = titles[i];
        return t.closest('button') || t.closest('[role="button"]') || t;
      }
    }
  } catch (_) {}
  // 仅用 data-testid（语言无关）；不用 aria-label/title 文案
  try {
    return (
      root.querySelector('button[data-testid="compose-btn-send"]') ||
      root.querySelector('[data-testid="compose-btn-send"]') ||
      root.querySelector('div[data-testid="send-button"]') ||
      root.querySelector('[data-testid="send"]')
    );
  } catch (_) {
    return null;
  }
}

function isConversationFooterSendButton(btn) {
  try {
    if (!btn) return false;
    if (btn.closest('[data-testid="media-caption-input-container"]')) return false;
    if (btn.closest('[data-testid="media-editor"]')) return false;
    if (btn.closest('[data-testid="draw-overlay"]')) return false;
    return !!btn.closest('footer');
  } catch (_) {
    return false;
  }
}

function findSendButton(scopeEl) {
  // 配文抽屉打开时：必须在配文面板内找发送键，绝不能落到背后会话 footer（否则只发文字丢图）
  try {
    const capRoot = getMediaCaptionRoot();
    if (capRoot && isElementVisible(capRoot)) {
      const mediaLayer =
        (capRoot.closest && (
          capRoot.closest('[data-testid="media-editor"]') ||
          capRoot.closest('[data-testid="draw-overlay"]') ||
          capRoot.closest('[data-animate-modal-popup="true"]') ||
          capRoot.closest('[role="dialog"]')
        )) ||
        (capRoot.parentElement && capRoot.parentElement.parentElement) ||
        capRoot.parentElement ||
        capRoot;
      const candidates = [];
      try {
        const local = findSendButtonInRoot(mediaLayer);
        if (local) candidates.push(local);
      } catch (_) {}
      try {
        const pushIfOk = (btn) => {
          if (!btn || isConversationFooterSendButton(btn)) return;
          if (!isElementVisible(btn)) return;
          candidates.push(btn);
        };
        document.querySelectorAll(
          '[data-icon="wds-ic-send-filled"],[data-icon="ic-send-filled"],[data-icon^="wds-ic-send"],button[data-testid="compose-btn-send"],[data-testid="compose-btn-send"],div[data-testid="send-button"],[data-testid="send"]'
        ).forEach((el) => {
          const btn = el.closest ? (el.closest('button') || el.closest('[role="button"]') || el) : el;
          pushIfOk(btn);
        });
        document.querySelectorAll('svg title').forEach((t) => {
          if (!isSendIconName(t.textContent)) return;
          pushIfOk(t.closest('button') || t.closest('[role="button"]') || t);
        });
      } catch (_) {}
      if (candidates.length) return candidates[0];
      return null;
    }
  } catch (_) {}

  let root = document;
  try {
    if (scopeEl && scopeEl.closest) {
      root =
        scopeEl.closest('footer') ||
        document.querySelector('#main') ||
        document.querySelector('footer') ||
        document;
    } else {
      root = document.querySelector('#main') || document.querySelector('footer') || document;
    }
  } catch (_) {}
  return findSendButtonInRoot(root);
}

function clickSendButton(scopeEl) {
  const btn = findSendButton(scopeEl);
  if (btn) {
    try { btn.click(); } catch (_) {}
    return true;
  }
  return false;
}

/**
 * 翻译完成后触发发送：优先复点用户点过的同一发送按钮。
 * 配文/发图场景绝不能改点背后会话 footer 的发送键。
 * 注意：翻译前 clearComposerText 后发送键常被重建，旧 preferred 已 isConnected=false，
 * 必须回退到现场 findSendButton（否则点击发送只会落译文、Enter 却能发出）。
 */
function triggerSendAfterTranslate(scopeEl, preferredBtn) {
  try {
    const preferred = resolveSendButtonEl(preferredBtn);
    if (preferred && preferred.isConnected) {
      preferred.click();
      return true;
    }
  } catch (_) {}
  // Enter 路径同款：现场查找当前仍挂载的发送键
  return clickSendButton(scopeEl);
}

/** 立即清空输入框：优先 MAIN Lexical（isolated 直连/execCommand 对 WA Lexical 无效） */
async function clearComposerText(scopeEl) {
  const e = getNativeComposerElement(scopeEl);
  if (!e) return;
  try { e.focus(); } catch (_) {}
  if (await setComposerTextPreferMain(e, '')) {
    try {
      setTimeout(() => {
        try { updateComposerHintOnce(document, true); } catch (_) {}
      }, 80);
    } catch (_) {}
    return;
  }
  // 最后回退：不主动 selectAll 闪选（delete 对 Lexical 也常无效）
  try {
    e.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
  } catch (_) {}
  try {
    setTimeout(() => {
      try { updateComposerHintOnce(document, true); } catch (_) {}
    }, 80);
  } catch (_) {}
}
// ========== 输入框上方状态条：正在翻译中 / 报错原因 / 切换接口（对齐 WATransChat）==========
var __waComposerToastLeaveTimer = null;
var __waComposerToastAutoHideTimer = null;

function ensureComposerTranslatingToastStyle() {
  if (document.getElementById("wa-composer-translating-toast-style")) return;
  var style = document.createElement("style");
  style.id = "wa-composer-translating-toast-style";
  style.textContent =
    "@keyframes wa-composer-status-spin{to{transform:rotate(360deg)}}" +
    "#wa-composer-translating-toast{" +
    "display:flex;align-items:center;justify-content:flex-start;gap:8px;" +
    "flex:0 0 auto;align-self:stretch;box-sizing:border-box;margin:0;" +
    "padding:4px 16px 3px;border:0;background:transparent;" +
    'font-family:"Roboto Variable",Roboto,"Helvetica Neue",Helvetica,Arial,sans-serif;' +
    "font-size:12px;line-height:16px;font-weight:400;letter-spacing:0.01em;" +
    "user-select:none;opacity:1;transition:opacity .15s ease;" +
    "position:static!important;height:auto!important;max-height:32px;overflow:hidden;min-width:0}" +
    "#wa-composer-translating-toast.wa-toast--light{color:#667781}" +
    "#wa-composer-translating-toast.wa-toast--dark{color:#8696a0}" +
    "#wa-composer-translating-toast.wa-toast--error.wa-toast--light{color:#ea4335}" +
    "#wa-composer-translating-toast.wa-toast--error.wa-toast--dark{color:#f15c6d}" +
    "#wa-composer-translating-toast .wa-toast-spinner{" +
    "width:10px;height:10px;border-radius:50%;border:1.5px solid currentColor;" +
    "border-top-color:#00a884;opacity:0.85;box-sizing:border-box;flex:0 0 auto;" +
    "animation:wa-composer-status-spin .65s linear infinite}" +
    "#wa-composer-translating-toast .wa-toast-label{" +
    "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1 1 auto;pointer-events:none}" +
    "#wa-composer-translating-toast.wa-toast--error .wa-toast-label{pointer-events:auto;cursor:pointer}" +
    "#wa-composer-translating-toast.wa-toast--error .wa-toast-label:hover{" +
    "text-decoration:underline;text-underline-offset:2px}" +
    "#wa-composer-translating-toast .wa-toast-action{" +
    "flex:0 0 auto;margin:0;padding:3px 10px;border:0;border-radius:999px;" +
    "background:#00a884;color:#fff;font:inherit;font-size:11px;line-height:14px;font-weight:500;" +
    "cursor:pointer;white-space:nowrap;text-decoration:none;pointer-events:auto;box-shadow:none;" +
    "transition:background-color .15s ease,opacity .15s ease}" +
    "#wa-composer-translating-toast .wa-toast-action:hover{background:#06cf9c;text-decoration:none}" +
    "#wa-composer-translating-toast .wa-toast-action:active{background:#008f6f}" +
    "#wa-composer-translating-toast .wa-toast-action:disabled{opacity:0.55;cursor:default}" +
    "#wa-composer-translating-toast.wa-toast--leaving{opacity:0;pointer-events:none}";
  (document.head || document.documentElement).appendChild(style);
}

function clearComposerToastTimers() {
  try {
    if (__waComposerToastLeaveTimer) {
      clearTimeout(__waComposerToastLeaveTimer);
      __waComposerToastLeaveTimer = null;
    }
  } catch (_) {}
  try {
    if (__waComposerToastAutoHideTimer) {
      clearTimeout(__waComposerToastAutoHideTimer);
      __waComposerToastAutoHideTimer = null;
    }
  } catch (_) {}
}

function removeComposerStatusToast() {
  try {
    clearComposerToastTimers();
    var el = document.getElementById("wa-composer-translating-toast");
    if (!el) return;
    try {
      el.remove();
    } catch (_) {}
  } catch (_) {}
}

/** Fade out translating bar; keep error bar until auto-hide / manual remove. */
function hideComposerTranslatingToast() {
  try {
    clearComposerToastTimers();
    var el = document.getElementById("wa-composer-translating-toast");
    if (!el || (el.dataset && el.dataset.mode === "error")) return;
    el.classList.add("wa-toast--leaving");
    __waComposerToastLeaveTimer = setTimeout(function () {
      try {
        el.remove();
      } catch (_) {}
      __waComposerToastLeaveTimer = null;
    }, 160);
  } catch (_) {}
}

function isComposerDarkTheme() {
  try {
    var root = document.documentElement;
    var body = document.body;
    if (
      (root &&
        (root.classList.contains("dark") ||
          root.getAttribute("data-theme") === "dark" ||
          root.getAttribute("data-color-mode") === "dark")) ||
      (body &&
        (body.classList.contains("dark") ||
          (body.dataset && body.dataset.theme === "dark")))
    ) {
      return true;
    }
  } catch (_) {}
  try {
    var m = (getComputedStyle(document.body).backgroundColor || "").match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)/i
    );
    if (m) {
      var avg = (Number(m[1]) + Number(m[2]) + Number(m[3])) / 3;
      if (avg < 60) return true;
    }
  } catch (_) {}
  return false;
}

function findComposerToastAnchor() {
  try {
    var footer =
      document.querySelector("#main footer") || document.querySelector("footer");
    if (!footer) return null;
    var compose =
      footer.querySelector('[data-testid="compose-box"]') ||
      document.querySelector('[data-testid="compose-box"]');
    var before = null;
    if (compose) {
      var cur = compose;
      while (cur && cur.parentElement && cur.parentElement !== footer) {
        cur = cur.parentElement;
      }
      if (cur && cur.parentElement === footer) before = cur;
    }
    if (!before) {
      before = footer.querySelector(".copyable-area") || footer.firstElementChild;
    }
    return { parent: footer, before: before };
  } catch (_) {
    return null;
  }
}

function insertComposerStatusToast(el) {
  var anchor = findComposerToastAnchor();
  if (!anchor || !anchor.parent) return false;
  if (anchor.before && anchor.before.parentNode === anchor.parent) {
    anchor.parent.insertBefore(el, anchor.before);
  } else {
    anchor.parent.insertBefore(el, anchor.parent.firstChild);
  }
  return true;
}

function composerTranslatingLabel() {
  try {
    var ui = normalizeUiLang(currentUiLang || "zh");
    return tPage(ui, "composerTranslating", "正在翻译中...");
  } catch (_) {
    return "正在翻译中...";
  }
}

function isComposerGuardFailDetail(detail) {
  var d = String(detail == null ? "" : detail).trim().toLowerCase();
  return d === "composer_still_original" || d === "composer_write_mismatch";
}

function formatComposerTranslateFailReason(detail) {
  try {
    var cLang = cfg();
    if (cLang && cLang.uiLang) currentUiLang = String(cLang.uiLang);
  } catch (_) {}
  var uiLang = normalizeUiLang(currentUiLang || "zh");
  var d = detail == null ? "" : String(detail).trim();
  var dl = d.toLowerCase();
  // 防原文误发：给用户可操作说明，不暴露内部错误码
  if (isComposerGuardFailDetail(d)) {
    return tPage(
      uiLang,
      "composerBlockUntranslated",
      "已禁止未翻译原文发出。如需发送原文，请按 Ctrl+Enter"
    );
  }
  var suffix = tPage(uiLang, "translateFailRetryOther", "请重试或更换其它翻译接口");
  if (dl.includes("402") || dl.includes("http 402")) {
    suffix = tPage(uiLang, "translateFailRenew", "请提醒客服续费");
  } else if (
    dl.includes("未登录") ||
    dl.includes("订阅") ||
    dl.includes("expired") ||
    dl.includes("login")
  ) {
    suffix = tPage(uiLang, "translateFailLoginRetry", "请登录后重试");
  } else if (dl.includes("need_deepl_key")) {
    d = tPage(uiLang, "engineNeedDeeplKey", "请先在设置中填写 DeepL API Key。");
    suffix = "";
  } else if (
    dl.includes("need_chatgpt_key") ||
    dl.includes("need_openai_custom") ||
    dl.includes("need_deepseek_custom")
  ) {
    try {
      var eng = String(resolveCurrentOutboundEngine() || "").toLowerCase();
      if (eng === "openai_custom") {
        d = tPage(
          uiLang,
          "engineNeedOpenaiCustom",
          "请先在设置中填写 OpenAI自定义 的接口地址、模型与 API Key。"
        );
      } else if (eng === "deepseek_custom") {
        d = tPage(
          uiLang,
          "engineNeedDeepseekCustom",
          "请先在设置中填写 Deepseek自定义 API Key。"
        );
      } else {
        d = tPage(uiLang, "engineNeedChatgptKey", "请先填写 ChatGPT API Key");
      }
    } catch (_) {
      d = tPage(uiLang, "engineNeedChatgptKey", "请先填写 ChatGPT API Key");
    }
    suffix = "";
  }
  if (d) {
    return suffix
      ? tPageFill(uiLang, "translateFailWithDetail", d + "，" + suffix, {
          detail: d,
          suffix: suffix,
        })
      : d;
  }
  return tPageFill(
    uiLang,
    "translateFailRestored",
    "翻译失败，已恢复原文，" + suffix,
    { suffix: suffix }
  );
}

function copyComposerErrorText(text) {
  var value = String(text == null ? "" : text);
  if (!value) return Promise.resolve(false);
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      return navigator.clipboard.writeText(value).then(
        function () {
          return true;
        },
        function () {
          return false;
        }
      );
    }
  } catch (_) {}
  try {
    var ta = document.createElement("textarea");
    ta.value = value;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;";
    document.body.appendChild(ta);
    ta.select();
    var ok = document.execCommand("copy");
    try {
      ta.remove();
    } catch (_) {}
    return Promise.resolve(!!ok);
  } catch (_) {
    return Promise.resolve(false);
  }
}

function showComposerTranslatingToast() {
  try {
    removeComposerStatusToast();
    ensureComposerTranslatingToastStyle();
    try {
      var cLang0 = cfg();
      if (cLang0 && cLang0.uiLang) currentUiLang = String(cLang0.uiLang);
    } catch (_) {}
    var dark = isComposerDarkTheme();
    var bar = document.createElement("div");
    bar.id = "wa-composer-translating-toast";
    bar.className = dark ? "wa-toast--dark" : "wa-toast--light";
    bar.dataset.mode = "translating";
    bar.setAttribute("role", "status");
    bar.setAttribute("aria-live", "polite");
    var spinner = document.createElement("span");
    spinner.className = "wa-toast-spinner";
    spinner.setAttribute("aria-hidden", "true");
    var label = document.createElement("span");
    label.className = "wa-toast-label";
    label.textContent = composerTranslatingLabel();
    bar.appendChild(spinner);
    bar.appendChild(label);
    insertComposerStatusToast(bar);
  } catch (_) {}
}

function showComposerTranslateErrorToast(detail) {
  try {
    removeComposerStatusToast();
    ensureComposerTranslatingToastStyle();
    try {
      var cLang = cfg();
      if (cLang && cLang.uiLang) currentUiLang = String(cLang.uiLang);
    } catch (_) {}
    var uiLang = normalizeUiLang(currentUiLang || "zh");
    var dark = isComposerDarkTheme();
    var bar = document.createElement("div");
    bar.id = "wa-composer-translating-toast";
    bar.className = (dark ? "wa-toast--dark" : "wa-toast--light") + " wa-toast--error";
    bar.dataset.mode = "error";
    bar.setAttribute("role", "alert");
    bar.setAttribute("aria-live", "assertive");

    var reason = formatComposerTranslateFailReason(detail);
    var label = document.createElement("span");
    label.className = "wa-toast-label";
    label.textContent = reason;
    label.dataset.copyText = reason;
    label.title =
      tPage(uiLang, "composerErrorClickCopy", "点击复制错误信息") + "\n" + reason;
    label.setAttribute("role", "button");
    label.setAttribute("tabindex", "0");
    label.addEventListener("click", async function (evt) {
      try {
        evt.preventDefault();
      } catch (_) {}
      try {
        evt.stopPropagation();
      } catch (_) {}
      var copyText = label.dataset.copyText || label.textContent || "";
      if (!(await copyComposerErrorText(copyText))) return;
      var prev = label.textContent;
      label.textContent = tPage(uiLang, "composerErrorCopied", "已复制错误信息");
      setTimeout(function () {
        try {
          if (label.isConnected) label.textContent = label.dataset.copyText || prev;
        } catch (_) {}
      }, 1200);
      try {
        if (__waComposerToastAutoHideTimer) clearTimeout(__waComposerToastAutoHideTimer);
      } catch (_) {}
      __waComposerToastAutoHideTimer = setTimeout(function () {
        removeComposerStatusToast();
      }, 12000);
    });

    bar.appendChild(label);
    // 防原文误发提示：切换接口无帮助，不显示该按钮
    if (!isComposerGuardFailDetail(detail)) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "wa-toast-action";
      btn.textContent = tPage(uiLang, "composerSwitchEngine", "切换翻译接口");
      btn.addEventListener("click", function (evt) {
        try {
          evt.preventDefault();
        } catch (_) {}
        try {
          evt.stopPropagation();
        } catch (_) {}
        if (btn.disabled) return;
        btn.disabled = true;
        switchToNextOutboundEngine(function (result) {
          btn.disabled = false;
          if (!result || !result.ok) return;
          var name =
            result.name || getEngineDisplayName(result.engine, uiLang);
          var msg = tPageFill(
            uiLang,
            "composerEngineSwitched",
            "已切换到 " + name + "，请重新发送",
            { engine: name }
          );
          label.textContent = msg;
          label.dataset.copyText = msg;
          label.title = msg;
          bar.classList.remove("wa-toast--error");
          try {
            if (__waComposerToastAutoHideTimer) clearTimeout(__waComposerToastAutoHideTimer);
          } catch (_) {}
          __waComposerToastAutoHideTimer = setTimeout(function () {
            removeComposerStatusToast();
          }, 3500);
        });
      });
      bar.appendChild(btn);
    }
    insertComposerStatusToast(bar);
    __waComposerToastAutoHideTimer = setTimeout(function () {
      removeComposerStatusToast();
    }, 12000);
  } catch (_) {}
}

/** @deprecated kept as alias for any external callers */
function showTranslateFailToast(detail) {
  showComposerTranslateErrorToast(detail);
}

// 仅统一换行符为 \n，保留连续空行（输入框/发送路径不再压缩）
function normalizeNewlines(text) {
  return String(text == null ? '' : text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}
// 等待函数
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
function isElementVisible(el) {
  try {
    if (!el) return false;
    if (el.getClientRects && el.getClientRects().length > 0) return true;
    const r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    if (r && (r.width > 0 && r.height > 0)) return true;
    return el.offsetParent !== null;
  } catch (_) {
    return false;
  }
}
function getSegmentContainer(textElement, fallbackEl) {
  return (textElement && textElement.parentNode && textElement.parentNode.nodeType === 1)
    ? textElement.parentNode
    : fallbackEl;
}
function getCustomerIdentifier() {
  return getCurrentCustomerIdentifier();
}
// 共享写入：优先 Lexical linebreak 写入；失败再 paste 回退
async function pasteReplaceText(targetEl, text) {
  if (!targetEl) return;
  const rawText = text == null ? '' : String(text);
  try { targetEl.focus(); } catch (_) {}
  if (await setComposerTextPreferMain(targetEl, rawText)) {
    try {
      targetEl.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
    } catch (_) {}
    return;
  }
  // 回退 paste（可能产生多段落双空行，仅 Lexical 不可用时使用）
  await wait(1);
  try {
    const range = document.createRange();
    range.selectNodeContents(targetEl);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  } catch (_) {}
  await wait(1);
  try {
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData.setData('text/plain', rawText);
    targetEl.dispatchEvent(pasteEvent);
  } catch (_) {}
  try { targetEl.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true })); } catch (_) {}
}
// 使用 ClipboardEvent 方式替换文本，保留换行符
async function replaceComposerText(text, scopeEl) {
  const e = getNativeComposerElement(scopeEl);
  if (!e) return;
  await pasteReplaceText(e, text);
}
function getUserSourceLangSetting() {
  const raw = window.userSourceLangSetting;
  if (raw && String(raw).trim()) return String(raw).trim();
  return window.userSourceLang || 'zh-CN';
}

/**
 * 客户目标语与「你的语言」同语系时返回 true。
 * 「你的语言」为 auto 时：用有效源语言（默认 zh-CN）比较，与输入框同语提示一致。
 */
function isCustomerLangSameAsUserSetting(customerLang) {
  const targetFamily = normalizeLangFamily(customerLang);
  if (!targetFamily) return false;
  const setting = getUserSourceLangSetting();
  const compareWith = (!setting || setting === 'auto')
    ? (window.userSourceLang || 'zh-CN')
    : setting;
  return normalizeLangFamily(compareWith) === targetFamily;
}

/**
 * 发送前：是否跳过翻译直接发出
 * - 客户语言与「你的语言」同语系（含 auto→有效源语言；含 SAME_LANGUAGE）
 * - 不做本地语种检测（脚本比例不准确，易误判）
 */
function shouldSkipOutgoingTranslate(targetLang, _text) {
  if (!targetLang || targetLang === 'SAME_LANGUAGE') return true;
  if (isCustomerLangSameAsUserSetting(targetLang)) return true;
  return false;
}

function getTargetLangForSend() {
  try { ensureSessionLanguageForCurrentChat(); } catch (_) {}
  const currentTargetLangPref = getCurrentTargetLangPref();
  const countryInfo = getCountryInfo();
  // 优先级：会话手动设置 > 全局默认客户语言（具体语言）> 区号推断（默认=自动时）> en
  if (currentTargetLangPref && currentTargetLangPref !== 'auto' && currentTargetLangPref !== 'unknown') {
    if (isCustomerLangSameAsUserSetting(currentTargetLangPref)) {
      console.log('会话客户语言与我的语言相同，直接发送原文:', currentTargetLangPref);
      return 'SAME_LANGUAGE';
    }
    console.log('使用会话手动语言设置:', currentTargetLangPref);
    return currentTargetLangPref;
  }

  const globalDefault = (typeof window.defaultTargetLang === 'string') ? window.defaultTargetLang : 'auto';
  if (globalDefault && globalDefault !== 'auto' && globalDefault !== 'unknown') {
    if (isCustomerLangSameAsUserSetting(globalDefault)) {
      console.log('全局默认与我的语言相同，直接发送原文:', globalDefault);
      return 'SAME_LANGUAGE';
    }
    console.log('使用全局默认客户语言:', globalDefault);
    return globalDefault;
  }

  // 默认客户语言为「自动」：按号码区号推断
  const detectedLang = (countryInfo && countryInfo.id) ? countryInfo.id : '';
  if (detectedLang && detectedLang !== 'unknown') {
    if (isCustomerLangSameAsUserSetting(detectedLang)) {
      console.log('区号推断语言与我的语言相同，直接发送原文:', detectedLang);
      return 'SAME_LANGUAGE';
    }
    console.log('使用区号推断的客户语言:', detectedLang);
    return detectedLang;
  }

  console.log('使用兜底客户语言: en');
  return 'en';
}

/* ========== Composer placeholder: 「回复      谷歌网页 > 英语」 (content.js 1:1) ========== */
var cachedComposerHintKey = "";
var cachedComposerHintText = "";

function formatLanguageLabelFromCode(langCode, localeKey) {
  if (!langCode) return "";
  var ui = normalizeUiLang(localeKey || currentUiLang || "zh");
  try {
    var api = window.__whatsnowLangList;
    if (api && typeof api.formatLanguageDisplayName === "function") {
      return api.formatLanguageDisplayName(langCode, ui) || String(langCode);
    }
  } catch (_) {}
  if (langCode === "auto") {
    return ui === "zh" ? "自动检测语言" : "Auto detect";
  }
  try {
    if (typeof Intl !== "undefined" && typeof Intl.DisplayNames === "function") {
      var loc = ui === "zh" ? "zh-CN" : "en";
      var fmt = new Intl.DisplayNames([loc], { type: "language" });
      var normalized = String(langCode).replace(/_/g, "-");
      var label = "";
      try {
        label = fmt.of(normalized) || "";
      } catch (_) {}
      if (!label && normalized.indexOf("-") >= 0) {
        try {
          label = fmt.of(normalized.split("-")[0]) || "";
        } catch (_) {}
      }
      if (label) return label;
    }
  } catch (_) {}
  return String(langCode);
}

function shortenComposerLangLabel(label, ui) {
  var s = String(label || "").trim();
  if (!s) return "";
  if (ui === "zh" && s === "英文") s = "英语";
  s = s.replace(/\s*[（(][^）)]*[）)]\s*/g, "").trim() || s;
  return s;
}

function resolveComposerHintEngineId() {
  try {
    return resolveCurrentOutboundEngine();
  } catch (_) {}
  return "google_web";
}

function getEngineDisplayName(engineId, ui) {
  var id = String(engineId || "google_web");
  try {
    var api = window.__whatsnowEngineList;
    if (api) {
      var map = api.nameMap ? api.nameMap(ui || "zh") : null;
      if (map && map[id]) return map[id];
      if (api.NAME_ZH && (ui === "zh" || !ui) && api.NAME_ZH[id]) return api.NAME_ZH[id];
      if (api.NAME_EN && api.NAME_EN[id]) return api.NAME_EN[id];
    }
  } catch (_) {}
  return id;
}

function getLocalizedHint() {
  var ui = normalizeUiLang(currentUiLang || "zh");
  var translateOff = !!window.__inlineTranslateDisabled;
  var pref = "";
  var countryId = "";
  var engineId = "google_web";
  try {
    pref = getCurrentTargetLangPref() || "";
  } catch (_) {}
  try {
    var ci = getCountryInfo();
    countryId = (ci && ci.id) || "";
  } catch (_) {}
  try {
    engineId = resolveComposerHintEngineId();
  } catch (_) {}
  var hintKey = [
    ui,
    translateOff ? "1" : "0",
    pref,
    engineId,
    typeof window.defaultTargetLang === "string" ? window.defaultTargetLang : "auto",
    countryId,
    typeof window.userSourceLang === "string" ? window.userSourceLang : "",
    typeof window.userSourceLangSetting === "string" ? window.userSourceLangSetting : "",
  ].join("|");
  if (cachedComposerHintKey === hintKey && cachedComposerHintText) {
    return cachedComposerHintText;
  }

  if (translateOff) {
    var offText =
      ui === "zh"
        ? "发送原文，如需翻译开启→"
        : "Send original text — turn on → to translate";
    cachedComposerHintKey = hintKey;
    cachedComposerHintText = offText;
    return offText;
  }

  var targetLang = "";
  try {
    targetLang = getTargetLangForSend();
  } catch (_) {
    targetLang = "";
  }

  var sameLangHint = targetLang === "SAME_LANGUAGE";
  if (!sameLangHint && targetLang && typeof normalizeLangFamily === "function") {
    try {
      var targetFamily = normalizeLangFamily(targetLang);
      if (targetFamily) {
        var setting = getUserSourceLangSetting();
        var compareWith =
          !setting || setting === "auto" ? window.userSourceLang || "zh-CN" : setting;
        sameLangHint = normalizeLangFamily(compareWith) === targetFamily;
      }
    } catch (_) {}
  }

  var text;
  if (sameLangHint) {
    text = ui === "zh" ? "双方同语不译" : "Same language — no translate";
  } else {
    var code =
      !targetLang || targetLang === "auto" || targetLang === "unknown" ? "en" : targetLang;
    var targetLabel = shortenComposerLangLabel(
      formatLanguageLabelFromCode(code, ui) || code,
      ui
    );
    var engineLabel = getEngineDisplayName(engineId, ui);
    var replyPrefix = ui === "zh" ? "回复" : "Reply";
    text = replyPrefix + "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0" + engineLabel + " > " + targetLabel;
  }

  cachedComposerHintKey = hintKey;
  cachedComposerHintText = text;
  return text;
}

var COMPOSER_EDITOR_SELECTOR =
  '[data-testid="conversation-compose-box-input"][contenteditable="true"], footer [contenteditable="true"][role="textbox"], [data-testid="media-caption-input-container"][contenteditable="true"][role="textbox"]';

function queryComposerEditors(scope) {
  try {
    return Array.from((scope || document).querySelectorAll(COMPOSER_EDITOR_SELECTOR));
  } catch (_) {
    return [];
  }
}

function closestComposerEditor(target) {
  try {
    if (!target) return null;
    if (target.closest) {
      var hit = target.closest(COMPOSER_EDITOR_SELECTOR);
      if (hit) return hit;
    }
    if (target.matches && target.matches(COMPOSER_EDITOR_SELECTOR)) return target;
  } catch (_) {}
  return null;
}

function isComposerEditorEmpty(editorEl) {
  try {
    if (!editorEl) return true;
    var text = (editorEl.innerText || editorEl.textContent || "")
      .replace(/\u200B/g, "")
      .replace(/\u00A0/g, " ")
      .trim();
    return !text;
  } catch (_) {
    return true;
  }
}

function updateComposerHintOnce(rootEl, force) {
  try {
    var container = rootEl || document;
    var localized = getLocalizedHint();
    var scope = container.body || container;
    var editors = queryComposerEditors(scope);
    editors.forEach(function (editorEl) {
      if (!(editorEl instanceof Element)) return;

      var hintEl = null;
      try {
        var parent = editorEl.parentElement;
        if (parent) {
          var wraps = Array.from(parent.querySelectorAll('[aria-hidden="true"]'));
          if (parent.parentElement) {
            Array.from(parent.parentElement.children).forEach(function (ch) {
              if (
                ch !== parent &&
                ch.getAttribute &&
                ch.getAttribute("aria-hidden") === "true"
              ) {
                wraps.push(ch);
              }
            });
          }
          for (var wi = 0; wi < wraps.length; wi++) {
            var wrap = wraps[wi];
            var inner = wrap.querySelector("div");
            var node = inner && !inner.isContentEditable ? inner : wrap;
            if (node && !node.isContentEditable && !editorEl.contains(node)) {
              hintEl = node;
              break;
            }
          }
        }
      } catch (_) {}

      var ariaOk = (editorEl.getAttribute("aria-placeholder") || "") === localized;
      var hintOk = !hintEl || (hintEl.textContent || "") === localized;
      if (!force && ariaOk && hintOk) {
        editorEl.setAttribute("data-wa-hint-updated", "1");
        editorEl.setAttribute("data-wa-hint-text", localized);
        return;
      }

      try {
        editorEl.setAttribute("aria-placeholder", localized);
      } catch (_) {}

      if (hintEl) {
        try {
          hintEl.textContent = localized;
          hintEl.setAttribute("data-wa-hint-updated", "1");
          hintEl.setAttribute("data-wa-hint-text", localized);
          try {
            var cs = window.getComputedStyle(editorEl);
            if (cs) {
              hintEl.style.fontSize = cs.fontSize || "";
              hintEl.style.lineHeight = cs.lineHeight || "";
              hintEl.style.fontFamily = cs.fontFamily || "";
              hintEl.style.fontWeight = cs.fontWeight || "";
              hintEl.style.letterSpacing = cs.letterSpacing || "";
              hintEl.style.whiteSpace = "nowrap";
              hintEl.style.overflow = "hidden";
              hintEl.style.textOverflow = "ellipsis";
              hintEl.style.maxWidth = "100%";
            }
          } catch (_) {}
        } catch (_) {}
      }

      editorEl.setAttribute("data-wa-hint-updated", "1");
      editorEl.setAttribute("data-wa-hint-text", localized);
    });
  } catch (_) {}
}

function refreshComposerTargetLangHint() {
  try {
    cachedComposerHintKey = "";
    cachedComposerHintText = "";
    updateComposerHintOnce(document, true);
  } catch (_) {}
}

function refreshComposerTargetLangHint2() {
  refreshComposerTargetLangHint();
}

try {
  window.__whatsnowRefreshComposerHint = refreshComposerTargetLangHint;
} catch (_) {}

// Empty composer → rewrite placeholder (send / delete)
try {
  var emptyHintTimer = null;
  var scheduleHintRefreshIfEmpty = function (target) {
    try {
      var editor = closestComposerEditor(target);
      if (!editor) return;
      if (emptyHintTimer) clearTimeout(emptyHintTimer);
      emptyHintTimer = setTimeout(function () {
        if (isComposerEditorEmpty(editor)) {
          updateComposerHintOnce(document, true);
        }
      }, 50);
    } catch (_) {}
  };
  document.addEventListener(
    "input",
    function (ev) {
      scheduleHintRefreshIfEmpty(ev && ev.target);
    },
    true
  );
  document.addEventListener(
    "keyup",
    function (ev) {
      try {
        if (!ev) return;
        if (ev.key === "Backspace" || ev.key === "Delete" || ev.key === "Enter") {
          scheduleHintRefreshIfEmpty(ev.target);
        }
      } catch (_) {}
    },
    true
  );
} catch (_) {}

// DOM mutations (WA rebuilds placeholder) — throttled
try {
  var hintObserverTimer = null;
  var hintObserver = new MutationObserver(function () {
    if (hintObserverTimer) return;
    hintObserverTimer = setTimeout(function () {
      hintObserverTimer = null;
      updateComposerHintOnce(document);
    }, 120);
  });
  hintObserver.observe(document.documentElement || document, {
    childList: true,
    subtree: true,
  });
} catch (_) {}

// Chat switch / first paint — reload per-chat lang when identifier changes
try {
  setTimeout(function () {
    try { loadSessionLanguageSettings(); } catch (_) {}
    updateComposerHintOnce(document, true);
  }, 400);
  setInterval(function () {
    try {
      ensureSessionLanguageForCurrentChat();
      updateComposerHintOnce(document, false);
    } catch (_) {}
  }, 2500);
} catch (_) {}

// 获取当前用户的源语言设置
function getCurrentUserSourceLang() {
  // 这里需要同步获取，但由于chrome.storage.local.get是异步的，
  // 我们需要使用一个全局变量来缓存用户的源语言设置
  return window.userSourceLang || 'zh-CN'; // 默认中文
}

/**
 * SVG <title> / data-icon 是否为发送图标 ID（与 UI 语言无关）
 * 例：ic-send-filled、wds-ic-send-filled
 */
function isSendIconName(name) {
  const s = String(name || '').trim();
  if (!s) return false;
  if (s === 'ic-send-filled' || s === 'wds-ic-send-filled') return true;
  if (/^wds-ic-send($|-)/i.test(s)) return true;
  if (/^(ic-|wds-ic-)?send-filled$/i.test(s)) return true;
  return false;
}

/**
 * 判断节点是否为会话/配文「发送」按钮（图标 ID / data-testid，不用文案）。
 * 用于文档级捕获：发送键被 WA 重建后、per-button 尚未挂上时也能拦住。
 */
function isWaComposerSendButton(el) {
  if (!el || !el.closest) return false;
  try {
    if (el.isContentEditable || el.getAttribute('role') === 'textbox') return false;
  } catch (_) {}
  try {
    const icon = el.getAttribute && el.getAttribute('data-icon');
    if (icon && isSendIconName(icon)) return true;
  } catch (_) {}
  try {
    const testid = el.getAttribute && el.getAttribute('data-testid');
    if (
      testid === 'compose-btn-send' ||
      testid === 'wds-ic-send-filled' ||
      testid === 'send-button' ||
      testid === 'send'
    ) {
      return true;
    }
  } catch (_) {}
  try {
    const titles = el.querySelectorAll ? el.querySelectorAll('svg title') : [];
    for (let i = 0; i < titles.length; i++) {
      if (isSendIconName(titles[i].textContent)) return true;
    }
  } catch (_) {}
  try {
    const icons = el.querySelectorAll ? el.querySelectorAll('[data-icon]') : [];
    for (let i = 0; i < icons.length; i++) {
      if (isSendIconName(icons[i].getAttribute('data-icon'))) return true;
    }
  } catch (_) {}
  try {
    if (
      el.querySelector && (
        el.querySelector('[data-testid="compose-btn-send"]') ||
        el.querySelector('[data-testid="wds-ic-send-filled"]') ||
        el.querySelector('[data-testid="send-button"]') ||
        el.querySelector('[data-testid="send"]')
      )
    ) {
      return true;
    }
  } catch (_) {}
  return false;
}

function resolveSendButtonFromEventTarget(target) {
  if (!target || !target.closest) return null;
  try {
    const btn =
      target.closest('button') ||
      target.closest('[role="button"]') ||
      (isWaComposerSendButton(target) ? target : null);
    if (!btn) return null;
    try {
      if (btn.isContentEditable || btn.getAttribute('role') === 'textbox') return null;
    } catch (_) {}
    if (!isWaComposerSendButton(btn)) return null;
    return btn;
  } catch (_) {
    return null;
  }
}

/** 写入译文后确认框内已是译文，避免 clear/replace 竞态把原文发出去 */
async function ensureComposerHasTranslatedText(scopeEl, translated, original) {
  const want = String(translated || '').trim();
  const orig = String(original || '').trim();
  if (!want) return false;
  const readNow = () => String(readComposerText(scopeEl) || '').trim();
  let cur = readNow();
  if (cur === want) return true;
  for (let i = 0; i < 3; i++) {
    try { await replaceComposerText(want, scopeEl); } catch (_) {}
    await wait(40 + i * 30);
    cur = readNow();
    if (cur === want) return true;
  }
  if (!cur || cur === orig) return false;
  return cur.length > 0 && cur !== orig;
}

function runOutboundTranslatePipeline(original, targetLang, scopeEl, opts) {
  const options = opts || {};
  const clearFirst = options.clearFirst !== false;
  const autoSend = options.autoSend !== false && autoSendInputTranslationCache;
  // 点击发送拦截后应复点同一按钮；Enter 路径则按配文/会话上下文找按钮
  const preferredSendBtn = options.preferredSendBtn || null;
  const taskId = beginWaTranslateTask();
  let finished = false;
  const finishPipeline = function (opts2) {
    if (finished) return;
    finished = true;
    // keepErrorBar: leave error toast; otherwise fade out "正在翻译中"
    if (!(opts2 && opts2.keepErrorBar)) {
      try {
        hideComposerTranslatingToast();
      } catch (_) {}
    }
    endWaTranslateTask(taskId);
  };
  chrome.storage.local.get(['sourceLang'], async (res) => {
    try {
      if (!isWaTranslateTaskActive(taskId)) return;
      const sourceLang = (res && res.sourceLang && res.sourceLang !== 'auto') ? res.sourceLang : 'zh-CN';
      if (clearFirst && autoSend) {
        try { await clearComposerText(scopeEl); } catch (_) {}
      }
      if (!isWaTranslateTaskActive(taskId)) return;
      try {
        showComposerTranslatingToast();
      } catch (_) {}
      if (!isWaTranslateTaskActive(taskId)) {
        try {
          hideComposerTranslatingToast();
        } catch (_) {}
        return;
      }
      let callbackOnce = false;
      translate(sourceLang, targetLang, original, async (translated, errDetail) => {
        if (callbackOnce) return;
        callbackOnce = true;
        if (!isWaTranslateTaskActive(taskId)) return;
        if (!translated || !translated.trim()) {
          try { await replaceComposerText(original, scopeEl); } catch (_) {}
          try {
            showComposerTranslateErrorToast(errDetail);
          } catch (_) {}
          finishPipeline({ keepErrorBar: true });
          return;
        }
        let ready = false;
        try {
          await replaceComposerText(translated, scopeEl);
          await wait(30);
          ready = await ensureComposerHasTranslatedText(scopeEl, translated, original);
        } catch (_) {
          ready = false;
        }
        if (!ready) {
          try { await replaceComposerText(original, scopeEl); } catch (_) {}
          try {
            showComposerTranslateErrorToast(errDetail || 'composer_write_mismatch');
          } catch (_) {}
          finishPipeline({ keepErrorBar: true });
          return;
        }
        if (!autoSend) {
          finishPipeline();
          return;
        }
        if (!isWaTranslateTaskActive(taskId)) return;
        setTimeout(() => {
          if (!isWaTranslateTaskActive(taskId)) return;
          // 发送前再读一次：期望有不同译文却仍是原文时中止。
          // 链接等「译文=原文」的情况允许发出（引擎原样返回）。
          try {
            const nowText = String(readComposerText(scopeEl) || '').trim();
            const orig = String(original || '').trim();
            const want = String(translated || '').trim();
            if (!nowText || (nowText === orig && want && want !== orig)) {
              try {
                showComposerTranslateErrorToast('composer_still_original');
              } catch (_) {}
              finishPipeline({ keepErrorBar: true });
              return;
            }
          } catch (_) {}
          try {
            waTranslatingAndSending = true;
            // 优先复点用户点过的发送键，避免配文时误点会话发送
            if (!triggerSendAfterTranslate(scopeEl, preferredSendBtn)) {
              try { clickSendButton(scopeEl); } catch (_) {}
            }
          } finally {
            setTimeout(() => {
              waTranslatingAndSending = false;
              finishPipeline();
            }, 160);
          }
        }, 60);
      });
    } catch (_) {
      try { await replaceComposerText(original, scopeEl); } catch (_) {}
      try {
        hideComposerTranslatingToast();
      } catch (_) {}
      finishPipeline();
    }
  });
}

/**
 * 发送按钮点击拦截核心（per-button 与 document 捕获共用）。
 * @returns {boolean} 是否已拦截
 */
function handleNativeSendClickEvent(evt, container) {
  if (waTranslatingAndSending) return false;
  if (waOutboundSendLocked) {
    try { evt.stopPropagation(); } catch (_) {}
    try { evt.preventDefault(); } catch (_) {}
    return true;
  }
  // Ctrl+Enter 等绕过：放行；标志由 triggerNativeSendBypassTranslate 延后清除，
  // 避免 document 捕获先清掉、per-button 又当成普通发送去翻译并清空输入框
  if (waBypassTranslateOnce) {
    return false;
  }
  const original = (readComposerText(container) || '').trim();
  if (!original) return false;

  // 点击“译”按钮关闭时，不做翻译拦截，直接走原生发送
  if (window.__inlineTranslateDisabled) return false;
  // 未登录 / 会员失效：不拦截，走原生发送（与扩展 VIP-only 一致）
  if (!canCore()) return false;
  // 关闭「自动发送译文」时：不拦截发送按钮，直接放行，让用户手动发送当前框内译文
  if (!autoSendInputTranslationCache) return false;

  // 同语言无需翻译：在 preventDefault 之前放行用户真实点击
  let targetLang = '';
  try {
    targetLang = getTargetLangForSend();
  } catch (err) {
    console.warn('[WhatsNow] getTargetLangForSend failed on send click', err);
    return false;
  }
  if (shouldSkipOutgoingTranslate(targetLang, original)) {
    return false;
  }

  if (waConsumeSendGestureOrDup()) {
    try { evt.stopPropagation(); } catch (_) {}
    try { evt.preventDefault(); } catch (_) {}
    return true;
  }
  if (waSendDebounceHit()) {
    try { evt.stopPropagation(); } catch (_) {}
    try { evt.preventDefault(); } catch (_) {}
    return true;
  }

  // 阻止原始发送，先翻译
  try { evt.stopPropagation(); } catch (_) {}
  try { evt.preventDefault(); } catch (_) {}
  // preferredSendBtn=container：翻译后复点同一发送键，配文发图不会丢图
  runOutboundTranslatePipeline(original, targetLang, container, {
    clearFirst: true,
    autoSend: true,
    preferredSendBtn: container
  });
  return true;
}

function hookNativeSend() {
    // 仅图标 ID / data-testid（语言无关）；不用 aria-label/title 文案
    const selectors = [
      '[data-icon="wds-ic-send-filled"]',
      '[data-icon="ic-send-filled"]',
      '[data-testid="wds-ic-send-filled"]',
      '[data-icon^="wds-ic-send"]',
      '[data-icon*="send"]',
      'button[data-testid="compose-btn-send"]',
      '[data-testid="compose-btn-send"]',
      'div[data-testid="send-button"]',
      '[data-testid="send"]'
    ];
    const searchRoot =
      document.querySelector('#main') ||
      document.querySelector('[data-testid="drawer-middle"]') ||
      document.querySelector('footer') ||
      document;
    const found = [];
    selectors.forEach(sel => {
      try {
        searchRoot.querySelectorAll(sel).forEach(el => found.push(el));
      } catch (_) {}
    });
    // SVG <title>ic-send-filled</title>（新版无 data-icon）
    try {
      searchRoot.querySelectorAll('svg title').forEach((t) => {
        if (isSendIconName(t.textContent)) found.push(t);
      });
    } catch (_) {}
    found.forEach(el => {
      const container = el.closest('button') || el.closest('div[role="button"]') || el;
      if (!container || container.classList && container.classList.contains('wa-send-hooked')) return;
      try {
        if (container.isContentEditable || container.getAttribute('role') === 'textbox') return;
      } catch (_) {}
      if (container.classList) container.classList.add('wa-send-hooked');
      const handler = (evt) => {
        handleNativeSendClickEvent(evt, container);
      };
      ['click'].forEach(ev => container.addEventListener(ev, handler, true));
    });
}

// 文档级捕获：不依赖按钮是否已标 wa-send-hooked。
// mic→发送键重建后，MutationObserver 再挂接常有数百毫秒窗口，期间点击会漏拦发原文。
(function setupGlobalSendClickCapture() {
  if (window.__waGlobalSendClickHooked) return;
  window.__waGlobalSendClickHooked = true;
  const onSendClickCapture = (evt) => {
    try {
      if (waTranslatingAndSending) return;
      const container = resolveSendButtonFromEventTarget(evt && evt.target);
      if (!container) return;
      handleNativeSendClickEvent(evt, container);
    } catch (_) {}
  };
  document.addEventListener('click', onSendClickCapture, true);
})();

// 发送按钮挂钩：观察会话主区域（文档捕获兜底后，此处仅作标记/次要路径）
(function setupSendHookWatcher() {
  let hookTimer = null;
  let boundRoot = null;
  let mo = null;

  function scheduleHook() {
    if (hookTimer) return;
    // 尽快挂上 per-button（文档捕获已兜底，延迟可很短）
    hookTimer = setTimeout(() => {
      hookTimer = null;
      try { hookNativeSend(); } catch (_) {}
    }, 0);
  }

  function bindComposeRoot() {
    const root =
      document.querySelector('#main') ||
      document.querySelector('footer') ||
      document.body;
    if (!root || root === boundRoot) return;
    boundRoot = root;
    try {
      if (mo) mo.disconnect();
    } catch (_) {}
    try {
      mo = new MutationObserver(() => scheduleHook());
      mo.observe(root, { childList: true, subtree: true });
    } catch (_) {}
    scheduleHook();
  }

  try { hookNativeSend(); } catch (_) {}
  bindComposeRoot();
  // 慢速兜底（会话切换 / footer 重建）
  setInterval(() => {
    try {
      bindComposeRoot();
      hookNativeSend();
    } catch (_) {}
  }, 2000);
})();

/**
 * Enter 发送拦截核心。返回 true 表示已拦截（调用方应 preventDefault）。
 * @param {KeyboardEvent|null} e
 * @param {'keydown'|'lexical'} source
 */
function handleComposerEnterForTranslate(e, source) {
  if (waTranslatingAndSending) return false;
  if (waOutboundSendLocked) {
    if (e) {
      try { e.stopPropagation(); e.preventDefault(); } catch (_) {}
    }
    return true;
  }
  if (e && e.key && e.key !== 'Enter') return false;

  const ed = getNativeComposerElement();
  if (!ed) return false;

  // keydown 路径需确认焦点在输入框；Lexical KEY_ENTER 已保证来自该编辑器
  if (source !== 'lexical') {
    const active = document.activeElement;
    if (!(active === ed || (active && ed.contains(active)))) return false;
  }

  if (isImeComposingEvent(e, ed)) return false;

  const original = (readComposerText(ed) || '').trim();
  if (!original) return false;

  // Ctrl+Enter：不翻译，直接发送原文
  if (e && e.ctrlKey) {
    if (e) {
      try { e.stopPropagation(); e.preventDefault(); } catch (_) {}
    }
    // keydown + Lexical 可能各触发一次，去重后只发一条
    if (waConsumeSendGestureOrDup()) return true;
    triggerNativeSendBypassTranslate(ed);
    return true;
  }

  // Enter（不含 Shift/Alt/Ctrl）：翻译后发送
  if (e && (e.shiftKey || e.altKey || e.metaKey)) return false;

  // 点击“译”按钮关闭时，不做翻译拦截
  if (window.__inlineTranslateDisabled) return false;
  // 未登录 / 会员失效：不拦截 Enter / 发送
  if (!canCore()) return false;

  if (waConsumeSendGestureOrDup()) {
    if (e) {
      try { e.stopPropagation(); e.preventDefault(); } catch (_) {}
    }
    return true;
  }
  if (waSendDebounceHit()) {
    if (e) {
      try { e.stopPropagation(); e.preventDefault(); } catch (_) {}
    }
    return true;
  }

  let targetLang = '';
  try {
    targetLang = getTargetLangForSend();
  } catch (err) {
    console.warn('[WATransChat] getTargetLangForSend failed, sending original', err);
    if (e) {
      try { e.stopPropagation(); e.preventDefault(); } catch (_) {}
    }
    triggerNativeSendBypassTranslate(ed);
    return true;
  }

  if (shouldSkipOutgoingTranslate(targetLang, original)) {
    // 同语言：自动发送开则放行原生发送；关则拦截 Enter 以免误发
    if (autoSendInputTranslationCache) {
      if (source === 'lexical') return false; // 交给 Lexical/WA 原生发送
      // keydown：显式点发送，避免与 WA 默认行为打架
      if (e) {
        try { e.stopPropagation(); e.preventDefault(); } catch (_) {}
      }
      triggerNativeSendBypassTranslate(ed);
      return true;
    }
    if (e) {
      try { e.stopPropagation(); e.preventDefault(); } catch (_) {}
    }
    return true;
  }

  if (e) {
    try { e.stopPropagation(); e.preventDefault(); } catch (_) {}
  }
  runOutboundTranslatePipeline(original, targetLang, ed, {
    clearFirst: !!autoSendInputTranslationCache,
    autoSend: !!autoSendInputTranslationCache
  });
  return true;
}

function findLexicalCommandByType(editor, typeName) {
  try {
    if (!editor || !editor._commands || typeof editor._commands.keys !== 'function') return null;
    for (const k of editor._commands.keys()) {
      if (k && k.type === typeName) return k;
    }
  } catch (_) {}
  return null;
}

// Lexical KEY_ENTER：比全局 keydown 更贴近编辑器发送语义；编辑器重建时重挂
(function setupLexicalEnterCommandHook() {
  let boundEditor = null;
  let unregister = null;

  function bind() {
    const el = getNativeComposerElement();
    const editor = getLexicalEditor(el);
    if (!editor || editor === boundEditor) return;
    try { if (typeof unregister === 'function') unregister(); } catch (_) {}
    unregister = null;
    boundEditor = editor;
    const cmd = findLexicalCommandByType(editor, 'KEY_ENTER_COMMAND');
    if (!cmd || typeof editor.registerCommand !== 'function') return;
    try {
      // COMMAND_PRIORITY_CRITICAL ≈ 4，抢在 WA 默认发送之前
      unregister = editor.registerCommand(cmd, (event) => {
        try {
          return !!handleComposerEnterForTranslate(event || null, 'lexical');
        } catch (_) {
          return false;
        }
      }, 4);
    } catch (_) {
      boundEditor = null;
      unregister = null;
    }
  }

  try { bind(); } catch (_) {}
  setInterval(() => {
    try { bind(); } catch (_) {}
  }, 1500);
})();

// Enter 键拦截（全局捕获，避免 WhatsApp 重建 editor 造成漏挂钩窗口期；并作 Lexical 钩子兜底）
if (!window.__waGlobalEnterHooked) {
  window.__waGlobalEnterHooked = true;
  document.addEventListener('keydown', (e) => {
    try {
      handleComposerEnterForTranslate(e, 'keydown');
    } catch (_) {}
  }, true);
}


  try {
    window.__whatsnowTranslateHelpers = Object.assign(window.__whatsnowTranslateHelpers || {}, {
      getTargetLangForSend: getTargetLangForSend,
      getNativeComposerElement: getNativeComposerElement,
      getMediaCaptionEditorEl: getMediaCaptionEditorEl,
      isMediaCaptionComposerOpen: isMediaCaptionComposerOpen,
      isAllowedChatComposerEl: isAllowedChatComposerEl,
      readComposerTextFromEl: readComposerTextFromEl,
      readComposerText: readComposerText,
      pasteReplaceText: pasteReplaceText,
      clearComposerText: clearComposerText,
      setComposerTextViaLexical: setComposerTextViaLexical,
      triggerSendAfterTranslate: triggerSendAfterTranslate,
      getCurrentUserSourceLang: getCurrentUserSourceLang,
      getCustomerIdentifier: getCustomerIdentifier,
      getCurrentCustomerIdentifier: getCurrentCustomerIdentifier,
      normalizeNewlines: normalizeNewlines,
      getSegmentContainer: getSegmentContainer,
      findSendButton: findSendButton,
      getCurrentTargetLangPref: getCurrentTargetLangPref,
      getCurrentEnginePref: getCurrentEnginePref,
      setCurrentTargetLangPref: setCurrentTargetLangPref,
      loadSessionLanguageSettings: loadSessionLanguageSettings,
      clearCustomerTargetLanguageValue: clearCustomerTargetLanguageValue,
      saveCustomerTargetLanguageValue: saveCustomerTargetLanguageValue,
      readCustomerLanguageSettingsMap: readCustomerLanguageSettingsMap,
      writeCustomerLanguageSettingsMap: writeCustomerLanguageSettingsMap,
      isValidCustomerIdentifier: isValidCustomerIdentifier,
      getCountryInfo: getCountryInfo,
      refreshComposerTargetLangHint: refreshComposerTargetLangHint,
      updateComposerHintOnce: updateComposerHintOnce,
      switchToNextOutboundEngine: switchToNextOutboundEngine,
      resolveCurrentOutboundEngine: resolveCurrentOutboundEngine,
      saveOutboundEngineSelection: saveOutboundEngineSelection,
      clampOutboundEngine: clampOutboundEngine,
    });
  } catch (e) {
    console.warn("[WATransChat] publish send-hook helpers failed", e);
  }
  try {
    if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
      window.__TAURI__.core.invoke("dlog", { msg: "watrans-send-hook: ready (1:1)" });
    }
  } catch (_) {}
})();