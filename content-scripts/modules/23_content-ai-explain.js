 */
(function () {
  "use strict";
  if (window.__FaloAiExplainInstalled) return;
  window.__FaloAiExplainInstalled = true;

  var EXPLAIN_CSS = ".wa-ai-explain-btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 4px;\n  margin: 0 4px 3px 0;\n  padding: 2px 8px;\n  border: 1px solid rgba(0, 0, 0, 0.12);\n  border-radius: 12px;\n  background: rgba(53, 120, 229, 0.1);\n  color: #2a6fdb;\n  font-size: 11px;\n  line-height: 1.2;\n  cursor: pointer;\n  user-select: none;\n  white-space: nowrap;\n  box-sizing: border-box;\n  flex-shrink: 0;\n  vertical-align: middle;\n  align-self: center;\n}\n\n.wa-ai-explain-btn .wa-ai-explain-icon {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  line-height: 0;\n  flex-shrink: 0;\n}\n\n.wa-ai-explain-btn .wa-ai-explain-icon svg {\n  display: block;\n  width: 10px;\n  height: 10px;\n}\n\n.wa-ai-explain-btn:hover {\n  background: rgba(53, 120, 229, 0.18);\n  border-color: rgba(42, 111, 219, 0.35);\n}\n\n.wa-ai-explain-btn:disabled {\n  opacity: 0.65;\n  cursor: wait;\n}\n\n.wa-ai-explain-btn.is-loading {\n  pointer-events: none;\n}\n\n.dark .wa-ai-explain-btn {\n  background: rgba(83, 160, 255, 0.14);\n  border-color: rgba(233, 237, 239, 0.16);\n  color: #7ab8ff;\n}\n\n.dark .wa-ai-explain-btn:hover {\n  background: rgba(83, 160, 255, 0.22);\n.wa-ai-suggest-overlay {\n  position: fixed;\n  inset: 0;\n  z-index: 2147483646;\n  background: rgba(11, 20, 26, 0.45);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: 16px;\n  box-sizing: border-box;\n}\n\n.wa-ai-suggest-modal {\n  width: min(440px, 92vw);\n  max-height: min(80vh, 640px);\n  overflow: visible;\n  background: #fff;\n  color: #111b21;\n  border-radius: 14px;\n  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.28);\n  font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif;\n  display: flex;\n  flex-direction: column;\n}\n\n.wa-ai-suggest-modal.is-loading .wa-ai-suggest-modal-body {\n  display: none;\n}\n\n.wa-ai-suggest-modal-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 12px;\n  padding: 14px 16px 10px;\n  position: relative;\n  z-index: 3;\n  flex-shrink: 0;\n  overflow: visible;\n}\n\n.wa-ai-suggest-modal-actions {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 2px;\n  flex-shrink: 0;\n  position: relative;\n  line-height: 0;\n}\n\n.wa-ai-suggest-modal .wa-ai-suggest-settings {\n  position: relative;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  line-height: 0;\n}\n\n.wa-ai-suggest-modal .wa-ai-suggest-settings > .wa-fu-icon-btn {\n  width: 32px;\n  height: 32px;\n  padding: 0;\n  margin: 0;\n  line-height: 0;\n  color: #667781;\n}\n\n.wa-ai-suggest-modal .wa-ai-suggest-settings > .wa-fu-icon-btn svg {\n  display: block;\n  width: 18px;\n  height: 18px;\n  flex-shrink: 0;\n}\n\n.wa-ai-suggest-modal .wa-ai-suggest-settings > .wa-fu-icon-btn:hover {\n  color: #111b21;\n}\n\n.wa-ai-suggest-modal .wa-fu-settings__panel {\n  z-index: 20;\n  line-height: normal;\n  width: min(280px, calc(100vw - 48px));\n  max-height: min(70vh, 440px);\n  overflow-y: auto;\n}\n\n.wa-fu-settings__title--section {\n  margin-top: 8px;\n  padding-top: 10px;\n  border-top: 1px solid var(--fu-line, rgba(0, 0, 0, 0.08));\n}\n\n.wa-ai-suggest-modal-title {\n  margin: 0;\n  font-size: 16px;\n  font-weight: 650;\n  line-height: 1.3;\n}\n\n.wa-ai-suggest-modal-close {\n  border: none;\n  background: transparent;\n  color: #667781;\n  width: 32px;\n  height: 32px;\n  padding: 0;\n  margin: 0;\n  border-radius: 50%;\n  cursor: pointer;\n  line-height: 0;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  flex-shrink: 0;\n  box-sizing: border-box;\n}\n\n.wa-ai-suggest-modal-close svg {\n  display: block;\n  width: 18px;\n  height: 18px;\n  flex-shrink: 0;\n}\n\n.wa-ai-suggest-modal-close:hover {\n  background: rgba(0, 0, 0, 0.06);\n  color: #111b21;\n}\n\n.wa-ai-suggest-modal-hint {\n  margin: 0;\n  padding: 0 16px 14px;\n  font-size: 13px;\n  color: #667781;\n  position: relative;\n  z-index: 1;\n}\n\n.wa-ai-suggest-modal.is-loading .wa-ai-suggest-modal-hint:not(.is-error) {\n  animation: wa-ai-suggest-pulse 1.6s ease-in-out infinite;\n}\n\n.wa-ai-suggest-dots::after {\n  content: '';\n  display: inline-block;\n  width: 1.2em;\n  text-align: left;\n  animation: wa-ai-suggest-dots 1.4s infinite;\n}\n\n@keyframes wa-ai-suggest-dots {\n  0%, 20% { content: ''; }\n  21%, 40% { content: '.'; }\n  41%, 60% { content: '..'; }\n  61%, 100% { content: '...'; }\n}\n\n@keyframes wa-ai-suggest-pulse {\n  0%, 100% { opacity: 1; }\n  50% { opacity: 0.5; }\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .wa-ai-suggest-modal.is-loading .wa-ai-suggest-modal-hint:not(.is-error),\n  .wa-ai-suggest-dots::after {\n    animation: none;\n  }\n  .wa-ai-suggest-dots::after {\n    content: '...';\n  }\n}\n\n.wa-ai-suggest-modal-hint.is-error {\n  color: #c0392b;\n}\n\n.wa-ai-suggest-modal-body {\n  padding: 0 12px 14px;\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  overflow: auto;\n  flex: 1 1 auto;\n  min-height: 0;\n  position: relative;\n  z-index: 1;\n}\n\n.wa-ai-suggest-option {\n  display: block;\n  width: 100%;\n  text-align: left;\n  border: 1px solid #e9edef;\n  background: #f0f2f5;\n  color: inherit;\n  border-radius: 12px;\n  padding: 10px 12px;\n  cursor: pointer;\n  box-sizing: border-box;\n}\n\n.wa-ai-suggest-option:hover {\n  border-color: #6366f1;\n  background: rgba(37, 211, 102, 0.1);\n}\n\n.wa-ai-suggest-option-index {\n  display: inline-block;\n  font-size: 11px;\n  font-weight: 650;\n  color: #4f46e5;\n  margin-bottom: 4px;\n}\n\n.wa-ai-suggest-option-text {\n  display: block;\n  font-size: 14px;\n  line-height: 1.5;\n  white-space: pre-wrap;\n  word-break: break-word;\n}\n\n.dark .wa-ai-suggest-modal {\n  background: #202c33;\n  color: #e9edef;\n}\n\n.dark .wa-ai-suggest-modal-close {\n  color: #8696a0;\n}\n\n.dark .wa-ai-suggest-modal-close:hover {\n  background: rgba(255, 255, 255, 0.08);\n  color: #e9edef;\n}\n\n.dark .wa-ai-suggest-modal .wa-ai-suggest-settings > .wa-fu-icon-btn {\n  color: #8696a0;\n}\n\n.dark .wa-ai-suggest-modal .wa-ai-suggest-settings > .wa-fu-icon-btn:hover {\n  background: rgba(255, 255, 255, 0.08);\n  color: #e9edef;\n}\n\n.dark .wa-ai-suggest-modal-hint {\n  color: #8696a0;\n}\n\n.dark .wa-ai-suggest-modal-hint.is-error {\n  color: #ff8b81;\n}\n\n.dark .wa-ai-suggest-option {\n  background: #111b21;\n  border-color: #2a3942;\n  color: #e9edef;\n}\n\n.dark .wa-ai-suggest-option:hover {\n  border-color: #6366f1;\n  background: rgba(37, 211, 102, 0.12);\n}\n.wa-ai-explain-btn {\n  pointer-events: auto !important;\n  position: relative;\n  z-index: 2;\n}\n.wa-ai-suggest-overlay {\n  position: fixed !important;\n  inset: 0 !important;\n  z-index: 2147483646 !important;\n  display: flex !important;\n  align-items: center !important;\n  justify-content: center !important;\n}";
  function ensureExplainStyle() {
    try {
      var st = document.getElementById("falo-ai-explain-style");
      if (!st) {
        st = document.createElement("style");
        st.id = "falo-ai-explain-style";
        (document.head || document.documentElement).appendChild(st);
      }
      if (st.textContent !== EXPLAIN_CSS) st.textContent = EXPLAIN_CSS;
      return true;
    } catch (_) { return false; }
  }
  ensureExplainStyle();

  function bootExplain() {
    ensureExplainStyle();
    var H = window.__faloAiHelpers || {};
    var W = { helpers: H, can: function (cap) {
      try { return !!(window.__faloCan && window.__faloCan(cap)); } catch (_) { return false; }
    } };
    var normalizeUiLang = H.normalizeUiLang || function (x) { return x || "zh"; };
    var tPage = H.tPage || function (_l, _k, fb) { return fb; };
    var tPageFill = H.tPageFill || function (l, k, fb) { return tPage(l, k, fb); };
    var showNoTitleNotice = H.showNoTitleNotice || function (msg) { try { if (window.__faloNotice) window.__faloNotice(msg); else if (window.__faloAlert) window.__faloAlert(msg); else if (window.appAlert) window.appAlert(msg); else alert(msg); } catch (_) {} };
    var checkHasCapabilityRealtime = H.checkHasCapabilityRealtime || function (cap, cb) { cb(!!(W.can && W.can(cap))); };
    var checkIsProRealtime = H.checkIsProRealtime || function (cb) { cb(!!(W.can && W.can("ai_explain"))); };
    var collectWaAiExplainContext = H.collectWaAiExplainContext || function () { return []; };
    var getWaAiExplainConversationRoot = H.getWaAiExplainConversationRoot || function () { return null; };
    var getWaAiExplainChatMessageRows = H.getWaAiExplainChatMessageRows || function () { return []; };
    var getWaAiExplainMsgDirection = H.getWaAiExplainMsgDirection || function () { return "unknown"; };
    var getWaAiExplainOriginalTextForMsg = H.getWaAiExplainOriginalTextForMsg || function () { return ""; };
    var extractWaAiExplainMessageText = H.extractWaAiExplainMessageText || function () { return ""; };
    var waAiMsgToolbar = H.waAiMsgToolbar || { register: function () {}, schedule: function () {} };
    var currentUiLang = (typeof H.getUiLang === "function" ? H.getUiLang() : "zh");
    function getCurrentUserSourceLang() {
      try {
        var s = window.userSourceLang || (window.__faloTranslateCfg && window.__faloTranslateCfg.sourceLang) || "zh-CN";
        if (!s || s === "auto") return "zh-CN";
        return String(s);
      } catch (_) { return "zh-CN"; }
    }
    /** 与气泡译文一致：仅收敛极端空行，保留正常换行 */
    function normalizeNewlines(text) {
      return String(text == null ? '' : text)
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n');
    }

(function initAiExplainMeaning() {
  const BTN_CLASS = 'wa-ai-explain-btn';
  const BTN_ATTR = 'data-wa-ai-explain';
  const ENABLED_KEY = 'aiExplainMeaningEnabled';
  let mountTimer = null;
  let explainInFlight = false;
  let lastMountedMsgId = '';
  let featureEnabled = true;

  function ui() {
    return normalizeUiLang(typeof currentUiLang === 'string' ? currentUiLang : 'zh');
  }

  function t(key, fallbackZh, fallbackEn) {
    const lang = ui();
    const fb = lang === 'zh' ? fallbackZh : (fallbackEn || fallbackZh);
    return tPage(lang, key, fb);
  }

  function isFeatureEnabledValue(v) {
    return v !== false;
  }

  function applyFeatureEnabled(enabled, opts) {
    const next = !!enabled;
    const changed = featureEnabled !== next;
    featureEnabled = next;
    if (!featureEnabled) {
      removeAllExplainButtons(null);
      lastMountedMsgId = '';
      if (opts && opts.notify) {
        showExplainToast(
          t('explainFeatureOff', '已关闭 AI 分析，可在功能设置中重新开启', 'AI Analyze turned off. Re-enable it in feature settings.'),
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

  function loadFeatureEnabled() {
    try {
      var en = localStorage.getItem(ENABLED_KEY);
      applyFeatureEnabled(isFeatureEnabledValue(en === null ? true : en === '1'), { forceMount: true });
    } catch (_) {
      featureEnabled = true;
    }
  }

  

  try {
    window.__waUiLangChangeHooks = window.__waUiLangChangeHooks || [];
    window.__waUiLangChangeHooks.push(() => {
      lastMountedMsgId = '';
      removeAllExplainButtons(null);
      scheduleMount();
    });
  } catch (_) {}

  // 与 OpenAI自定义 / AI推荐回复 共用同一套 DOM 与上下文收集
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

  /**
   * AI分析上下文：与聊天记录 ChatGPT/OpenAI自定义 翻译、AI推荐回复共用 collectWaAiExplainContext。
   */
  function collectExplainContext(anchorEl) {
    return collectWaAiExplainContext(anchorEl);
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

  function getTranslationTextEl(msgEl) {
    if (!msgEl || !msgEl.querySelector) return null;
    const wrapper = msgEl.querySelector('.translated-text');
    if (!wrapper) return null;
    return wrapper.querySelector('.selectable-text.copyable-text') ||
      wrapper.querySelector('.selectable-text') ||
      wrapper;
  }

  function getOriginalTextForMsg(msgEl) {
    if (!msgEl) return '';
    try {
      const wrapper = msgEl.querySelector && msgEl.querySelector('.translated-text');
      const fromWrapper = wrapper && wrapper.getAttribute('data-original-text');
      if (fromWrapper && String(fromWrapper).trim()) return String(fromWrapper).trim();
    } catch (_) {}
    try {
      const fromMsg = msgEl.getAttribute && msgEl.getAttribute('data-original-text');
      if (fromMsg && String(fromMsg).trim()) return String(fromMsg).trim();
    } catch (_) {}
    return extractMessageText(msgEl);
  }

  function setTranslationContent(msgEl, text) {
    const wrapper = msgEl && msgEl.querySelector && msgEl.querySelector('.translated-text');
    const textEl = getTranslationTextEl(msgEl);
    if (!wrapper || !textEl) return false;
    const next = String(text || '');
    const normalized = (typeof normalizeNewlines === 'function')
      ? normalizeNewlines(next)
      : String(next || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n');
    try {
      wrapper.removeAttribute('data-ai-explain');
      wrapper.removeAttribute('data-pre-explain-text');
      textEl.classList.remove('wa-translating-status');
    } catch (_) {}
    textEl.textContent = normalized;
    return true;
  }

  async function persistAsOfficialTranslation(msgEl, translatedText) {
    const originalText = getOriginalTextForMsg(msgEl);
    const cleaned = (typeof normalizeNewlines === 'function')
      ? normalizeNewlines(String(translatedText || ''))
      : String(translatedText || '').trim();
    if (!originalText || !cleaned) return false;
    try {
      if (typeof getMsgCacheKey === 'function' && typeof setCache === 'function') {
        await setCache(getMsgCacheKey(originalText), cleaned);
      }
    } catch (_) {}
    return true;
  }

  function removeAllExplainButtons(exceptEl) {
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

  function placeExplainButton(msgEl, btn) {
    if (!msgEl || !btn) return false;
    const msgMeta = getMsgMeta(msgEl);
    const suggestBtn = (msgEl.querySelector && msgEl.querySelector('.wa-ai-suggest-reply-btn')) || null;
    const retranslateBtn = (msgEl.querySelector && msgEl.querySelector('.wa-retranslate-btn')) || null;
    // 顺序：AI分析 → AI推荐回复 → 重译
    if (suggestBtn && suggestBtn.parentNode) {
      if (btn.nextSibling === suggestBtn && btn.parentNode === suggestBtn.parentNode) return true;
      suggestBtn.parentNode.insertBefore(btn, suggestBtn);
      return true;
    }
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

  function createExplainButton() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = BTN_CLASS;
    btn.setAttribute(BTN_ATTR, '1');
    btn.title = t(
      'explainBtnTitle',
      '结合最近几条聊天记录分析真实意思',
      'Analyze the real meaning from the last few chat messages'
    );
    btn.setAttribute('aria-label', t('explainTitle', 'AI分析', 'AI Analyze'));
    btn.innerHTML =
      '<span class="wa-ai-explain-icon" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="12" height="12">' +
      '<path fill="currentColor" d="M12 2a7 7 0 0 0-4 12.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3A7 7 0 0 0 12 2zm-2 16v1a2 2 0 0 0 2 2 2 2 0 0 0 2-2v-1H10z"/>' +
      '</svg></span>' +
      '<span class="wa-ai-explain-label">' + t('explainTitle', 'AI分析', 'AI Analyze') + '</span>';
    function stopExplainBubble(ev) {
      try { ev.stopPropagation(); } catch (_) {}
      try { if (ev.stopImmediatePropagation) ev.stopImmediatePropagation(); } catch (_) {}
    }
    btn.addEventListener('mousedown', stopExplainBubble, true);
    btn.addEventListener('pointerdown', stopExplainBubble, true);
    btn.addEventListener('click', function (ev) {
      stopExplainBubble(ev);
      try { ev.preventDefault(); } catch (_) {}
      onExplainClick(ev);
    }, true);
    return btn;
  }

  function setButtonLoading(btn, loading) {
    if (!btn) return;
    const label = btn.querySelector('.wa-ai-explain-label');
    if (loading) {
      btn.disabled = true;
      btn.classList.add('is-loading');
      if (label) label.textContent = t('explainAnalyzing', '分析中…', 'Analyzing…');
    } else {
      btn.disabled = false;
      btn.classList.remove('is-loading');
      if (label) label.textContent = t('explainTitle', 'AI分析', 'AI Analyze');
    }
  }

  function showExplainToast(text, isError) {
    try {
      const existing = document.getElementById('wa-ai-explain-toast');
      if (existing) existing.remove();
      const toast = document.createElement('div');
      toast.id = 'wa-ai-explain-toast';
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

  function onExplainHintModalKeydown(ev) {
    if (ev && ev.key === 'Escape') {
      try { ev.preventDefault(); } catch (_) {}
      try { ev.stopPropagation(); } catch (_) {}
      closeExplainHintModal();
    }
  }

  function closeExplainHintModal() {
    try {
      const overlay = document.getElementById('wa-ai-explain-overlay');
      if (overlay) overlay.remove();
    } catch (_) {}
    try { document.removeEventListener('keydown', onExplainHintModalKeydown, true); } catch (_) {}
  }

  // 会员权限提示：与 AI 推荐回复一致，使用居中弹窗（复用 suggest 弹窗样式）
  function showExplainProOnlyModal(message) {
    try { if (typeof ensureExplainStyle === 'function') ensureExplainStyle(); } catch (_) {}
    closeExplainHintModal();
    const overlay = document.createElement('div');
    overlay.id = 'wa-ai-explain-overlay';
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
          '<h3 class="wa-ai-suggest-modal-title">' + t('explainTitle', 'AI分析', 'AI Analyze') + '</h3>' +
          '<div class="wa-ai-suggest-modal-actions">' +
            '<button type="button" class="wa-ai-suggest-modal-close" aria-label="' + t('suggestClose', '关闭', 'Close') + '">' +
              '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7a1 1 0 0 0-1.4 1.4l4.9 4.9-4.9 4.9a1 1 0 1 0 1.4 1.4l4.9-4.9 4.9 4.9a1 1 0 0 0 1.4-1.4L13.4 12l4.9-4.9a1 1 0 0 0 0-1.4Z"/></svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<p class="wa-ai-suggest-modal-hint is-error"></p>' +
        '<div class="wa-ai-suggest-modal-body"></div>' +
      '</div>';
    const hint = overlay.querySelector('.wa-ai-suggest-modal-hint');
    if (hint) hint.textContent = String(message || getProOnlyHintMessage());
    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay) closeExplainHintModal();
    });
    try {
      (document.body || document.documentElement).appendChild(overlay);
    } catch (_) {
      try { document.documentElement.appendChild(overlay); } catch (_2) {}
    }
    try {
      const closeBtn = overlay.querySelector('.wa-ai-suggest-modal-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', (ev) => {
          try { ev.preventDefault(); } catch (_) {}
          try { ev.stopPropagation(); } catch (_) {}
          closeExplainHintModal();
        });
      }
    } catch (_) {}
    try { document.addEventListener('keydown', onExplainHintModalKeydown, true); } catch (_) {}
    return overlay;
  }

  function localizeExplainError(err) {
    const raw = String(err || '').trim();
    if (!raw) return '';
    if (/没有可用的聊天上下文|No chat context/i.test(raw)) {
      return t('explainErrNoContext', '没有可用的聊天上下文', 'No chat context available');
    }
    if (/AI分析结果为空|AI释义结果为空|explain result was empty/i.test(raw)) {
      return t('explainErrEmpty', 'AI分析结果为空', 'AI analyze result was empty');
    }
    if (/AI分析失败|AI释义失败|AI explain failed|AI analyze failed/i.test(raw)) {
      return t('explainErrFailed', 'AI分析失败', 'AI analyze failed');
    }
    if (/专业版会员可用|尊享版会员可用|Pro members only|Premium members only|缺少Deepseek API Key|pro_only|premium_only/i.test(raw)) {
      return getProOnlyHintMessage();
    }
    return raw;
  }

  function getProOnlyHintMessage() {
    return t(
      'explainProOnly',
      '此功能仅尊享版会员可用，请升级到尊享版。',
      'This feature is available to Premium members only. Please upgrade to Premium.'
    );
  }

  function checkExplainProAccess() {
    return new Promise((resolve) => {
      try {
        if (typeof checkHasCapabilityRealtime === 'function') {
          checkHasCapabilityRealtime('ai_explain', (ok) => resolve(!!ok));
          return;
        }
      } catch (_) {}
      try {
        resolve(!!(window.__faloCan && window.__faloCan('ai_explain')));
      } catch (_) {
        resolve(false);
      }
    });
  }

  async function onExplainClick(e) {
    try { e.preventDefault(); } catch (_) {}
    try { e.stopPropagation(); } catch (_) {}
    if (explainInFlight) return;
    const btn = e && e.currentTarget;
    const msgEl = (btn && btn.closest && (btn.closest('[data-id]') || btn.closest('[data-testid="msg-container"]'))) ||
      findLastIncomingMessageRow();
    if (!msgEl || !hasMessageTranslation(msgEl)) {
      showExplainToast(t('explainNoTranslation', '未找到可替换的译文', 'No translation to replace'), true);
      return;
    }

    explainInFlight = true;
    setButtonLoading(btn, true);

    let prevTextEl = null;
    let prevSnapshot = '';
    let analyzingStarted = false;

    try {
      // 先校验会员权限，不足时弹窗提示（与 AI 推荐回复一致），避免先改译文再回滚
      const isPro = await checkExplainProAccess();
      if (!isPro) {
        showExplainProOnlyModal(getProOnlyHintMessage());
        return;
      }

      prevTextEl = getTranslationTextEl(msgEl);
      prevSnapshot = prevTextEl ? (prevTextEl.textContent || '') : '';
      setTranslationContent(msgEl, t('explainAnalyzing', '分析中…', 'Analyzing…'));
      analyzingStarted = true;

      const context = collectExplainContext(msgEl);
      if (!context.length) {
        if (prevTextEl) prevTextEl.textContent = prevSnapshot;
        showExplainToast(t('explainNoContext', '未找到可用的聊天上下文', 'No chat context found'), true);
        return;
      }
      // 已按锚点强制纳入对方消息，此处不再因方向识别失败误报「未找到对方消息」
      if (!context.some((m) => m.role === 'them')) {
        const fallbackText = getOriginalTextForMsg(msgEl) || extractMessageText(msgEl);
        if (!fallbackText) {
          if (prevTextEl) prevTextEl.textContent = prevSnapshot;
          showExplainToast(t('explainNoIncoming', '未找到对方消息', 'No incoming message found'), true);
          return;
        }
        context.length = 0;
        context.push({ role: 'them', text: fallbackText, el: msgEl, id: msgEl.getAttribute('data-id') || '' });
      }

      const outputLang = (typeof getCurrentUserSourceLang === 'function')
        ? getCurrentUserSourceLang()
        : (window.userSourceLang || 'zh-CN');

      const resp = await (async function () {
        try {
          var inv = (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke)
            || (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke);
          if (typeof inv !== 'function') return { ok: false, error: 'invoke_unavailable' };
          return await inv('ai_explain_meaning', {
            messages: context.map(function (m) { return { role: m.role, text: m.text }; }),
            outputLang: outputLang
          });
        } catch (err) {
          return { ok: false, error: String(err && err.message ? err.message : err) };
        }
      })();

      const explanation = (resp && (resp.explanation || resp.text))
        ? String(resp.explanation || resp.text).trim()
        : '';

      if (!resp || !resp.ok || !explanation) {
        if (prevTextEl) prevTextEl.textContent = prevSnapshot;
        const err = (resp && resp.error) ? String(resp.error) : '';
        const isProOnly = (resp && (resp.code === 'pro_only' || resp.code === 'premium_only'))
          || /专业版|尊享版|Pro members only|Premium members only|缺少Deepseek API Key|pro_only|premium_only/i.test(err);
        if (isProOnly) {
          showExplainProOnlyModal(getProOnlyHintMessage());
        } else {
          showExplainToast(
            localizeExplainError(err) || t('explainFailedRetry', 'AI分析失败，请稍后重试', 'AI analyze failed, please retry'),
            true
          );
        }
        return;
      }

      // 写入 DOM，并写入 IndexedDB 译文缓存，之后滚动/重挂载也走这条正式译文
      const cleaned = normalizeNewlines(String(explanation || ''));
      setTranslationContent(msgEl, cleaned);
      await persistAsOfficialTranslation(msgEl, cleaned);
    } catch (err) {
      if (analyzingStarted && prevTextEl) prevTextEl.textContent = prevSnapshot;
      showExplainToast(t('explainFailedPrefix', 'AI分析失败：', 'AI analyze failed: ') + String(err), true);
    } finally {
      explainInFlight = false;
      setButtonLoading(btn, false);
    }
  }

  function mountExplainButton() {
    if (!featureEnabled) {
      removeAllExplainButtons(null);
      lastMountedMsgId = '';
      return;
    }
    const lastIn = findLastIncomingMessageRow();
    if (!lastIn || !hasMessageTranslation(lastIn)) {
      removeAllExplainButtons(null);
      lastMountedMsgId = '';
      return;
    }
    const msgId = lastIn.getAttribute('data-id') || '';
    const existingOnTarget = lastIn.querySelector('.' + BTN_CLASS);
    if (existingOnTarget && msgId && msgId === lastMountedMsgId) {
      removeAllExplainButtons(existingOnTarget);
      placeExplainButton(lastIn, existingOnTarget);
      return;
    }

    removeAllExplainButtons(null);
    const btn = createExplainButton();
    if (!placeExplainButton(lastIn, btn)) {
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
      try { mountExplainButton(); } catch (_) {}
    }, 250);
  }

  function start() {
    try { if (typeof ensureExplainStyle === 'function') ensureExplainStyle(); } catch (_) {}
    loadFeatureEnabled();
    try {
      if (waAiMsgToolbar && typeof waAiMsgToolbar.register === 'function') {
        waAiMsgToolbar.register(mountExplainButton);
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
      try { mountExplainButton(); } catch (_) {}
    }, 1200);
  }

  function destroy() {
    try { removeAllExplainButtons(null); } catch (_) {}
    lastMountedMsgId = '';
  }

  try {
    window.__waAiExplain = {
      remount: scheduleMount,
      setEnabled: setFeatureEnabled
    };
  } catch (_) {}

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
    if (!window.__faloAiHelpers) {
      setTimeout(tryStart, 50);
      return;
    }
    bootExplain();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tryStart);
  else tryStart();
})();