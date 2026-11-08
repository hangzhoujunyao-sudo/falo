/*! Falo translation engines — 1:1 from Falo options.js / content-customer-lang.js */
(function (global) {
  "use strict";
  if (global.__faloEngineList) return;

  // options.js GLOBAL_INPUT_ENGINES (客户语言 / 全局输入框)
  var GLOBAL_INPUT_ENGINES = [
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

  // options.js CHAT_HISTORY_ENGINES (聊天记录)
  var CHAT_HISTORY_ENGINES = [
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

  // Engines that require pro_engines / ai_proxy (extension checkIsProRealtime gates)
  var PRO_ENGINES_GLOBAL = [
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
  var PRO_ENGINES_HISTORY = ["deepl", "chatgpt", "openai_custom", "deepseek_custom"];

  var NAME_ZH = {
    google_web: "谷歌网页",
    google: "谷歌",
    google_chrome: "谷歌Chrome",
    bing: "Bing",
    yandex: "Yandex",
    volc: "火山",
    deeplx: "DeepLX",
    backup: "备用",
    deepl: "DeepL",
    deepseek: "Deepseek-V4",
    volc_deepseek: "火山Deepseek-V4",
    qwen: "阿里Qwen2.5-7B-Instruct",
    hunyuan: "腾讯Hunyuan-MT-7B",
    glm: "智谱GLM-4-Flash",
    chatgpt: "ChatGPT",
    openai_custom: "OpenAI自定义",
    deepseek_custom: "Deepseek自定义",
  };
  var NAME_EN = {
    google_web: "Google Web",
    google: "Google",
    google_chrome: "Google Chrome",
    bing: "Bing",
    yandex: "Yandex",
    volc: "Volcengine",
    deeplx: "DeepLX",
    backup: "Backup",
    deepl: "DeepL",
    deepseek: "Deepseek-V4",
    volc_deepseek: "Volc Deepseek-V4",
    qwen: "Alibaba Qwen2.5-7B-Instruct",
    hunyuan: "Tencent Hunyuan-MT-7B",
    glm: "Zhipu GLM-4-Flash",
    chatgpt: "ChatGPT",
    openai_custom: "OpenAI Custom",
    deepseek_custom: "Deepseek Custom",
  };

  function nameMap(uiLang) {
    var u = String(uiLang || "zh").toLowerCase();
    return u.indexOf("zh") === 0 ? NAME_ZH : NAME_EN;
  }

  function isProMember() {
    try {
      if (window.__faloCan) {
        if (window.__faloCan("pro_engines") || window.__faloCan("ai_proxy")) return true;
      }
      var c = window.__faloCaps;
      if (c && (c.isPro || c.isPremium)) return true;
    } catch (_) {}
    return false;
  }

  function isProEngine(engine, listKind) {
    var e = String(engine || "");
    var list = listKind === "history" ? PRO_ENGINES_HISTORY : PRO_ENGINES_GLOBAL;
    return list.indexOf(e) >= 0;
  }

  function fillEngineSelect(selectEl, opts) {
    if (!selectEl) return "";
    opts = opts || {};
    var kind = opts.kind === "history" ? "history" : "global";
    var engines = kind === "history" ? CHAT_HISTORY_ENGINES : GLOBAL_INPUT_ENGINES;
    var map = nameMap(opts.uiLang || "zh");
    var prev = opts.value != null ? String(opts.value) : selectEl.value || "google_web";
    selectEl.innerHTML = "";
    engines.forEach(function (v) {
      var o = document.createElement("option");
      o.value = v;
      o.textContent = map[v] || v;
      selectEl.appendChild(o);
    });
    var effective = engines.indexOf(prev) >= 0 ? prev : "google_web";
    var pro = typeof opts.isPro === "boolean" ? opts.isPro : isProMember();
    if (!pro && isProEngine(effective, kind)) effective = "google_web";
    try {
      selectEl.value = effective;
    } catch (_) {}
    return effective;
  }

  function resolveIsPro(opts) {
    try {
      if (typeof opts.isPro === "function") return opts.isPro();
      if (typeof opts.isPro === "boolean") return opts.isPro;
    } catch (_) {}
    return isProMember();
  }

  function resolveUiLang(opts) {
    try {
      if (typeof opts.uiLang === "function") return String(opts.uiLang() || "zh");
      if (opts.uiLang) return String(opts.uiLang);
      var i18n = global.__faloPageI18n;
      if (i18n && i18n.getUiLang) return String(i18n.getUiLang() || "zh");
      if (global.FaloI18n && global.FaloI18n.getLang) {
        return String(global.FaloI18n.getLang() || "zh");
      }
    } catch (_) {}
    return "zh";
  }

  function trimCfg(v) {
    return String(v == null ? "" : v).trim();
  }

  function readDefaultKeyConfig() {
    try {
      var cfg = global.__faloTranslateCfg || global.__faloTranslateBoot || {};
      return {
        deeplApiKey: cfg.deeplApiKey || "",
        chatgptApiKey: cfg.chatgptApiKey || "",
        openaiCustomApiKey: cfg.openaiCustomApiKey || "",
        openaiCustomApiUrl: cfg.openaiCustomApiUrl || "",
        openaiCustomModel: cfg.openaiCustomModel || "",
        deepseekCustomApiKey: cfg.deepseekCustomApiKey || "",
      };
    } catch (_) {
      return {};
    }
  }

  function resolveKeyConfig(opts) {
    try {
      if (typeof opts.getKeyConfig === "function") {
        var c = opts.getKeyConfig();
        if (c && typeof c === "object") return c;
      }
    } catch (_) {}
    return readDefaultKeyConfig();
  }

  function pageT(uiLang, key, zhFb, enFb) {
    try {
      var i18n = global.__faloPageI18n;
      if (i18n && i18n.t) {
        var fb = String(uiLang || "zh").toLowerCase().indexOf("en") === 0 ? enFb : zhFb;
        return i18n.t(uiLang, key, fb);
      }
    } catch (_) {}
    return String(uiLang || "zh").toLowerCase().indexOf("en") === 0 ? enFb : zhFb;
  }

  /** Falo / AI Suggest parity: block keyed engines until API fields are filled. */
  function checkKeyedEngineReady(engine, keyCfg, uiLang) {
    var id = String(engine || "");
    var cfg = keyCfg || {};
    if (id === "deepl") {
      if (trimCfg(cfg.deeplApiKey)) return { ok: true, engine: id };
      return {
        ok: false,
        engine: id,
        error: pageT(
          uiLang,
          "engineNeedDeeplKey",
          "请先在设置中填写 DeepL API Key。",
          "Please enter a DeepL API Key in settings."
        ),
      };
    }
    if (id === "chatgpt") {
      if (trimCfg(cfg.chatgptApiKey)) return { ok: true, engine: id };
      return {
        ok: false,
        engine: id,
        error: pageT(
          uiLang,
          "engineNeedChatgptKey",
          "请先填写 ChatGPT API Key",
          "Please set ChatGPT API Key first"
        ),
      };
    }
    if (id === "openai_custom") {
      if (
        trimCfg(cfg.openaiCustomApiKey) &&
        trimCfg(cfg.openaiCustomApiUrl) &&
        trimCfg(cfg.openaiCustomModel)
      ) {
        return { ok: true, engine: id };
      }
      return {
        ok: false,
        engine: id,
        error: pageT(
          uiLang,
          "engineNeedOpenaiCustom",
          "请先在设置中填写 OpenAI自定义 的接口地址、模型与 API Key。",
          "Please configure OpenAI Custom URL, model and API Key in settings."
        ),
      };
    }
    if (id === "deepseek_custom") {
      if (trimCfg(cfg.deepseekCustomApiKey)) return { ok: true, engine: id };
      return {
        ok: false,
        engine: id,
        error: pageT(
          uiLang,
          "engineNeedDeepseekCustom",
          "请先在设置中填写 Deepseek自定义 API Key。",
          "Please enter a Deepseek Custom API Key in settings."
        ),
      };
    }
    return { ok: true, engine: id };
  }

  function bindProGate(selectEl, opts) {
    if (!selectEl || selectEl.__wnEngineProBound) return;
    selectEl.__wnEngineProBound = true;
    opts = opts || {};
    var kind = opts.kind === "history" ? "history" : "global";
    if (!selectEl.__wnAllowedEngine) {
      selectEl.__wnAllowedEngine = selectEl.value || opts.fallback || "google_web";
    }
    selectEl.addEventListener("change", function () {
      var selected = selectEl.value || "google_web";
      var previous = selectEl.__wnAllowedEngine || opts.fallback || "google_web";
      var ui = resolveUiLang(opts);
      Promise.resolve(resolveIsPro(opts))
        .then(function (pro) {
          pro = !!pro;
          if (!pro && isProEngine(selected, kind)) {
            var msg = opts.proMessage;
            if (!msg) {
              msg = pageT(
                ui,
                "proEngineOnly",
                "此接口功能仅专业版会员可用，请升级到专业版会员。",
                "This engine requires Pro membership. Please upgrade."
              );
            }
            try { if (window.__faloNotice) window.__faloNotice(msg); else if (window.__faloAlert) window.__faloAlert(msg); else if (typeof window.appAlert === "function") window.appAlert(msg); else alert(msg); } catch (_) {}
            var fallback = previous;
            if (isProEngine(fallback, kind) && !pro) fallback = "google_web";
            selectEl.value = fallback;
            return;
          }
          var keyReady = checkKeyedEngineReady(selected, resolveKeyConfig(opts), ui);
          if (!keyReady.ok) {
            try {
              var keyMsg = keyReady.error || "Please configure API Key in settings.";
              if (window.__faloNotice) window.__faloNotice(keyMsg);
              else if (window.__faloAlert) window.__faloAlert(keyMsg);
              else if (typeof window.appAlert === "function") window.appAlert(keyMsg);
              else alert(keyMsg);
            } catch (_) {}
            selectEl.value = previous;
            if (typeof opts.onKeyMissing === "function") {
              try {
                opts.onKeyMissing(selected, keyReady);
              } catch (_) {}
            }
            return;
          }
          selectEl.__wnAllowedEngine = selected;
          if (typeof opts.onAllowed === "function") opts.onAllowed(selected);
        })
        .catch(function () {
          selectEl.value = previous;
        });
    });
  }

  global.__faloEngineList = {
    GLOBAL_INPUT_ENGINES: GLOBAL_INPUT_ENGINES,
    CHAT_HISTORY_ENGINES: CHAT_HISTORY_ENGINES,
    PRO_ENGINES_GLOBAL: PRO_ENGINES_GLOBAL,
    PRO_ENGINES_HISTORY: PRO_ENGINES_HISTORY,
    NAME_ZH: NAME_ZH,
    NAME_EN: NAME_EN,
    nameMap: nameMap,
    isProMember: isProMember,
    isProEngine: isProEngine,
    fillEngineSelect: fillEngineSelect,
    checkKeyedEngineReady: checkKeyedEngineReady,
    bindProGate: bindProGate,
  };
})(typeof window !== "undefined" ? window : globalThis);
