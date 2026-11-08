 */
(function () {
  "use strict";
  if (window.__WhatsNowAiSuggestInstalled) return;
  window.__WhatsNowAiSuggestInstalled = true;

  var SUGGEST_CSS = ".wa-ai-suggest-reply-btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 4px;\n  margin: 0 4px 3px 0;\n  padding: 2px 8px;\n  border: 1px solid rgba(0, 0, 0, 0.12);\n  border-radius: 12px;\n  background: rgba(37, 211, 102, 0.1);\n  color: #128c7e;\n  font-size: 11px;\n  line-height: 1.2;\n  cursor: pointer;\n  user-select: none;\n  white-space: nowrap;\n  box-sizing: border-box;\n  flex-shrink: 0;\n  vertical-align: middle;\n  align-self: center;\n}\n\n.wa-ai-suggest-reply-btn .wa-ai-suggest-icon {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  line-height: 0;\n  flex-shrink: 0;\n}\n\n.wa-ai-suggest-reply-btn .wa-ai-suggest-icon svg {\n  display: block;\n  width: 10px;\n  height: 10px;\n}\n\n.wa-ai-suggest-reply-btn:hover {\n  background: rgba(37, 211, 102, 0.18);\n  border-color: rgba(18, 140, 126, 0.35);\n}\n\n.wa-ai-suggest-reply-btn:disabled {\n  opacity: 0.65;\n  cursor: wait;\n}\n\n.wa-ai-suggest-reply-btn.is-loading {\n  pointer-events: none;\n}\n\n.dark .wa-ai-suggest-reply-btn {\n  background: rgba(37, 211, 102, 0.14);\n  border-color: rgba(233, 237, 239, 0.16);\n  color: #25d366;\n}\n\n.dark .wa-ai-suggest-reply-btn:hover {\n  background: rgba(37, 211, 102, 0.22);\n  border-color: rgba(37, 211, 102, 0.4);\n}\n\n/* AI\u5206\u6790\u6309\u94ae\uff08\u4e0e\u63a8\u8350\u56de\u590d\u5e76\u5217\uff09 */\n.wa-ai-explain-btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 4px;\n  margin: 0 4px 3px 0;\n  padding: 2px 8px;\n  border: 1px solid rgba(0, 0, 0, 0.12);\n  border-radius: 12px;\n  background: rgba(53, 120, 229, 0.1);\n  color: #2a6fdb;\n  font-size: 11px;\n  line-height: 1.2;\n  cursor: pointer;\n  user-select: none;\n  white-space: nowrap;\n  box-sizing: border-box;\n  flex-shrink: 0;\n  vertical-align: middle;\n  align-self: center;\n}\n\n.wa-ai-explain-btn .wa-ai-explain-icon {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  line-height: 0;\n  flex-shrink: 0;\n}\n\n.wa-ai-explain-btn .wa-ai-explain-icon svg {\n  display: block;\n  width: 10px;\n  height: 10px;\n}\n\n.wa-ai-explain-btn:hover {\n  background: rgba(53, 120, 229, 0.18);\n  border-color: rgba(42, 111, 219, 0.35);\n}\n\n.wa-ai-explain-btn:disabled {\n  opacity: 0.65;\n  cursor: wait;\n}\n\n.wa-ai-explain-btn.is-loading {\n  pointer-events: none;\n}\n\n.dark .wa-ai-explain-btn {\n  background: rgba(83, 160, 255, 0.14);\n  border-color: rgba(233, 237, 239, 0.16);\n  color: #7ab8ff;\n}\n\n.dark .wa-ai-explain-btn:hover {\n  background: rgba(83, 160, 255, 0.22);\n  border-color: rgba(122, 184, 255, 0.4);\n}\n\n/* AI\u63a8\u8350\u56de\u590d\u9009\u62e9\u5f39\u7a97 */\n.wa-ai-suggest-overlay {\n  position: fixed;\n  inset: 0;\n  z-index: 2147483646;\n  background: rgba(11, 20, 26, 0.45);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: 16px;\n  box-sizing: border-box;\n}\n\n.wa-ai-suggest-modal {\n  width: min(440px, 92vw);\n  max-height: min(80vh, 640px);\n  overflow: visible;\n  background: #fff;\n  color: #111b21;\n  border-radius: 14px;\n  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.28);\n  font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif;\n  display: flex;\n  flex-direction: column;\n}\n\n.wa-ai-suggest-modal.is-loading .wa-ai-suggest-modal-body {\n  display: none;\n}\n\n.wa-ai-suggest-modal-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 12px;\n  padding: 14px 16px 10px;\n  position: relative;\n  z-index: 3;\n  flex-shrink: 0;\n  overflow: visible;\n}\n\n.wa-ai-suggest-modal-actions {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 2px;\n  flex-shrink: 0;\n  position: relative;\n  line-height: 0;\n}\n\n.wa-ai-suggest-modal .wa-ai-suggest-settings {\n  position: relative;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  line-height: 0;\n}\n\n.wa-ai-suggest-modal .wa-ai-suggest-settings > .wa-fu-icon-btn {\n  width: 32px;\n  height: 32px;\n  padding: 0;\n  margin: 0;\n  line-height: 0;\n  color: #667781;\n}\n\n.wa-ai-suggest-modal .wa-ai-suggest-settings > .wa-fu-icon-btn svg {\n  display: block;\n  width: 18px;\n  height: 18px;\n  flex-shrink: 0;\n}\n\n.wa-ai-suggest-modal .wa-ai-suggest-settings > .wa-fu-icon-btn:hover {\n  color: #111b21;\n}\n\n.wa-ai-suggest-modal .wa-fu-settings__panel {\n  z-index: 20;\n  line-height: normal;\n  width: min(280px, calc(100vw - 48px));\n  max-height: min(70vh, 440px);\n  overflow-y: auto;\n}\n\n.wa-fu-settings__title--section {\n  margin-top: 8px;\n  padding-top: 10px;\n  border-top: 1px solid var(--fu-line, rgba(0, 0, 0, 0.08));\n}\n\n.wa-ai-suggest-modal-title {\n  margin: 0;\n  font-size: 16px;\n  font-weight: 650;\n  line-height: 1.3;\n}\n\n.wa-ai-suggest-modal-close {\n  border: none;\n  background: transparent;\n  color: #667781;\n  width: 32px;\n  height: 32px;\n  padding: 0;\n  margin: 0;\n  border-radius: 50%;\n  cursor: pointer;\n  line-height: 0;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  flex-shrink: 0;\n  box-sizing: border-box;\n}\n\n.wa-ai-suggest-modal-close svg {\n  display: block;\n  width: 18px;\n  height: 18px;\n  flex-shrink: 0;\n}\n\n.wa-ai-suggest-modal-close:hover {\n  background: rgba(0, 0, 0, 0.06);\n  color: #111b21;\n}\n\n.wa-ai-suggest-modal-hint {\n  margin: 0;\n  padding: 0 16px 14px;\n  font-size: 13px;\n  color: #667781;\n  position: relative;\n  z-index: 1;\n}\n\n.wa-ai-suggest-modal.is-loading .wa-ai-suggest-modal-hint:not(.is-error) {\n  animation: wa-ai-suggest-pulse 1.6s ease-in-out infinite;\n}\n\n.wa-ai-suggest-dots::after {\n  content: '';\n  display: inline-block;\n  width: 1.2em;\n  text-align: left;\n  animation: wa-ai-suggest-dots 1.4s infinite;\n}\n\n@keyframes wa-ai-suggest-dots {\n  0%, 20% { content: ''; }\n  21%, 40% { content: '.'; }\n  41%, 60% { content: '..'; }\n  61%, 100% { content: '...'; }\n}\n\n@keyframes wa-ai-suggest-pulse {\n  0%, 100% { opacity: 1; }\n  50% { opacity: 0.5; }\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .wa-ai-suggest-modal.is-loading .wa-ai-suggest-modal-hint:not(.is-error),\n  .wa-ai-suggest-dots::after {\n    animation: none;\n  }\n  .wa-ai-suggest-dots::after {\n    content: '...';\n  }\n}\n\n.wa-ai-suggest-modal-hint.is-error {\n  color: #c0392b;\n}\n\n.wa-ai-suggest-modal-body {\n  padding: 0 12px 14px;\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  overflow: auto;\n  flex: 1 1 auto;\n  min-height: 0;\n  position: relative;\n  z-index: 1;\n}\n\n.wa-ai-suggest-option {\n  display: block;\n  width: 100%;\n  text-align: left;\n  border: 1px solid #e9edef;\n  background: #f0f2f5;\n  color: inherit;\n  border-radius: 12px;\n  padding: 10px 12px;\n  cursor: pointer;\n  box-sizing: border-box;\n}\n\n.wa-ai-suggest-option:hover {\n  border-color: #25d366;\n  background: rgba(37, 211, 102, 0.1);\n}\n\n.wa-ai-suggest-option-index {\n  display: inline-block;\n  font-size: 11px;\n  font-weight: 650;\n  color: #128c7e;\n  margin-bottom: 4px;\n}\n\n.wa-ai-suggest-option-text {\n  display: block;\n  font-size: 14px;\n  line-height: 1.5;\n  white-space: pre-wrap;\n  word-break: break-word;\n}\n\n.dark .wa-ai-suggest-modal {\n  background: #202c33;\n  color: #e9edef;\n}\n\n.dark .wa-ai-suggest-modal-close {\n  color: #8696a0;\n}\n\n.dark .wa-ai-suggest-modal-close:hover {\n  background: rgba(255, 255, 255, 0.08);\n  color: #e9edef;\n}\n\n.dark .wa-ai-suggest-modal .wa-ai-suggest-settings > .wa-fu-icon-btn {\n  color: #8696a0;\n}\n\n.dark .wa-ai-suggest-modal .wa-ai-suggest-settings > .wa-fu-icon-btn:hover {\n  background: rgba(255, 255, 255, 0.08);\n  color: #e9edef;\n}\n\n.dark .wa-ai-suggest-modal-hint {\n  color: #8696a0;\n}\n\n.dark .wa-ai-suggest-modal-hint.is-error {\n  color: #ff8b81;\n}\n\n.dark .wa-ai-suggest-option {\n  background: #111b21;\n  border-color: #2a3942;\n  color: #e9edef;\n}\n\n.dark .wa-ai-suggest-option:hover {\n  border-color: #25d366;\n  background: rgba(37, 211, 102, 0.12);\n}\n.wa-fu {\n  --fu-bg: #ffffff;\n  --fu-bg-elevated: #ffffff;\n  --fu-surface: #f4f6f7;\n  --fu-surface-2: #eef1f3;\n  --fu-text: #111b21;\n  --fu-muted: #667781;\n  --fu-line: rgba(17, 27, 33, 0.08);\n  --fu-line-strong: rgba(17, 27, 33, 0.14);\n  --fu-accent: #008069;\n  --fu-accent-strong: #006d5b;\n  --fu-accent-soft: rgba(0, 128, 105, 0.12);\n  --fu-danger: #d14b4b;\n  --fu-danger-soft: rgba(209, 75, 75, 0.1);\n  --fu-shadow: 0 8px 28px rgba(11, 20, 26, 0.16);\n  --fu-card-shadow: 0 1px 2px rgba(11, 20, 26, 0.04);\n  --fu-card-shadow-hover: 0 2px 8px rgba(11, 20, 26, 0.08);\n  --fu-radius: 16px;\n  --fu-font: \"Segoe UI\", system-ui, -apple-system, BlinkMacSystemFont, \"Helvetica Neue\", Arial, sans-serif;\n  --fu-ease: cubic-bezier(0.22, 1, 0.36, 1);\n  color: var(--fu-text);\n  font-family: var(--fu-font);\n  -webkit-font-smoothing: antialiased;\n}\n\n.wa-fu.wa-fu--dark,\nbody.dark .wa-fu,\nhtml[data-color-mode=\"dark\"] .wa-fu {\n  --fu-bg: #111b21;\n  --fu-bg-elevated: #1a242b;\n  --fu-surface: #1f2c33;\n  --fu-surface-2: #253238;\n  --fu-text: #e9edef;\n  --fu-muted: #8696a0;\n  --fu-line: rgba(233, 237, 239, 0.1);\n  --fu-line-strong: rgba(233, 237, 239, 0.18);\n  --fu-accent: #00a884;\n  --fu-accent-strong: #02c497;\n  --fu-accent-soft: rgba(0, 168, 132, 0.16);\n  --fu-danger: #ef6b6b;\n  --fu-danger-soft: rgba(239, 107, 107, 0.14);\n  --fu-shadow: 0 12px 36px rgba(0, 0, 0, 0.45);\n  --fu-card-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);\n  --fu-card-shadow-hover: 0 3px 10px rgba(0, 0, 0, 0.32);\n}\n\n.wa-fu-icon-btn {\n  appearance: none;\n  border: none;\n  background: transparent;\n  color: #54656f;\n  width: 40px;\n  height: 40px;\n  border-radius: 50%;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  cursor: pointer;\n  transition: background-color 0.18s ease, color 0.18s ease, transform 0.18s var(--fu-ease);\n  -webkit-tap-highlight-color: transparent;\n}\n\n.wa-fu-icon-btn:hover { background: rgba(0, 0, 0, 0.06); }\n.wa-fu-icon-btn:active { transform: scale(0.96); }\n\n.wa-fu-icon-btn--ghost {\n  width: 34px;\n  height: 34px;\n  color: var(--fu-muted);\n}\n\n.wa-fu-icon-btn--danger {\n  width: 30px;\n  height: 30px;\n  color: var(--fu-muted);\n  opacity: 0;\n  transition: opacity 0.16s ease, background-color 0.16s ease, color 0.16s ease;\n}\n\n.wa-fu-icon-btn--soft {\n  width: 30px;\n  height: 30px;\n  opacity: 0;\n  transition: opacity 0.16s ease, background-color 0.16s ease, color 0.16s ease;\n}\n\n.wa-fu-item:hover .wa-fu-icon-btn--danger,\n.wa-fu-item:focus-within .wa-fu-icon-btn--danger,\n.wa-fu-item:hover .wa-fu-icon-btn--soft,\n.wa-fu-item:focus-within .wa-fu-icon-btn--soft { opacity: 1; }\n\n.wa-fu-icon-btn--danger:hover {\n  background: var(--fu-danger-soft);\n  color: var(--fu-danger);\n}\n\n.wa-fu--dark .wa-fu-icon-btn,\nbody.dark .wa-followup-todo-btn,\nhtml[data-color-mode=\"dark\"] .wa-followup-todo-btn { color: #aebac1; }\n.wa-fu-settings {\n  position: relative;\n}\n\n.wa-fu-settings__panel {\n  position: absolute;\n  top: calc(100% + 6px);\n  right: 0;\n  z-index: 5;\n  width: min(260px, calc(100vw - 48px));\n  padding: 10px;\n  border-radius: 12px;\n  background: var(--fu-bg-elevated);\n  border: 1px solid var(--fu-line);\n  box-shadow: var(--fu-shadow);\n}\n\n.wa-fu-settings__panel[hidden] { display: none !important; }\n\n.wa-fu-settings__title {\n  font-size: 11px;\n  font-weight: 700;\n  color: var(--fu-muted);\n  letter-spacing: 0.02em;\n  padding: 2px 6px 8px;\n}\n\n.wa-fu-settings__option {\n  appearance: none;\n  width: 100%;\n  text-align: left;\n  border: 1px solid transparent;\n  background: transparent;\n  color: var(--fu-text);\n  border-radius: 10px;\n  padding: 9px 10px;\n  cursor: pointer;\n  transition: background-color 0.16s ease, border-color 0.16s ease;\n}\n\n.wa-fu-settings__option + .wa-fu-settings__option { margin-top: 4px; }\n\n.wa-fu-settings__option:hover {\n  background: var(--fu-surface);\n}\n\n.wa-fu-settings__option.is-active {\n  background: var(--fu-accent-soft);\n  border-color: transparent;\n}\n\n.wa-fu-settings__option-label {\n  font-size: 13px;\n  font-weight: 700;\n}\n\n.wa-fu-settings__option-hint {\n  margin-top: 2px;\n  font-size: 11px;\n  color: var(--fu-muted);\n  line-height: 1.35;\n}\n\n.wa-fu-settings__option.is-active .wa-fu-settings__option-label {\n  color: var(--fu-accent-strong);\n}\n.wa-ai-suggest-reply-btn {\n  pointer-events: auto !important;\n  position: relative;\n  z-index: 2;\n}\n.wa-ai-suggest-overlay {\n  position: fixed !important;\n  inset: 0 !important;\n  z-index: 2147483646 !important;\n  display: flex !important;\n  align-items: center !important;\n  justify-content: center !important;\n}";
  function ensureSuggestStyle() {
    try {
      var st = document.getElementById("whatsnow-ai-suggest-style");
      if (!st) {
        st = document.createElement("style");
        st.id = "whatsnow-ai-suggest-style";
        (document.head || document.documentElement).appendChild(st);
      }
      if (st.textContent !== SUGGEST_CSS) st.textContent = SUGGEST_CSS;
      return true;
    } catch (_) { return false; }
  }
  ensureSuggestStyle();

  function bootSuggest() {
    ensureSuggestStyle();
    var H = window.__whatsnowAiHelpers || {};
    var W = { helpers: H, can: function (cap) {
      try { return !!(window.__whatsnowCan && window.__whatsnowCan(cap)); } catch (_) { return false; }
    } };
    var normalizeUiLang = H.normalizeUiLang || function (x) { return x || "zh"; };
    var tPage = H.tPage || function (_l, _k, fb) { return fb; };
    var tPageFill = H.tPageFill || function (l, k, fb, vars) {
      var s = tPage(l, k, fb);
      if (vars && typeof vars === "object") Object.keys(vars).forEach(function (kk) {
        s = String(s).split("{" + kk + "}").join(String(vars[kk]));
      });
      return s;
    };
    var showNoTitleNotice = H.showNoTitleNotice || function (msg) { try { if (window.__whatsnowNotice) window.__whatsnowNotice(msg); else if (window.__whatsnowAlert) window.__whatsnowAlert(msg); else if (window.appAlert) window.appAlert(msg); else alert(msg); } catch (_) {} };
    var checkHasCapabilityRealtime = H.checkHasCapabilityRealtime || function (cap, cb) { cb(!!(W.can && W.can(cap))); };
    var checkIsProRealtime = H.checkIsProRealtime || function (cb) {
      cb(!!(W.can && (W.can("ai_suggest") || W.can("ai_proxy"))));
    };
    var collectWaAiExplainContext = H.collectWaAiExplainContext || function () { return []; };
    var getWaAiExplainConversationRoot = H.getWaAiExplainConversationRoot || function () { return null; };
    var getWaAiExplainChatMessageRows = H.getWaAiExplainChatMessageRows || function () { return []; };
    var getWaAiExplainMsgDirection = H.getWaAiExplainMsgDirection || function () { return "unknown"; };
    var getWaAiExplainOriginalTextForMsg = H.getWaAiExplainOriginalTextForMsg || function () { return ""; };
    var extractWaAiExplainMessageText = H.extractWaAiExplainMessageText || function () { return ""; };
    var waAiMsgToolbar = H.waAiMsgToolbar || { register: function () {}, schedule: function () {} };
    var getNativeComposerElement = H.getNativeComposerElement || function () { return null; };
    var pasteReplaceText = H.pasteReplaceText || async function () {};
    var currentUiLang = (typeof H.getUiLang === "function" ? H.getUiLang() : "zh");
    function getCurrentUserSourceLang() {
      try {
        var s = window.userSourceLang || (window.__whatsnowTranslateCfg && window.__whatsnowTranslateCfg.sourceLang) || "zh-CN";
        if (!s || s === "auto") return "zh-CN";
        return String(s);
      } catch (_) { return "zh-CN"; }
    }

(function initAiSuggestReply() {
  const BTN_CLASS = 'wa-ai-suggest-reply-btn';
  const BTN_ATTR = 'data-wa-ai-suggest';
  const ENABLED_KEY = 'aiSuggestReplyEnabled';
  const ENGINE_KEY = 'aiSuggestReplyEngine';
  const SUGGEST_ENGINES = ['chatgpt', 'openai_custom', 'deepseek_custom', 'deepseek', 'volc_deepseek'];
  const DEFAULT_SUGGEST_ENGINE = 'volc_deepseek';
  const SETTINGS_ICON =
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M10.82 22c-.45 0-.83-.15-1.16-.45a1.9 1.9 0 0 1-.59-1.1l-.22-1.65a3.79 3.79 0 0 1-.61-.3c-.2-.12-.38-.24-.57-.38l-1.55.65c-.41.19-.83.2-1.25.05a1.84 1.84 0 0 1-.97-.8l-1.18-2.04c-.23-.39-.3-.8-.2-1.23.1-.43.33-.8.68-1.07l1.32-1a2.39 2.39 0 0 1-.02-.34v-.68c0-.1 0-.22.02-.34l-1.32-1a1.9 1.9 0 0 1-.68-1.07c-.1-.43-.03-.84.2-1.22L3.9 5.98c.23-.39.56-.66.97-.8.42-.15.84-.14 1.25.04l1.55.66a6.82 6.82 0 0 1 1.18-.68l.22-1.65c.07-.43.27-.8.6-1.1.32-.3.7-.45 1.15-.45h2.36c.45 0 .83.15 1.16.45.32.3.52.67.59 1.1l.22 1.65a5.5 5.5 0 0 1 1.17.68l1.55-.66c.42-.18.84-.2 1.25-.04.42.15.75.41.98.8l1.17 2.04c.24.39.3.8.2 1.23-.1.43-.32.8-.67 1.07l-1.32 1 .02.34v.68c0 .1-.02.22-.05.34l1.32 1c.36.28.58.64.68 1.07.1.43.03.84-.2 1.22l-1.2 2.05c-.23.39-.56.66-.98.8-.41.16-.83.14-1.25-.05l-1.5-.64a6.84 6.84 0 0 1-1.17.67l-.22 1.65c-.07.43-.27.8-.6 1.1-.32.3-.7.45-1.15.45h-2.36Zm.18-2h1.97l.35-2.65a5.6 5.6 0 0 0 2.65-1.53l2.48 1.03.98-1.7-2.16-1.63c.09-.23.15-.47.18-.73a6.15 6.15 0 0 0 0-1.58c-.03-.26-.1-.5-.18-.74l2.16-1.62-.98-1.7-2.47 1.05a5.56 5.56 0 0 0-2.66-1.55L13 4h-1.97l-.35 2.65a5.6 5.6 0 0 0-2.66 1.53L5.55 7.15l-.98 1.7 2.15 1.6a6.06 6.06 0 0 0 0 3.08l-2.15 1.62.98 1.7 2.47-1.05a5.55 5.55 0 0 0 2.66 1.55L11 20Z"/><path fill="currentColor" fill-rule="evenodd" d="M12 13.5c.44 0 .75-.13 1.06-.44.3-.3.44-.62.44-1.06 0-.44-.13-.75-.44-1.06-.3-.3-.62-.44-1.06-.44-.46 0-.78.14-1.06.43-.3.3-.44.63-.44 1.07 0 .44.13.76.44 1.07.28.3.6.43 1.06.43Zm2.47.97A3.37 3.37 0 0 1 12 15.5c-.98 0-1.81-.34-2.49-1.03A3.4 3.4 0 0 1 8.5 12c0-.97.34-1.8 1.01-2.47A3.36 3.36 0 0 1 12 8.5c.97 0 1.8.34 2.47 1.03.69.68 1.03 1.5 1.03 2.47 0 .97-.34 1.8-1.03 2.47Z" clip-rule="evenodd"/></svg>';
  let mountTimer = null;
  let suggestInFlight = false;
  let lastMountedMsgId = '';
  let featureEnabled = true;
  let suggestEngine = DEFAULT_SUGGEST_ENGINE;
  let settingsOutsideHandler = null;

  function ui() {
    return normalizeUiLang(typeof currentUiLang === 'string' ? currentUiLang : 'zh');
  }

  function t(key, fallbackZh, fallbackEn) {
    const lang = ui();
    const fb = lang === 'zh' ? fallbackZh : (fallbackEn || fallbackZh);
    return tPage(lang, key, fb);
  }

  function tFill(key, fallbackZh, fallbackEn, vars) {
    const lang = ui();
    const fb = lang === 'zh' ? fallbackZh : (fallbackEn || fallbackZh);
    return tPageFill(lang, key, fb, vars);
  }

  function isFeatureEnabledValue(v) {
    return v !== false;
  }

  function applyFeatureEnabled(enabled, opts) {
    const next = !!enabled;
    const changed = featureEnabled !== next;
    featureEnabled = next;
    if (!featureEnabled) {
      removeAllSuggestButtons(null);
      lastMountedMsgId = '';
      closeSuggestModal();
      if (opts && opts.notify) {
        showSuggestToast(
          t('suggestFeatureOff', '已关闭 AI 推荐回复，可在功能设置中重新开启', 'AI Suggest Reply turned off. Re-enable it in feature settings.'),
          false
        );
      }
    } else if (changed || (opts && opts.forceMount)) {
      scheduleMount();
    }
  }

  function setFeatureEnabled(enabled) {
    const next = !!enabled;
    return new Promise((resolve) => {
      try { localStorage.setItem(ENABLED_KEY, next ? '1' : '0'); } catch (_) {}
      applyFeatureEnabled(next, { notify: !next });
      resolve(next);
    });
  }

  function normalizeSuggestEngine(v) {
    const id = String(v || '').trim();
    return SUGGEST_ENGINES.includes(id) ? id : DEFAULT_SUGGEST_ENGINE;
  }

  function getSuggestEngineLabel(engine) {
    const id = normalizeSuggestEngine(engine);
    if (id === 'chatgpt') return t('suggestEngineChatgpt', 'ChatGPT', 'ChatGPT');
    if (id === 'openai_custom') return t('suggestEngineOpenaiCustom', 'OpenAI自定义', 'OpenAI Custom');
    if (id === 'deepseek_custom') return t('suggestEngineDeepseekCustom', 'Deepseek自定义', 'Deepseek Custom');
    if (id === 'deepseek') return t('suggestEngineDeepseek', 'Deepseek', 'Deepseek');
    return t('suggestEngineVolcDeepseek', '火山Deepseek', 'Volc Deepseek');
  }

  function applySuggestEngine(engine) {
    suggestEngine = normalizeSuggestEngine(engine);
    try { syncSuggestSettingsUi(); } catch (_) {}
  }

  function setSuggestEngine(engine) {
    const next = normalizeSuggestEngine(engine);
    return new Promise((resolve) => {
      try { localStorage.setItem(ENGINE_KEY, next); } catch (_) {}
      applySuggestEngine(next);
      resolve(next);
    });
  }

  function ensureSuggestEngineReady(engine) {
    const id = normalizeSuggestEngine(engine);
    return new Promise((resolve) => {
      try {
        const cfg = window.__whatsnowTranslateCfg || window.__whatsnowTranslateBoot || {};
        if (id === 'chatgpt') {
          const key = String(cfg.chatgptApiKey || '').trim();
          if (key) resolve({ ok: true, engine: id });
          else resolve({ ok: false, error: t('suggestEngineNeedChatgptKey', '请先填写 ChatGPT API Key', 'Please set ChatGPT API Key first') });
          return;
        }
        if (id === 'openai_custom') {
          const key = String(cfg.openaiCustomApiKey || '').trim();
          const apiUrl = String(cfg.openaiCustomApiUrl || '').trim();
          const model = String(cfg.openaiCustomModel || '').trim();
          if (key && apiUrl && model) resolve({ ok: true, engine: id });
          else resolve({
            ok: false,
            error: t('suggestEngineNeedOpenaiCustom', '请先在设置中填写 OpenAI自定义 的接口地址、模型与 API Key。', 'Please configure OpenAI Custom URL, model and API Key in settings.')
          });
          return;
        }
        if (id === 'deepseek_custom') {
          const key = String(cfg.deepseekCustomApiKey || '').trim();
          if (key) resolve({ ok: true, engine: id });
          else resolve({
            ok: false,
            error: t('suggestEngineNeedDeepseekCustom', '请先在设置中填写 Deepseek自定义 API Key。', 'Please enter a Deepseek Custom API Key in settings.')
          });
          return;
        }
        resolve({ ok: true, engine: id });
      } catch (_) {
        resolve({ ok: false, error: t('suggestFailedRetry', 'AI推荐回复失败，请稍后重试', 'AI suggest reply failed, please retry') });
      }
    });
  }

  function loadFeatureEnabled() {
    try {
      var en = localStorage.getItem(ENABLED_KEY);
      var eng = localStorage.getItem(ENGINE_KEY);
      applySuggestEngine(eng);
      applyFeatureEnabled(isFeatureEnabledValue(en === null ? true : en === '1'), { forceMount: true });
    } catch (_) {
      featureEnabled = true;
      suggestEngine = DEFAULT_SUGGEST_ENGINE;
    }
  }

  

  try {
    window.__waUiLangChangeHooks = window.__waUiLangChangeHooks || [];
    window.__waUiLangChangeHooks.push(() => {
      lastMountedMsgId = '';
      closeSuggestModal();
      removeAllSuggestButtons(null);
      scheduleMount();
    });
  } catch (_) {}

  // 与 OpenAI自定义 / AI分析 共用同一套 DOM 与上下文收集（含屏幕垂直排序、连发窗）
  function getConversationMessagesRoot() {
    return getWaAiExplainConversationRoot();
  }

  function getChatMessageRows(root) {
    return getWaAiExplainChatMessageRows(root);
  }

  function getMsgDirection(msgEl) {
    return getWaAiExplainMsgDirection(msgEl);
  }

  function extractMessageText(msgEl) {
    return getWaAiExplainOriginalTextForMsg(msgEl) || extractWaAiExplainMessageText(msgEl);
  }

  function collectSuggestChatContext(anchorEl) {
    const hint = anchorEl
      ? (getWaAiExplainOriginalTextForMsg(anchorEl) || extractWaAiExplainMessageText(anchorEl) || '')
      : '';
    try {
      // 拆分后上下文收集在 content-translate-visible；点击时读最新 helpers，避免初始化竞态
      const helpers = (window.__whatsnowAiHelpers) || H || {};
      if (typeof helpers.collectChatHistoryTranslateContext === 'function') {
        return helpers.collectChatHistoryTranslateContext(anchorEl, hint) || [];
      }
      const collectExplain = (typeof helpers.collectWaAiExplainContext === 'function')
        ? helpers.collectWaAiExplainContext
        : collectWaAiExplainContext;
      const items = (typeof collectExplain === 'function' ? collectExplain(anchorEl, hint) : []) || [];
      return items
        .map((m) => ({
          role: m && m.role === 'me' ? 'me' : 'them',
          text: m && m.text != null ? String(m.text).trim() : '',
          el: (m && m.el) || null,
          id: m && m.id != null ? String(m.id) : ''
        }))
        .filter((m) => m.text);
    } catch (_) {
      return [];
    }
  }

  function findLastIncomingMessageRow() {
    const rows = getChatMessageRows();
    for (let i = rows.length - 1; i >= 0; i -= 1) {
      const row = rows[i];
      if (getMsgDirection(row) !== 'in') continue;
      if (!extractMessageText(row)) continue;
      return row;
    }
    return null;
  }

  function hasMessageTranslation(msgEl) {
    if (!msgEl || !msgEl.querySelector) return false;
    try {
      const wrapper = msgEl.querySelector('.translated-text');
      if (!wrapper) return false;
      const text = (wrapper.innerText || wrapper.textContent || '').trim();
      return !!text;
    } catch (_) {
      return false;
    }
  }

  function removeAllSuggestButtons(exceptEl) {
    try {
      document.querySelectorAll('.' + BTN_CLASS).forEach((btn) => {
        try {
          if (exceptEl && (btn === exceptEl || exceptEl.contains(btn))) return;
          btn.remove();
        } catch (_) {}
      });
    } catch (_) {}
  }

  function getMsgMeta(msgEl) {
    if (!msgEl) return null;
    try {
      return msgEl.querySelector('[data-testid="msg-meta"]') ||
        (msgEl.closest && msgEl.closest('[data-testid="msg-container"]')
          ? msgEl.closest('[data-testid="msg-container"]').querySelector('[data-testid="msg-meta"]')
          : null);
    } catch (_) {
      return null;
    }
  }

  function placeSuggestButton(msgEl, btn) {
    if (!msgEl || !btn) return false;
    const msgMeta = getMsgMeta(msgEl);
    const retranslateBtn = (msgEl.querySelector && msgEl.querySelector('.wa-retranslate-btn')) || null;
    // 目标：wa-retranslate-btn 左侧（同在 msg-meta 内）
    if (retranslateBtn && retranslateBtn.parentNode) {
      if (btn.nextSibling === retranslateBtn && btn.parentNode === retranslateBtn.parentNode) return true;
      retranslateBtn.parentNode.insertBefore(btn, retranslateBtn);
      return true;
    }
    if (msgMeta) {
      const firstChild = msgMeta.firstChild;
      if (btn.parentNode === msgMeta && (!firstChild || msgMeta.firstChild === btn)) return true;
      if (firstChild && firstChild !== btn) {
        msgMeta.insertBefore(btn, firstChild);
      } else if (btn.parentNode !== msgMeta) {
        msgMeta.appendChild(btn);
      }
      return true;
    }
    const translated = msgEl.querySelector && msgEl.querySelector('.translated-text');
    const fallback = (translated && translated.parentElement)
      || (msgEl.querySelector && msgEl.querySelector('span[data-testid~="selectable-text"]')?.parentElement)
      || msgEl;
    if (fallback && btn.parentNode !== fallback) fallback.appendChild(btn);
    return !!fallback;
  }

  function createSuggestButton() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = BTN_CLASS;
    btn.setAttribute(BTN_ATTR, '1');
    btn.title = t('suggestBtnTitle', '根据双方最近6条聊天内容，通过AI生成3条推荐回复内容', 'Generate 3 AI suggested replies from the last 6 messages');
    btn.setAttribute('aria-label', t('suggestTitle', 'AI推荐回复', 'AI Suggest Reply'));
    btn.innerHTML =
      '<span class="wa-ai-suggest-icon" aria-hidden="true">' +
      '<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="14" height="14">' +
      '<path d="M492.771556 1000.618667h-1.479112a60.472889 60.472889 0 0 1-56.888888-39.822223 894.691556 894.691556 0 0 0-123.562667-258.275555 1141.191111 1141.191111 0 0 0-255.032889-114.403556 59.676444 59.676444 0 0 1-39.367111-54.499555 59.619556 59.619556 0 0 1 35.783111-56.888889 1158.542222 1158.542222 0 0 0 258.844444-138.695111 984.177778 984.177778 0 0 0 124.529778-242.005334 59.904 59.904 0 0 1 55.296-36.920888h1.934222a60.245333 60.245333 0 0 1 55.125334 40.163555 895.488 895.488 0 0 0 110.933333 238.933333 1219.697778 1219.697778 0 0 0 269.937778 138.126223 60.074667 60.074667 0 0 1 36.920889 57.571555 59.733333 59.733333 0 0 1-40.96 54.727111 1093.916444 1093.916444 0 0 0-265.955556 114.232889c-21.788444 21.560889-62.179556 100.067556-110.193778 256a60.472889 60.472889 0 0 1-55.864888 41.756445z m-6.257778-793.201778l-13.596445 29.240889a644.380444 644.380444 0 0 1-97.564444 164.977778A791.210667 791.210667 0 0 1 191.488 512l-34.133333 17.066667 35.555555 14.336c146.773333 59.278222 173.852444 86.186667 182.727111 95.061333a591.246222 591.246222 0 0 1 97.393778 169.927111l16.611556 38.855111 14.961777-39.424a519.452444 519.452444 0 0 1 90.680889-169.301333c9.329778-9.329778 37.717333-37.717333 188.472889-95.459556l38.115556-14.336-36.920889-17.066666a763.221333 763.221333 0 0 1-189.610667-109.795556 550.115556 550.115556 0 0 1-91.022222-164.124444l-12.401778-29.866667-2.730666 0.967111z" fill="currentColor"></path>' +
      '<path d="M1020.928 175.160889a5.347556 5.347556 0 0 1-0.341333 10.012444 431.900444 431.900444 0 0 0-102.4 45.169778 327.168 327.168 0 0 0-43.861334 99.100445 5.347556 5.347556 0 0 1-10.126222 0 361.187556 361.187556 0 0 0-48.469333-99.328 443.733333 443.733333 0 0 0-98.474667-44.942223 5.347556 5.347556 0 0 1-0.341333-9.955555 480.369778 480.369778 0 0 0 98.417778-53.646222 413.980444 413.980444 0 0 0 48.583111-92.501334 5.347556 5.347556 0 0 1 10.012444 0 353.109333 353.109333 0 0 0 43.918222 92.501334 482.588444 482.588444 0 0 0 103.082667 53.589333z" fill="currentColor"></path>' +
      '</svg></span>' +
      '<span class="wa-ai-suggest-label">' + t('suggestTitle', 'AI推荐回复', 'AI Suggest Reply') + '</span>';
    function stopSuggestBubble(ev) {
      try { ev.stopPropagation(); } catch (_) {}
      try { if (ev.stopImmediatePropagation) ev.stopImmediatePropagation(); } catch (_) {}
    }
    btn.addEventListener('mousedown', stopSuggestBubble, true);
    btn.addEventListener('pointerdown', stopSuggestBubble, true);
    btn.addEventListener('click', function (ev) {
      stopSuggestBubble(ev);
      try { ev.preventDefault(); } catch (_) {}
      onSuggestClick(ev);
    }, true);
    return btn;
  }

  function setButtonLoading(btn, loading) {
    if (!btn) return;
    const label = btn.querySelector('.wa-ai-suggest-label');
    if (loading) {
      btn.disabled = true;
      btn.classList.add('is-loading');
      if (label) label.textContent = t('suggestGenerating', '生成中…', 'Generating…');
    } else {
      btn.disabled = false;
      btn.classList.remove('is-loading');
      if (label) label.textContent = t('suggestTitle', 'AI推荐回复', 'AI Suggest Reply');
    }
  }

  function showSuggestToast(text, isError) {
    try {
      const existing = document.getElementById('wa-ai-suggest-toast');
      if (existing) existing.remove();
      const toast = document.createElement('div');
      toast.id = 'wa-ai-suggest-toast';
      toast.textContent = (isError ? '⚠️ ' : '✅ ') + String(text || '');
      Object.assign(toast.style, {
        position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
        background: isError ? 'rgba(180,40,40,0.9)' : 'rgba(0,0,0,0.82)',
        color: '#fff', padding: '10px 22px', borderRadius: '8px', fontSize: '14px',
        zIndex: '2147483647', boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        maxWidth: '80vw', textAlign: 'center', transition: 'opacity 0.4s',
        whiteSpace: 'pre-wrap'
      });
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => { try { toast.remove(); } catch (_) {} }, 500);
      }, isError ? 5000 : 2200);
    } catch (_) {}
  }

  function closeSuggestSettingsPanel() {
    try {
      const panel = document.getElementById('wa-ai-suggest-settings-panel');
      if (panel) panel.hidden = true;
      if (settingsOutsideHandler) {
        document.removeEventListener('mousedown', settingsOutsideHandler, true);
        settingsOutsideHandler = null;
      }
    } catch (_) {}
  }

  function toggleSuggestSettingsPanel(anchor) {
    const panel = document.getElementById('wa-ai-suggest-settings-panel');
    if (!panel) return;
    const willShow = panel.hidden;
    closeSuggestSettingsPanel();
    if (!willShow) return;
    panel.hidden = false;
    syncSuggestSettingsUi();
    settingsOutsideHandler = (ev) => {
      if (!panel || panel.hidden) return;
      if (panel.contains(ev.target)) return;
      if (anchor && anchor.contains && anchor.contains(ev.target)) return;
      closeSuggestSettingsPanel();
    };
    setTimeout(() => document.addEventListener('mousedown', settingsOutsideHandler, true), 0);
  }

  function syncSuggestSettingsUi() {
    const panel = document.getElementById('wa-ai-suggest-settings-panel');
    if (!panel) return;
    panel.querySelectorAll('[data-ai-suggest-enabled]').forEach((row) => {
      const on = row.getAttribute('data-ai-suggest-enabled') === '1';
      const active = on === featureEnabled;
      row.classList.toggle('is-active', active);
      row.setAttribute('aria-checked', active ? 'true' : 'false');
    });
    panel.querySelectorAll('[data-ai-suggest-engine]').forEach((row) => {
      const engine = normalizeSuggestEngine(row.getAttribute('data-ai-suggest-engine'));
      const active = engine === suggestEngine;
      row.classList.toggle('is-active', active);
      row.setAttribute('aria-checked', active ? 'true' : 'false');
    });
  }

  function buildSuggestSettingsControl() {
    const wrap = document.createElement('div');
    wrap.className = 'wa-fu wa-fu-settings wa-ai-suggest-settings';
    try {
      if (document.body && document.body.classList.contains('dark')) {
        wrap.classList.add('wa-fu--dark');
      }
    } catch (_) {}

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'wa-fu-icon-btn wa-fu-icon-btn--ghost';
    btn.setAttribute('aria-label', t('suggestSettings', '功能设置', 'Feature settings'));
    btn.title = t('suggestSettings', '功能设置', 'Feature settings');
    btn.innerHTML = SETTINGS_ICON;
    btn.addEventListener('click', (e) => {
      try { e.preventDefault(); } catch (_) {}
      try { e.stopPropagation(); } catch (_) {}
      toggleSuggestSettingsPanel(wrap);
    });

    const panel = document.createElement('div');
    panel.className = 'wa-fu-settings__panel';
    panel.id = 'wa-ai-suggest-settings-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'menu');
    panel.setAttribute('aria-label', t('suggestSettings', '功能设置', 'Feature settings'));

    const title = document.createElement('div');
    title.className = 'wa-fu-settings__title';
    title.textContent = t('suggestTitle', 'AI推荐回复', 'AI Suggest Reply');
    panel.appendChild(title);

    const options = [
      {
        enabled: true,
        label: t('suggestOn', '开启', 'On'),
        hint: t('suggestOnHint', '在对方消息上显示 AI 推荐回复按钮', 'Show the AI suggest button on incoming messages')
      },
      {
        enabled: false,
        label: t('suggestOff', '关闭', 'Off'),
        hint: t('suggestOffHint', '隐藏按钮；可在功能设置中重新开启', 'Hide the button; re-enable in feature settings')
      }
    ];
    options.forEach((opt) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'wa-fu-settings__option';
      row.setAttribute('role', 'menuitemradio');
      row.setAttribute('data-ai-suggest-enabled', opt.enabled ? '1' : '0');
      row.setAttribute('aria-checked', (opt.enabled === featureEnabled) ? 'true' : 'false');
      if (opt.enabled === featureEnabled) row.classList.add('is-active');

      const labelEl = document.createElement('div');
      labelEl.className = 'wa-fu-settings__option-label';
      labelEl.textContent = opt.label;
      const hintEl = document.createElement('div');
      hintEl.className = 'wa-fu-settings__option-hint';
      hintEl.textContent = opt.hint;
      row.appendChild(labelEl);
      row.appendChild(hintEl);
      row.addEventListener('click', async (e) => {
        try { e.preventDefault(); } catch (_) {}
        try { e.stopPropagation(); } catch (_) {}
        closeSuggestSettingsPanel();
        if (opt.enabled === featureEnabled) return;
        await setFeatureEnabled(opt.enabled);
      });
      panel.appendChild(row);
    });

    const engineTitle = document.createElement('div');
    engineTitle.className = 'wa-fu-settings__title wa-fu-settings__title--section';
    engineTitle.textContent = t('suggestEngineTitle', '接口', 'API');
    panel.appendChild(engineTitle);

    const engineOptions = [
      { engine: 'chatgpt', label: getSuggestEngineLabel('chatgpt') },
      { engine: 'openai_custom', label: getSuggestEngineLabel('openai_custom') },
      { engine: 'deepseek_custom', label: getSuggestEngineLabel('deepseek_custom') },
      { engine: 'deepseek', label: getSuggestEngineLabel('deepseek') },
      { engine: 'volc_deepseek', label: getSuggestEngineLabel('volc_deepseek') }
    ];
    engineOptions.forEach((opt) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'wa-fu-settings__option';
      row.setAttribute('role', 'menuitemradio');
      row.setAttribute('data-ai-suggest-engine', opt.engine);
      row.setAttribute('aria-checked', (opt.engine === suggestEngine) ? 'true' : 'false');
      if (opt.engine === suggestEngine) row.classList.add('is-active');

      const labelEl = document.createElement('div');
      labelEl.className = 'wa-fu-settings__option-label';
      labelEl.textContent = opt.label;
      row.appendChild(labelEl);
      row.addEventListener('click', async (e) => {
        try { e.preventDefault(); } catch (_) {}
        try { e.stopPropagation(); } catch (_) {}
        if (opt.engine === suggestEngine) {
          closeSuggestSettingsPanel();
          return;
        }
        const ready = await ensureSuggestEngineReady(opt.engine);
        if (!ready || !ready.ok) {
          closeSuggestSettingsPanel();
          showSuggestToast(
            (ready && ready.error) || t('suggestFailedRetry', 'AI推荐回复失败，请稍后重试', 'AI suggest reply failed, please retry'),
            true
          );
          return;
        }
        await setSuggestEngine(opt.engine);
        closeSuggestSettingsPanel();
      });
      panel.appendChild(row);
    });

    wrap.appendChild(btn);
    wrap.appendChild(panel);
    return wrap;
  }

  function closeSuggestModal() {
    closeSuggestSettingsPanel();
    try {
      const overlay = document.getElementById('wa-ai-suggest-overlay');
      if (overlay) overlay.remove();
    } catch (_) {}
    try {
      document.removeEventListener('keydown', onSuggestModalKeydown, true);
    } catch (_) {}
  }

  function onSuggestModalKeydown(e) {
    if (e && e.key === 'Escape') {
      try { e.preventDefault(); } catch (_) {}
      closeSuggestModal();
    }
  }

  async function insertSuggestedReplyToComposer(text) {
    let editor = null;
    try {
      const viaHelper = (window.__whatsnowAiHelpers && typeof window.__whatsnowAiHelpers.getNativeComposerElement === 'function')
        ? window.__whatsnowAiHelpers.getNativeComposerElement
        : getNativeComposerElement;
      editor = viaHelper();
    } catch (_) {
      editor = null;
    }
    if (!editor) {
      try {
        editor = document.querySelector('[data-testid="conversation-compose-box-input"][contenteditable="true"]')
          || document.querySelector('footer div[contenteditable="true"][data-lexical-editor="true"]')
          || document.querySelector('div[role="textbox"][contenteditable="true"][data-lexical-editor="true"]');
      } catch (_) {}
    }
    if (!editor) return false;
    try {
      const paste = (window.__whatsnowAiHelpers && typeof window.__whatsnowAiHelpers.pasteReplaceText === 'function')
        ? window.__whatsnowAiHelpers.pasteReplaceText
        : pasteReplaceText;
      await paste(editor, text);
      return true;
    } catch (_) {
      return false;
    }
  }

  async function applySuggestedReply(text) {
    const reply = String(text || '').trim();
    if (!reply) return;
    const ok = await insertSuggestedReplyToComposer(reply);
    if (!ok) {
      showSuggestToast(t('suggestComposerNotFound', '未找到消息输入框', 'Composer not found'), true);
      return;
    }
    closeSuggestModal();
    showSuggestToast(t('suggestInserted', '已填入推荐回复', 'Suggested reply inserted'), false);
  }

  function renderSuggestModalList(replies) {
    const overlay = document.getElementById('wa-ai-suggest-overlay');
    if (!overlay) return;
    const modal = overlay.querySelector('.wa-ai-suggest-modal');
    if (modal) modal.classList.remove('is-loading');
    const body = overlay.querySelector('.wa-ai-suggest-modal-body');
    const hint = overlay.querySelector('.wa-ai-suggest-modal-hint');
    if (hint) {
      hint.classList.remove('is-error');
      hint.textContent = t('suggestClickHint', '点击一条即可填入输入框，可再编辑后发送。', 'Click one to insert it into the composer. You can edit before sending.');
      hint.style.display = '';
    }
    if (!body) return;
    body.innerHTML = '';
    replies.forEach((text, idx) => {
      const opt = document.createElement('button');
      opt.type = 'button';
      opt.className = 'wa-ai-suggest-option';
      opt.innerHTML =
        '<span class="wa-ai-suggest-option-index">' + tFill('suggestOption', '推荐 {n}', 'Option {n}', { n: idx + 1 }) + '</span>' +
        '<span class="wa-ai-suggest-option-text"></span>';
      const textEl = opt.querySelector('.wa-ai-suggest-option-text');
      if (textEl) textEl.textContent = text;
      opt.addEventListener('click', (ev) => {
        try { ev.preventDefault(); } catch (_) {}
        try { ev.stopPropagation(); } catch (_) {}
        applySuggestedReply(text);
      });
      body.appendChild(opt);
    });
  }

  function openSuggestModal() {
    try { if (typeof ensureSuggestStyle === 'function') ensureSuggestStyle(); } catch (_) {}
    closeSuggestModal();
    const overlay = document.createElement('div');
    overlay.id = 'wa-ai-suggest-overlay';
    overlay.className = 'wa-ai-suggest-overlay';
    try {
      if ((document.body && document.body.classList.contains('dark')) ||
          (document.documentElement && (document.documentElement.classList.contains('dark') ||
            document.documentElement.getAttribute('data-color-mode') === 'dark'))) {
        overlay.classList.add('dark');
      }
    } catch (_) {}
    overlay.innerHTML =
      '<div class="wa-ai-suggest-modal is-loading" role="dialog" aria-modal="true">' +
        '<div class="wa-ai-suggest-modal-head">' +
          '<h3 class="wa-ai-suggest-modal-title">' + t('suggestTitle', 'AI推荐回复', 'AI Suggest Reply') + '</h3>' +
          '<div class="wa-ai-suggest-modal-actions">' +
            '<button type="button" class="wa-ai-suggest-modal-close" aria-label="' + t('suggestClose', '关闭', 'Close') + '">' +
              '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7a1 1 0 0 0-1.4 1.4l4.9 4.9-4.9 4.9a1 1 0 1 0 1.4 1.4l4.9-4.9 4.9 4.9a1 1 0 0 0 1.4-1.4L13.4 12l4.9-4.9a1 1 0 0 0 0-1.4Z"/></svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<p class="wa-ai-suggest-modal-hint">' +
          t('suggestGeneratingModal', '正在生成 3 条推荐回复', 'Generating 3 suggested replies') +
          '<span class="wa-ai-suggest-dots" aria-hidden="true"></span>' +
        '</p>' +
        '<div class="wa-ai-suggest-modal-body"></div>' +
      '</div>';
    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay) closeSuggestModal();
    });
    // Append FIRST so a settings-control throw cannot swallow the dialog.
    try {
      (document.body || document.documentElement).appendChild(overlay);
    } catch (_) {
      try { document.documentElement.appendChild(overlay); } catch (_2) {}
    }
    try {
      const actions = overlay.querySelector('.wa-ai-suggest-modal-actions');
      const closeBtn = overlay.querySelector('.wa-ai-suggest-modal-close');
      if (actions && closeBtn) {
        actions.insertBefore(buildSuggestSettingsControl(), closeBtn);
      }
      if (closeBtn) {
        closeBtn.addEventListener('click', (ev) => {
          try { ev.preventDefault(); } catch (_) {}
          try { ev.stopPropagation(); } catch (_) {}
          closeSuggestModal();
        });
      }
    } catch (_) {}
    try { document.addEventListener('keydown', onSuggestModalKeydown, true); } catch (_) {}
    return overlay;
  }

  function showSuggestModalError(message) {
    const overlay = document.getElementById('wa-ai-suggest-overlay');
    if (!overlay) {
      showSuggestToast(message, true);
      return;
    }
    const modal = overlay.querySelector('.wa-ai-suggest-modal');
    const hint = overlay.querySelector('.wa-ai-suggest-modal-hint');
    if (hint) {
      hint.classList.add('is-error');
      hint.textContent = message;
      hint.style.display = '';
    }
    if (modal) modal.classList.add('is-loading');
  }

  function localizeSuggestError(err) {
    const raw = String(err || '').trim();
    if (!raw) return '';
    if (/没有可用的聊天上下文|No chat context/i.test(raw)) {
      return t('suggestErrNoContext', '没有可用的聊天上下文', 'No chat context available');
    }
    if (/AI推荐回复结果为空|suggest reply was empty/i.test(raw)) {
      return t('suggestErrEmpty', 'AI推荐回复结果为空', 'AI suggest reply was empty');
    }
    if (/AI推荐回复失败|suggest reply failed/i.test(raw)) {
      return t('suggestErrFailed', 'AI推荐回复失败', 'AI suggest reply failed');
    }
    if (/专业版会员可用|Pro members only|缺少Deepseek API Key|pro_only/i.test(raw)) {
      return getProOnlyHintMessage();
    }
    return raw;
  }

  function getProOnlyHintMessage() {
    return t(
      'suggestProOnly',
      '此接口功能仅专业版会员可用，请升级到专业版会员。',
      'This interface is available to Pro members only. Please upgrade to Pro membership.'
    );
  }

  function checkSuggestReplyProAccess() {
    return new Promise((resolve) => {
      try {
        if (typeof checkHasCapabilityRealtime === 'function') {
          checkHasCapabilityRealtime('ai_suggest', (ok) => resolve(!!ok));
          return;
        }
      } catch (_) {}
      try {
        checkIsProRealtime((isPro) => resolve(!!isPro));
      } catch (_) {
        resolve(false);
      }
    });
  }

  async function onSuggestClick(e) {
    try { e.preventDefault(); } catch (_) {}
    try { e.stopPropagation(); } catch (_) {}
    if (suggestInFlight) return;
    const btn = e && e.currentTarget;
    suggestInFlight = true;
    setButtonLoading(btn, true);
    openSuggestModal();

    try {
      const isPro = await checkSuggestReplyProAccess();
      if (!isPro) {
        showSuggestModalError(getProOnlyHintMessage());
        return;
      }

      const engineReady = await ensureSuggestEngineReady(suggestEngine);
      if (!engineReady || !engineReady.ok) {
        showSuggestModalError(
          (engineReady && engineReady.error) ||
          t('suggestFailedRetry', 'AI推荐回复失败，请稍后重试', 'AI suggest reply failed, please retry')
        );
        return;
      }
      const engine = normalizeSuggestEngine((engineReady && engineReady.engine) || suggestEngine);

      const anchorEl = (btn && btn.closest && btn.closest('[data-id]')) || findLastIncomingMessageRow();
      const context = collectSuggestChatContext(anchorEl);
      if (!context.length) {
        showSuggestModalError(t('suggestNoContext', '未找到可用的聊天上下文', 'No chat context found'));
        return;
      }
      if (!context.some((m) => m.role === 'them')) {
        const fallbackText = anchorEl
          ? (getWaAiExplainOriginalTextForMsg(anchorEl) || extractWaAiExplainMessageText(anchorEl) || '')
          : '';
        if (!fallbackText) {
          showSuggestModalError(t('suggestNoIncoming', '未找到对方消息', 'No incoming message found'));
          return;
        }
        context.length = 0;
        context.push({
          role: 'them',
          text: fallbackText,
          el: anchorEl,
          id: (anchorEl && anchorEl.getAttribute && anchorEl.getAttribute('data-id')) || ''
        });
      }

      const replyLang = (typeof getCurrentUserSourceLang === 'function')
        ? getCurrentUserSourceLang()
        : (window.userSourceLang || 'zh-CN');

      const resp = await (async function () {
        try {
          var inv = (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke)
            || (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke);
          if (typeof inv !== 'function') return { ok: false, error: 'invoke_unavailable' };
          return await inv('ai_suggest_reply', {
            engine: engine,
            messages: context.map(function (m) { return { role: m.role, text: m.text }; }),
            replyLang: replyLang
          });
        } catch (err) {
          return { ok: false, error: String(err && err.message ? err.message : err) };
        }
      })();

      const replies = Array.isArray(resp && resp.replies)
        ? resp.replies.map((x) => String(x || '').trim()).filter(Boolean)
        : ((resp && resp.reply) ? [String(resp.reply).trim()] : []);

      if (!resp || !resp.ok || !replies.length) {
        const err = (resp && resp.error) ? String(resp.error) : '';
        const code = resp && resp.code ? String(resp.code) : '';
        if (code === 'need_key' || /need_chatgpt_key|need_openai_custom|need_deepseek_custom/i.test(err)) {
          showSuggestModalError(
            engine === 'openai_custom'
              ? t(
                'suggestEngineNeedOpenaiCustom',
                '请先在设置中填写 OpenAI自定义 的接口地址、模型与 API Key。',
                'Please configure OpenAI Custom URL, model and API Key in feature settings.'
              )
              : engine === 'deepseek_custom'
                ? t(
                  'suggestEngineNeedDeepseekCustom',
                  '请先在设置中填写 Deepseek自定义 API Key（接口地址与模型可留空，将使用官方默认）。',
                  'Please enter a Deepseek Custom API Key in feature settings (URL and model are optional and use official defaults).'
                )
              : t('suggestEngineNeedChatgptKey', '请先填写 ChatGPT API Key', 'Please set ChatGPT API Key first')
          );
          return;
        }
        const isProOnly = code === 'pro_only'
          || /专业版|Pro members only|缺少Deepseek API Key|pro_only/i.test(err);
        showSuggestModalError(
          isProOnly
            ? getProOnlyHintMessage()
            : (localizeSuggestError(err) || t('suggestFailedRetry', 'AI推荐回复失败，请稍后重试', 'AI suggest reply failed, please retry'))
        );
        return;
      }

      renderSuggestModalList(replies);
    } catch (err) {
      showSuggestModalError(t('suggestFailedPrefix', 'AI推荐回复失败：', 'AI suggest reply failed: ') + String(err));
    } finally {
      suggestInFlight = false;
      setButtonLoading(btn, false);
    }
  }

  function mountSuggestButton() {
    if (!featureEnabled) {
      removeAllSuggestButtons(null);
      lastMountedMsgId = '';
      return;
    }
    const lastIn = findLastIncomingMessageRow();
    if (!lastIn || !hasMessageTranslation(lastIn)) {
      removeAllSuggestButtons(null);
      lastMountedMsgId = '';
      return;
    }
    const msgId = lastIn.getAttribute('data-id') || '';
    const existingOnTarget = lastIn.querySelector('.' + BTN_CLASS);
    if (existingOnTarget && msgId && msgId === lastMountedMsgId) {
      removeAllSuggestButtons(existingOnTarget);
      placeSuggestButton(lastIn, existingOnTarget);
      return;
    }

    removeAllSuggestButtons(null);
    const btn = createSuggestButton();
    if (!placeSuggestButton(lastIn, btn)) {
      try { btn.remove(); } catch (_) {}
      return;
    }
    lastMountedMsgId = msgId;
  }

  function scheduleMount() {
    try {
      if (waAiMsgToolbar && typeof waAiMsgToolbar.schedule === 'function') {
        waAiMsgToolbar.schedule();
        return;
      }
    } catch (_) {}
    if (mountTimer) clearTimeout(mountTimer);
    mountTimer = setTimeout(() => {
      mountTimer = null;
      try { mountSuggestButton(); } catch (_) {}
    }, 250);
  }

  function start() {
    try { if (typeof ensureSuggestStyle === 'function') ensureSuggestStyle(); } catch (_) {}
    loadFeatureEnabled();
    try {
      if (waAiMsgToolbar && typeof waAiMsgToolbar.register === 'function') {
        waAiMsgToolbar.register(mountSuggestButton);
        return;
      }
    } catch (_) {}
    const root = document.body;
    if (!root) return;
    try {
      const observer = new MutationObserver(() => scheduleMount());
      observer.observe(root, { childList: true, subtree: true });
    } catch (_) {}
    scheduleMount();
    setInterval(() => {
      try { mountSuggestButton(); } catch (_) {}
    }, 1200);
  }

  function destroy() {
    try { removeAllSuggestButtons(null); } catch (_) {}
    try { closeSuggestModal(); } catch (_) {}
    lastMountedMsgId = '';
  }

  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
      start();
    }
  } catch (_) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
      start();
    }
  }
})();
  }

  function tryStart() {
    if (!window.__whatsnowAiHelpers) {
      setTimeout(tryStart, 50);
      return;
    }
    bootSuggest();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tryStart);
  else tryStart();
})();