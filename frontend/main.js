// WATransChat — authored and maintained solely by @benedictusrey.
const invoke = window.__TAURI__?.core?.invoke ?? (async () => {
  throw new Error(
    (window.WhatsNowI18n && window.WhatsNowI18n.t("runtime.required")) ||
      "WATransChat settings require the desktop runtime.",
  );
});
const listen = window.__TAURI__?.event?.listen;
function t(key, vars) {
  return window.WhatsNowI18n ? window.WhatsNowI18n.t(key, vars) : key;
}
/** macOS WKWebView: native confirm/alert/prompt are silent no-ops. */
function dialogLabels() {
  return {
    okLabel: t("devices.confirmOk"),
    cancelLabel: t("devices.confirmCancel"),
  };
}
async function askConfirm(message) {
  if (typeof window.appConfirm === "function") {
    return window.appConfirm(message, dialogLabels());
  }
  return window.confirm(message);
}
async function askAlert(message) {
  if (typeof window.appAlert === "function") {
    return window.appAlert(message, { okLabel: t("devices.confirmOk") });
  }
  window.alert(message);
}
async function askPrompt(message, defaultValue, opts) {
  if (typeof window.appPrompt === "function") {
    return window.appPrompt(message, defaultValue, Object.assign({}, dialogLabels(), opts || {}));
  }
  return window.prompt(message, defaultValue);
}
function uiLang() {
  return window.WhatsNowI18n ? window.WhatsNowI18n.getLang() : "zh";
}
function applyUiLang(lang) {
  if (!window.WhatsNowI18n) return "zh";
  const next = window.WhatsNowI18n.setLang(lang);
  const active =
    document.querySelector(".nav-item.active")?.dataset?.panelTarget || "overview";
  showPanel(active);
  applyTheme(selectedTheme);
  refreshPlatformShortcutCopy();
  if (cachedPlans.length) renderSubscriptionPlans(cachedPlans);
  return next;
}
const BOOLS = [
  "close_to_tray",
  "start_minimized",
  "autostart",
  "notifications",
  "notification_previews",
  "always_on_top",
  "hotkey_enabled",
  "translate_enabled",
  "translate_incoming",
  "translate_compose",
  "auto_send_input_translation",
  "enable_translate_button",
  "show_quick_phrases",
  "show_quick_remark",
  "show_msg_device",
  "show_business_badge",
  "show_chatlist_country",
  "show_fx",
  "show_followup_todos",
];
const SELECTS = [
  "ui_lang",
  "translate_target_lang",
  "translate_source_lang",
  "default_customer_lang",
  "translate_engine",
  "chat_history_engine",
];
const TEXTS = [
  "deepl_api_key",
  "chatgpt_api_key",
  "chatgpt_model",
  "openai_custom_api_key",
  "openai_custom_api_url",
  "openai_custom_model",
  "deepseek_custom_api_key",
  "deepseek_custom_api_url",
  "deepseek_custom_model",
  "translate_text_color",
];

/** WATransChat `ee` — engines that expose a custom AI system prompt editor. */
const AI_PROMPT_ENGINES = [
  "deepseek",
  "volc_deepseek",
  "chatgpt",
  "openai_custom",
  "deepseek_custom",
];
/** Engine id → Settings field (WATransChat `de` / `sr`). */
const AI_PROMPT_FIELD = {
  deepseek: "ai_system_prompt_deepseek",
  volc_deepseek: "ai_system_prompt_volc_deepseek",
  chatgpt: "ai_system_prompt_chatgpt",
  openai_custom: "ai_system_prompt_openai_custom",
  deepseek_custom: "ai_system_prompt_deepseek_custom",
};
/** WATransChat default `Vr` / `_t`. */
const AI_PROMPT_DEFAULT = `You are a professional \${toCode} native translator who needs to fluently translate text into \${toCode}.

## Translation Rules
1. Output only the translated content, without explanations or additional content (such as "Here's the translation:" or "Translation as follows:")
2. The returned translation must maintain exactly the same number of paragraphs and format as the original text
3. For content that should not be translated (such as proper nouns, code, etc.), keep the original text.

## OUTPUT FORMAT:
Output translation directly`;
/** WATransChat finance industry template `Vt`. */
const AI_PROMPT_FINANCE = `You are a professional \${toCode} native translator specializing in finance who needs to fluently translate text into \${toCode}.

## Translation Rules
1. Output only the translated content, without explanations or additional content (such as "Here's the translation:" or "Translation as follows:")
2. Ensure all industry terminology is accurate; keep abbreviations, symbols, and proper nouns when appropriate
3. The returned translation must maintain exactly the same number of paragraphs and format as the original text
4. For content that should not be translated (such as proper nouns, code, etc.), keep the original text.

## OUTPUT FORMAT:
Output translation directly`;
/** In-memory cache of prompt fields loaded from settings. */
let aiPromptCache = {
  ai_system_prompt: "",
  ai_system_prompt_deepseek: "",
  ai_system_prompt_volc_deepseek: "",
  ai_system_prompt_chatgpt: "",
  ai_system_prompt_openai_custom: "",
  ai_system_prompt_deepseek_custom: "",
};
/** Currently shown prompt engine (WATransChat `Pe`). */
let aiPromptActiveEngine = "";
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
let selectedTheme = "light";
function themeLabel(theme) {
  if (window.WhatsNowI18n) return window.WhatsNowI18n.themeLabel(theme);
  return theme || "light";
}
const PANEL_NAMES = Object.freeze([
  "overview",
  "accounts",
  "focus",
  "appearance",
  "interface",
  "notifications",
  "preferences",
  "membership",
  "translation",
  "devices",
  "backup",
  "security",
  "about",
]);
function panelMeta(name) {
  if (window.WhatsNowI18n) return window.WhatsNowI18n.panelMeta(name);
  return [name, ""];
}
function hasPanel(name) {
  return PANEL_NAMES.includes(name);
}

function detectPlatform() {
  const value = navigator.userAgentData?.platform || navigator.platform || navigator.userAgent || "";
  if (/mac/i.test(value)) return "macos";
  if (/win/i.test(value)) return "windows";
  return "linux";
}

function platformDefaultHotkey() {
  return detectPlatform() === "linux" ? "Ctrl+Alt+W" : "Alt+W";
}

function applyTheme(theme) {
  selectedTheme = window.WhatsNowTheme.apply(document, theme, systemDark.matches);
  const overviewTheme = document.getElementById("overview_theme");
  if (overviewTheme) overviewTheme.textContent = themeLabel(selectedTheme);
}

function selectTheme(theme) {
  const normalized = window.WhatsNowTheme.normalize(theme);
  const input = document.querySelector(`input[name="theme"][value="${normalized}"]`);
  if (input) input.checked = true;
  applyTheme(normalized);
}

function wireThemePicker() {
  selectTheme("light");
  for (const input of document.querySelectorAll('input[name="theme"]')) {
    input.addEventListener("change", () => {
      if (input.checked) applyTheme(input.value);
    });
  }
  systemDark.addEventListener?.("change", () => {
    if (selectedTheme === "system") applyTheme("system");
  });
}

function showNote(elementId, message, timeoutMs = 2500) {
  const note = document.getElementById(elementId);
  if (!note) return;
  note.textContent = message;
  if (timeoutMs > 0) {
    setTimeout(() => {
      if (note.textContent === message) note.textContent = "";
    }, timeoutMs);
  }
}

function wireExternalLinks() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest?.('a[href^="http://"], a[href^="https://"]');
    if (!link) return;
    event.preventDefault();
    invoke("open_external_url", { url: link.href }).catch((error) => {
      showNote("note", t("link.browser", { error: String(error) }), 6000);
    });
  });
}

function setSelectValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  const v = value == null ? "" : String(value);
  if (el.tagName === "SELECT" && v && ![...el.options].some((o) => o.value === v)) {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    el.appendChild(opt);
  }
  el.value = v;
}

const QUALITY_LANG_KEY = "wn_qualityTranslateLangs";

/** Defaults for quality-test source/target (local only; does not change app settings). */
function qualityLangDefaults(settings) {
  const s = settings || {};
  let source = "auto";
  let target = uiLang().indexOf("zh") === 0 ? "en" : "zh-CN";
  try {
    const saved = JSON.parse(localStorage.getItem(QUALITY_LANG_KEY) || "null");
    if (saved && typeof saved.source === "string" && saved.source.trim()) {
      source = saved.source.trim();
    } else if (s.translate_source_lang) {
      source = String(s.translate_source_lang);
    }
    if (saved && typeof saved.target === "string" && saved.target.trim() && saved.target !== "auto") {
      target = saved.target.trim();
    } else {
      const cust = String(s.default_customer_lang || "").trim();
      if (cust && cust !== "auto") target = cust;
    }
  } catch (_) {}
  return { source, target };
}

function persistQualityLangs() {
  const sl = document.getElementById("quality_source_lang");
  const tl = document.getElementById("quality_target_lang");
  if (!sl && !tl) return;
  try {
    localStorage.setItem(
      QUALITY_LANG_KEY,
      JSON.stringify({
        source: (sl && sl.value) || "auto",
        target: (tl && tl.value) || "en",
      }),
    );
  } catch (_) {}
}

/** WATransChat 1:1 language lists + searchable select (options.js lang-search). */
function fillTranslateLangSelects(settings) {
  const api = window.__whatsnowLangList;
  if (!api || typeof api.fillSelect !== "function") return;
  const s = settings || {};
  const qDefaults = qualityLangDefaults(s);
  const qSl = document.getElementById("quality_source_lang");
  const qTl = document.getElementById("quality_target_lang");
  // Extension options: 你的语言 + 默认客户语言; quality test has its own pair.
  const specs = [
    {
      id: "translate_source_lang",
      includeAuto: true,
      autoKind: "detect",
      value: s.translate_source_lang || "auto",
    },
    {
      id: "default_customer_lang",
      includeAuto: true,
      autoKind: "defaultCustomer",
      value: s.default_customer_lang || "auto",
    },
    {
      id: "quality_source_lang",
      includeAuto: true,
      autoKind: "detect",
      value: (qSl && qSl.value) || qDefaults.source,
    },
    {
      id: "quality_target_lang",
      includeAuto: false,
      autoKind: "detect",
      value: (qTl && qTl.value) || qDefaults.target,
    },
  ];
  for (const spec of specs) {
    const el = document.getElementById(spec.id);
    if (!el) continue;
    api.fillSelect(el, {
      uiLang: uiLang(),
      includeAuto: spec.includeAuto,
      autoKind: spec.autoKind,
      value: spec.value,
    });
    if (typeof api.enhanceSelect === "function") {
      api.enhanceSelect(el, { uiLang: uiLang() });
    }
  }
}

async function settingsIsPro() {
  try {
    const status = await invoke("membership_status");
    if (!status) return false;
    if (status.is_pro || status.is_premium) return true;
    const caps = Array.isArray(status.caps) ? status.caps : [];
    return caps.includes("pro_engines") || caps.includes("ai_proxy");
  } catch (_) {
    return false;
  }
}

/** WATransChat 1:1 engine lists (options.js GLOBAL_INPUT / CHAT_HISTORY). */
function readApiKeyConfigFromForm() {
  const val = (id) => String(document.getElementById(id)?.value || "").trim();
  return {
    deeplApiKey: val("deepl_api_key"),
    chatgptApiKey: val("chatgpt_api_key"),
    openaiCustomApiKey: val("openai_custom_api_key"),
    openaiCustomApiUrl: val("openai_custom_api_url"),
    openaiCustomModel: val("openai_custom_model"),
    deepseekCustomApiKey: val("deepseek_custom_api_key"),
  };
}

function focusApiKeyFieldsForEngine(engine) {
  const map = {
    deepl: ["deepl_api_key"],
    chatgpt: ["chatgpt_api_key"],
    openai_custom: [
      "openai_custom_api_url",
      "openai_custom_model",
      "openai_custom_api_key",
    ],
    deepseek_custom: [
      "deepseek_custom_api_url",
      "deepseek_custom_model",
      "deepseek_custom_api_key",
    ],
  };
  const ids = map[String(engine || "")] || [];
  const surface = document.querySelector(".api-keys-surface");
  if (surface && typeof surface.scrollIntoView === "function") {
    try {
      surface.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (_) {
      try {
        surface.scrollIntoView(true);
      } catch (__) {}
    }
  }
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el && !String(el.value || "").trim()) {
      try {
        el.focus();
      } catch (_) {}
      return;
    }
  }
  if (ids[0]) {
    try {
      document.getElementById(ids[0])?.focus();
    } catch (_) {}
  }
}

async function fillTranslateEngineSelects(settings) {
  const api = window.__whatsnowEngineList;
  if (!api || typeof api.fillEngineSelect !== "function") return;
  const s = settings || {};
  const isPro = await settingsIsPro();
  const composeEl = document.getElementById("translate_engine");
  const historyEl = document.getElementById("chat_history_engine");
  let composeValue = s.translate_engine || "google_web";
  let historyValue = s.chat_history_engine || "google_web";
  const keyedGate = {
    getKeyConfig: readApiKeyConfigFromForm,
    onKeyMissing: (engine) => focusApiKeyFieldsForEngine(engine),
    uiLang: () => uiLang(),
  };
  if (composeEl) {
    composeValue = api.fillEngineSelect(composeEl, {
      kind: "global",
      uiLang: uiLang(),
      value: composeValue,
      isPro,
    });
    api.bindProGate(composeEl, {
      kind: "global",
      isPro: () => settingsIsPro(),
      fallback: composeValue,
      ...keyedGate,
      onAllowed: (selected) => {
        composeEl.__wnAllowedEngine = selected;
      },
    });
    composeEl.__wnAllowedEngine = composeValue;
  }
  if (historyEl) {
    historyValue = api.fillEngineSelect(historyEl, {
      kind: "history",
      uiLang: uiLang(),
      value: historyValue,
      isPro,
    });
    api.bindProGate(historyEl, {
      kind: "history",
      isPro: () => settingsIsPro(),
      fallback: historyValue,
      ...keyedGate,
      onAllowed: (selected) => {
        historyEl.__wnAllowedEngine = selected;
      },
    });
    historyEl.__wnAllowedEngine = historyValue;
  }
}

function normalizeStoredAiPrompt(raw) {
  const text = String(raw || "").trim();
  return !text || text === AI_PROMPT_DEFAULT.trim() ? "" : text;
}

function displayAiPrompt(stored) {
  const text = String(stored || "").trim();
  return text || AI_PROMPT_DEFAULT;
}

function readStoredAiPrompt(engine, bag) {
  const field = AI_PROMPT_FIELD[engine];
  if (field && bag && typeof bag[field] === "string" && bag[field].trim()) {
    return bag[field];
  }
  if (
    (engine === "deepseek" || engine === "volc_deepseek" || engine === "chatgpt") &&
    bag &&
    typeof bag.ai_system_prompt === "string" &&
    bag.ai_system_prompt.trim()
  ) {
    return bag.ai_system_prompt;
  }
  return "";
}

/** Prefer compose engine, else history (WATransChat `Uc`). */
function resolveAiPromptEngine(composeEngine, historyEngine) {
  const g = String(composeEngine || "");
  const h = String(historyEngine || "");
  if (AI_PROMPT_ENGINES.includes(g)) return g;
  if (AI_PROMPT_ENGINES.includes(h)) return h;
  return "";
}

function aiPromptEngineLabel(engine) {
  const lang = uiLang();
  const map =
    window.__whatsnowEngineList && typeof window.__whatsnowEngineList.nameMap === "function"
      ? window.__whatsnowEngineList.nameMap(lang)
      : null;
  return (map && map[engine]) || engine;
}

function aiPromptDescKey(engine) {
  switch (engine) {
    case "deepseek":
      return "translation.aiPromptDescDeepseek";
    case "volc_deepseek":
      return "translation.aiPromptDescVolcDeepseek";
    case "chatgpt":
      return "translation.aiPromptDescChatgpt";
    case "openai_custom":
      return "translation.aiPromptDescOpenaiCustom";
    case "deepseek_custom":
      return "translation.aiPromptDescDeepseekCustom";
    default:
      return "translation.aiPromptDesc";
  }
}

function syncAiPromptCacheFromSettings(s) {
  aiPromptCache = {
    ai_system_prompt: s.ai_system_prompt == null ? "" : String(s.ai_system_prompt),
    ai_system_prompt_deepseek:
      s.ai_system_prompt_deepseek == null ? "" : String(s.ai_system_prompt_deepseek),
    ai_system_prompt_volc_deepseek:
      s.ai_system_prompt_volc_deepseek == null
        ? ""
        : String(s.ai_system_prompt_volc_deepseek),
    ai_system_prompt_chatgpt:
      s.ai_system_prompt_chatgpt == null ? "" : String(s.ai_system_prompt_chatgpt),
    ai_system_prompt_openai_custom:
      s.ai_system_prompt_openai_custom == null
        ? ""
        : String(s.ai_system_prompt_openai_custom),
    ai_system_prompt_deepseek_custom:
      s.ai_system_prompt_deepseek_custom == null
        ? ""
        : String(s.ai_system_prompt_deepseek_custom),
  };
}

function refreshAiPromptSection() {
  const section = document.getElementById("ai-prompt-section");
  const textarea = document.getElementById("ai-system-prompt-input");
  const titleEl = document.getElementById("opt-ai-prompt-title");
  const descEl = document.getElementById("opt-ai-prompt-desc");
  if (!section || !textarea) return;
  const compose = document.getElementById("translate_engine")?.value || "";
  const history = document.getElementById("chat_history_engine")?.value || "";
  const eng = resolveAiPromptEngine(compose, history);
  aiPromptActiveEngine = eng;
  if (!eng) {
    section.hidden = true;
    return;
  }
  section.hidden = false;
  const label = aiPromptEngineLabel(eng);
  if (titleEl) {
    titleEl.textContent = `${t("translation.aiPromptTitle")} (${label})`;
  }
  if (descEl) {
    descEl.textContent = t(aiPromptDescKey(eng));
  }
  textarea.value = displayAiPrompt(readStoredAiPrompt(eng, aiPromptCache));
}

async function saveAiPromptForActiveEngine() {
  const eng = AI_PROMPT_ENGINES.includes(aiPromptActiveEngine)
    ? aiPromptActiveEngine
    : "deepseek";
  const field = AI_PROMPT_FIELD[eng];
  if (!field) return;
  const raw = document.getElementById("ai-system-prompt-input")?.value || "";
  const stored = normalizeStoredAiPrompt(raw);
  const s = await invoke("get_settings");
  s[field] = stored;
  if (eng === "deepseek") s.ai_system_prompt = stored;
  await invoke("set_settings", { settings: s });
  syncAiPromptCacheFromSettings(s);
  refreshAiPromptSection();
  const status = document.getElementById("ai-prompt-status");
  if (status) status.textContent = t("translation.aiPromptSaved");
  showNote("note", t("translation.aiPromptSaved"), 3000);
}

async function restoreAiPromptDefault() {
  const eng = AI_PROMPT_ENGINES.includes(aiPromptActiveEngine)
    ? aiPromptActiveEngine
    : "deepseek";
  const field = AI_PROMPT_FIELD[eng];
  if (!field) return;
  const textarea = document.getElementById("ai-system-prompt-input");
  if (textarea) textarea.value = AI_PROMPT_DEFAULT;
  const s = await invoke("get_settings");
  s[field] = "";
  if (eng === "deepseek") s.ai_system_prompt = "";
  await invoke("set_settings", { settings: s });
  syncAiPromptCacheFromSettings(s);
  const status = document.getElementById("ai-prompt-status");
  if (status) status.textContent = t("translation.aiPromptRestored");
  showNote("note", t("translation.aiPromptRestored"), 3000);
}

function applyAiPromptIndustryTemplate() {
  const textarea = document.getElementById("ai-system-prompt-input");
  if (textarea) textarea.value = AI_PROMPT_FINANCE;
}

function wireAiPromptSection() {
  document.getElementById("translate_engine")?.addEventListener("change", () => {
    refreshAiPromptSection();
  });
  document.getElementById("chat_history_engine")?.addEventListener("change", () => {
    refreshAiPromptSection();
  });
  document.getElementById("ai-prompt-save-btn")?.addEventListener("click", () => {
    saveAiPromptForActiveEngine().catch((e) => askAlert(String(e)));
  });
  document
    .getElementById("ai-prompt-restore-default-btn")
    ?.addEventListener("click", () => {
      restoreAiPromptDefault().catch((e) => askAlert(String(e)));
    });
  document.getElementById("ai-prompt-template-btn")?.addEventListener("click", () => {
    applyAiPromptIndustryTemplate();
  });
  document.addEventListener("whatsnow-ui-lang", () => {
    refreshAiPromptSection();
  });
}

async function load() {
  const s = await invoke("get_settings");
  const lang = window.WhatsNowI18n
    ? window.WhatsNowI18n.normalize(s.ui_lang || "zh")
    : "zh";
  if (window.WhatsNowI18n) window.WhatsNowI18n.setLang(lang);
  const uiLangEl = document.getElementById("ui_lang");
  if (uiLangEl) uiLangEl.value = lang;
  selectTheme(s.theme || "light");
  fillTranslateLangSelects(s);
  await fillTranslateEngineSelects(s);
  for (const f of BOOLS) {
    const el = document.getElementById(f);
    if (el) el.checked = !!s[f];
  }
  // Extension enableTranslateButton ≡ one switch. Keep compose + inlineBtn synced.
  {
    const composeEl = document.getElementById("translate_compose");
    const inlineEl = document.getElementById("enable_translate_button");
    const on = !!(composeEl?.checked || inlineEl?.checked);
    if (composeEl) composeEl.checked = on;
    if (inlineEl) inlineEl.checked = on;
  }
  for (const f of SELECTS) {
    // Language + engine selects already filled with saved values above.
    if (
      f === "ui_lang" ||
      f === "translate_source_lang" ||
      f === "default_customer_lang" ||
      f === "translate_target_lang" ||
      f === "translate_engine" ||
      f === "chat_history_engine"
    ) {
      continue;
    }
    setSelectValue(f, s[f]);
  }
  for (const f of TEXTS) {
    const el = document.getElementById(f);
    if (el) el.value = s[f] == null ? "" : String(s[f]);
  }
  const fontEl = document.getElementById("translate_font_size");
  if (fontEl) fontEl.value = String(s.translate_font_size || 14);
  document.getElementById("hotkey").value = s.hotkey || platformDefaultHotkey();
  document.getElementById("notification_preview_duration_secs").value = String(
    Math.min(30, Math.max(2, Number(s.notification_preview_duration_secs) || 2)),
  );
  syncAiPromptCacheFromSettings(s);
  refreshAiPromptSection();
  applyProxyFieldsFromSettings(s);
}

function readProxyEndpointFromFields(prefix) {
  const host = String(document.getElementById(`${prefix}host`)?.value || "").trim();
  const port = Number.parseInt(document.getElementById(`${prefix}port`)?.value || "", 10);
  if (!host || !Number.isFinite(port) || port < 1 || port > 65535) return null;
  return {
    scheme: String(document.getElementById(`${prefix}scheme`)?.value || "http"),
    host,
    port,
    username: String(document.getElementById(`${prefix}username`)?.value || "").trim(),
    password: String(document.getElementById(`${prefix}password`)?.value || ""),
  };
}

function writeProxyEndpointToFields(prefix, ep) {
  const set = (id, v) => {
    const el = document.getElementById(`${prefix}${id}`);
    if (el) el.value = v == null ? "" : String(v);
  };
  set("scheme", ep?.scheme || "http");
  set("host", ep?.host || "");
  set("port", ep?.port || "");
  set("username", ep?.username || "");
  set("password", ep?.password || "");
}

function syncProxyCustomVisibility() {
  const mode = document.getElementById("proxy_mode")?.value || "system";
  const fields = document.getElementById("proxy_custom_fields");
  if (fields) fields.hidden = mode !== "custom";
}

function applyProxyFieldsFromSettings(s) {
  const modeEl = document.getElementById("proxy_mode");
  if (modeEl) modeEl.value = s.proxy_mode || "system";
  writeProxyEndpointToFields("proxy_", s.proxy_custom || null);
  syncProxyCustomVisibility();
  const note = document.getElementById("proxy_check_note");
  if (note) note.textContent = "";
}

function collectProxyIntoSettings(s) {
  const mode = document.getElementById("proxy_mode")?.value || "system";
  s.proxy_mode = mode;
  if (mode === "custom") {
    s.proxy_custom = readProxyEndpointFromFields("proxy_");
  } else {
    // Keep last custom endpoint when switching modes so users can flip back.
    const current = readProxyEndpointFromFields("proxy_");
    if (current) s.proxy_custom = current;
  }
}

function formatProxyCheckLocation(r) {
  if (!r) return "—";
  const country = r.country || r.country_code || "";
  const parts = [r.city, r.region, country].filter((x) => typeof x === "string" && x.trim());
  // Prefer "City, Country"; keep region only when city is missing.
  if (r.city && country) return `${r.city}, ${country}`;
  if (parts.length) return parts.join(", ");
  if (r.isp) return r.isp;
  return "—";
}

function formatProxyCheckNote(r) {
  if (r?.ok) {
    return t("network.checkOk", {
      ip: r.ip || "?",
      location: formatProxyCheckLocation(r),
      ms: r.ms || 0,
      via: r.via || "",
    });
  }
  return t("network.checkFail", { error: r?.error || "fail", via: r?.via || "" });
}

async function checkGlobalProxy() {
  const note = document.getElementById("proxy_check_note");
  if (note) note.textContent = t("network.checking");
  try {
    const mode = document.getElementById("proxy_mode")?.value || "system";
    const payload = {
      accountId: null,
      mode,
      proxy: mode === "custom" ? readProxyEndpointFromFields("proxy_") : null,
    };
    const r = await invoke("check_proxy", payload);
    if (note) note.textContent = formatProxyCheckNote(r);
  } catch (e) {
    if (note) note.textContent = t("network.checkFail", { error: String(e), via: "" });
  }
}

function wireProxySection() {
  document.getElementById("proxy_mode")?.addEventListener("change", syncProxyCustomVisibility);
  document.getElementById("proxy_check_btn")?.addEventListener("click", () => {
    checkGlobalProxy().catch((e) => askAlert(String(e)));
  });
}

let accountProxyTargetId = "";

function syncAcctProxyFieldsVisibility() {
  const inherit = !!document.getElementById("acct_proxy_inherit")?.checked;
  const fields = document.getElementById("acct_proxy_fields");
  if (fields) fields.hidden = inherit;
}

function closeAccountProxyModal() {
  const modal = document.getElementById("account-proxy-modal");
  if (modal) modal.hidden = true;
  accountProxyTargetId = "";
}

function openAccountProxyModal(account) {
  accountProxyTargetId = account.id;
  const modal = document.getElementById("account-proxy-modal");
  const subtitle = document.getElementById("account-proxy-subtitle");
  if (subtitle) {
    subtitle.textContent = t("accounts.proxySubtitle", {
      name: account.name || account.id,
      id: account.id,
    });
  }
  const inherit = !account.proxy;
  const inheritEl = document.getElementById("acct_proxy_inherit");
  if (inheritEl) inheritEl.checked = inherit;
  writeProxyEndpointToFields("acct_proxy_", account.proxy || null);
  syncAcctProxyFieldsVisibility();
  const note = document.getElementById("account-proxy-note");
  if (note) note.textContent = "";
  if (modal) modal.hidden = false;
}

async function saveAccountProxyModal() {
  if (!accountProxyTargetId) return;
  const inherit = !!document.getElementById("acct_proxy_inherit")?.checked;
  const proxy = inherit ? null : readProxyEndpointFromFields("acct_proxy_");
  if (!inherit && !proxy) {
    const note = document.getElementById("account-proxy-note");
    if (note) note.textContent = t("accounts.proxyNeedHost");
    return;
  }
  try {
    await invoke("set_account_proxy", { id: accountProxyTargetId, proxy });
    closeAccountProxyModal();
    await loadAccounts();
    showNote("note", t("accounts.proxySaved"), 3000);
  } catch (e) {
    const note = document.getElementById("account-proxy-note");
    if (note) note.textContent = String(e);
  }
}

async function checkAccountProxyModal() {
  const note = document.getElementById("account-proxy-note");
  if (note) note.textContent = t("network.checking");
  try {
    const inherit = !!document.getElementById("acct_proxy_inherit")?.checked;
    const r = await invoke("check_proxy", {
      accountId: accountProxyTargetId || null,
      proxy: inherit ? null : readProxyEndpointFromFields("acct_proxy_"),
    });
    if (note) note.textContent = formatProxyCheckNote(r);
  } catch (e) {
    if (note) note.textContent = t("network.checkFail", { error: String(e), via: "" });
  }
}

function wireAccountProxyModal() {
  document.getElementById("acct_proxy_inherit")?.addEventListener("change", syncAcctProxyFieldsVisibility);
  document.getElementById("account-proxy-cancel")?.addEventListener("click", closeAccountProxyModal);
  document.getElementById("account-proxy-save")?.addEventListener("click", () => {
    saveAccountProxyModal().catch((e) => askAlert(String(e)));
  });
  document.getElementById("account-proxy-check")?.addEventListener("click", () => {
    checkAccountProxyModal().catch((e) => askAlert(String(e)));
  });
  document.getElementById("account-proxy-modal")?.addEventListener("click", (ev) => {
    if (ev.target?.id === "account-proxy-modal") closeAccountProxyModal();
  });
}

async function save() {
  const button = document.getElementById("save");
  const note = document.getElementById("note");
  button.disabled = true;
  showNote("note", t("save.saving"), 0);
  try {
    const s = await invoke("get_settings");
    s.theme = selectedTheme;
    for (const f of BOOLS) {
      const el = document.getElementById(f);
      if (el) s[f] = el.checked;
    }
    // One switch (WATransChat enableTranslateButton): write both schema fields.
    {
      const on = !!document.getElementById("translate_compose")?.checked;
      s.translate_compose = on;
      s.enable_translate_button = on;
      const inlineEl = document.getElementById("enable_translate_button");
      if (inlineEl) inlineEl.checked = on;
    }
    for (const f of SELECTS) {
      const el = document.getElementById(f);
      if (el) s[f] = el.value;
    }
    // Extension has no separate「译文语言」: incoming target follows 你的语言.
    // auto → zh-CN (same as WATransChat userSourceLang fallback).
    {
      const src = String(s.translate_source_lang || "auto").trim() || "auto";
      s.translate_source_lang = src;
      s.translate_target_lang = src !== "auto" ? src : "zh-CN";
    }
    for (const f of TEXTS) {
      const el = document.getElementById(f);
      if (el) s[f] = el.value;
    }
    // Persist visible AI prompt textarea into the active engine field (extension parity).
    {
      const eng = resolveAiPromptEngine(
        document.getElementById("translate_engine")?.value || "",
        document.getElementById("chat_history_engine")?.value || "",
      );
      const field = eng ? AI_PROMPT_FIELD[eng] : "";
      if (field) {
        const stored = normalizeStoredAiPrompt(
          document.getElementById("ai-system-prompt-input")?.value || "",
        );
        s[field] = stored;
        if (eng === "deepseek") s.ai_system_prompt = stored;
      }
    }
    const fontEl = document.getElementById("translate_font_size");
    if (fontEl) {
      const n = Number.parseInt(fontEl.value, 10);
      s.translate_font_size = Math.min(28, Math.max(10, Number.isFinite(n) ? n : 14));
    }
    const hk = document.getElementById("hotkey").value.trim();
    s.hotkey = hk || platformDefaultHotkey();
    const previewDuration = Number.parseInt(
      document.getElementById("notification_preview_duration_secs").value,
      10,
    );
    s.notification_preview_duration_secs = Math.min(
      30,
      Math.max(2, Number.isFinite(previewDuration) ? previewDuration : 2),
    );
    if (s.ui_lang != null) {
      s.ui_lang = window.WhatsNowI18n
        ? window.WhatsNowI18n.normalize(s.ui_lang)
        : s.ui_lang;
    }
    collectProxyIntoSettings(s);
    const warn = await invoke("set_settings", { settings: s });
    await load();
    applyUiLang(s.ui_lang || "zh");
    if (warn) {
      showNote("note", t("save.warn", { warn }), 7000);
    } else {
      showNote("note", t("save.ok"));
    }
  } catch (e) {
    note.textContent = t("save.fail", { error: String(e) });
  } finally {
    button.disabled = false;
  }
}

/** WATransChat options.js updateUserStatus short labels (试用中/已订阅/已过期/未订阅). */
function parseMembershipDateToMs(v) {
  if (!v) return 0;
  if (typeof v === "number" && isFinite(v)) {
    if (v > 1e12) return v;
    if (v > 1e9) return v * 1000;
  }
  const n = new Date(v).getTime();
  return Number.isNaN(n) ? 0 : n;
}

function resolveMembershipBadgeKey(status) {
  if (!status || !status.logged_in) return "none";
  const raw = String(status.subscription_status || "").trim().toLowerCase();
  // Server is_valid wins after renew (status string / old trial date can lag).
  if (status.is_valid === true) {
    if (raw === "trial" || raw === "trialing") return "trial";
    return "active";
  }
  const endMs = parseMembershipDateToMs(
    raw === "active"
      ? status.subscription_end_date
      : raw === "trial" || raw === "trialing"
        ? status.trial_end_date || status.subscription_end_date
        : status.subscription_end_date || status.trial_end_date,
  );
  const nowMs = Date.now();
  const expiredByTime = !!endMs && endMs <= nowMs;
  const expiredByStatus =
    raw === "expired" || raw === "past_due" || raw === "canceled" || raw === "cancelled";
  const isExpired = expiredByTime || expiredByStatus;
  if (raw === "trial" || raw === "trialing") return isExpired ? "expired" : "trial";
  if (raw === "active") return isExpired ? "expired" : "active";
  if (isExpired) return "expired";
  return "none";
}

function formatMembershipStatus(statusOrRaw) {
  // Accept full status view (preferred) or legacy raw subscription_status string.
  const key =
    statusOrRaw && typeof statusOrRaw === "object"
      ? resolveMembershipBadgeKey(statusOrRaw)
      : (() => {
          const s = String(statusOrRaw || "")
            .trim()
            .toLowerCase();
          if (!s) return "";
          if (s === "trialing") return "trial";
          if (s === "cancelled" || s === "canceled" || s === "past_due") return "expired";
          if (s === "inactive") return "none";
          return s;
        })();
  if (!key) return "—";
  const i18nKey = `membership.statusValue.${key}`;
  const translated = t(i18nKey);
  return translated === i18nKey ? key : translated;
}

function renderMembership(status) {
  const out = document.getElementById("membership-logged-out");
  const inn = document.getElementById("membership-logged-in");
  if (!out || !inn) return;
  const logged = !!(status && status.logged_in);
  out.hidden = logged;
  inn.hidden = !logged;
  if (!logged) {
    if (status && status.api_base) {
      const base = document.getElementById("membership_api_base");
      if (base && !base.value) base.value = status.api_base;
    }
    return;
  }
  document.getElementById("membership_email_display").textContent = status.email || "—";
  document.getElementById("membership_plan").textContent = status.plan_name || "—";
  document.getElementById("membership_status_text").textContent = formatMembershipStatus(status);
  const expiresEl = document.getElementById("membership_expires");
  if (expiresEl) {
    const end =
      String(status.subscription_end_date || "").trim() ||
      String(status.trial_end_date || "").trim() ||
      "";
    expiresEl.textContent = end || "—";
  }
  document.getElementById("membership_seats").textContent = String(status.seats_in_use ?? 0);
  document.getElementById("membership_limit").textContent = String(status.device_limit ?? 0);
  const summary = document.getElementById("devices_summary");
  if (summary) {
    if (status && status.logged_in) {
      summary.hidden = false;
      summary.textContent = t("membership.seatsLine", {
        used: status.seats_in_use ?? 0,
        limit: status.device_limit ?? 0,
      });
    } else {
      summary.hidden = true;
      summary.textContent = "";
    }
  }
}

let cachedWechatQrUrl = "";
let cachedPlans = [];
let plansLoadSeq = 0;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function closeWechatPayModal() {
  const modal = document.getElementById("wechat-pay-modal");
  if (modal) modal.hidden = true;
  const img = document.getElementById("wechat-pay-qr");
  if (img) img.removeAttribute("src");
}

function openWechatPayModal(url) {
  const modal = document.getElementById("wechat-pay-modal");
  const img = document.getElementById("wechat-pay-qr");
  if (!modal || !img || !url) return;
  img.src = url;
  img.alt = t("membership.wechatPayTitle");
  modal.hidden = false;
}

async function openMembershipPay() {
  showNote("plans_note", t("membership.openingPay"), 0);
  try {
    const result = await invoke("membership_open_pay", {
      wechatQrUrl: cachedWechatQrUrl || null,
    });
    if (!result || result.kind === "sign_in_required") {
      showNote("plans_note", t("membership.signInToSubscribe"), 5000);
      return;
    }
    if (result.kind === "wechat_qr" && result.url) {
      openWechatPayModal(result.url);
      showNote("plans_note", "", 0);
      return;
    }
    if (result.kind === "browser" && result.url) {
      await invoke("open_external_url", { url: result.url });
      showNote("plans_note", t("membership.openingPay"), 2500);
      return;
    }
    showNote("plans_note", t("membership.plansFail", { error: "unknown" }), 5000);
  } catch (e) {
    showNote("plans_note", t("membership.plansFail", { error: String(e) }), 6000);
  }
}

function renderSubscriptionPlans(plans) {
  const container = document.getElementById("plans-container");
  if (!container) return;
  container.textContent = "";
  const rows = Array.isArray(plans) ? plans : [];
  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "field-note";
    empty.textContent = t("membership.plansEmpty");
    container.appendChild(empty);
    return;
  }
  const featuredIcon =
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M12 2l2.39 4.84L20 8.27l-3.8 3.7.9 5.25L12 15.77l-5.1 2.68.9-5.25L4 8.27l5.61-1.43L12 2z"/></svg>';
  for (const plan of rows) {
    if (!plan || typeof plan !== "object") continue;
    const card = document.createElement("div");
    const disabled = plan.is_active === false;
    card.className =
      "subscription-plan" +
      (plan.featured ? " featured" : "") +
      (disabled ? " disabled" : "");
    const features = Array.isArray(plan.features) ? plan.features : [];
    const link = String(plan.link || "").trim();
    const badge = plan.featured
      ? `<div class="plan-featured-badge">${featuredIcon}<span>${escapeHtml(
          t("membership.recommended"),
        )}</span></div>`
      : "";
    const detailBtn = link
      ? `<button type="button" class="secondary detail-link-btn" data-plan-link="${escapeHtml(
          link,
        )}"><span>${escapeHtml(t("membership.viewDetails"))}</span></button>`
      : "";
    card.innerHTML = `
      ${badge}
      <div class="plan-header">
        <div class="plan-name">${escapeHtml(plan.name || "—")}</div>
        <div class="plan-price">${escapeHtml(plan.price_text || "")}${
          disabled
            ? `<span class="plan-status">${escapeHtml(t("membership.notAvailable"))}</span>`
            : ""
        }</div>
      </div>
      <ul class="plan-features">
        ${features.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}
      </ul>
      <div class="plan-actions${link ? " has-detail-link" : ""}">
        ${detailBtn}
        <button type="button" class="primary-action subscribe-btn"${
          disabled ? " disabled" : ""
        } data-plan-id="${escapeHtml(plan.id || "")}">
          <span>${escapeHtml(
            disabled ? t("membership.notAvailable") : t("membership.subscribeNow"),
          )}</span>
        </button>
      </div>
    `;
    container.appendChild(card);
  }
  container.querySelectorAll(".detail-link-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const url = btn.getAttribute("data-plan-link") || "";
      if (!url) return;
      try {
        await invoke("open_external_url", { url });
      } catch (e) {
        showNote("plans_note", String(e), 5000);
      }
    });
  });
  container.querySelectorAll(".subscribe-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      openMembershipPay();
    });
  });
}

async function loadSubscriptionPlans() {
  const seq = ++plansLoadSeq;
  const container = document.getElementById("plans-container");
  if (container) {
    container.innerHTML = `<p class="field-note">${escapeHtml(t("membership.plansLoading"))}</p>`;
  }
  try {
    const data = await invoke("membership_list_plans");
    if (seq !== plansLoadSeq) return;
    cachedWechatQrUrl = (data && data.wechat_qr_url) || "";
    cachedPlans = (data && data.plans) || [];
    renderSubscriptionPlans(cachedPlans);
    if (data && data.success === false) {
      showNote("plans_note", t("membership.plansEmpty"), 4000);
    }
  } catch (e) {
    if (seq !== plansLoadSeq) return;
    if (container) {
      container.innerHTML = `<p class="field-note">${escapeHtml(
        t("membership.plansFail", { error: String(e) }),
      )}</p>`;
    }
  }
}

async function loadMembership(options = {}) {
  const forceRefresh = !!options.refresh;
  try {
    const status = await invoke("membership_status", { refresh: forceRefresh });
    renderMembership(status);
    // Re-apply engine lists so Pro engines unlock after login without reload.
    try {
      const s = await invoke("get_settings");
      await fillTranslateEngineSelects(s);
      refreshAiPromptSection();
    } catch (_) {}
    // Forced refresh: don't block the button on plans fetch (extra RTT).
    if (forceRefresh) {
      void loadSubscriptionPlans();
    } else {
      await loadSubscriptionPlans();
    }
    // Forced seat-pick lives on the main-window tabs chrome, not Settings.
    return status;
  } catch (e) {
    if (forceRefresh) {
      // Keep the last rendered membership card; caller shows the error.
      throw e;
    }
    renderMembership({ logged_in: false });
    showNote("membership_note", String(e), 6000);
    await loadSubscriptionPlans();
    throw e;
  }
}

function membershipRefreshTimeLabel() {
  try {
    return new Date().toLocaleString(uiLang() === "zh" ? "zh-CN" : "en-US", {
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch (_) {
    return new Date().toLocaleString();
  }
}

let membershipRefreshBusy = false;

async function refreshMembership() {
  if (membershipRefreshBusy) return;
  membershipRefreshBusy = true;
  const btn = document.getElementById("membership_refresh");
  const noteId = document.getElementById("membership-logged-in")?.hidden
    ? "membership_note"
    : "membership_status_note";
  if (btn) btn.disabled = true;
  showNote(noteId, t("membership.refreshing"), 0);
  const timeoutMs = 25000;
  try {
    await Promise.race([
      loadMembership({ refresh: true }),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`刷新超时（${timeoutMs / 1000}s）`)), timeoutMs);
      }),
    ]);
    showNote(
      document.getElementById("membership-logged-in")?.hidden
        ? "membership_note"
        : "membership_status_note",
      t("membership.refreshed", { time: membershipRefreshTimeLabel() }),
      4000,
    );
  } catch (e) {
    showNote(
      document.getElementById("membership-logged-in")?.hidden
        ? "membership_note"
        : "membership_status_note",
      t("membership.refreshFail", { error: String(e) }),
      6000,
    );
  } finally {
    membershipRefreshBusy = false;
    if (btn) btn.disabled = false;
  }
}

let deviceManageToken = "";
let deviceLimitModalLimit = 2;
let pendingLoginCreds = null;

function setDeviceLimitStatus(message) {
  const el = document.getElementById("dl-status");
  if (el) el.textContent = message || "";
}

function closeDeviceLimitModal() {
  const modal = document.getElementById("device-limit-modal");
  if (modal) modal.hidden = true;
  setDeviceLimitStatus("");
  deviceManageToken = "";
}

function deviceLabel(d) {
  return d.device_name || d.name || d.device_id || t("devices.unknownDevice");
}

function normalizeDeviceList(raw) {
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((d) => ({
    id: d && d.id != null ? d.id : null,
    device_id: d && d.device_id != null ? String(d.device_id) : "",
    device_name:
      d && (d.device_name || d.name)
        ? String(d.device_name || d.name)
        : t("devices.unknownDevice"),
    last_active:
      d && (d.last_active || d.last_seen) ? String(d.last_active || d.last_seen) : "",
    location: d && d.location ? String(d.location) : "",
    status: d && d.status != null ? d.status : 1,
    active: d && typeof d.active === "boolean" ? d.active : undefined,
  }));
}

function filterActiveDevices(rawList) {
  return (Array.isArray(rawList) ? rawList : []).filter((dev) => {
    if (typeof dev.active === "boolean") return dev.active;
    if (dev.status === 0 || dev.status === "0") return false;
    return true;
  });
}

function buildDeviceLimitDescText(deviceLimit) {
  const nRaw = parseInt(deviceLimit, 10);
  const n = Number.isFinite(nRaw) && nRaw > 0 ? nRaw : 2;
  return t("devices.deviceLimitDesc") + t("devices.deviceLimitCapSuffix", { n });
}

function renderDeviceLimitTexts() {
  const title = document.getElementById("dl-title");
  const desc = document.getElementById("dl-desc");
  const listTitle = document.getElementById("dl-list-title");
  const logoutAll = document.getElementById("dl-logout-all");
  const refresh = document.getElementById("dl-refresh");
  const cancel = document.getElementById("dl-cancel");
  if (title) title.textContent = t("devices.deviceLimitTitle");
  if (desc) desc.textContent = buildDeviceLimitDescText(deviceLimitModalLimit);
  if (listTitle) listTitle.textContent = t("devices.signedInDevices");
  if (logoutAll) logoutAll.textContent = t("devices.signOutAllDevices");
  if (refresh) refresh.textContent = t("devices.refreshShort");
  const closeLabel = t("membership.close");
  if (cancel) {
    cancel.title = closeLabel;
    cancel.setAttribute("aria-label", closeLabel);
  }
}

function deviceRowKey(dev) {
  if (!dev) return "";
  if (dev.id != null && String(dev.id).trim() !== "") return String(dev.id);
  return String(dev.device_id || "").trim();
}

function isDeviceOnlineFlag(dev) {
  if (typeof dev.active === "boolean") return !!dev.active;
  return !(dev.status === 0 || dev.status === "0");
}

function syncDeviceSelectToolbar(listEl, selectAllEl, logoutBtnEl) {
  if (!listEl) return;
  const boxes = Array.from(listEl.querySelectorAll(".device-select-cb:not(:disabled)"));
  const checked = boxes.filter((b) => b.checked).length;
  const total = boxes.length;
  if (selectAllEl) {
    selectAllEl.checked = total > 0 && checked === total;
    selectAllEl.indeterminate = checked > 0 && checked < total;
  }
  if (logoutBtnEl) {
    logoutBtnEl.disabled = checked === 0;
    const base = t("devices.logoutSelected");
    logoutBtnEl.textContent = checked > 0 ? `${base} (${checked})` : base;
  }
}

function getSelectedDeviceKeys(listEl) {
  if (!listEl) return [];
  return Array.from(listEl.querySelectorAll(".device-select-cb:checked:not(:disabled)"))
    .map((b) => String(b.getAttribute("data-device-key") || "").trim())
    .filter(Boolean);
}

function getSelectedDevicePayloads(listEl) {
  if (!listEl) return [];
  return Array.from(listEl.querySelectorAll(".device-select-cb:checked:not(:disabled)"))
    .map((b) => {
      try {
        return JSON.parse(b.getAttribute("data-dev-json") || "null");
      } catch (_) {
        return { id: b.getAttribute("data-device-key"), device_id: b.getAttribute("data-device-key") };
      }
    })
    .filter(Boolean);
}

function renderDeviceLimitList(devices) {
  const list = document.getElementById("dl-devices-list");
  if (!list) return;
  list.textContent = "";
  const selectAll = document.getElementById("dl-select-all");
  const logoutSelected = document.getElementById("dl-logout-selected");
  // 离线设备仍占席位，需展示以便注销
  const items = normalizeDeviceList(devices);
  if (!items.length) {
    if (selectAll) {
      selectAll.checked = false;
      selectAll.indeterminate = false;
    }
    if (logoutSelected) logoutSelected.disabled = true;
    const empty = document.createElement("div");
    empty.className = "device-item";
    empty.textContent = t("devices.noActiveDevicesToSignOut");
    list.appendChild(empty);
    return;
  }
  for (const dev of items) {
    const row = document.createElement("div");
    row.className = "device-item";
    const key = deviceRowKey(dev);
    const isActive = isDeviceOnlineFlag(dev);
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "device-select-cb";
    cb.setAttribute("data-device-key", key);
    cb.setAttribute("data-offline", isActive ? "0" : "1");
    cb.setAttribute("data-dev-json", JSON.stringify(dev));
    cb.disabled = !key;
    cb.addEventListener("change", () => {
      syncDeviceSelectToolbar(list, selectAll, logoutSelected);
    });
    const main = document.createElement("div");
    main.className = "device-main";
    const name = document.createElement("div");
    name.className = "device-name";
    name.appendChild(document.createTextNode(deviceLabel(dev)));
    const tag = document.createElement("span");
    tag.className =
      "device-status-tag " + (isActive ? "device-status-active" : "device-status-offline");
    tag.textContent = isActive ? t("devices.statusActiveShort") : t("devices.statusOfflineShort");
    name.appendChild(tag);
    const metaParts = [];
    if (dev.last_active) metaParts.push(t("devices.lastActivePrefix") + dev.last_active);
    if (dev.device_id) metaParts.push("ID: " + dev.device_id);
    const meta = document.createElement("div");
    meta.className = "device-meta";
    meta.textContent = metaParts.join(" · ");
    main.appendChild(name);
    main.appendChild(meta);
    const actions = document.createElement("div");
    actions.className = "device-actions";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "device-remove-btn";
    btn.textContent = t("devices.signOutThisDevice");
    btn.addEventListener("click", async () => {
      if (!deviceManageToken) return;
      if (!(await askConfirm(t("devices.confirmSignOutThisDevice")))) return;
      setDeviceLimitStatus(t("devices.signingOut"));
      btn.disabled = true;
      try {
        await invoke("membership_logout_device_by_challenge", {
          token: deviceManageToken,
          id: dev.id != null ? Number(dev.id) : null,
          deviceId: dev.device_id ? String(dev.device_id) : null,
        });
        await refreshDeviceLimitList();
        setDeviceLimitStatus(t("devices.signedOutRetryLogin"));
        setTimeout(() => {
          closeDeviceLimitModal();
          retryLoginAfterKick();
        }, 400);
      } catch (e) {
        setDeviceLimitStatus(String(e) || t("devices.signOutFailed"));
        btn.disabled = false;
      }
    });
    actions.appendChild(btn);
    row.appendChild(cb);
    row.appendChild(main);
    row.appendChild(actions);
    list.appendChild(row);
  }
  syncDeviceSelectToolbar(list, selectAll, logoutSelected);
}

async function fetchDeviceLimitItems() {
  if (!deviceManageToken) return null;
  try {
    const data = await invoke("membership_devices_by_challenge", {
      token: deviceManageToken,
    });
    if (!data || data.success === false) return null;
    return normalizeDeviceList(data.devices || []);
  } catch (_) {
    return null;
  }
}

async function refreshDeviceLimitList() {
  if (!deviceManageToken) return;
  setDeviceLimitStatus(t("devices.loadingDevicesList"));
  try {
    const items = await fetchDeviceLimitItems();
    if (!items) {
      setDeviceLimitStatus(t("devices.deviceListLoadFailRelogin"));
      return;
    }
    renderDeviceLimitList(items);
    setDeviceLimitStatus("");
  } catch (e) {
    setDeviceLimitStatus(String(e) || t("membership.networkError"));
  }
}

function openDeviceLimitModal(payload) {
  deviceManageToken = String(payload.device_manage_token || "").trim();
  const nRaw = parseInt(payload.device_limit, 10);
  deviceLimitModalLimit = Number.isFinite(nRaw) && nRaw > 0 ? nRaw : 2;
  renderDeviceLimitTexts();
  const logoutAll = document.getElementById("dl-logout-all");
  if (logoutAll) logoutAll.disabled = false;
  const modal = document.getElementById("device-limit-modal");
  renderDeviceLimitList(payload.devices || []);
  if (modal) modal.hidden = false;
  if (deviceManageToken) refreshDeviceLimitList();
}

/** WATransChat options.js parity: map server English auth errors. */
function localizeMembershipAuthError(raw) {
  let err = String(raw == null ? "" : raw).trim();
  if (!err) return t("membership.loginFailed");
  err = err.replace(/^HTTP\s*\d+\s*:\s*/i, "");
  err = err.replace(/^[A-Z0-9_]+\s*:\s*/, "");
  const lower = err.toLowerCase();
  if (lower.includes("user not found") || lower.includes("account not found") || lower.includes("email not found")) {
    return t("membership.acctNotExist");
  }
  if (
    lower.includes("incorrect password") ||
    lower.includes("wrong password") ||
    lower.includes("invalid credentials") ||
    lower.includes("invalid password")
  ) {
    return t("membership.incorrectPassword");
  }
  if (lower.includes("invalid email") || lower.includes("email or password")) {
    return t("membership.invalidEmailOrPassword");
  }
  if (lower.includes("already registered") || lower.includes("email already") || err.includes("已注册")) {
    return t("membership.emailAlready");
  }
  if (
    lower.includes("network") ||
    lower.includes("request failed") ||
    lower.includes("timed out") ||
    lower.includes("timeout") ||
    lower.includes("connection")
  ) {
    return t("membership.networkError");
  }
  if (/[\u4e00-\u9fff]/.test(err)) return err;
  return err || t("membership.loginFailed");
}

async function membershipLogin() {
  const email = document.getElementById("membership_email").value.trim();
  const password = document.getElementById("membership_password").value;
  const apiBase = document.getElementById("membership_api_base").value.trim();
  pendingLoginCreds = { email, password, apiBase };
  try {
    const result = await invoke("membership_login", {
      email,
      password,
      apiBase: apiBase || null,
    });
    if (result && result.kind === "device_limit") {
      openDeviceLimitModal(result);
      showNote("membership_note", result.message || t("membership.deviceFullNote"), 0);
      return;
    }
    const status = result && result.status ? result.status : result;
    document.getElementById("membership_password").value = "";
    pendingLoginCreds = null;
    closeDeviceLimitModal();
    renderMembership(status);
    showNote("membership_note", t("membership.signedIn"), 3000);
  } catch (e) {
    showNote("membership_note", localizeMembershipAuthError(e && e.message ? e.message : e), 8000);
  }
}

async function retryLoginAfterKick() {
  if (!pendingLoginCreds) {
    setDeviceLimitStatus(t("membership.reenter"));
    return;
  }
  const { email, password, apiBase } = pendingLoginCreds;
  try {
    const result = await invoke("membership_login", {
      email,
      password,
      apiBase: apiBase || null,
    });
    if (result && result.kind === "device_limit") {
      openDeviceLimitModal(result);
      setDeviceLimitStatus(t("membership.stillFull"));
      return;
    }
    const status = result && result.status ? result.status : result;
    document.getElementById("membership_password").value = "";
    pendingLoginCreds = null;
    closeDeviceLimitModal();
    renderMembership(status);
    showNote("membership_note", t("membership.signedIn"), 3000);
  } catch (e) {
    setDeviceLimitStatus(localizeMembershipAuthError(e && e.message ? e.message : e));
  }
}

async function logoutAllChallengeDevices() {
  if (!deviceManageToken) return;
  if (!(await askConfirm(t("devices.confirmSignOutAll")))) return;
  const btn = document.getElementById("dl-logout-all");
  if (btn) btn.disabled = true;
  setDeviceLimitStatus(t("devices.signingOutAllDevices"));
  try {
    const items = await fetchDeviceLimitItems();
    if (!items) {
      setDeviceLimitStatus(t("devices.deviceListLoadFailRelogin"));
      if (btn) btn.disabled = false;
      return;
    }
    if (!items.length) {
      setDeviceLimitStatus(t("devices.noActiveDevicesToSignOut"));
      if (btn) btn.disabled = false;
      return;
    }
    let failCount = 0;
    for (let i = 0; i < items.length; i++) {
      setDeviceLimitStatus(
        t("devices.signingOutDeviceProgress", { current: i + 1, total: items.length }),
      );
      try {
        await invoke("membership_logout_device_by_challenge", {
          token: deviceManageToken,
          id: items[i].id != null ? Number(items[i].id) : null,
          deviceId: items[i].device_id ? String(items[i].device_id) : null,
        });
      } catch (_) {
        failCount += 1;
      }
    }
    if (failCount === 0) {
      setDeviceLimitStatus(t("devices.allDevicesSignedOutRetryLogin"));
      setTimeout(() => {
        closeDeviceLimitModal();
        retryLoginAfterKick();
      }, 400);
      return;
    }
    await refreshDeviceLimitList();
    setDeviceLimitStatus(t("devices.someDevicesSignOutFailed", { n: failCount }));
    if (btn) btn.disabled = false;
  } catch (e) {
    setDeviceLimitStatus(String(e) || t("membership.networkError"));
    if (btn) btn.disabled = false;
  }
}

async function membershipLogout() {
  try {
    // Rust enter_login_gate destroys this Settings window and opens login.
    await invoke("membership_logout");
  } catch (e) {
    showNote("membership_note", localizeMembershipAuthError(e && e.message ? e.message : e), 6000);
  }
}

/** Upload format: `{OS} Desktop {tab} {profile?}` (see seat_device_name). */
function renderCurrentDeviceCard(names) {
  const nameEl = document.getElementById("current-device-name");
  if (!nameEl) return;
  const rows = (Array.isArray(names) ? names : [names])
    .map((n) => String(n || "").trim())
    .filter(Boolean);
  nameEl.textContent = rows.length ? rows.join("\n") : "-";
  nameEl.classList.toggle("current-device-name-multi", rows.length > 1);
}

function localSeatIdSet(localSeats) {
  const ids = new Set();
  for (const s of Array.isArray(localSeats) ? localSeats : []) {
    const id = String((s && s.device_id) || "").trim();
    if (id) ids.add(id);
  }
  return ids;
}

/** Prefer server row name when device_id matches; else uploaded `{OS} Desktop {label}`. */
function resolveLocalSeatDisplayNames(localSeats, devices) {
  const byId = new Map();
  for (const d of devices) {
    const id = String(d.device_id || "").trim();
    if (id) byId.set(id, deviceLabel(d));
  }
  const names = [];
  for (const s of Array.isArray(localSeats) ? localSeats : []) {
    const id = String((s && s.device_id) || "").trim();
    const uploaded = String((s && s.device_name) || "").trim();
    const name = (id && byId.get(id)) || uploaded;
    if (name) names.push(name);
  }
  return names;
}

async function loadDevicesList() {
  const list = document.getElementById("devices-list");
  if (!list) return;
  const toolbar = document.getElementById("device-select-toolbar");
  if (toolbar) toolbar.hidden = true;
  list.textContent = "";
  const loading = document.createElement("div");
  loading.className = "device-item";
  loading.textContent = t("devices.loadingDevices");
  list.appendChild(loading);

  try {
    const status = await invoke("membership_status", { refresh: false });
    if (!status || !status.logged_in) {
      list.textContent = "";
      renderCurrentDeviceCard([]);
      const empty = document.createElement("div");
      empty.className = "device-item";
      empty.textContent = t("devices.loginRequired");
      list.appendChild(empty);
      return;
    }
    const data = await invoke("membership_list_devices");
    const rawList = (data && data.devices) || [];
    // 离线(status=0)仍占席位，列表全部展示；标签区分在线/离线
    const devices = normalizeDeviceList(rawList);
    const localSeats = (data && data.local_seats) || [];
    const localIds = localSeatIdSet(localSeats);
    const fallbackName = String((data && data.current_device_name) || "").trim();
    const currentNames = resolveLocalSeatDisplayNames(localSeats, devices);
    renderCurrentDeviceCard(currentNames.length ? currentNames : fallbackName ? [fallbackName] : []);
    const seatsUsed =
      data && data.seats_in_use != null ? Number(data.seats_in_use) : devices.length;
    const seatsLimit = status.device_limit ?? 2;
    const summary = document.getElementById("devices_summary");
    if (summary) {
      summary.hidden = false;
      summary.textContent = t("membership.seatsLine", {
        used: seatsUsed,
        limit: seatsLimit,
      });
    }
    // 与设备面板一致：席位按已登录设备数（含离线），非仅在线。
    const memSeats = document.getElementById("membership_seats");
    const memLimit = document.getElementById("membership_limit");
    if (memSeats) memSeats.textContent = String(seatsUsed);
    if (memLimit) memLimit.textContent = String(seatsLimit);
    list.textContent = "";
    const toolbar = document.getElementById("device-select-toolbar");
    const selectAll = document.getElementById("device-select-all");
    const logoutSelectedBtn = document.getElementById("btn-logout-selected-devices");
    if (!devices.length) {
      if (toolbar) toolbar.hidden = true;
      const empty = document.createElement("div");
      empty.className = "device-item";
      empty.textContent = t("devices.noOtherDevicesFound");
      list.appendChild(empty);
      return;
    }
    if (toolbar) toolbar.hidden = false;
    if (selectAll) {
      selectAll.checked = false;
      selectAll.indeterminate = false;
    }
    for (const dev of devices) {
      const name = deviceLabel(dev);
      const lastActive = dev.last_active || "";
      const location = dev.location || "";
      const isActive = isDeviceOnlineFlag(dev);
      const isCurrent = localIds.has(String(dev.device_id || "").trim());
      const id = deviceRowKey(dev);
      const item = document.createElement("div");
      item.className = "device-item" + (isCurrent ? " device-item-current" : "");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "device-select-cb";
      cb.setAttribute("data-device-key", id);
      cb.setAttribute("data-offline", isActive ? "0" : "1");
      cb.disabled = !id || isCurrent;
      cb.addEventListener("change", () => {
        syncDeviceSelectToolbar(list, selectAll, logoutSelectedBtn);
      });
      const main = document.createElement("div");
      main.className = "device-main";
      const nameLine = document.createElement("div");
      nameLine.className = "device-name";
      nameLine.appendChild(document.createTextNode(name));
      const tag = document.createElement("span");
      tag.className =
        "device-status-tag " + (isActive ? "device-status-active" : "device-status-offline");
      tag.textContent = isActive ? t("devices.statusActiveShort") : t("devices.statusOfflineShort");
      nameLine.appendChild(tag);
      if (isCurrent) {
        const cur = document.createElement("span");
        cur.className = "device-status-tag device-status-current";
        cur.textContent = t("devices.currentDeviceBadge");
        nameLine.appendChild(cur);
      }
      const metaParts = [];
      if (lastActive) metaParts.push(t("devices.lastActivePrefix") + lastActive);
      if (location) metaParts.push(t("devices.locationPrefix") + location);
      const meta = document.createElement("div");
      meta.className = "device-meta";
      meta.textContent = metaParts.join(" · ");
      main.appendChild(nameLine);
      main.appendChild(meta);
      const actions = document.createElement("div");
      actions.className = "device-actions";
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "device-remove-btn";
      removeBtn.textContent = t("devices.signOutThisDevice");
      removeBtn.disabled = !id || isCurrent;
      if (!isCurrent) {
        removeBtn.addEventListener("click", async () => {
          if (!id) return;
          if (!(await askConfirm(t("devices.confirmSignOutThisDevice")))) return;
          logoutSingleDevice(id);
        });
      }
      actions.appendChild(removeBtn);
      item.appendChild(cb);
      item.appendChild(main);
      item.appendChild(actions);
      list.appendChild(item);
    }
    syncDeviceSelectToolbar(list, selectAll, logoutSelectedBtn);
  } catch (e) {
    const toolbar = document.getElementById("device-select-toolbar");
    if (toolbar) toolbar.hidden = true;
    list.textContent = "";
    const fail = document.createElement("div");
    fail.className = "device-item";
    fail.textContent = t("devices.deviceListLoadFailBackend");
    list.appendChild(fail);
  }
}

async function logoutSingleDevice(deviceId) {
  try {
    await invoke("membership_logout_device", { deviceId: String(deviceId) });
  } catch (_) {
    // Quiet failure, same as WATransChat options.js
  }
  await loadDevicesList();
}

async function logoutOtherDevices() {
  if (!(await askConfirm(t("devices.confirmSignOutOthers")))) return;
  try {
    await invoke("membership_logout_others");
  } catch (_) {
    // Quiet failure
  }
  await loadDevicesList();
}

async function logoutSelectedDevices(deviceKeys) {
  const keys = (Array.isArray(deviceKeys) ? deviceKeys : []).filter(Boolean);
  if (!keys.length) return;
  if (!(await askConfirm(t("devices.confirmSignOutSelected", { n: keys.length })))) return;
  const btn = document.getElementById("btn-logout-selected-devices");
  if (btn) btn.disabled = true;
  for (const key of keys) {
    try {
      await invoke("membership_logout_device", { deviceId: String(key) });
    } catch (_) {}
  }
  await loadDevicesList();
}

async function logoutSelectedChallengeDevices() {
  const list = document.getElementById("dl-devices-list");
  const payloads = getSelectedDevicePayloads(list);
  if (!payloads.length || !deviceManageToken) return;
  if (!(await askConfirm(t("devices.confirmSignOutSelected", { n: payloads.length })))) return;
  const btn = document.getElementById("dl-logout-selected");
  if (btn) btn.disabled = true;
  let ok = 0;
  for (let i = 0; i < payloads.length; i++) {
    const dev = payloads[i];
    setDeviceLimitStatus(
      t("devices.signingOutDeviceProgress", { current: i + 1, total: payloads.length })
    );
    try {
      await invoke("membership_logout_device_by_challenge", {
        token: deviceManageToken,
        id: dev.id != null ? Number(dev.id) : null,
        deviceId: dev.device_id ? String(dev.device_id) : null,
      });
      ok += 1;
    } catch (_) {}
  }
  await refreshDeviceLimitList();
  if (ok > 0) {
    setDeviceLimitStatus(t("devices.signedOutRetryLogin"));
    setTimeout(() => {
      closeDeviceLimitModal();
      retryLoginAfterKick();
    }, 400);
  } else {
    setDeviceLimitStatus(t("devices.signOutFailed"));
    if (btn) btn.disabled = false;
  }
}

/** @deprecated alias kept for any leftover callers */
async function loadDevices() {
  await loadDevicesList();
}

async function checkForUpdateFromAbout() {
  const btn = document.getElementById("about_check_update");
  const noteId = "about_update_note";
  if (btn) btn.disabled = true;
  showNote(noteId, t("about.updateChecking"), 0);
  try {
    const result = await invoke("check_for_update", { manual: true, quiet: true });
    if (result && result.update) {
      showNote(noteId, t("about.updateAvailable"), 4000);
    } else if (result && result.upToDate) {
      const version =
        window.__whatsnowAppVersion ||
        document.querySelector("[data-version-ref]")?.textContent?.replace(/.*?(\d+\.\d+\.\d+).*/, "$1") ||
        "";
      showNote(noteId, t("about.updateLatest", { version }), 5000);
    } else if (result && result.error) {
      showNote(noteId, t("about.updateFail", { error: result.error }), 6000);
    } else {
      showNote(noteId, t("about.updateLatest", { version: window.__whatsnowAppVersion || "" }), 4000);
    }
  } catch (e) {
    showNote(noteId, t("about.updateFail", { error: String(e) }), 6000);
  } finally {
    if (btn) btn.disabled = false;
  }
}

function wireMembership() {
  document.getElementById("about_check_update")?.addEventListener("click", () => {
    checkForUpdateFromAbout().catch(() => {});
  });
  document.getElementById("membership_login")?.addEventListener("click", membershipLogin);
  document.getElementById("membership_logout")?.addEventListener("click", membershipLogout);
  document.getElementById("membership_refresh")?.addEventListener("click", refreshMembership);
  document.getElementById("dl-cancel")?.addEventListener("click", closeDeviceLimitModal);
  document.getElementById("dl-refresh")?.addEventListener("click", () => {
    refreshDeviceLimitList().catch(() => {});
  });
  document.getElementById("dl-logout-all")?.addEventListener("click", logoutAllChallengeDevices);
  document.getElementById("device-limit-modal")?.addEventListener("click", (ev) => {
    if (ev.target && ev.target.id === "device-limit-modal") closeDeviceLimitModal();
  });
  document.getElementById("wechat-pay-close")?.addEventListener("click", closeWechatPayModal);
  document.getElementById("wechat-pay-modal")?.addEventListener("click", (ev) => {
    if (ev.target && ev.target.id === "wechat-pay-modal") closeWechatPayModal();
  });
  document.getElementById("btn-refresh-devices")?.addEventListener("click", async () => {
    await loadMembership();
    await loadDevicesList();
  });
  document.getElementById("btn-logout-other-devices")?.addEventListener("click", () => {
    logoutOtherDevices().catch(() => {});
  });
  document.getElementById("device-select-all")?.addEventListener("change", (ev) => {
    const on = !!(ev.target && ev.target.checked);
    document
      .querySelectorAll("#devices-list .device-select-cb:not(:disabled)")
      .forEach((b) => {
        b.checked = on;
      });
    syncDeviceSelectToolbar(
      document.getElementById("devices-list"),
      document.getElementById("device-select-all"),
      document.getElementById("btn-logout-selected-devices")
    );
  });
  document.getElementById("btn-select-offline-devices")?.addEventListener("click", () => {
    document.querySelectorAll("#devices-list .device-select-cb:not(:disabled)").forEach((b) => {
      b.checked = b.getAttribute("data-offline") === "1";
    });
    syncDeviceSelectToolbar(
      document.getElementById("devices-list"),
      document.getElementById("device-select-all"),
      document.getElementById("btn-logout-selected-devices")
    );
  });
  document.getElementById("btn-logout-selected-devices")?.addEventListener("click", () => {
    logoutSelectedDevices(getSelectedDeviceKeys(document.getElementById("devices-list"))).catch(
      () => {}
    );
  });
  document.getElementById("dl-select-all")?.addEventListener("change", (ev) => {
    const on = !!(ev.target && ev.target.checked);
    document
      .querySelectorAll("#dl-devices-list .device-select-cb:not(:disabled)")
      .forEach((b) => {
        b.checked = on;
      });
    syncDeviceSelectToolbar(
      document.getElementById("dl-devices-list"),
      document.getElementById("dl-select-all"),
      document.getElementById("dl-logout-selected")
    );
  });
  document.getElementById("dl-select-offline")?.addEventListener("click", () => {
    document
      .querySelectorAll("#dl-devices-list .device-select-cb:not(:disabled)")
      .forEach((b) => {
        b.checked = b.getAttribute("data-offline") === "1";
      });
    syncDeviceSelectToolbar(
      document.getElementById("dl-devices-list"),
      document.getElementById("dl-select-all"),
      document.getElementById("dl-logout-selected")
    );
  });
  document.getElementById("dl-logout-selected")?.addEventListener("click", () => {
    logoutSelectedChallengeDevices().catch(() => {});
  });
}

// --- Focus and notification tools ---

function renderFocus(status) {
  const badge = document.getElementById("focus_status");
  const endButton = document.getElementById("focus_off");
  endButton.hidden = !status.focus_active;
  const overview = document.getElementById("overview_focus");
  if (!status.focus_active) {
    badge.textContent = t("focus.ready");
    if (overview) overview.textContent = t("focus.ready");
    return;
  }
  const totalMinutes = Math.max(1, Math.ceil(status.focus_remaining_secs / 60));
  const label = totalMinutes >= 60
    ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
    : `${totalMinutes}m`;
  badge.textContent = t("focus.active", { label });
  if (overview) overview.textContent = label;
}

async function loadFocus() {
  try {
    renderFocus(await invoke("get_productivity_status"));
  } catch (e) {
    renderFocus({ focus_active: false, focus_remaining_secs: 0 });
  }
}

async function setFocus(minutes) {
  try {
    const status = await invoke("set_focus_mode", { minutes });
    renderFocus(status);
    showNote("note", minutes === 0 ? t("focus.resumed") : t("focus.enabled"));
  } catch (e) {
    showNote("note", String(e), 5000);
  }
}

async function testNotification() {
  const button = document.getElementById("test_notification");
  button.disabled = true;
  try {
    const result = await invoke("test_notification");
    showNote("test_notification_note", result || t("notifications.testOk"), 7000);
  } catch (e) {
    showNote("test_notification_note", String(e), 5000);
  } finally {
    button.disabled = false;
  }
}

// --- Accounts ---

/** One open/close at a time — overlapping WebView create/destroy freezes Settings. */
let accountTabOpBusy = false;
let accountTabOpDoneResolver = null;
/** @type {Set<string>} */
const selectedAccountIds = new Set();
/** @type {Array<{id:string,name:string,open?:boolean,has_seat?:boolean}>} */
let cachedAccountList = [];
let batchRunning = false;
let batchCancel = false;

window.__whatsnowAccountTabOpDone = function whatsnowAccountTabOpDone() {
  const resolve = accountTabOpDoneResolver;
  accountTabOpDoneResolver = null;
  if (resolve) resolve();
};

function waitAccountTabOpDone(timeoutMs) {
  const ms = timeoutMs == null ? 60000 : timeoutMs;
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      if (accountTabOpDoneResolver === done) accountTabOpDoneResolver = null;
      resolve();
    };
    accountTabOpDoneResolver = done;
    window.setTimeout(done, ms);
  });
}

function setAccountTabButtonsDisabled(disabled) {
  const list = document.getElementById("accounts-list");
  if (!list) return;
  for (const btn of list.querySelectorAll("button[data-acct-tab-op]")) {
    btn.disabled = disabled;
  }
}

function isAccountInactive(a) {
  return !(a.has_seat || a.open);
}

function setBatchNote(msg) {
  const el = document.getElementById("accounts_batch_note");
  if (el) el.textContent = msg || "";
}

function selectedIdsFor(predicate) {
  const byId = new Map(cachedAccountList.map((a) => [a.id, a]));
  return [...selectedAccountIds].filter((id) => {
    const a = byId.get(id);
    return a && predicate(a);
  });
}

function updateAccountsBatchBar() {
  const openBtn = document.getElementById("accounts_open_selected");
  const closeBtn = document.getElementById("accounts_close_selected");
  const cancelBtn = document.getElementById("accounts_batch_cancel");
  const selectAll = document.getElementById("accounts_select_all");
  const allIds = cachedAccountList.map((a) => a.id);
  for (const id of [...selectedAccountIds]) {
    if (!allIds.includes(id)) selectedAccountIds.delete(id);
  }
  const nOpen = selectedIdsFor(isAccountInactive).length;
  const nClose = selectedIdsFor((a) => !isAccountInactive(a)).length;
  const busy = batchRunning || accountTabOpBusy;
  if (openBtn) {
    openBtn.disabled = busy || nOpen === 0;
    openBtn.textContent =
      nOpen > 0 ? t("accounts.openSelectedN", { n: nOpen }) : t("accounts.openSelected");
  }
  if (closeBtn) {
    closeBtn.disabled = busy || nClose === 0;
    closeBtn.textContent =
      nClose > 0 ? t("accounts.closeSelectedN", { n: nClose }) : t("accounts.closeSelected");
  }
  if (cancelBtn) {
    cancelBtn.hidden = !batchRunning;
    cancelBtn.disabled = !batchRunning;
  }
  if (selectAll) {
    const n = selectedAccountIds.size;
    selectAll.disabled = batchRunning || allIds.length === 0;
    selectAll.checked = allIds.length > 0 && allIds.every((id) => selectedAccountIds.has(id));
    selectAll.indeterminate = n > 0 && n < allIds.length && !selectAll.checked;
  }
}

async function runAccountTabOp(fn) {
  if (accountTabOpBusy || batchRunning) return;
  accountTabOpBusy = true;
  setAccountTabButtonsDisabled(true);
  updateAccountsBatchBar();
  try {
    // Invoke returns after seat network; WebView create/close runs after IPC
    // unwinds and waits for async close to finish before the next op.
    await fn();
    await waitAccountTabOpDone(20000);
  } catch (e) {
    const msg = String(e);
    if (!msg.includes("请稍候")) askAlert(msg);
  } finally {
    accountTabOpBusy = false;
    await loadAccounts().catch(() => {});
    await loadMembership().catch(() => {});
    updateAccountsBatchBar();
  }
}

/**
 * @param {"open"|"close"} kind
 * @param {string[]} ids
 */
async function runAccountBatchQueue(kind, ids) {
  const byId = new Map(cachedAccountList.map((a) => [a.id, a]));
  const progressKey =
    kind === "open" ? "accounts.batchProgressOpen" : "accounts.batchProgressClose";
  const doneKey = kind === "open" ? "accounts.batchDoneOpen" : "accounts.batchDoneClose";
  const cancelKey =
    kind === "open" ? "accounts.batchCancelledOpen" : "accounts.batchCancelledClose";
  const command = kind === "open" ? "open_account" : "close_account";

  batchRunning = true;
  batchCancel = false;
  accountTabOpBusy = true;
  setAccountTabButtonsDisabled(true);
  updateAccountsBatchBar();
  let ok = 0;
  let failed = false;
  let cancelled = false;
  try {
    for (let i = 0; i < ids.length; i++) {
      if (batchCancel) {
        cancelled = true;
        break;
      }
      const id = ids[i];
      const name = (byId.get(id) && byId.get(id).name) || id;
      setBatchNote(t(progressKey, { i: i + 1, n: ids.length, name }));
      try {
        await invoke(command, { id });
        await waitAccountTabOpDone(60000);
        ok += 1;
        selectedAccountIds.delete(id);
      } catch (e) {
        const msg = String(e);
        if (msg.includes("请稍候")) {
          await new Promise((r) => setTimeout(r, 400));
          i -= 1;
          continue;
        }
        setBatchNote(t("accounts.batchFail", { error: msg }));
        failed = true;
        break;
      }
      await loadAccounts().catch(() => {});
    }
    if (cancelled) {
      setBatchNote(t(cancelKey, { ok, n: ids.length }));
    } else if (!failed) {
      setBatchNote(t(doneKey, { ok }));
    }
  } finally {
    batchRunning = false;
    batchCancel = false;
    accountTabOpBusy = false;
    await loadAccounts().catch(() => {});
    await loadMembership().catch(() => {});
    updateAccountsBatchBar();
  }
}

async function openSelectedAccountsBatch() {
  if (batchRunning || accountTabOpBusy) return;
  let ids = selectedIdsFor(isAccountInactive);
  if (!ids.length) {
    setBatchNote(t("accounts.batchNoneOpen"));
    return;
  }

  let remain = Infinity;
  try {
    const status = await invoke("membership_status");
    if (status && status.logged_in) {
      const limit = Number(status.device_limit) || 0;
      const used = Number(status.seats_in_use) || 0;
      remain = Math.max(0, limit - used);
    }
  } catch (_) {}

  if (remain === 0) {
    setBatchNote(t("accounts.batchNoSeats"));
    return;
  }
  if (Number.isFinite(remain) && ids.length > remain) {
    if (!(await askConfirm(t("accounts.batchTrim", { remain, total: ids.length })))) {
      return;
    }
    ids = ids.slice(0, remain);
  }

  await runAccountBatchQueue("open", ids);
}

async function closeSelectedAccountsBatch() {
  if (batchRunning || accountTabOpBusy) return;
  const ids = selectedIdsFor((a) => !isAccountInactive(a));
  if (!ids.length) {
    setBatchNote(t("accounts.batchNoneClose"));
    return;
  }
  await runAccountBatchQueue("close", ids);
}

function wireAccountsBatchBar() {
  document.getElementById("accounts_select_all")?.addEventListener("change", (ev) => {
    const on = !!(ev.target && ev.target.checked);
    if (on) {
      for (const a of cachedAccountList) selectedAccountIds.add(a.id);
    } else {
      selectedAccountIds.clear();
    }
    renderAccounts(cachedAccountList);
  });
  document.getElementById("accounts_open_selected")?.addEventListener("click", () => {
    openSelectedAccountsBatch().catch((e) => askAlert(String(e)));
  });
  document.getElementById("accounts_close_selected")?.addEventListener("click", () => {
    closeSelectedAccountsBatch().catch((e) => askAlert(String(e)));
  });
  document.getElementById("accounts_batch_cancel")?.addEventListener("click", () => {
    batchCancel = true;
  });
}

function renderAccounts(accounts) {
  cachedAccountList = Array.isArray(accounts) ? accounts : [];
  const list = document.getElementById("accounts-list");
  list.textContent = "";
  const canRemove = cachedAccountList.length > 1;
  const overviewAccounts = document.getElementById("overview_accounts");
  if (overviewAccounts) {
    overviewAccounts.textContent =
      cachedAccountList.length === 1
        ? t("accounts.countOne")
        : t("accounts.countMany", { n: cachedAccountList.length });
  }

  for (const a of cachedAccountList) {
    const row = document.createElement("div");
    row.className = "account-row";

    const isActive = !isAccountInactive(a);
    {
      const pick = document.createElement("input");
      pick.type = "checkbox";
      pick.className = "acct-pick";
      pick.checked = selectedAccountIds.has(a.id);
      pick.disabled = batchRunning;
      pick.addEventListener("change", () => {
        if (pick.checked) selectedAccountIds.add(a.id);
        else selectedAccountIds.delete(a.id);
        updateAccountsBatchBar();
      });
      row.appendChild(pick);
    }

    const name = document.createElement("span");
    name.className = "acct-name";
    name.textContent = a.name;
    row.appendChild(name);

    const seatBadge = document.createElement("span");
    seatBadge.className = "acct-seat-badge";
    seatBadge.textContent = isActive ? t("accounts.seatOn") : t("accounts.seatOff");
    row.appendChild(seatBadge);

    if (a.unread > 0) {
      const badge = document.createElement("span");
      badge.className = "acct-unread";
      badge.textContent = String(a.unread);
      row.appendChild(badge);
    } else {
      const unreadSpacer = document.createElement("span");
      unreadSpacer.className = "acct-pick-spacer";
      unreadSpacer.setAttribute("aria-hidden", "true");
      row.appendChild(unreadSpacer);
    }

    if (isActive) {
      const closeBtn = document.createElement("button");
      closeBtn.className = "secondary";
      closeBtn.textContent = t("accounts.close");
      closeBtn.dataset.acctTabOp = "1";
      closeBtn.disabled = accountTabOpBusy || batchRunning;
      closeBtn.addEventListener("click", () => {
        runAccountTabOp(() => invoke("close_account", { id: a.id }));
      });
      row.appendChild(closeBtn);
    } else {
      const openBtn = document.createElement("button");
      openBtn.className = "secondary";
      openBtn.textContent = t("accounts.open");
      openBtn.dataset.acctTabOp = "1";
      openBtn.disabled = accountTabOpBusy || batchRunning;
      openBtn.addEventListener("click", () => {
        runAccountTabOp(() => invoke("open_account", { id: a.id }));
      });
      row.appendChild(openBtn);
    }

    const muteBtn = document.createElement("button");
    muteBtn.className = "secondary";
    muteBtn.textContent = a.notifications_enabled ? t("accounts.mute") : t("accounts.unmute");
    muteBtn.setAttribute("aria-pressed", String(!a.notifications_enabled));
    muteBtn.title = a.notifications_enabled
      ? t("accounts.muteTitle")
      : t("accounts.unmuteTitle");
    muteBtn.disabled = batchRunning;
    muteBtn.addEventListener("click", async () => {
      try {
        await invoke("set_account_notifications", {
          id: a.id,
          enabled: !a.notifications_enabled,
        });
        await loadAccounts();
      } catch (e) {
        askAlert(String(e));
      }
    });
    row.appendChild(muteBtn);

    const fpBtn = document.createElement("button");
    fpBtn.className = "secondary";
    fpBtn.textContent = t("accounts.fingerprint");
    fpBtn.disabled = batchRunning;
    fpBtn.addEventListener("click", () => {
      openFingerprintModal(a).catch((e) => askAlert(String(e)));
    });
    row.appendChild(fpBtn);

    const proxyBtn = document.createElement("button");
    proxyBtn.className = "secondary";
    proxyBtn.textContent = a.proxy
      ? t("accounts.proxyCustom")
      : t("accounts.proxy");
    proxyBtn.title = a.proxy
      ? `${a.proxy.scheme || "http"}://${a.proxy.host}:${a.proxy.port}`
      : t("accounts.proxyInherit");
    proxyBtn.disabled = batchRunning;
    proxyBtn.addEventListener("click", () => openAccountProxyModal(a));
    row.appendChild(proxyBtn);

    const renameBtn = document.createElement("button");
    renameBtn.className = "secondary";
    renameBtn.textContent = t("accounts.rename");
    renameBtn.disabled = batchRunning;
    renameBtn.addEventListener("click", async () => {
      const next = await askPrompt(t("accounts.renamePrompt"), a.name);
      if (next && next.trim() && next.trim() !== a.name) {
        try {
          await invoke("rename_account", { id: a.id, name: next.trim() });
        } catch (e) {
          await askAlert(String(e));
        }
        await loadAccounts();
      }
    });
    row.appendChild(renameBtn);

    const removeBtn = document.createElement("button");
    removeBtn.className = "secondary";
    removeBtn.textContent = t("accounts.remove");
    removeBtn.disabled = !canRemove || batchRunning;
    removeBtn.addEventListener("click", async () => {
      if (!(await askConfirm(t("accounts.removeConfirm", { name: a.name })))) return;
      try {
        await invoke("remove_account", { id: a.id });
        selectedAccountIds.delete(a.id);
      } catch (e) {
        askAlert(String(e));
      }
      await loadAccounts();
    });
    row.appendChild(removeBtn);

    list.appendChild(row);
  }
  updateAccountsBatchBar();
}

let cachedFingerprintJson = "";

function closeFingerprintModal() {
  const modal = document.getElementById("fingerprint-modal");
  if (modal) modal.hidden = true;
  cachedFingerprintJson = "";
  const note = document.getElementById("fingerprint-note");
  if (note) note.textContent = "";
  const pre = document.getElementById("fingerprint-json");
  if (pre) pre.textContent = "";
}

function escapeFpHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Pretty JSON with lightweight syntax highlighting for the fingerprint viewer. */
function highlightFingerprintJson(jsonText) {
  return String(jsonText).replace(
    /("(?:\\.|[^"\\])*")\s*:|"((?:\\.|[^"\\])*)"|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false)\b|\b(null)\b|([{}\[\],])/g,
    (_match, key, str, num, bool, nul, punct) => {
      if (key !== undefined) {
        return `<span class="fp-key">${escapeFpHtml(key)}</span>:`;
      }
      if (str !== undefined) {
        return `<span class="fp-string">${escapeFpHtml(`"${str}"`)}</span>`;
      }
      if (num !== undefined) {
        return `<span class="fp-number">${escapeFpHtml(num)}</span>`;
      }
      if (bool !== undefined) {
        return `<span class="fp-bool">${bool}</span>`;
      }
      if (nul !== undefined) {
        return `<span class="fp-null">${nul}</span>`;
      }
      return `<span class="fp-punct">${escapeFpHtml(punct)}</span>`;
    },
  );
}

async function openFingerprintModal(account) {
  const fp = await invoke("get_account_fingerprint", { id: account.id });
  cachedFingerprintJson = JSON.stringify(fp, null, 2);
  const modal = document.getElementById("fingerprint-modal");
  const pre = document.getElementById("fingerprint-json");
  const subtitle = document.getElementById("fingerprint-subtitle");
  const note = document.getElementById("fingerprint-note");
  if (!modal || !pre) return;
  if (subtitle) {
    subtitle.textContent = t("accounts.fingerprintSubtitle", {
      name: account.name,
      id: account.id,
    });
  }
  if (note) note.textContent = "";
  pre.innerHTML = highlightFingerprintJson(cachedFingerprintJson);
  pre.scrollTop = 0;
  modal.hidden = false;
}

function wireFingerprintModal() {
  document.getElementById("fingerprint-close")?.addEventListener("click", closeFingerprintModal);
  document.getElementById("fingerprint-modal")?.addEventListener("click", (ev) => {
    if (ev.target && ev.target.id === "fingerprint-modal") closeFingerprintModal();
  });
  document.getElementById("fingerprint-copy")?.addEventListener("click", async () => {
    const note = document.getElementById("fingerprint-note");
    if (!cachedFingerprintJson) return;
    try {
      await navigator.clipboard.writeText(cachedFingerprintJson);
      if (note) note.textContent = t("accounts.fingerprintCopied");
    } catch (e) {
      if (note) note.textContent = t("accounts.fingerprintCopyFail");
    }
  });
}

async function loadAccounts() {
  try {
    const accounts = await invoke("list_accounts");
    renderAccounts(accounts);
  } catch (e) {
    // ignore — listing failed
  }
}

async function addAccount() {
  const input = document.getElementById("new_account_name");
  const name = input.value.trim();
  if (!name) return;
  try {
    await invoke("add_account", { name });
    input.value = "";
    await loadAccounts();
  } catch (e) {
    const msg = String(e);
    // Only the macOS < 14 case is permanent — disable Add and surface the note.
    // Other failures (disk write, window build) are transient: report and let the user retry.
    if (msg.includes("macOS 14")) {
      const note = document.getElementById("macos-note");
      note.textContent = msg;
      note.hidden = false;
      document.getElementById("add_account").disabled = true;
      document.getElementById("new_account_name").disabled = true;
    } else {
      askAlert(msg);
    }
  }
}

function showPanel(panelName) {
  if (!hasPanel(panelName)) return;
  for (const panel of document.querySelectorAll("[data-panel]")) {
    const active = panel.dataset.panel === panelName;
    panel.hidden = !active;
    panel.classList.toggle("active", active);
  }
  for (const button of document.querySelectorAll("[data-panel-target]")) {
    const active = button.dataset.panelTarget === panelName;
    button.classList.toggle("active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  }
  const [title, description] = panelMeta(panelName);
  document.getElementById("panel_title").textContent = title;
  document.getElementById("panel_description").textContent = description;
  document.getElementById("save").hidden = panelName === "about";
  document.querySelector(".panel-stage").scrollTop = 0;
  if (panelName === "devices") {
    loadDevicesList().catch(() => {});
  }
  if (panelName === "backup" && window.WhatsNowContactsBackup) {
    window.WhatsNowContactsBackup.onPanelShow();
  }
}

function wirePanelNavigation() {
  for (const button of document.querySelectorAll("[data-panel-target]")) {
    button.addEventListener("click", () => showPanel(button.dataset.panelTarget));
  }
  for (const button of document.querySelectorAll("[data-jump-panel]")) {
    button.addEventListener("click", () => showPanel(button.dataset.jumpPanel));
  }
}

function wireFocusControls() {
  for (const button of document.querySelectorAll("[data-focus-minutes]")) {
    button.addEventListener("click", () => setFocus(Number(button.dataset.focusMinutes)));
  }
  document.getElementById("focus_custom_start").addEventListener("click", () => {
    const value = Number.parseInt(document.getElementById("focus_custom").value, 10);
    setFocus(Math.min(1440, Math.max(1, Number.isFinite(value) ? value : 90)));
  });
  document.getElementById("focus_off").addEventListener("click", () => setFocus(0));
}

function refreshPlatformShortcutCopy() {
  const platform = detectPlatform();
  const recommended = platformDefaultHotkey();
  const recommendedButton = document.querySelector('[data-hotkey-preset="platform"]');
  if (recommendedButton) {
    recommendedButton.dataset.hotkeyPreset = recommended;
    recommendedButton.textContent =
      platform === "macos"
        ? t("preferences.useOption")
        : t("preferences.useCombo", { combo: recommended.replaceAll("+", " + ") });
  }
  const note = document.getElementById("platform_shortcut_note");
  if (!note) return;
  if (platform === "windows") note.textContent = t("preferences.noteWin");
  else if (platform === "macos") note.textContent = t("preferences.noteMac");
  else note.textContent = t("preferences.noteLinux");
}

function wireShortcutPresets() {
  refreshPlatformShortcutCopy();
  for (const button of document.querySelectorAll("[data-hotkey-preset]")) {
    button.addEventListener("click", () => {
      document.getElementById("hotkey").value = button.dataset.hotkeyPreset;
      setHotkeyHint("");
    });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  if (window.WhatsNowI18n) window.WhatsNowI18n.setLang("zh");
  wireExternalLinks();
  wireThemePicker();
  wirePanelNavigation();
  wireFocusControls();
  wireShortcutPresets();
  wireMembership();
  if (window.WhatsNowContactsBackup) window.WhatsNowContactsBackup.init();
  if (window.WhatsNowSettingsBackup) window.WhatsNowSettingsBackup.init();
  document.addEventListener("whatsnow-ui-lang", () => {
    if (window.WhatsNowContactsBackup) window.WhatsNowContactsBackup.refreshUi();
  });
  const uiLangSelect = document.getElementById("ui_lang");
  if (uiLangSelect) {
    uiLangSelect.addEventListener("change", () => {
      applyUiLang(uiLangSelect.value);
    });
  }
  load()
    .then(() => {
      applyUiLang(document.getElementById("ui_lang")?.value || "zh");
    })
    .catch((error) => {
      showNote("note", t("save.loadFail", { error: String(error) }), 0);
    });
  Promise.allSettled([loadAccounts(), loadLock(), loadFocus(), loadMembership()]);
  wireLock();
  document.getElementById("save").addEventListener("click", save);

  // WATransChat parity: translation color/size apply immediately (no extra Save click).
  let appearanceSaveTimer = 0;
  async function saveTranslationAppearanceLive() {
    try {
      const s = await invoke("get_settings");
      const colorEl = document.getElementById("translate_text_color");
      const fontEl = document.getElementById("translate_font_size");
      if (colorEl) {
        const raw = String(colorEl.value || "").trim();
        s.translate_text_color = /^#[0-9a-fA-F]{6}$/i.test(raw) ? raw : "#333333";
      }
      if (fontEl) {
        const n = Number.parseInt(fontEl.value, 10);
        s.translate_font_size = Math.min(28, Math.max(10, Number.isFinite(n) ? n : 14));
      }
      await invoke("set_settings", { settings: s });
    } catch (e) {
      showNote("note", t("save.appearanceFail", { error: String(e) }), 4000);
    }
  }
  function scheduleTranslationAppearanceSave() {
    clearTimeout(appearanceSaveTimer);
    appearanceSaveTimer = setTimeout(() => {
      saveTranslationAppearanceLive().catch(() => {});
    }, 200);
  }
  const colorInput = document.getElementById("translate_text_color");
  if (colorInput) {
    colorInput.addEventListener("input", scheduleTranslationAppearanceSave);
    colorInput.addEventListener("change", scheduleTranslationAppearanceSave);
  }
  const fontInput = document.getElementById("translate_font_size");
  if (fontInput) {
    fontInput.addEventListener("change", scheduleTranslationAppearanceSave);
  }
  wireLatencyAndQuality();
  wireAiPromptSection();
  wireProxySection();
  wireAccountProxyModal();
  wirePhraseManageModal();
  document.getElementById("add_account").addEventListener("click", addAccount);
  document.getElementById("new_account_name").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addAccount();
  });
  wireAccountsBatchBar();
  wireFingerprintModal();
  document.getElementById("record_hotkey").addEventListener("click", toggleRecording);
  document.getElementById("test_notification").addEventListener("click", testNotification);
  window.setInterval(loadFocus, 60_000);
  const hash = (location.hash || "").replace(/^#/, "");
  if (hash && hasPanel(hash)) showPanel(hash);
  window.addEventListener("hashchange", () => {
    const h = (location.hash || "").replace(/^#/, "");
    if (h && hasPanel(h)) showPanel(h);
  });
});

// --- App lock ---

async function loadLock() {
  let s;
  try {
    s = await invoke("get_lock_status");
  } catch (e) {
    return;
  }
  const disabled = document.getElementById("lock-disabled");
  const enabled = document.getElementById("lock-enabled");
  disabled.hidden = s.enabled;
  enabled.hidden = !s.enabled;

  if (s.enabled) {
    const row = document.getElementById("biometric_row");
    row.hidden = !s.biometric_available;
    document.getElementById("biometric_label").textContent = t("security.useBiometric", { label: s.biometric_label });
    document.getElementById("biometric_enabled").checked = s.biometric_enabled;
    document.getElementById("lock_on_launch").checked = s.lock_on_launch;
    document.getElementById("lock_on_hide").checked = s.lock_on_hide;
    document.getElementById("idle_min").value = String(Math.round(s.idle_secs / 60));
  }
}

async function saveLockOptions() {
  const idleMin = parseInt(document.getElementById("idle_min").value, 10) || 0;
  await invoke("set_app_lock_options", {
    lockOnLaunch: document.getElementById("lock_on_launch").checked,
    lockOnHide: document.getElementById("lock_on_hide").checked,
    idleSecs: Math.max(0, idleMin) * 60,
  });
}

function wireLock() {
  document.getElementById("enable_lock").addEventListener("click", async () => {
    const a = document.getElementById("lock_pw1").value;
    const b = document.getElementById("lock_pw2").value;
    try {
      await invoke("set_app_lock_password", { new: a, confirm: b });
      document.getElementById("lock_pw1").value = "";
      document.getElementById("lock_pw2").value = "";
      await loadLock();
    } catch (e) { askAlert(String(e)); }
  });

  document.getElementById("lock_now").addEventListener("click", async () => {
    try { await invoke("lock_app"); } catch (e) { askAlert(String(e)); }
  });

  document.getElementById("change_pw").addEventListener("click", async () => {
    const current = await askPrompt(t("security.currentPw"), "", { password: true });
    if (current === null) return;
    const next = await askPrompt(t("security.newPw"), "", { password: true });
    if (!next) return;
    try {
      await invoke("change_app_lock_password", { current, new: next, confirm: next });
      await askAlert(t("security.changed"));
    } catch (e) { await askAlert(String(e)); }
  });

  document.getElementById("disable_lock").addEventListener("click", async () => {
    const current = await askPrompt(t("security.disablePrompt"), "", { password: true });
    if (current === null) return;
    try {
      await invoke("disable_app_lock", { current });
      await loadLock();
    } catch (e) { await askAlert(String(e)); }
  });

  document.getElementById("biometric_enabled").addEventListener("change", async (e) => {
    try {
      await invoke("set_biometric_enabled", { enabled: e.target.checked });
    } catch (err) {
      askAlert(String(err));
      e.target.checked = !e.target.checked; // revert on failure
    }
    await loadLock();
  });

  for (const id of ["lock_on_launch", "lock_on_hide"]) {
    document.getElementById(id).addEventListener("change", () => saveLockOptions().catch((e) => askAlert(String(e))));
  }
  document.getElementById("idle_min").addEventListener("change", () => saveLockOptions().catch((e) => askAlert(String(e))));
}

// --- Engine latency probe + quality test (WATransChat options parity) ---

const QUALITY_DAILY_LIMIT = 10;
const QUALITY_QUOTA_KEY = "wn_qualityTranslateDailyQuota";
const QUALITY_LAST_KEY = "wn_qualityTranslateLast";
let qualityTestBusy = false;
let lastQualityResult = null;
let qualityTestRunToken = 0;
let qualityProgressUnlisten = null;

function qualityDayKey() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function getQualityQuota() {
  const day = qualityDayKey();
  try {
    const raw = JSON.parse(localStorage.getItem(QUALITY_QUOTA_KEY) || "null");
    if (raw && String(raw.day || "") === day) {
      const count = Math.max(0, Number(raw.count) || 0);
      return {
        day,
        count,
        limit: QUALITY_DAILY_LIMIT,
        remaining: Math.max(0, QUALITY_DAILY_LIMIT - count),
      };
    }
  } catch (_) {}
  return { day, count: 0, limit: QUALITY_DAILY_LIMIT, remaining: QUALITY_DAILY_LIMIT };
}

function consumeQualityQuota() {
  const q = getQualityQuota();
  if (q.count >= QUALITY_DAILY_LIMIT) {
    const err = new Error("daily_limit");
    err.code = "daily_limit";
    err.quota = q;
    throw err;
  }
  const next = {
    day: q.day,
    count: q.count + 1,
    limit: QUALITY_DAILY_LIMIT,
    remaining: Math.max(0, QUALITY_DAILY_LIMIT - (q.count + 1)),
  };
  try {
    localStorage.setItem(QUALITY_QUOTA_KEY, JSON.stringify({ day: next.day, count: next.count }));
  } catch (_) {}
  return next;
}

function engineDisplayName(engine) {
  const api = window.__whatsnowEngineList;
  if (api && typeof api.nameMap === "function") {
    const map = api.nameMap(uiLang());
    if (map && map[engine]) return map[engine];
  }
  return engine;
}

function formatLatencyKind(kind, ms) {
  if (kind === "ok") return `${ms} ms`;
  if (kind === "timeout") return t("translation.qualityStatusFail") + ` · timeout · ${ms} ms`;
  return t("translation.qualityStatusFail") + (ms ? ` · ${ms} ms` : "");
}

function renderLatencyList(statuses) {
  const list = document.getElementById("latency_probe_list");
  if (!list) return;
  const entries = Object.entries(statuses || {});
  if (!entries.length) {
    list.hidden = true;
    list.innerHTML = "";
    return;
  }
  list.hidden = false;
  list.innerHTML = entries
    .map(([engine, st]) => {
      const kind = st && st.kind ? st.kind : "fail";
      const ms = st && typeof st.ms === "number" ? st.ms : 0;
      return `<li class="probe-row"><div class="probe-row-head"><span>${escapeHtml(
        engineDisplayName(engine),
      )}</span><span class="probe-meta">${escapeHtml(formatLatencyKind(kind, ms))}</span></div></li>`;
    })
    .join("");
}

function formatQualityTestError(item) {
  const err = (item && item.error) || "";
  if (err === "timeout") return t("translation.qualityErrorTimeout");
  if (err === "empty") return t("translation.qualityErrorEmpty");
  if (err) return String(err).slice(0, 160);
  return t("translation.qualityErrorGeneric");
}

function renderQualityList(state) {
  const list = document.getElementById("quality_test_list");
  if (!list) return;
  const results = state && Array.isArray(state.results) ? state.results : [];
  if (!results.length) {
    list.hidden = true;
    list.innerHTML = "";
    return;
  }
  list.hidden = false;
  list.innerHTML = results
    .map((r) => {
      const engine = r && r.engine ? r.engine : "";
      const status = (r && r.status) || "pending";
      let statusLabel = t("translation.qualityStatusPending");
      let statusClass = "pending";
      let body = `<div class="quality-test-card-body quality-test-card-muted">${escapeHtml(
        statusLabel,
      )}</div>`;
      let actions = "";

      if (status === "ok") {
        statusLabel = t("translation.qualityStatusOk");
        statusClass = "ok";
        body = `<div class="quality-test-card-body">${escapeHtml(
          String(r.translatedText || ""),
        )}</div>`;
        actions = `<button type="button" class="secondary quality-test-apply-btn" data-engine="${escapeHtml(
          engine,
        )}">${escapeHtml(t("translation.qualityApplyBtn"))}</button>`;
      } else if (status === "fail") {
        statusLabel = t("translation.qualityStatusFail");
        statusClass = "fail";
        body = `<div class="quality-test-card-body quality-test-card-error">${escapeHtml(
          formatQualityTestError(r),
        )}</div>`;
      } else if (status === "skip") {
        statusLabel = t("translation.qualityStatusSkip");
        statusClass = "skip";
        const reason =
          r.skipReason === "need_key"
            ? t("translation.qualitySkipKey")
            : t("translation.qualitySkipPro");
        body = `<div class="quality-test-card-body quality-test-card-muted">${escapeHtml(
          reason,
        )}</div>`;
      } else {
        statusLabel = t("translation.qualityStatusPending");
        statusClass = "pending";
      }

      const msText =
        typeof r.ms === "number" && r.ms >= 0 && (status === "ok" || status === "fail")
          ? `${r.ms}ms`
          : "";

      return `<article class="quality-test-card quality-test-card-${statusClass}" data-engine="${escapeHtml(
        engine,
      )}"><header class="quality-test-card-head"><div class="quality-test-card-title">${escapeHtml(
        engineDisplayName(engine),
      )}</div><div class="quality-test-card-meta"><span class="quality-test-card-status">${escapeHtml(
        statusLabel,
      )}</span>${
        msText
          ? `<span class="quality-test-card-ms">${escapeHtml(msText)}</span>`
          : ""
      }</div></header>${body}${
        actions ? `<footer class="quality-test-card-foot">${actions}</footer>` : ""
      }</article>`;
    })
    .join("");
}

function applyQualityProgressState(state, statusEl) {
  if (!state) return;
  lastQualityResult = state;
  renderQualityList(state);
  updateQualityCopyBtn();
  if (!statusEl || !state.probing) return;
  const total = typeof state.total === "number" ? state.total : 0;
  const done = typeof state.completed === "number" ? state.completed : 0;
  statusEl.textContent = t("translation.qualityRunning", { done, total });
}

async function applyQualityEngine(engine) {
  const id = String(engine || "").trim();
  if (!id) return;
  const name = engineDisplayName(id);
  const api = window.__whatsnowEngineList;
  const isPro = await settingsIsPro();
  if (api && typeof api.isProEngine === "function" && api.isProEngine(id, "global") && !isPro) {
    askAlert(t("translation.qualityApplyDeniedPro"));
    return;
  }
  const cfg = readApiKeyConfigFromForm();
  if (id === "deepl" && !cfg.deeplApiKey) {
    askAlert(t("translation.qualityApplyDeniedKey"));
    focusApiKeyFieldsForEngine(id);
    return;
  }
  if (id === "chatgpt" && !cfg.chatgptApiKey) {
    askAlert(t("translation.qualityApplyDeniedKey"));
    focusApiKeyFieldsForEngine(id);
    return;
  }
  if (
    id === "openai_custom" &&
    (!cfg.openaiCustomApiKey || !cfg.openaiCustomApiUrl || !cfg.openaiCustomModel)
  ) {
    askAlert(t("translation.qualityApplyDeniedOpenaiCustom"));
    focusApiKeyFieldsForEngine(id);
    return;
  }
  if (id === "deepseek_custom" && !cfg.deepseekCustomApiKey) {
    askAlert(t("translation.qualityApplyDeniedDeepseekCustom"));
    focusApiKeyFieldsForEngine(id);
    return;
  }
  const composeEl = document.getElementById("translate_engine");
  if (composeEl) {
    const hasOpt = Array.from(composeEl.options || []).some((o) => o.value === id);
    if (hasOpt) {
      composeEl.value = id;
      composeEl.__wnAllowedEngine = id;
    }
  }
  const s = await invoke("get_settings");
  s.translate_engine = id;
  await invoke("set_settings", { settings: s });
  refreshAiPromptSection();
  const msg = t("translation.qualityApplied", { name });
  showNote("note", msg, 3000);
  const statusEl = document.getElementById("quality_test_status");
  if (statusEl && !qualityTestBusy) statusEl.textContent = msg;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildQualityAiCopy(state) {
  const results = (state && Array.isArray(state.results) ? state.results : []).filter(
    (r) => r && r.status === "ok" && String(r.translatedText || "").trim(),
  );
  const lines = [];
  lines.push("Compare these machine translations and pick the best one. Reply with only the best translation.");
  lines.push("");
  lines.push(`【source】${state.sl || "auto"}`);
  lines.push(`【target】${state.tl || ""}`);
  lines.push("【original】");
  lines.push(String(state.text || ""));
  lines.push("");
  results.forEach((r) => {
    lines.push(`【${engineDisplayName(r.engine)}】`);
    lines.push(String(r.translatedText || "").trim());
    lines.push("");
  });
  return lines.join("\n");
}

function updateQualityCopyBtn() {
  const btn = document.getElementById("quality_copy_ai");
  if (!btn) return;
  const ok =
    lastQualityResult &&
    Array.isArray(lastQualityResult.results) &&
    lastQualityResult.results.some((r) => r && r.status === "ok" && r.translatedText);
  btn.disabled = qualityTestBusy || !ok;
}

function refreshQualityQuotaNote() {
  const status = document.getElementById("quality_test_status");
  if (!status || qualityTestBusy) return;
  const q = getQualityQuota();
  status.textContent = t("translation.qualityQuota", { count: q.count, limit: q.limit });
}

function wireLatencyAndQuality() {
  const probeBtn = document.getElementById("probe_engine_latency");
  const qualityBtn = document.getElementById("quality_translate_test");
  const copyBtn = document.getElementById("quality_copy_ai");
  const sample = document.getElementById("quality_test_text");
  const qualityList = document.getElementById("quality_test_list");
  if (sample && !sample.value) {
    sample.value = uiLang().indexOf("zh") === 0 ? "你好，最近怎么样？" : "Hello, how are you?";
  }
  for (const id of ["quality_source_lang", "quality_target_lang"]) {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", persistQualityLangs);
  }
  if (qualityList && !qualityList.__wnApplyBound) {
    qualityList.__wnApplyBound = true;
    qualityList.addEventListener("click", (ev) => {
      const btn = ev.target && ev.target.closest ? ev.target.closest(".quality-test-apply-btn") : null;
      if (!btn || qualityTestBusy) return;
      const engine = btn.getAttribute("data-engine") || "";
      applyQualityEngine(engine).catch((e) => askAlert(String(e)));
    });
  }
  document.addEventListener("whatsnow-ui-lang", () => {
    // Refill searchable lang lists; current select values are preserved.
    fillTranslateLangSelects({
      translate_source_lang: document.getElementById("translate_source_lang")?.value,
      default_customer_lang: document.getElementById("default_customer_lang")?.value,
    });
  });
  try {
    const saved = JSON.parse(localStorage.getItem(QUALITY_LAST_KEY) || "null");
    if (saved && Array.isArray(saved.results)) {
      lastQualityResult = saved;
      renderQualityList(saved);
    }
  } catch (_) {}
  refreshQualityQuotaNote();
  updateQualityCopyBtn();

  if (probeBtn) {
    probeBtn.addEventListener("click", async () => {
      const statusEl = document.getElementById("latency_probe_status");
      probeBtn.disabled = true;
      if (statusEl) statusEl.textContent = t("translation.latencyProbing");
      try {
        const api = window.__whatsnowEngineList;
        const engines = api && Array.isArray(api.GLOBAL_INPUT_ENGINES)
          ? api.GLOBAL_INPUT_ENGINES.slice()
          : undefined;
        const state = await invoke("probe_engine_latency", { engines });
        const statuses = (state && state.statuses) || {};
        renderLatencyList(statuses);
        if (statusEl) {
          statusEl.textContent = t("translation.latencyDone", {
            count: Object.keys(statuses).length,
          });
        }
      } catch (e) {
        if (statusEl) {
          statusEl.textContent = t("translation.latencyFail", { error: String(e) });
        }
      } finally {
        probeBtn.disabled = false;
      }
    });
  }

  if (qualityBtn) {
    qualityBtn.addEventListener("click", async () => {
      const statusEl = document.getElementById("quality_test_status");
      if (qualityTestBusy) {
        if (statusEl) statusEl.textContent = t("translation.qualityBusy");
        return;
      }
      const text = String(sample?.value || "").trim();
      if (!text) {
        if (statusEl) statusEl.textContent = t("translation.qualityEmpty");
        return;
      }
      let quota;
      try {
        quota = consumeQualityQuota();
      } catch (e) {
        if (e && e.code === "daily_limit") {
          if (statusEl) {
            statusEl.textContent = t("translation.qualityDailyLimit", {
              limit: QUALITY_DAILY_LIMIT,
            });
          }
          return;
        }
        throw e;
      }
      qualityTestBusy = true;
      updateQualityCopyBtn();
      qualityBtn.disabled = true;
      const runToken = ++qualityTestRunToken;
      if (statusEl) {
        statusEl.textContent = t("translation.qualityRunning", { done: 0, total: "?" });
      }
      try {
        const api = window.__whatsnowEngineList;
        const engines = api && Array.isArray(api.GLOBAL_INPUT_ENGINES)
          ? api.GLOBAL_INPUT_ENGINES.slice()
          : [
              "google_web",
              "google",
              "google_chrome",
              "bing",
              "yandex",
              "volc",
              "deeplx",
              "backup",
            ];
        const slEl = document.getElementById("quality_source_lang");
        const tlEl = document.getElementById("quality_target_lang");
        let sourceLang = (slEl && slEl.value) || "auto";
        let targetLang = (tlEl && tlEl.value) || "";
        if (!targetLang || targetLang === "auto") {
          const fallback = qualityLangDefaults({});
          targetLang = fallback.target || "en";
        }
        persistQualityLangs();
        applyQualityProgressState(
          {
            probing: true,
            total: engines.length,
            completed: 0,
            results: engines.map((engine) => ({ engine, status: "pending" })),
            sl: sourceLang,
            tl: targetLang,
            text,
          },
          statusEl,
        );
        if (typeof qualityProgressUnlisten === "function") {
          try {
            qualityProgressUnlisten();
          } catch (_) {}
          qualityProgressUnlisten = null;
        }
        if (typeof listen === "function") {
          qualityProgressUnlisten = await listen("quality-translate-progress", (event) => {
            if (runToken !== qualityTestRunToken) return;
            applyQualityProgressState(event && event.payload, statusEl);
          });
        }
        const state = await invoke("quality_translate_test", {
          text,
          targetLang,
          sourceLang,
          engines,
        });
        if (runToken !== qualityTestRunToken) return;
        lastQualityResult = state;
        try {
          localStorage.setItem(QUALITY_LAST_KEY, JSON.stringify(state));
        } catch (_) {}
        renderQualityList(state);
        const results = Array.isArray(state.results) ? state.results : [];
        const ok = results.filter((r) => r && r.status === "ok").length;
        const fail = results.filter((r) => r && r.status === "fail").length;
        const skip = results.filter((r) => r && r.status === "skip").length;
        if (statusEl) {
          statusEl.textContent =
            t("translation.qualityDone", { ok, fail, skip }) +
            ` · ${t("translation.qualityQuota", { count: quota.count, limit: quota.limit })}`;
        }
      } catch (e) {
        if (statusEl) {
          statusEl.textContent = t("translation.qualityFail", { error: String(e) });
        }
      } finally {
        if (typeof qualityProgressUnlisten === "function") {
          try {
            qualityProgressUnlisten();
          } catch (_) {}
          qualityProgressUnlisten = null;
        }
        qualityTestBusy = false;
        qualityBtn.disabled = false;
        updateQualityCopyBtn();
      }
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      if (
        !lastQualityResult ||
        !Array.isArray(lastQualityResult.results) ||
        !lastQualityResult.results.some((r) => r && r.status === "ok" && r.translatedText)
      ) {
        const statusEl = document.getElementById("quality_test_status");
        if (statusEl) statusEl.textContent = t("translation.qualityCopyEmpty");
        return;
      }
      const payload = buildQualityAiCopy(lastQualityResult);
      const statusEl = document.getElementById("quality_test_status");
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(payload);
        } else {
          const ta = document.createElement("textarea");
          ta.value = payload;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        }
        if (statusEl) statusEl.textContent = t("translation.qualityCopyOk");
      } catch (_) {
        if (statusEl) statusEl.textContent = t("translation.qualityCopyFail");
      }
    });
  }
}

// --- Quick phrases manage modal (settings entry next to show_quick_phrases) ---

function phraseUid() {
  return `cp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function parsePhrasesJson(raw) {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function normalizePhraseItem(raw, orderHint) {
  const now = Date.now();
  if (typeof raw === "string") {
    const text0 = raw.trim();
    if (!text0) return null;
    return { id: phraseUid(), text: text0, order: Number.isFinite(orderHint) ? orderHint : 0, updatedAt: now };
  }
  if (!raw || typeof raw !== "object") return null;
  const text = String(raw.text || "").trim();
  const deletedAt = raw.deletedAt != null ? Number(raw.deletedAt) || 0 : 0;
  if (!text && !deletedAt) return null;
  const item = {
    id: String(raw.id || "").trim() || phraseUid(),
    text,
    order: Number.isFinite(Number(raw.order))
      ? Number(raw.order)
      : Number.isFinite(orderHint)
        ? orderHint
        : 0,
    updatedAt: Number(raw.updatedAt) || now,
  };
  if (deletedAt > 0) item.deletedAt = deletedAt;
  if (raw.shortcut) item.shortcut = String(raw.shortcut);
  return item;
}

function normalizePhraseList(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  list.forEach((raw, i) => {
    const item = normalizePhraseItem(raw, i);
    if (item) out.push(item);
  });
  return out;
}

function aliveSortedPhrases(list) {
  return normalizePhraseList(list)
    .filter((p) => !p.deletedAt && String(p.text || "").trim())
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
}

function mergePhraseLists(base, changes) {
  const map = {};
  normalizePhraseList(base).forEach((p) => {
    if (p?.id != null) map[String(p.id)] = p;
  });
  normalizePhraseList(changes).forEach((p) => {
    if (!p?.id) return;
    const id = String(p.id);
    const prev = map[id];
    const prevVer = Math.max(Number(prev?.updatedAt) || 0, Number(prev?.deletedAt) || 0);
    const nextVer = Math.max(Number(p.updatedAt) || 0, Number(p.deletedAt) || 0);
    if (!prev || nextVer >= prevVer) map[id] = p;
  });
  return Object.values(map);
}

function parseSyncMeta(raw) {
  try {
    const parsed = JSON.parse(raw || "{}");
    return {
      lastSyncAt: Number(parsed.lastSyncAt) || 0,
      dirtyIds: Array.isArray(parsed.dirtyIds)
        ? parsed.dirtyIds.map((id) => String(id)).filter(Boolean)
        : [],
    };
  } catch (_) {
    return { lastSyncAt: 0, dirtyIds: [] };
  }
}

async function persistPhrasesFromSettings(nextList, dirtyIds) {
  const s = await invoke("get_settings");
  const full = normalizePhraseList(nextList);
  s.quick_phrases_json = JSON.stringify(full);
  const meta = parseSyncMeta(s.quick_phrases_sync_meta_json);
  const dirty = new Set(meta.dirtyIds);
  (dirtyIds || []).forEach((id) => {
    if (id != null && id !== "") dirty.add(String(id));
  });
  s.quick_phrases_sync_meta_json = JSON.stringify({
    lastSyncAt: meta.lastSyncAt,
    dirtyIds: Array.from(dirty).slice(0, 200),
  });
  // Keep the on-page checkbox as the source of truth for visibility.
  const toggle = document.getElementById("show_quick_phrases");
  if (toggle) s.show_quick_phrases = !!toggle.checked;
  await invoke("set_settings", { settings: s });
  return full;
}

function closePhraseManageModal() {
  const modal = document.getElementById("phrase-manage-modal");
  if (modal) modal.hidden = true;
}

async function renderPhraseManageList() {
  const bodyEl = document.getElementById("phrase-manage-list");
  if (!bodyEl) return;
  bodyEl.innerHTML = "";
  let settings;
  try {
    settings = await invoke("get_settings");
  } catch (e) {
    bodyEl.textContent = String(e);
    return;
  }
  const list = aliveSortedPhrases(parsePhrasesJson(settings.quick_phrases_json));
  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "phrase-manage-empty";
    empty.textContent = t("interface.phrasesEmpty");
    bodyEl.appendChild(empty);
    return;
  }
  list.forEach((phrase, index) => {
    const row = document.createElement("div");
    row.className = "phrase-manage-item";

    const ta = document.createElement("textarea");
    ta.className = "phrase-manage-item-text";
    ta.rows = 2;
    ta.value = String(phrase.text || "");
    ta.addEventListener("change", async () => {
      try {
        const s = await invoke("get_settings");
        const full = normalizePhraseList(parsePhrasesJson(s.quick_phrases_json));
        const target = full.find((p) => String(p.id) === String(phrase.id));
        if (!target) return;
        target.text = String(ta.value || "").trim();
        target.updatedAt = Date.now();
        await persistPhrasesFromSettings(mergePhraseLists(full, [target]), [target.id]);
        await renderPhraseManageList();
      } catch (e) {
        showNote("note", t("save.fail", { error: String(e) }), 4000);
      }
    });

    const actions = document.createElement("div");
    actions.className = "phrase-manage-item-actions";

    const upBtn = document.createElement("button");
    upBtn.type = "button";
    upBtn.className = "secondary";
    upBtn.textContent = "↑";
    upBtn.title = t("interface.phrasesMoveUp");
    upBtn.setAttribute("aria-label", t("interface.phrasesMoveUp"));
    upBtn.disabled = index === 0;
    upBtn.addEventListener("click", async () => {
      if (index === 0) return;
      try {
        const s = await invoke("get_settings");
        const alive = aliveSortedPhrases(parsePhrasesJson(s.quick_phrases_json));
        const tmp = alive[index - 1];
        alive[index - 1] = alive[index];
        alive[index] = tmp;
        const nowUp = Date.now();
        alive.forEach((p, i) => {
          p.order = i;
          p.updatedAt = nowUp;
        });
        await persistPhrasesFromSettings(
          mergePhraseLists(parsePhrasesJson(s.quick_phrases_json), alive),
          alive.map((p) => p.id),
        );
        await renderPhraseManageList();
      } catch (e) {
        showNote("note", t("save.fail", { error: String(e) }), 4000);
      }
    });

    const downBtn = document.createElement("button");
    downBtn.type = "button";
    downBtn.className = "secondary";
    downBtn.textContent = "↓";
    downBtn.title = t("interface.phrasesMoveDown");
    downBtn.setAttribute("aria-label", t("interface.phrasesMoveDown"));
    downBtn.disabled = index >= list.length - 1;
    downBtn.addEventListener("click", async () => {
      try {
        const s = await invoke("get_settings");
        const alive = aliveSortedPhrases(parsePhrasesJson(s.quick_phrases_json));
        if (index >= alive.length - 1) return;
        const tmp2 = alive[index + 1];
        alive[index + 1] = alive[index];
        alive[index] = tmp2;
        const nowDown = Date.now();
        alive.forEach((p, i) => {
          p.order = i;
          p.updatedAt = nowDown;
        });
        await persistPhrasesFromSettings(
          mergePhraseLists(parsePhrasesJson(s.quick_phrases_json), alive),
          alive.map((p) => p.id),
        );
        await renderPhraseManageList();
      } catch (e) {
        showNote("note", t("save.fail", { error: String(e) }), 4000);
      }
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "danger";
    delBtn.textContent = t("interface.phrasesDelete");
    delBtn.addEventListener("click", async () => {
      try {
        const s = await invoke("get_settings");
        const nowDel = Date.now();
        const tomb = {
          id: phrase.id,
          text: String(phrase.text || ""),
          order: Number(phrase.order) || 0,
          updatedAt: nowDel,
          deletedAt: nowDel,
        };
        await persistPhrasesFromSettings(
          mergePhraseLists(parsePhrasesJson(s.quick_phrases_json), [tomb]),
          [tomb.id],
        );
        await renderPhraseManageList();
      } catch (e) {
        showNote("note", t("save.fail", { error: String(e) }), 4000);
      }
    });

    actions.appendChild(upBtn);
    actions.appendChild(downBtn);
    actions.appendChild(delBtn);
    row.appendChild(ta);
    row.appendChild(actions);
    bodyEl.appendChild(row);
  });
}

async function openPhraseManageModal() {
  const modal = document.getElementById("phrase-manage-modal");
  if (!modal) return;
  modal.hidden = false;
  await renderPhraseManageList();
  try {
    document.getElementById("phrase-manage-new")?.focus();
  } catch (_) {}
}

function wirePhraseManageModal() {
  const openBtn = document.getElementById("waqp-phrase-settings");
  if (openBtn) {
    openBtn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      openPhraseManageModal().catch((e) => {
        showNote("note", t("save.fail", { error: String(e) }), 4000);
      });
    });
  }
  const modal = document.getElementById("phrase-manage-modal");
  const closeBtn = document.getElementById("phrase-manage-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", (ev) => {
      ev.preventDefault();
      closePhraseManageModal();
    });
  }
  if (modal) {
    modal.addEventListener("click", (ev) => {
      if (ev.target === modal) closePhraseManageModal();
    });
  }
  const addBtn = document.getElementById("phrase-manage-add");
  const newTa = document.getElementById("phrase-manage-new");
  const doAdd = async () => {
    const text = String(newTa?.value || "").trim();
    if (!text) return;
    try {
      const s = await invoke("get_settings");
      const full = normalizePhraseList(parsePhrasesJson(s.quick_phrases_json));
      const item = {
        id: phraseUid(),
        text,
        order: aliveSortedPhrases(full).length,
        updatedAt: Date.now(),
      };
      if (newTa) newTa.value = "";
      await persistPhrasesFromSettings(mergePhraseLists(full, [item]), [item.id]);
      await renderPhraseManageList();
      try {
        newTa?.focus();
      } catch (_) {}
    } catch (e) {
      showNote("note", t("save.fail", { error: String(e) }), 4000);
    }
  };
  if (addBtn) {
    addBtn.addEventListener("click", (ev) => {
      ev.preventDefault();
      doAdd();
    });
  }
  if (newTa) {
    newTa.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
        ev.preventDefault();
        doAdd();
      }
    });
  }
  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape") return;
    const m = document.getElementById("phrase-manage-modal");
    if (!m || m.hidden) return;
    ev.preventDefault();
    closePhraseManageModal();
  });
}

// --- Shortcut recorder ---

let recordingHotkey = false;
let hotkeyPrev = "";
const MODIFIER_KEYS = new Set(["Control", "Shift", "Alt", "Meta"]);

function setHotkeyHint(msg) {
  const hint = document.getElementById("hotkey_hint");
  if (!msg) { hint.hidden = true; hint.textContent = ""; }
  else { hint.textContent = msg; hint.hidden = false; }
}

function stopRecording(restore) {
  if (!recordingHotkey) return;
  recordingHotkey = false;
  window.removeEventListener("keydown", onRecordKeydown, true);
  window.removeEventListener("blur", onRecordBlur, true);
  const btn = document.getElementById("record_hotkey");
  btn.textContent = t("preferences.record");
  btn.classList.remove("recording");
  if (restore) document.getElementById("hotkey").value = hotkeyPrev;
}

function onRecordBlur() { setHotkeyHint(""); stopRecording(true); }

function onRecordKeydown(e) {
  e.preventDefault();
  e.stopPropagation();
  if (MODIFIER_KEYS.has(e.key)) return;            // ignore bare modifiers
  if (e.key === "Escape") { setHotkeyHint(""); stopRecording(true); return; }
  const mods = { ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey };
  const accel = window.HotkeyFmt.comboToAccelerator(mods, e.code);
  if (accel === null) { setHotkeyHint(t("preferences.hintUnsupported")); return; }
  if (!window.HotkeyFmt.isValidCombo(mods, e.code)) {
    setHotkeyHint(t("preferences.hintModifier"));
    return;
  }
  document.getElementById("hotkey").value = accel;
  setHotkeyHint("");
  stopRecording(false);
}

function toggleRecording() {
  if (recordingHotkey) { setHotkeyHint(""); stopRecording(true); return; }
  recordingHotkey = true;
  hotkeyPrev = document.getElementById("hotkey").value;
  const btn = document.getElementById("record_hotkey");
  btn.textContent = t("preferences.recording");
  btn.classList.add("recording");
  setHotkeyHint("");
  window.addEventListener("keydown", onRecordKeydown, true);
  window.addEventListener("blur", onRecordBlur, true);
}
