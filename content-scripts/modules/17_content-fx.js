 + styles.css */

(function () {

  "use strict";

  if (window.__faloFxInstalled) return;

  window.__faloFxInstalled = true;



  function normalizeUiLang(x) {

    try {

      var i18n = window.__faloPageI18n;

      if (i18n && i18n.normalize) return i18n.normalize(x);

    } catch (_) {}

    return String(x || 'zh').toLowerCase().indexOf('en') === 0 ? 'en' : 'zh';

  }

  function tPage(l, k, fb) {

    try {

      var i18n = window.__faloPageI18n;

      if (i18n && i18n.t) return i18n.t(l, k, fb);

    } catch (_) {}

    return fb;

  }

  function tPageFill(l, k, fb, vars) {

    try {

      var i18n = window.__faloPageI18n;

      if (i18n && i18n.fill) return i18n.fill(l, k, fb, vars);

    } catch (_) {}

    var s = String(fb || '');

    if (vars && typeof vars === 'object') {

      Object.keys(vars).forEach(function (kk) {

        s = s.split('{' + kk + '}').join(String(vars[kk]));

      });

    }

    return s;

  }

  function prefersEnglishMeta(ui) { return normalizeUiLang(ui) !== 'zh'; }

  function getUiLangFromRes(res, fb) {

    try {

      if (res && typeof res.uiLang === 'string' && res.uiLang.trim()) return normalizeUiLang(res.uiLang);

    } catch (_) {}

    return normalizeUiLang(fb || 'zh');

  }

  var currentUiLang = 'zh';

  function getNativeComposerElement() {

    try {

      var h = window.__faloTranslateHelpers;

      if (h && h.getNativeComposerElement) return h.getNativeComposerElement();

    } catch (_) {}

    return document.querySelector('footer [contenteditable="true"]') || null;

  }

  async function pasteReplaceText(el, text) {

    try {

      var h = window.__faloTranslateHelpers;

      if (h && h.pasteReplaceText) return await h.pasteReplaceText(el, text);

    } catch (_) {}

  }



  var STYLE_ID = 'falo-fx-style';

  function ensureFxStyles() {

    if (document.getElementById(STYLE_ID)) return;

    var parent = document.head || document.documentElement;

    if (!parent) return;

    var s = document.createElement('style');

    s.id = STYLE_ID;

    s.textContent = ".wa-currency-fx-btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  flex: 0 0 auto;\n  width: auto;\n  height: auto;\n  padding: 0;\n  margin: 0;\n  border: none;\n  border-radius: 0;\n  background: transparent;\n  color: #111b21;\n  cursor: pointer;\n  user-select: none;\n  box-sizing: border-box;\n  line-height: 0;\n  opacity: 0.85;\n}\n\n.wa-currency-fx-btn svg {\n  display: block;\n  width: 15px;\n  height: 15px;\n  pointer-events: none;\n}\n\n.wa-currency-fx-btn:hover {\n  opacity: 1;\n}\n\n.wa-currency-fx-btn:active {\n  opacity: 0.7;\n}\n\n.dark .wa-currency-fx-btn {\n  color: #e9edef;\n  background: transparent;\n  border: none;\n}\n\n.dark .wa-currency-fx-btn:hover {\n  opacity: 1;\n  background: transparent;\n}\n\n/* \u6c47\u7387\u8f6c\u6362\u6d6e\u52a8\u9762\u677f\uff1a\u4e0d\u906e\u7f69\u9875\u9762\uff0c\u53ef\u62d6\u52a8\uff0c\u53ef\u8fb9\u804a\u8fb9\u7528 */\n.wa-fx-overlay {\n  position: fixed;\n  inset: 0;\n  z-index: 2147483646;\n  background: transparent;\n  pointer-events: none;\n  display: block;\n  padding: 0;\n  box-sizing: border-box;\n}\n\n.wa-fx-modal {\n  position: fixed;\n  left: auto;\n  top: 72px;\n  right: 20px;\n  width: min(400px, calc(100vw - 24px));\n  max-height: min(86vh, 680px);\n  overflow: auto;\n  background: #fff;\n  color: #111b21;\n  border-radius: 16px;\n  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.28);\n  font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif;\n  display: flex;\n  flex-direction: column;\n  pointer-events: auto;\n  box-sizing: border-box;\n}\n\n.wa-fx-modal-head {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 12px;\n  padding: 16px 16px 8px;\n  flex-shrink: 0;\n  cursor: move;\n  user-select: none;\n  touch-action: none;\n}\n\n.wa-fx-modal-head.is-dragging {\n  cursor: grabbing;\n}\n\n.wa-fx-modal-title-wrap {\n  min-width: 0;\n}\n\n.wa-fx-modal-title {\n  font-size: 17px;\n  font-weight: 650;\n  line-height: 1.3;\n  color: #111b21;\n}\n\n.wa-fx-modal-subtitle {\n  margin-top: 4px;\n  font-size: 12px;\n  color: #667781;\n  line-height: 1.35;\n}\n\n.wa-fx-modal-close {\n  flex: 0 0 auto;\n  width: 32px;\n  height: 32px;\n  border: none;\n  border-radius: 50%;\n  background: rgba(11, 20, 26, 0.06);\n  color: #54656f;\n  font-size: 22px;\n  line-height: 1;\n  cursor: pointer;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  user-select: none;\n}\n\n.wa-fx-modal-close:hover {\n  background: rgba(11, 20, 26, 0.12);\n  color: #111b21;\n}\n\n.wa-fx-modal-body {\n  padding: 8px 16px 16px;\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n  min-height: 0;\n}\n\n.wa-fx-card {\n  background: #f0f2f5;\n  border-radius: 12px;\n  padding: 12px 14px;\n}\n\n.wa-fx-card-result {\n  background: rgba(18, 140, 126, 0.1);\n  border: 1px solid rgba(18, 140, 126, 0.18);\n  cursor: pointer;\n  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;\n  user-select: none;\n}\n\n.wa-fx-card-result:hover {\n  background: rgba(18, 140, 126, 0.16);\n  border-color: rgba(18, 140, 126, 0.32);\n}\n\n.wa-fx-card-result:active,\n.wa-fx-card-result.is-copied {\n  background: rgba(18, 140, 126, 0.22);\n  box-shadow: inset 0 0 0 1px rgba(18, 140, 126, 0.28);\n}\n\n.wa-fx-card-label {\n  font-size: 12px;\n  color: #667781;\n  margin-bottom: 8px;\n}\n\n.wa-fx-input-row {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n\n.wa-fx-amount-group {\n  display: inline-flex;\n  align-items: baseline;\n  gap: 4px;\n  flex: 0 0 auto;\n  min-width: 0;\n  max-width: 70%;\n}\n\n.wa-fx-amount-input {\n  flex: 0 0 auto;\n  min-width: 1ch;\n  width: auto;\n  max-width: 100%;\n  border: none;\n  background: transparent;\n  font-size: 28px;\n  font-weight: 600;\n  color: #111b21;\n  outline: none;\n  padding: 0;\n  line-height: 1.2;\n  font-variant-numeric: tabular-nums;\n  field-sizing: content;\n}\n\n.wa-fx-code-badge {\n  flex: 0 0 auto;\n  display: inline-flex;\n  align-items: baseline;\n  margin: 0;\n  padding: 0;\n  background: transparent;\n  color: #54656f;\n  font-size: 15px;\n  font-weight: 700;\n  letter-spacing: 0.02em;\n  line-height: 1.2;\n  font-variant-numeric: tabular-nums;\n  user-select: text;\n}\n\n.wa-fx-code-badge-target {\n  background: transparent;\n  color: #4f46e5;\n}\n\n.wa-fx-currency-picker {\n  position: relative;\n  flex: 0 0 auto;\n  margin-left: auto;\n  max-width: 70%;\n}\n\n.wa-fx-currency-select {\n  display: inline-flex;\n  align-items: center;\n  justify-content: flex-start;\n  flex: 0 0 auto;\n  width: auto;\n  min-width: 0;\n  max-width: 100%;\n  margin-left: 0;\n  box-sizing: border-box;\n  border: 1px solid rgba(0, 0, 0, 0.1);\n  border-radius: 20px;\n  background: #fff;\n  color: #111b21;\n  font-size: 13px;\n  font-weight: 600;\n  padding: 6px 28px 6px 10px;\n  cursor: pointer;\n  outline: none;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  position: relative;\n}\n\n.wa-fx-currency-select::after {\n  content: '';\n  position: absolute;\n  right: 10px;\n  top: 50%;\n  width: 0;\n  height: 0;\n  border-left: 4px solid transparent;\n  border-right: 4px solid transparent;\n  border-top: 5px solid currentColor;\n  transform: translateY(-40%);\n  opacity: 0.55;\n  pointer-events: none;\n}\n\n.wa-fx-currency-picker.is-open .wa-fx-currency-select {\n  border-color: rgba(18, 140, 126, 0.45);\n}\n\n.wa-fx-currency-dropdown {\n  position: absolute;\n  right: 0;\n  top: calc(100% + 6px);\n  z-index: 20;\n  width: min(280px, 78vw);\n  max-height: 260px;\n  display: flex;\n  flex-direction: column;\n  background: #fff;\n  border: 1px solid rgba(0, 0, 0, 0.1);\n  border-radius: 12px;\n  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);\n  overflow: hidden;\n}\n\n.wa-fx-currency-dropdown[hidden] {\n  display: none !important;\n}\n\n.wa-fx-currency-search {\n  flex: 0 0 auto;\n  width: 100%;\n  box-sizing: border-box;\n  border: none;\n  border-bottom: 1px solid rgba(0, 0, 0, 0.08);\n  padding: 10px 12px;\n  font-size: 13px;\n  outline: none;\n  color: #111b21;\n  background: #f7f8fa;\n}\n\n.wa-fx-currency-options {\n  flex: 1 1 auto;\n  overflow: auto;\n  max-height: 210px;\n  padding: 4px;\n}\n\n.wa-fx-currency-section {\n  padding: 8px 10px 4px;\n  font-size: 11px;\n  font-weight: 700;\n  letter-spacing: 0.04em;\n  color: #8696a0;\n  text-transform: none;\n}\n\n.wa-fx-currency-sep {\n  height: 1px;\n  margin: 6px 8px;\n  background: rgba(0, 0, 0, 0.08);\n}\n\n.wa-fx-currency-option {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  width: 100%;\n  border: none;\n  background: transparent;\n  text-align: left;\n  padding: 8px 8px 8px 10px;\n  border-radius: 8px;\n  cursor: pointer;\n  color: #111b21;\n  font-size: 13px;\n}\n\n.wa-fx-currency-option:hover,\n.wa-fx-currency-option.is-active {\n  background: rgba(18, 140, 126, 0.1);\n}\n\n.wa-fx-currency-option.is-pinned {\n  background: rgba(18, 140, 126, 0.06);\n}\n\n.wa-fx-currency-option-code {\n  flex: 0 0 auto;\n  min-width: 36px;\n  font-weight: 700;\n  letter-spacing: 0.02em;\n}\n\n.wa-fx-currency-option-name {\n  flex: 1 1 auto;\n  min-width: 0;\n  color: #667781;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.wa-fx-currency-pin {\n  flex: 0 0 auto;\n  width: 26px;\n  height: 26px;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  border: none;\n  border-radius: 50%;\n  background: transparent;\n  color: #8696a0;\n  cursor: pointer;\n  padding: 0;\n  line-height: 0;\n}\n\n.wa-fx-currency-pin:hover {\n  background: rgba(11, 20, 26, 0.06);\n  color: #4f46e5;\n}\n\n.wa-fx-currency-pin.is-on {\n  color: #4f46e5;\n}\n\n.wa-fx-currency-pin svg {\n  display: block;\n}\n\n.wa-fx-currency-empty {\n  padding: 14px 10px;\n  text-align: center;\n  color: #8696a0;\n  font-size: 12px;\n}\n\n.wa-fx-currency-select option {\n  white-space: normal;\n  font-weight: 500;\n}\n\n.wa-fx-arrow {\n  text-align: center;\n  color: #8696a0;\n  font-size: 16px;\n  line-height: 1;\n  user-select: none;\n}\n\n.wa-fx-result-row {\n  display: flex;\n  align-items: center;\n  justify-content: flex-start;\n  gap: 8px;\n  width: 100%;\n  max-width: 100%;\n}\n\n.wa-fx-result-amount {\n  flex: 0 1 auto;\n  min-width: 0;\n  max-width: 100%;\n  font-size: 28px;\n  font-weight: 700;\n  color: #312e81;\n  line-height: 1.2;\n  font-variant-numeric: tabular-nums;\n  word-break: break-all;\n  cursor: pointer;\n  border-radius: 6px;\n  padding: 0;\n}\n\n.wa-fx-result-amount:hover,\n.wa-fx-result-amount.is-copied {\n  background: rgba(18, 140, 126, 0.12);\n}\n\n.wa-fx-target-select {\n  flex: 0 0 auto;\n}\n\n.wa-fx-result-code {\n  flex: 0 0 auto;\n  font-size: 14px;\n  font-weight: 700;\n  color: #4f46e5;\n  letter-spacing: 0.02em;\n}\n\n.wa-fx-rate-hint {\n  margin-top: 8px;\n  font-size: 12px;\n  color: #667781;\n}\n\n.wa-fx-list-head {\n  margin-top: 4px;\n  font-size: 13px;\n  font-weight: 600;\n  color: #111b21;\n}\n\n.wa-fx-rate-list {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n  max-height: 240px;\n  overflow: auto;\n  border: 1px solid rgba(0, 0, 0, 0.06);\n  border-radius: 12px;\n  background: #fff;\n}\n\n.wa-fx-rate-item {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 10px;\n  padding: 10px 12px;\n  border-bottom: 1px solid rgba(0, 0, 0, 0.04);\n}\n\n.wa-fx-rate-item:last-child {\n  border-bottom: none;\n}\n\n.wa-fx-rate-item.is-local {\n  background: rgba(18, 140, 126, 0.08);\n}\n\n.wa-fx-rate-left {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  min-width: 0;\n}\n\n.wa-fx-rate-code {\n  font-size: 13px;\n  font-weight: 700;\n  color: #111b21;\n  min-width: 36px;\n}\n\n.wa-fx-rate-name {\n  font-size: 12px;\n  color: #667781;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.wa-fx-local-badge {\n  flex: 0 0 auto;\n  font-size: 10px;\n  font-weight: 650;\n  color: #312e81;\n  background: rgba(18, 140, 126, 0.16);\n  border-radius: 999px;\n  padding: 2px 6px;\n}\n\n.wa-fx-rate-right {\n  flex: 0 0 auto;\n  font-size: 12px;\n  font-weight: 600;\n  color: #111b21;\n  font-variant-numeric: tabular-nums;\n  white-space: nowrap;\n}\n\n.wa-fx-foot {\n  font-size: 11px;\n  color: #8696a0;\n  text-align: center;\n  margin-top: 2px;\n}\n\n.dark .wa-fx-modal,\n.wa-fx-overlay.dark .wa-fx-modal {\n  background: #1f2c34;\n  color: #e9edef;\n}\n\n.dark .wa-fx-modal-title,\n.wa-fx-overlay.dark .wa-fx-modal-title {\n  color: #e9edef;\n}\n\n.dark .wa-fx-modal-subtitle,\n.dark .wa-fx-card-label,\n.dark .wa-fx-rate-hint,\n.dark .wa-fx-rate-name,\n.dark .wa-fx-foot,\n.wa-fx-overlay.dark .wa-fx-modal-subtitle,\n.wa-fx-overlay.dark .wa-fx-card-label,\n.wa-fx-overlay.dark .wa-fx-rate-hint,\n.wa-fx-overlay.dark .wa-fx-rate-name,\n.wa-fx-overlay.dark .wa-fx-foot {\n  color: #8696a0;\n}\n\n.dark .wa-fx-modal-close,\n.wa-fx-overlay.dark .wa-fx-modal-close {\n  background: rgba(233, 237, 239, 0.08);\n  color: #aebac1;\n}\n\n.dark .wa-fx-modal-close:hover,\n.wa-fx-overlay.dark .wa-fx-modal-close:hover {\n  background: rgba(233, 237, 239, 0.14);\n  color: #e9edef;\n}\n\n.dark .wa-fx-card,\n.wa-fx-overlay.dark .wa-fx-card {\n  background: #111b21;\n}\n\n.dark .wa-fx-card-result,\n.wa-fx-overlay.dark .wa-fx-card-result {\n  background: rgba(37, 211, 102, 0.1);\n  border-color: rgba(37, 211, 102, 0.22);\n}\n\n.dark .wa-fx-card-result:hover,\n.wa-fx-overlay.dark .wa-fx-card-result:hover {\n  background: rgba(37, 211, 102, 0.16);\n  border-color: rgba(37, 211, 102, 0.35);\n}\n\n.dark .wa-fx-card-result:active,\n.dark .wa-fx-card-result.is-copied,\n.wa-fx-overlay.dark .wa-fx-card-result:active,\n.wa-fx-overlay.dark .wa-fx-card-result.is-copied {\n  background: rgba(37, 211, 102, 0.22);\n  box-shadow: inset 0 0 0 1px rgba(37, 211, 102, 0.3);\n}\n\n.dark .wa-fx-amount-input,\n.dark .wa-fx-list-head,\n.dark .wa-fx-rate-code,\n.dark .wa-fx-rate-right,\n.wa-fx-overlay.dark .wa-fx-amount-input,\n.wa-fx-overlay.dark .wa-fx-list-head,\n.wa-fx-overlay.dark .wa-fx-rate-code,\n.wa-fx-overlay.dark .wa-fx-rate-right {\n  color: #e9edef;\n}\n\n.dark .wa-fx-currency-select,\n.wa-fx-overlay.dark .wa-fx-currency-select {\n  background: #233138;\n  border-color: #3b4a54;\n  color: #e9edef;\n}\n\n.dark .wa-fx-currency-dropdown,\n.wa-fx-overlay.dark .wa-fx-currency-dropdown {\n  background: #1f2c34;\n  border-color: #3b4a54;\n  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.4);\n}\n\n.dark .wa-fx-currency-search,\n.wa-fx-overlay.dark .wa-fx-currency-search {\n  background: #111b21;\n  border-bottom-color: #3b4a54;\n  color: #e9edef;\n}\n\n.dark .wa-fx-currency-option,\n.wa-fx-overlay.dark .wa-fx-currency-option {\n  color: #e9edef;\n}\n\n.dark .wa-fx-currency-option:hover,\n.dark .wa-fx-currency-option.is-active,\n.wa-fx-overlay.dark .wa-fx-currency-option:hover,\n.wa-fx-overlay.dark .wa-fx-currency-option.is-active {\n  background: rgba(37, 211, 102, 0.14);\n}\n\n.dark .wa-fx-currency-option-name,\n.wa-fx-overlay.dark .wa-fx-currency-option-name,\n.dark .wa-fx-currency-empty,\n.wa-fx-overlay.dark .wa-fx-currency-empty,\n.dark .wa-fx-currency-section,\n.wa-fx-overlay.dark .wa-fx-currency-section {\n  color: #8696a0;\n}\n\n.dark .wa-fx-currency-sep,\n.wa-fx-overlay.dark .wa-fx-currency-sep {\n  background: rgba(233, 237, 239, 0.1);\n}\n\n.dark .wa-fx-currency-option.is-pinned,\n.wa-fx-overlay.dark .wa-fx-currency-option.is-pinned {\n  background: rgba(37, 211, 102, 0.08);\n}\n\n.dark .wa-fx-currency-pin,\n.wa-fx-overlay.dark .wa-fx-currency-pin {\n  color: #8696a0;\n}\n\n.dark .wa-fx-currency-pin:hover,\n.dark .wa-fx-currency-pin.is-on,\n.wa-fx-overlay.dark .wa-fx-currency-pin:hover,\n.wa-fx-overlay.dark .wa-fx-currency-pin.is-on {\n  color: #6366f1;\n}\n\n.dark .wa-fx-currency-pin:hover,\n.wa-fx-overlay.dark .wa-fx-currency-pin:hover {\n  background: rgba(233, 237, 239, 0.08);\n}\n\n.dark .wa-fx-code-badge,\n.wa-fx-overlay.dark .wa-fx-code-badge {\n  background: transparent;\n  color: #aebac1;\n}\n\n.dark .wa-fx-code-badge-target,\n.wa-fx-overlay.dark .wa-fx-code-badge-target {\n  background: transparent;\n  color: #6366f1;\n}\n\n.dark .wa-fx-result-amount,\n.wa-fx-overlay.dark .wa-fx-result-amount {\n  color: #6366f1;\n}\n\n.dark .wa-fx-result-amount:hover,\n.dark .wa-fx-result-amount.is-copied,\n.wa-fx-overlay.dark .wa-fx-result-amount:hover,\n.wa-fx-overlay.dark .wa-fx-result-amount.is-copied {\n  background: rgba(37, 211, 102, 0.14);\n}\n\n.dark .wa-fx-result-code,\n.wa-fx-overlay.dark .wa-fx-result-code {\n  color: #6366f1;\n}\n\n.dark .wa-fx-rate-list,\n.wa-fx-overlay.dark .wa-fx-rate-list {\n  background: #111b21;\n  border-color: rgba(233, 237, 239, 0.08);\n}\n\n.dark .wa-fx-rate-item,\n.wa-fx-overlay.dark .wa-fx-rate-item {\n  border-bottom-color: rgba(233, 237, 239, 0.06);\n}\n\n.dark .wa-fx-rate-item.is-local,\n.wa-fx-overlay.dark .wa-fx-rate-item.is-local {\n  background: rgba(37, 211, 102, 0.1);\n}\n\n.dark .wa-fx-local-badge,\n.wa-fx-overlay.dark .wa-fx-local-badge {\n  color: #6366f1;\n  background: rgba(37, 211, 102, 0.18);\n}";

    parent.appendChild(s);

  }





// ==================== 汇率转换 ====================

// 覆盖 areaCodeToCountry 中出现的全部货币 + 常用币种

const CURRENCY_META = {

  AED: { zh: '阿联酋迪拉姆', en: 'UAE Dirham', symbol: 'د.إ' },

  AFN: { zh: '阿富汗尼', en: 'Afghan Afghani', symbol: '؋' },

  ALL: { zh: '阿尔巴尼亚列克', en: 'Albanian Lek', symbol: 'L' },

  AMD: { zh: '亚美尼亚德拉姆', en: 'Armenian Dram', symbol: '֏' },

  AOA: { zh: '安哥拉宽扎', en: 'Angolan Kwanza', symbol: 'Kz' },

  ARS: { zh: '阿根廷比索', en: 'Argentine Peso', symbol: 'ARS$' },

  AUD: { zh: '澳元', en: 'Australian Dollar', symbol: 'A$' },

  AWG: { zh: '阿鲁巴弗罗林', en: 'Aruban Florin', symbol: 'ƒ' },

  AZN: { zh: '阿塞拜疆马纳特', en: 'Azerbaijani Manat', symbol: '₼' },

  BAM: { zh: '波黑可兑换马克', en: 'Bosnia-Herzegovina Convertible Mark', symbol: 'KM' },

  BBD: { zh: '巴巴多斯元', en: 'Barbadian Dollar', symbol: 'Bds$' },

  BDT: { zh: '孟加拉塔卡', en: 'Bangladeshi Taka', symbol: '৳' },

  BGN: { zh: '保加利亚列弗', en: 'Bulgarian Lev', symbol: 'лв' },

  BHD: { zh: '巴林第纳尔', en: 'Bahraini Dinar', symbol: 'BD' },

  BIF: { zh: '布隆迪法郎', en: 'Burundian Franc', symbol: 'FBu' },

  BMD: { zh: '百慕大元', en: 'Bermudian Dollar', symbol: 'BD$' },

  BND: { zh: '文莱元', en: 'Brunei Dollar', symbol: 'B$' },

  BOB: { zh: '玻利维亚诺', en: 'Bolivian Boliviano', symbol: 'Bs' },

  BRL: { zh: '巴西雷亚尔', en: 'Brazilian Real', symbol: 'R$' },

  BSD: { zh: '巴哈马元', en: 'Bahamian Dollar', symbol: 'B$' },

  BTN: { zh: '不丹努尔特鲁姆', en: 'Bhutanese Ngultrum', symbol: 'Nu.' },

  BWP: { zh: '博茨瓦纳普拉', en: 'Botswana Pula', symbol: 'P' },

  BYN: { zh: '白俄罗斯卢布', en: 'Belarusian Ruble', symbol: 'Br' },

  BZD: { zh: '伯利兹元', en: 'Belize Dollar', symbol: 'BZ$' },

  CAD: { zh: '加元', en: 'Canadian Dollar', symbol: 'C$' },

  CDF: { zh: '刚果法郎', en: 'Congolese Franc', symbol: 'FC' },

  CHF: { zh: '瑞士法郎', en: 'Swiss Franc', symbol: 'CHF' },

  CLP: { zh: '智利比索', en: 'Chilean Peso', symbol: 'CLP$' },

  CNY: { zh: '人民币', en: 'Chinese Yuan', symbol: '¥' },

  COP: { zh: '哥伦比亚比索', en: 'Colombian Peso', symbol: 'COL$' },

  CRC: { zh: '哥斯达黎加科朗', en: 'Costa Rican Colon', symbol: '₡' },

  CUP: { zh: '古巴比索', en: 'Cuban Peso', symbol: '$MN' },

  CVE: { zh: '佛得角埃斯库多', en: 'Cape Verdean Escudo', symbol: '$' },

  CZK: { zh: '捷克克朗', en: 'Czech Koruna', symbol: 'Kč' },

  DJF: { zh: '吉布提法郎', en: 'Djiboutian Franc', symbol: 'Fdj' },

  DKK: { zh: '丹麦克朗', en: 'Danish Krone', symbol: 'kr' },

  DOP: { zh: '多米尼加比索', en: 'Dominican Peso', symbol: 'RD$' },

  DZD: { zh: '阿尔及利亚第纳尔', en: 'Algerian Dinar', symbol: 'دج' },

  EGP: { zh: '埃及镑', en: 'Egyptian Pound', symbol: 'E£' },

  ERN: { zh: '厄立特里亚纳克法', en: 'Eritrean Nakfa', symbol: 'Nfk' },

  ETB: { zh: '埃塞俄比亚比尔', en: 'Ethiopian Birr', symbol: 'Br' },

  EUR: { zh: '欧元', en: 'Euro', symbol: '€' },

  FJD: { zh: '斐济元', en: 'Fijian Dollar', symbol: 'FJ$' },

  FKP: { zh: '福克兰群岛镑', en: 'Falkland Islands Pound', symbol: '£' },

  GBP: { zh: '英镑', en: 'British Pound', symbol: '£' },

  GEL: { zh: '格鲁吉亚拉里', en: 'Georgian Lari', symbol: '₾' },

  GHS: { zh: '加纳塞地', en: 'Ghanaian Cedi', symbol: '₵' },

  GIP: { zh: '直布罗陀镑', en: 'Gibraltar Pound', symbol: '£' },

  GMD: { zh: '冈比亚达拉西', en: 'Gambian Dalasi', symbol: 'D' },

  GNF: { zh: '几内亚法郎', en: 'Guinean Franc', symbol: 'FG' },

  GTQ: { zh: '危地马拉格查尔', en: 'Guatemalan Quetzal', symbol: 'Q' },

  GYD: { zh: '圭亚那元', en: 'Guyanese Dollar', symbol: 'G$' },

  HKD: { zh: '港币', en: 'Hong Kong Dollar', symbol: 'HK$' },

  HNL: { zh: '洪都拉斯伦皮拉', en: 'Honduran Lempira', symbol: 'L' },

  HTG: { zh: '海地古德', en: 'Haitian Gourde', symbol: 'G' },

  HUF: { zh: '匈牙利福林', en: 'Hungarian Forint', symbol: 'Ft' },

  IDR: { zh: '印尼盾', en: 'Indonesian Rupiah', symbol: 'Rp' },

  ILS: { zh: '以色列新谢克尔', en: 'Israeli Shekel', symbol: '₪' },

  INR: { zh: '印度卢比', en: 'Indian Rupee', symbol: '₹' },

  IQD: { zh: '伊拉克第纳尔', en: 'Iraqi Dinar', symbol: 'ع.د' },

  IRR: { zh: '伊朗里亚尔', en: 'Iranian Rial', symbol: '﷼' },

  ISK: { zh: '冰岛克朗', en: 'Icelandic Krona', symbol: 'kr' },

  JMD: { zh: '牙买加元', en: 'Jamaican Dollar', symbol: 'J$' },

  JOD: { zh: '约旦第纳尔', en: 'Jordanian Dinar', symbol: 'JD' },

  JPY: { zh: '日元', en: 'Japanese Yen', symbol: '¥' },

  KES: { zh: '肯尼亚先令', en: 'Kenyan Shilling', symbol: 'KSh' },

  KGS: { zh: '吉尔吉斯斯坦索姆', en: 'Kyrgyzstani Som', symbol: 'с' },

  KHR: { zh: '柬埔寨瑞尔', en: 'Cambodian Riel', symbol: '៛' },

  KMF: { zh: '科摩罗法郎', en: 'Comorian Franc', symbol: 'CF' },

  KPW: { zh: '朝鲜元', en: 'North Korean Won', symbol: '₩' },

  KRW: { zh: '韩元', en: 'South Korean Won', symbol: '₩' },

  KWD: { zh: '科威特第纳尔', en: 'Kuwaiti Dinar', symbol: 'KD' },

  KYD: { zh: '开曼群岛元', en: 'Cayman Islands Dollar', symbol: 'CI$' },

  KZT: { zh: '哈萨克斯坦坚戈', en: 'Kazakhstani Tenge', symbol: '₸' },

  LAK: { zh: '老挝基普', en: 'Lao Kip', symbol: '₭' },

  LBP: { zh: '黎巴嫩镑', en: 'Lebanese Pound', symbol: 'ل.ل' },

  LKR: { zh: '斯里兰卡卢比', en: 'Sri Lankan Rupee', symbol: 'Rs' },

  LRD: { zh: '利比里亚元', en: 'Liberian Dollar', symbol: 'L$' },

  LSL: { zh: '莱索托洛蒂', en: 'Lesotho Loti', symbol: 'L' },

  LYD: { zh: '利比亚第纳尔', en: 'Libyan Dinar', symbol: 'ل.د' },

  MAD: { zh: '摩洛哥迪拉姆', en: 'Moroccan Dirham', symbol: 'د.م.' },

  MDL: { zh: '摩尔多瓦列伊', en: 'Moldovan Leu', symbol: 'L' },

  MGA: { zh: '马达加斯加阿里亚里', en: 'Malagasy Ariary', symbol: 'Ar' },

  MKD: { zh: '北马其顿第纳尔', en: 'Macedonian Denar', symbol: 'ден' },

  MMK: { zh: '缅甸元', en: 'Myanmar Kyat', symbol: 'K' },

  MNT: { zh: '蒙古图格里克', en: 'Mongolian Tugrik', symbol: '₮' },

  MOP: { zh: '澳门元', en: 'Macanese Pataca', symbol: 'MOP$' },

  MRU: { zh: '毛里塔尼亚乌吉亚', en: 'Mauritanian Ouguiya', symbol: 'UM' },

  MUR: { zh: '毛里求斯卢比', en: 'Mauritian Rupee', symbol: '₨' },

  MVR: { zh: '马尔代夫拉菲亚', en: 'Maldivian Rufiyaa', symbol: 'Rf' },

  MWK: { zh: '马拉维克瓦查', en: 'Malawian Kwacha', symbol: 'MK' },

  MXN: { zh: '墨西哥比索', en: 'Mexican Peso', symbol: 'MX$' },

  MYR: { zh: '马来西亚林吉特', en: 'Malaysian Ringgit', symbol: 'RM' },

  MZN: { zh: '莫桑比克梅蒂卡尔', en: 'Mozambican Metical', symbol: 'MT' },

  NAD: { zh: '纳米比亚元', en: 'Namibian Dollar', symbol: 'N$' },

  NGN: { zh: '尼日利亚奈拉', en: 'Nigerian Naira', symbol: '₦' },

  NIO: { zh: '尼加拉瓜科多巴', en: 'Nicaraguan Cordoba', symbol: 'C$' },

  NOK: { zh: '挪威克朗', en: 'Norwegian Krone', symbol: 'kr' },

  NPR: { zh: '尼泊尔卢比', en: 'Nepalese Rupee', symbol: '₨' },

  NZD: { zh: '新西兰元', en: 'New Zealand Dollar', symbol: 'NZ$' },

  OMR: { zh: '阿曼里亚尔', en: 'Omani Rial', symbol: 'OMR' },

  PAB: { zh: '巴拿马巴尔博亚', en: 'Panamanian Balboa', symbol: 'B/.' },

  PEN: { zh: '秘鲁索尔', en: 'Peruvian Sol', symbol: 'S/' },

  PGK: { zh: '巴布亚新几内亚基那', en: 'Papua New Guinean Kina', symbol: 'K' },

  PHP: { zh: '菲律宾比索', en: 'Philippine Peso', symbol: '₱' },

  PKR: { zh: '巴基斯坦卢比', en: 'Pakistani Rupee', symbol: '₨' },

  PLN: { zh: '波兰兹罗提', en: 'Polish Zloty', symbol: 'zł' },

  PYG: { zh: '巴拉圭瓜拉尼', en: 'Paraguayan Guarani', symbol: '₲' },

  QAR: { zh: '卡塔尔里亚尔', en: 'Qatari Riyal', symbol: 'QR' },

  RON: { zh: '罗马尼亚列伊', en: 'Romanian Leu', symbol: 'lei' },

  RSD: { zh: '塞尔维亚第纳尔', en: 'Serbian Dinar', symbol: 'дин.' },

  RUB: { zh: '俄罗斯卢布', en: 'Russian Ruble', symbol: '₽' },

  RWF: { zh: '卢旺达法郎', en: 'Rwandan Franc', symbol: 'FRw' },

  SAR: { zh: '沙特里亚尔', en: 'Saudi Riyal', symbol: '﷼' },

  SBD: { zh: '所罗门群岛元', en: 'Solomon Islands Dollar', symbol: 'SI$' },

  SCR: { zh: '塞舌尔卢比', en: 'Seychellois Rupee', symbol: '₨' },

  SDG: { zh: '苏丹镑', en: 'Sudanese Pound', symbol: 'ج.س.' },

  SEK: { zh: '瑞典克朗', en: 'Swedish Krona', symbol: 'kr' },

  SGD: { zh: '新加坡元', en: 'Singapore Dollar', symbol: 'S$' },

  SHP: { zh: '圣赫勒拿镑', en: 'Saint Helena Pound', symbol: '£' },

  SLL: { zh: '塞拉利昂利昂', en: 'Sierra Leonean Leone', symbol: 'Le' },

  SOS: { zh: '索马里先令', en: 'Somali Shilling', symbol: 'Sh' },

  SRD: { zh: '苏里南元', en: 'Surinamese Dollar', symbol: '$' },

  SSP: { zh: '南苏丹镑', en: 'South Sudanese Pound', symbol: '£' },

  STN: { zh: '圣多美和普林西比多布拉', en: 'Sao Tome and Principe Dobra', symbol: 'Db' },

  SYP: { zh: '叙利亚镑', en: 'Syrian Pound', symbol: '£S' },

  SZL: { zh: '斯威士兰里兰吉尼', en: 'Swazi Lilangeni', symbol: 'E' },

  THB: { zh: '泰铢', en: 'Thai Baht', symbol: '฿' },

  TJS: { zh: '塔吉克斯坦索莫尼', en: 'Tajikistani Somoni', symbol: 'SM' },

  TMT: { zh: '土库曼斯坦马纳特', en: 'Turkmenistani Manat', symbol: 'm' },

  TND: { zh: '突尼斯第纳尔', en: 'Tunisian Dinar', symbol: 'د.ت' },

  TOP: { zh: '汤加潘加', en: 'Tongan Paʻanga', symbol: 'T$' },

  TRY: { zh: '土耳其里拉', en: 'Turkish Lira', symbol: '₺' },

  TWD: { zh: '新台币', en: 'New Taiwan Dollar', symbol: 'NT$' },

  TZS: { zh: '坦桑尼亚先令', en: 'Tanzanian Shilling', symbol: 'TSh' },

  UAH: { zh: '乌克兰格里夫纳', en: 'Ukrainian Hryvnia', symbol: '₴' },

  UGX: { zh: '乌干达先令', en: 'Ugandan Shilling', symbol: 'USh' },

  USD: { zh: '美元', en: 'US Dollar', symbol: '$' },

  UYU: { zh: '乌拉圭比索', en: 'Uruguayan Peso', symbol: '$U' },

  UZS: { zh: '乌兹别克斯坦苏姆', en: 'Uzbekistani Som', symbol: 'soʻm' },

  VES: { zh: '委内瑞拉玻利瓦尔', en: 'Venezuelan Bolivar', symbol: 'Bs.S' },

  VND: { zh: '越南盾', en: 'Vietnamese Dong', symbol: '₫' },

  VUV: { zh: '瓦努阿图瓦图', en: 'Vanuatu Vatu', symbol: 'VT' },

  WST: { zh: '萨摩亚塔拉', en: 'Samoan Tala', symbol: 'WS$' },

  XAF: { zh: '中非法郎', en: 'Central African CFA Franc', symbol: 'FCFA' },

  XCD: { zh: '东加勒比元', en: 'East Caribbean Dollar', symbol: 'EC$' },

  XOF: { zh: '西非法郎', en: 'West African CFA Franc', symbol: 'CFA' },

  XPF: { zh: '太平洋法郎', en: 'CFP Franc', symbol: '₣' },

  YER: { zh: '也门里亚尔', en: 'Yemeni Rial', symbol: '﷼' },

  ZAR: { zh: '南非兰特', en: 'South African Rand', symbol: 'R' },

  ZMW: { zh: '赞比亚克瓦查', en: 'Zambian Kwacha', symbol: 'ZK' },

  ZWL: { zh: '津巴布韦元', en: 'Zimbabwean Dollar', symbol: 'Z$' }

};



const COMMON_FX_CURRENCIES = [

  'USD', 'EUR', 'GBP', 'JPY', 'HKD', 'SGD', 'AUD', 'CAD',

  'KRW', 'MYR', 'THB', 'IDR', 'VND', 'INR', 'PHP', 'TWD',

  'RUB', 'BRL', 'MXN', 'TRY', 'SAR', 'AED', 'CHF', 'NZD'

];



function getCurrencyLabel(code, uiLang) {

  const c = String(code || '').toUpperCase();

  const meta = CURRENCY_META[c];

  if (!meta) return c;

  return prefersEnglishMeta(uiLang) ? `${c} · ${meta.en}` : `${c} · ${meta.zh}`;

}



function getCurrencyShortName(code, uiLang) {

  const c = String(code || '').toUpperCase();

  const meta = CURRENCY_META[c];

  if (!meta) return c;

  return prefersEnglishMeta(uiLang) ? meta.en : meta.zh;

}



function formatFxAmount(value, currencyCode) {

  const n = Number(value);

  if (!Number.isFinite(n)) return '—';

  const code = String(currencyCode || '').toUpperCase();

  let maxFrac = 2;

  if (n !== 0 && Math.abs(n) < 0.01) maxFrac = 6;

  else if (Math.abs(n) < 1) maxFrac = 4;

  else if (['JPY', 'KRW', 'VND', 'IDR', 'CLP', 'PYG', 'UGX'].includes(code)) maxFrac = 0;

  try {

    return new Intl.NumberFormat(undefined, {

      minimumFractionDigits: 0,

      maximumFractionDigits: maxFrac

    }).format(n);

  } catch (_) {

    return String(Number(n.toFixed(maxFrac)));

  }

}



function fxLsGet(key, fallback) {

  try {

    var raw = localStorage.getItem(key);

    if (raw == null || raw === '') return fallback;

    return JSON.parse(raw);

  } catch (_) {

    return fallback;

  }

}

function fxLsSet(key, value) {

  try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}

}

function fetchExchangeRatesViaBackground(base) {

  var baseCode = String(base || 'CNY').toUpperCase();

  var cacheKey = 'fx_rates_cache_' + baseCode;

  var CACHE_TTL_MS = 60 * 60 * 1000;

  return (async function () {

    var cached = fxLsGet(cacheKey, null);

    if (cached && cached.rates && cached.updatedAt && (Date.now() - cached.updatedAt) < CACHE_TTL_MS) {

      return { ok: true, base: cached.base || baseCode, rates: cached.rates, updatedAt: cached.updatedAt, cached: true };

    }

    var invoke = null;

    try {

      invoke = (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke)

        || (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke);

    } catch (_) {}

    if (typeof invoke !== 'function') {

      if (cached && cached.rates) {

        return { ok: true, base: cached.base || baseCode, rates: cached.rates, updatedAt: cached.updatedAt || 0, cached: true, stale: true };

      }

      throw new Error('rate_fetch_failed');

    }

    var resp = await invoke('fetch_fx_rates', { base: baseCode });

    if (!resp || !resp.ok || !resp.rates) {

      if (cached && cached.rates) {

        return { ok: true, base: cached.base || baseCode, rates: cached.rates, updatedAt: cached.updatedAt || 0, cached: true, stale: true };

      }

      throw new Error((resp && resp.error) || 'rate_fetch_failed');

    }

    var blob = {

      base: String(resp.base || baseCode).toUpperCase(),

      rates: resp.rates,

      updatedAt: resp.updatedAt || Date.now(),

      source: resp.source || ''

    };

    fxLsSet(cacheKey, blob);

    return { ok: true, base: blob.base, rates: blob.rates, updatedAt: blob.updatedAt, cached: false, source: blob.source };

  })();

}



function showCurrencyConverterPopup(opts) {

  try {

    ensureFxStyles();

    const existing = document.querySelector('.wa-fx-overlay');

    if (existing) {

      try { existing.remove(); } catch (_) {}

      return;

    }



    const currencyDetected = !!(opts && opts.currencyDetected);

    const initialFromOpts = String((opts && opts.localCurrency) || '').toUpperCase();

    let localCurrency = initialFromOpts || 'USD';

    let uiLang = 'zh';



    const tp = (key, fallback) => tPage(uiLang, key, fallback);

    const currencyMetaLang = () => (prefersEnglishMeta(uiLang) ? 'en' : 'zh');



    const isDarkMode = (() => {

      try {

        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (prefersDark) return true;

        const html = document.documentElement;

        const body = document.body;

        return (html && (html.classList.contains('dark') || html.getAttribute('data-color-mode') === 'dark'))

          || (body && (body.classList.contains('dark') || (body.dataset && body.dataset.theme === 'dark')));

      } catch (_) {

        return false;

      }

    })();



    const overlay = document.createElement('div');

    overlay.className = 'wa-fx-overlay' + (isDarkMode ? ' dark' : '');



    const modal = document.createElement('div');

    modal.className = 'wa-fx-modal';

    modal.setAttribute('role', 'dialog');

    modal.setAttribute('aria-modal', 'false');



    const head = document.createElement('div');

    head.className = 'wa-fx-modal-head';

    head.title = tp('fxDragHint', '按住拖动面板');



    const titleWrap = document.createElement('div');

    titleWrap.className = 'wa-fx-modal-title-wrap';

    const title = document.createElement('div');

    title.className = 'wa-fx-modal-title';

    title.textContent = tp('fxTitle', '汇率转换');

    const subtitle = document.createElement('div');

    subtitle.className = 'wa-fx-modal-subtitle';

    titleWrap.appendChild(title);

    titleWrap.appendChild(subtitle);



    const closeBtn = document.createElement('button');

    closeBtn.type = 'button';

    closeBtn.className = 'wa-fx-modal-close';

    closeBtn.setAttribute('aria-label', tp('fxClose', '关闭'));

    closeBtn.textContent = '×';



    head.appendChild(titleWrap);

    head.appendChild(closeBtn);



    const body = document.createElement('div');

    body.className = 'wa-fx-modal-body';



    // 金额 + 源货币

    const fromCard = document.createElement('div');

    fromCard.className = 'wa-fx-card';

    const fromLabel = document.createElement('div');

    fromLabel.className = 'wa-fx-card-label';

    fromLabel.textContent = tp('fxAmount', '金额');

    const fromRow = document.createElement('div');

    fromRow.className = 'wa-fx-input-row';

    const amountInput = document.createElement('input');

    amountInput.type = 'text';

    amountInput.inputMode = 'decimal';

    amountInput.className = 'wa-fx-amount-input';

    amountInput.value = '100';

    amountInput.placeholder = '100*0.2';

    amountInput.setAttribute('aria-label', tp('fxAmount', '金额'));

    amountInput.title = tp('fxAmountHint', '支持四则运算，如 100*0.2、100/1.2、100+50');



    const currencyOptions = [];

    const pushCurrencyOpt = (code) => {

      const c = String(code || '').toUpperCase();

      if (!c || currencyOptions.includes(c)) return;

      currencyOptions.push(c);

    };

    pushCurrencyOpt('CNY');

    pushCurrencyOpt(localCurrency);

    COMMON_FX_CURRENCIES.forEach(pushCurrencyOpt);

    Object.keys(CURRENCY_META).forEach(pushCurrencyOpt);



    let openCurrencyPicker = null;

    let selectMeasureEl = null;

    let pinnedCurrencies = [];

    const pickerRegistry = [];



    function normalizePinnedList(list) {

      const out = [];

      (Array.isArray(list) ? list : []).forEach((code) => {

        const c = String(code || '').toUpperCase();

        if (c && !out.includes(c)) out.push(c);

      });

      return out;

    }



    function persistPinnedCurrencies() {

      try {

        fxLsSet('fx_pinned_currencies', pinnedCurrencies.slice() );

      } catch (_) {}

    }



    function isCurrencyPinned(code) {

      return pinnedCurrencies.indexOf(String(code || '').toUpperCase()) !== -1;

    }



    function toggleCurrencyPin(code) {

      const c = String(code || '').toUpperCase();

      if (!c) return;

      const idx = pinnedCurrencies.indexOf(c);

      if (idx === -1) pinnedCurrencies.push(c);

      else pinnedCurrencies.splice(idx, 1);

      persistPinnedCurrencies();

      pickerRegistry.forEach((p) => {

        try {

          if (p && typeof p.__rerenderOptions === 'function') p.__rerenderOptions();

        } catch (_) {}

      });

    }



    function createSearchableCurrencyPicker({ value, ariaLabel, extraClass }) {

      const picker = document.createElement('div');

      picker.className = 'wa-fx-currency-picker' + (extraClass ? ` ${extraClass}` : '');

      let current = String(value || 'CNY').toUpperCase();



      const trigger = document.createElement('button');

      trigger.type = 'button';

      trigger.className = 'wa-fx-currency-select';

      trigger.setAttribute('aria-label', ariaLabel || '');

      trigger.setAttribute('aria-haspopup', 'listbox');

      trigger.setAttribute('aria-expanded', 'false');



      const dropdown = document.createElement('div');

      dropdown.className = 'wa-fx-currency-dropdown';

      dropdown.hidden = true;



      const search = document.createElement('input');

      search.type = 'text';

      search.className = 'wa-fx-currency-search';

      search.placeholder = tp('fxSearchPlaceholder', '搜索代码或名称');

      search.setAttribute('aria-label', tp('fxSearchCurrency', '搜索货币'));

      search.autocomplete = 'off';



      const optionsBox = document.createElement('div');

      optionsBox.className = 'wa-fx-currency-options';

      optionsBox.setAttribute('role', 'listbox');



      dropdown.appendChild(search);

      dropdown.appendChild(optionsBox);

      picker.appendChild(trigger);

      picker.appendChild(dropdown);



      function labelOf(code) {

        return getCurrencyLabel(code, currencyMetaLang());

      }



      function matchCurrency(code, q) {

        if (!q) return true;

        const meta = CURRENCY_META[code] || {};

        const hay = [

          code,

          meta.zh || '',

          meta.en || '',

          labelOf(code)

        ].join(' ').toLowerCase();

        return hay.includes(q);

      }



      function updateTrigger() {

        const text = labelOf(current);

        trigger.textContent = text;

        trigger.title = text;

        trigger.dataset.value = current;

      }



      function appendOptionRow(code, { pinned }) {

        const item = document.createElement('button');

        item.type = 'button';

        item.className = 'wa-fx-currency-option'

          + (code === current ? ' is-active' : '')

          + (pinned ? ' is-pinned' : '');

        item.setAttribute('role', 'option');

        item.setAttribute('aria-selected', code === current ? 'true' : 'false');

        item.dataset.code = code;



        const codeEl = document.createElement('span');

        codeEl.className = 'wa-fx-currency-option-code';

        codeEl.textContent = code;

        const nameEl = document.createElement('span');

        nameEl.className = 'wa-fx-currency-option-name';

        nameEl.textContent = getCurrencyShortName(code, currencyMetaLang());



        const pinBtn = document.createElement('button');

        pinBtn.type = 'button';

        pinBtn.className = 'wa-fx-currency-pin' + (pinned ? ' is-on' : '');

        pinBtn.title = pinned

          ? tp('fxUnpin', '取消置顶')

          : tp('fxPin', '置顶');

        pinBtn.setAttribute('aria-label', pinBtn.title);

        pinBtn.innerHTML = pinned

          ? '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/></svg>'

          : '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M14 4v5c0 1.12.37 2.16 1 3H9c.65-.86 1-1.9 1-3V4h4m3-2H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3V4h1c.55 0 1-.45 1-1s-.45-1-1-1z" opacity=".45"/></svg>';



        pinBtn.addEventListener('mousedown', (e) => {

          e.preventDefault();

          e.stopPropagation();

        });

        pinBtn.addEventListener('click', (e) => {

          e.preventDefault();

          e.stopPropagation();

          toggleCurrencyPin(code);

        });



        item.appendChild(codeEl);

        item.appendChild(nameEl);

        item.appendChild(pinBtn);

        item.addEventListener('mousedown', (e) => {

          e.preventDefault();

          e.stopPropagation();

        });

        item.addEventListener('click', (e) => {

          if (e.target && e.target.closest && e.target.closest('.wa-fx-currency-pin')) return;

          e.preventDefault();

          e.stopPropagation();

          setValue(code, true);

          closeDropdown();

        });

        optionsBox.appendChild(item);

      }



      function renderOptions(filterText) {

        const q = String(filterText || '').trim().toLowerCase();

        optionsBox.innerHTML = '';

        const pinnedSet = new Set(pinnedCurrencies);

        const pinnedMatched = pinnedCurrencies.filter((code) => {

          if (!currencyOptions.includes(code) && !CURRENCY_META[code]) return false;

          return matchCurrency(code, q);

        });

        const otherMatched = currencyOptions.filter((code) => {

          if (pinnedSet.has(code)) return false;

          return matchCurrency(code, q);

        });



        let shown = 0;

        if (pinnedMatched.length) {

          const head = document.createElement('div');

          head.className = 'wa-fx-currency-section';

          head.textContent = tp('fxPinned', '置顶');

          optionsBox.appendChild(head);

          pinnedMatched.forEach((code) => {

            shown += 1;

            appendOptionRow(code, { pinned: true });

          });

          if (otherMatched.length) {

            const sep = document.createElement('div');

            sep.className = 'wa-fx-currency-sep';

            sep.setAttribute('aria-hidden', 'true');

            optionsBox.appendChild(sep);

            const allHead = document.createElement('div');

            allHead.className = 'wa-fx-currency-section';

            allHead.textContent = tp('fxAllCurrencies', '全部货币');

            optionsBox.appendChild(allHead);

          }

        }

        otherMatched.forEach((code) => {

          shown += 1;

          appendOptionRow(code, { pinned: false });

        });



        if (!shown) {

          const empty = document.createElement('div');

          empty.className = 'wa-fx-currency-empty';

          empty.textContent = tp('fxNoMatch', '无匹配货币');

          optionsBox.appendChild(empty);

        }

      }



      function closeDropdown() {

        if (dropdown.hidden) return;

        dropdown.hidden = true;

        trigger.setAttribute('aria-expanded', 'false');

        picker.classList.remove('is-open');

        if (openCurrencyPicker === picker) openCurrencyPicker = null;

        search.value = '';

      }



      function openDropdown() {

        if (openCurrencyPicker && openCurrencyPicker !== picker && typeof openCurrencyPicker.__closeDropdown === 'function') {

          openCurrencyPicker.__closeDropdown();

        }

        dropdown.hidden = false;

        trigger.setAttribute('aria-expanded', 'true');

        picker.classList.add('is-open');

        openCurrencyPicker = picker;

        renderOptions('');

        setTimeout(() => {

          try { search.focus(); search.select(); } catch (_) {}

        }, 0);

      }



      function setValue(code, emitChange) {

        const next = String(code || '').toUpperCase() || current;

        const changed = next !== current;

        current = next;

        updateTrigger();

        fitPickerWidth();

        if (emitChange && changed) {

          try {

            picker.dispatchEvent(new Event('change', { bubbles: true }));

          } catch (_) {}

        }

      }



      function fitPickerWidth() {

        try {

          if (!selectMeasureEl) {

            selectMeasureEl = document.createElement('span');

            selectMeasureEl.setAttribute('aria-hidden', 'true');

            selectMeasureEl.style.cssText = [

              'position:absolute',

              'left:-99999px',

              'top:0',

              'visibility:hidden',

              'white-space:nowrap',

              'pointer-events:none'

            ].join(';');

            document.body.appendChild(selectMeasureEl);

          }

          const cs = window.getComputedStyle(trigger);

          selectMeasureEl.style.font = cs.font

            || `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;

          selectMeasureEl.style.letterSpacing = cs.letterSpacing;

          selectMeasureEl.textContent = trigger.textContent || current;

          const textW = Math.ceil(selectMeasureEl.getBoundingClientRect().width);

          const pad = 34;

          const parentW = picker.parentElement

            ? picker.parentElement.getBoundingClientRect().width

            : 360;

          const maxW = Math.max(100, Math.floor(parentW - 110));

          const nextW = Math.min(Math.max(textW + pad, 88), maxW);

          trigger.style.width = `${nextW}px`;

        } catch (_) {}

      }



      Object.defineProperty(picker, 'value', {

        get() { return current; },

        set(v) { setValue(v, false); },

        configurable: true

      });

      picker.__refreshLabels = () => {

        search.placeholder = tp('fxSearchPlaceholder', '搜索代码或名称');

        updateTrigger();

        if (!dropdown.hidden) renderOptions(search.value);

        fitPickerWidth();

      };

      picker.__rerenderOptions = () => {

        if (!dropdown.hidden) renderOptions(search.value);

      };

      picker.__fitWidth = fitPickerWidth;

      picker.__closeDropdown = closeDropdown;

      pickerRegistry.push(picker);



      trigger.addEventListener('click', (e) => {

        e.preventDefault();

        e.stopPropagation();

        if (dropdown.hidden) openDropdown();

        else closeDropdown();

      });

      search.addEventListener('input', () => renderOptions(search.value));

      search.addEventListener('keydown', (e) => {

        if (e.key === 'Escape') {

          e.preventDefault();

          e.stopPropagation();

          closeDropdown();

          try { trigger.focus(); } catch (_) {}

        } else if (e.key === 'Enter') {

          e.preventDefault();

          const first = optionsBox.querySelector('.wa-fx-currency-option');

          if (first && first.dataset.code) {

            setValue(first.dataset.code, true);

            closeDropdown();

          }

        }

      });

      dropdown.addEventListener('click', (e) => e.stopPropagation());

      dropdown.addEventListener('mousedown', (e) => e.stopPropagation());



      updateTrigger();

      return picker;

    }



    const fromSelect = createSearchableCurrencyPicker({

      value: 'CNY',

      ariaLabel: tp('fxFromCurrency', '源货币')

    });

    const toSelect = createSearchableCurrencyPicker({

      value: localCurrency,

      ariaLabel: tp('fxToCurrency', '目标货币'),

      extraClass: 'wa-fx-target-select'

    });



    const fromAmountGroup = document.createElement('div');

    fromAmountGroup.className = 'wa-fx-amount-group';

    fromAmountGroup.appendChild(amountInput);

    const fromCodeBadge = document.createElement('span');

    fromCodeBadge.className = 'wa-fx-code-badge';

    fromCodeBadge.textContent = fromSelect.value || 'CNY';

    fromAmountGroup.appendChild(fromCodeBadge);

    fromRow.appendChild(fromAmountGroup);

    fromRow.appendChild(fromSelect);

    fromCard.appendChild(fromLabel);

    fromCard.appendChild(fromRow);



    const arrow = document.createElement('div');

    arrow.className = 'wa-fx-arrow';

    arrow.textContent = '↓';

    arrow.setAttribute('aria-hidden', 'true');



    // 结果：目标货币（可选手动选择；点击金额区复制）

    const toCard = document.createElement('div');

    toCard.className = 'wa-fx-card wa-fx-card-result';

    toCard.title = tp('fxClickToCopy', '点击金额可复制');

    const toLabel = document.createElement('div');

    toLabel.className = 'wa-fx-card-label';

    toLabel.textContent = tp('fxTargetClickCopy', '目标货币 · 点击金额复制');

    const toRow = document.createElement('div');

    toRow.className = 'wa-fx-result-row';

    const resultAmount = document.createElement('div');

    resultAmount.className = 'wa-fx-result-amount';

    resultAmount.textContent = '—';

    resultAmount.setAttribute('role', 'button');

    resultAmount.setAttribute('tabindex', '0');

    resultAmount.title = tp('fxClickCopyAmount', '点击复制金额');

    const toCodeBadge = document.createElement('span');

    toCodeBadge.className = 'wa-fx-code-badge wa-fx-code-badge-target';

    toCodeBadge.textContent = localCurrency;

    const rateHint = document.createElement('div');

    rateHint.className = 'wa-fx-rate-hint';

    rateHint.textContent = tp('fxLoadingRates', '加载汇率中…');

    const toAmountGroup = document.createElement('div');

    toAmountGroup.className = 'wa-fx-amount-group';

    toAmountGroup.appendChild(resultAmount);

    toAmountGroup.appendChild(toCodeBadge);

    toRow.appendChild(toAmountGroup);

    toRow.appendChild(toSelect);

    toCard.appendChild(toLabel);

    toCard.appendChild(toRow);

    toCard.appendChild(rateHint);



    // 参考汇率列表

    const listHead = document.createElement('div');

    listHead.className = 'wa-fx-list-head';

    listHead.textContent = tp('fxRefRates', '参考汇率（兑目标货币）');



    const list = document.createElement('div');

    list.className = 'wa-fx-rate-list';



    const foot = document.createElement('div');

    foot.className = 'wa-fx-foot';

    foot.textContent = '';



    body.appendChild(fromCard);

    body.appendChild(arrow);

    body.appendChild(toCard);

    body.appendChild(listHead);

    body.appendChild(list);

    body.appendChild(foot);



    modal.appendChild(head);

    modal.appendChild(body);

    overlay.appendChild(modal);

    document.body.appendChild(overlay);



    let ratesByBase = null; // { base, rates: { CODE: number }, updatedAt }

    let loading = false;

    let lastCopiedText = '';

    let copyResetTimer = null;



    function fitAmountInputWidth() {

      try {

        if (!selectMeasureEl) {

          selectMeasureEl = document.createElement('span');

          selectMeasureEl.setAttribute('aria-hidden', 'true');

          selectMeasureEl.style.cssText = [

            'position:absolute',

            'left:-99999px',

            'top:0',

            'visibility:hidden',

            'white-space:nowrap',

            'pointer-events:none'

          ].join(';');

          document.body.appendChild(selectMeasureEl);

        }

        const cs = window.getComputedStyle(amountInput);

        selectMeasureEl.style.font = cs.font

          || `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;

        selectMeasureEl.style.letterSpacing = cs.letterSpacing;

        const raw = String(amountInput.value || '');

        // 空值时按 placeholder 估宽，避免塌成一条线

        selectMeasureEl.textContent = raw.length ? raw : (amountInput.placeholder || '0');

        const textW = Math.ceil(selectMeasureEl.getBoundingClientRect().width);

        const nextW = Math.max(textW + 4, 24);

        amountInput.style.width = `${nextW}px`;

      } catch (_) {}

    }



    function syncCurrencyCodeBadges() {

      try {

        fromCodeBadge.textContent = String(fromSelect.value || '').toUpperCase() || '—';

      } catch (_) {}

      try {

        toCodeBadge.textContent = String(toSelect.value || localCurrency || '').toUpperCase() || '—';

      } catch (_) {}

    }



    function fitCurrencySelects() {

      fitAmountInputWidth();

      try { fromSelect.__fitWidth && fromSelect.__fitWidth(); } catch (_) {}

      try { toSelect.__fitWidth && toSelect.__fitWidth(); } catch (_) {}

      syncCurrencyCodeBadges();

    }



    function closeOpenCurrencyPicker() {

      try {

        if (openCurrencyPicker && typeof openCurrencyPicker.__closeDropdown === 'function') {

          openCurrencyPicker.__closeDropdown();

        }

      } catch (_) {}

    }



    function updateSubtitle() {

      const metaLang = currencyMetaLang();

      const label = getCurrencyLabel(localCurrency, metaLang);

      if (currencyDetected && localCurrency === initialFromOpts) {

        subtitle.textContent = tp('fxSubtitleLocal', '当地货币 · {label}').replace('{label}', label);

      } else if (currencyDetected) {

        subtitle.textContent = tp('fxSubtitleManual', '目标货币 · {label}（已手动调整）').replace('{label}', label);

      } else {

        subtitle.textContent = tp('fxSubtitleUnknown', '未识别对方货币，请手动选择 · {label}').replace('{label}', label);

      }

    }



    function persistManualTarget(code) {

      const c = String(code || '').toUpperCase();

      if (!c) return;

      try {

        fxLsSet('fx_manual_target_currency', c);

      } catch (_) {}

    }



    function setTargetCurrency(code, { persist } = {}) {

      const next = String(code || '').toUpperCase() || 'USD';

      localCurrency = next;

      if (toSelect.value !== next) toSelect.value = next;

      if (persist) persistManualTarget(next);

      updateSubtitle();

      fitCurrencySelects();

      render();

    }



    function copyTextToClipboard(text) {

      const value = String(text || '');

      if (!value || value === '—') return Promise.reject(new Error('empty'));

      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {

        return navigator.clipboard.writeText(value);

      }

      return new Promise((resolve, reject) => {

        try {

          const ta = document.createElement('textarea');

          ta.value = value;

          ta.setAttribute('readonly', '');

          ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';

          document.body.appendChild(ta);

          ta.select();

          const ok = document.execCommand('copy');

          ta.remove();

          if (ok) resolve();

          else reject(new Error('copy_failed'));

        } catch (e) {

          reject(e);

        }

      });

    }



    function flashCopiedFeedback() {

      toLabel.textContent = tp('fxCopied', '已复制到剪贴板');

      resultAmount.classList.add('is-copied');

      toCard.classList.add('is-copied');

      if (copyResetTimer) clearTimeout(copyResetTimer);

      copyResetTimer = setTimeout(() => {

        toLabel.textContent = tp('fxTargetClickCopy', '目标货币 · 点击金额复制');

        resultAmount.classList.remove('is-copied');

        toCard.classList.remove('is-copied');

      }, 1200);

    }



    async function copyLocalResult() {

      const text = lastCopiedText

        || (() => {

          const amt = String(resultAmount.textContent || '').trim().replace(/,/g, '');

          if (!amt || amt === '—') return '';

          return `${amt} ${localCurrency}`;

        })();

      if (!text || text === '—') return;

      try {

        await copyTextToClipboard(text);

        flashCopiedFeedback();

      } catch (e) {

        console.warn('复制当地货币金额失败:', e);

        toLabel.textContent = tp('fxCopyFailed', '复制失败');

        if (copyResetTimer) clearTimeout(copyResetTimer);

        copyResetTimer = setTimeout(() => {

          toLabel.textContent = tp('fxTargetClickCopy', '目标货币 · 点击金额复制');

        }, 1200);

      }

    }



    resultAmount.addEventListener('click', (e) => {

      e.preventDefault();

      e.stopPropagation();

      copyLocalResult();

    });

    resultAmount.addEventListener('keydown', (e) => {

      if (e.key === 'Enter' || e.key === ' ') {

        e.preventDefault();

        e.stopPropagation();

        copyLocalResult();

      }

    });

    toSelect.addEventListener('change', () => {

      setTargetCurrency(toSelect.value, { persist: true });

    });



    function close() {

      try { closeOpenCurrencyPicker(); } catch (_) {}

      try {

        document.removeEventListener('mousemove', onFxDragMove, true);

        document.removeEventListener('mouseup', onFxDragEnd, true);

        document.removeEventListener('touchmove', onFxDragMove, true);

        document.removeEventListener('touchend', onFxDragEnd, true);

      } catch (_) {}

      try { overlay.remove(); } catch (_) {}

      document.removeEventListener('keydown', onKey);

      if (copyResetTimer) clearTimeout(copyResetTimer);

      try { if (selectMeasureEl) selectMeasureEl.remove(); } catch (_) {}

      selectMeasureEl = null;

    }



    function onKey(e) {

      if (e.key === 'Escape') {

        if (openCurrencyPicker) {

          closeOpenCurrencyPicker();

          return;

        }

        // 输入框聚焦时不误关面板，方便聊天中途再回来用

        const ae = document.activeElement;

        if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) {

          if (!modal.contains(ae)) return;

        }

        close();

      }

    }



    closeBtn.addEventListener('click', (e) => {

      e.preventDefault();

      e.stopPropagation();

      close();

    });

    modal.addEventListener('click', (e) => {

      e.stopPropagation();

      if (openCurrencyPicker && !e.target.closest('.wa-fx-currency-picker')) {

        closeOpenCurrencyPicker();

      }

    });

    document.addEventListener('keydown', onKey);



    // 拖动面板（标题栏），不遮罩页面，可边聊边用

    let fxDrag = null;

    function clampFxPanel(left, top) {

      const rect = modal.getBoundingClientRect();

      const w = rect.width || 360;

      const h = rect.height || 200;

      const maxL = Math.max(8, window.innerWidth - w - 8);

      const maxT = Math.max(8, window.innerHeight - Math.min(h, window.innerHeight - 16) - 8);

      return {

        left: Math.min(Math.max(8, left), maxL),

        top: Math.min(Math.max(8, top), maxT)

      };

    }

    function applyFxPanelPos(left, top) {

      const p = clampFxPanel(left, top);

      modal.style.left = `${p.left}px`;

      modal.style.top = `${p.top}px`;

      modal.style.right = 'auto';

      modal.style.bottom = 'auto';

      modal.style.transform = 'none';

      return p;

    }

    function persistFxPanelPos(left, top) {

      try {

        fxLsSet('fx_panel_pos', { left: left, top: top });

      } catch (_) {}

    }

    function getEventPoint(e) {

      if (e.touches && e.touches[0]) {

        return { x: e.touches[0].clientX, y: e.touches[0].clientY };

      }

      if (e.changedTouches && e.changedTouches[0]) {

        return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };

      }

      return { x: e.clientX, y: e.clientY };

    }

    function onFxDragMove(e) {

      if (!fxDrag) return;

      try {

        const pt = getEventPoint(e);

        applyFxPanelPos(pt.x - fxDrag.ox, pt.y - fxDrag.oy);

        if (e.cancelable) e.preventDefault();

      } catch (_) {}

    }

    function onFxDragEnd(e) {

      if (!fxDrag) return;

      head.classList.remove('is-dragging');

      fxDrag = null;

      try {

        const rect = modal.getBoundingClientRect();

        persistFxPanelPos(rect.left, rect.top);

      } catch (_) {}

    }

    function startFxDrag(e) {

      if (e.button != null && e.button !== 0) return;

      if (e.target && e.target.closest && e.target.closest('.wa-fx-modal-close')) return;

      try {

        const rect = modal.getBoundingClientRect();

        const pt = getEventPoint(e);

        fxDrag = { ox: pt.x - rect.left, oy: pt.y - rect.top };

        head.classList.add('is-dragging');

        applyFxPanelPos(rect.left, rect.top);

        if (e.cancelable) e.preventDefault();

        e.stopPropagation();

      } catch (_) {}

    }

    head.addEventListener('mousedown', startFxDrag);

    head.addEventListener('touchstart', startFxDrag, { passive: false });

    document.addEventListener('mousemove', onFxDragMove, true);

    document.addEventListener('mouseup', onFxDragEnd, true);

    document.addEventListener('touchmove', onFxDragMove, true);

    document.addEventListener('touchend', onFxDragEnd, true);



    try {

      (function(){ var res = { fx_panel_pos: fxLsGet('fx_panel_pos', null) };

        const pos = res && res.fx_panel_pos;

        if (pos && Number.isFinite(pos.left) && Number.isFinite(pos.top)) {

          applyFxPanelPos(pos.left, pos.top);

        }

       })();

    } catch (_) {}



    function parseAmount(raw) {

      const s = String(raw || '')

        .trim()

        .replace(/,/g, '')

        .replace(/×/g, '*')

        .replace(/÷/g, '/')

        .replace(/（/g, '(')

        .replace(/）/g, ')')

        .replace(/\s+/g, '');

      if (!s) return NaN;

      // 仅允许数字与四则运算 / 括号，避免 eval

      if (!/^[0-9+\-*/().]+$/.test(s)) return NaN;

      try {

        let i = 0;

        const peek = () => s[i];

        const consume = () => s[i++];



        function parseExpr() {

          let v = parseTerm();

          while (peek() === '+' || peek() === '-') {

            const op = consume();

            const r = parseTerm();

            v = op === '+' ? v + r : v - r;

          }

          return v;

        }



        function parseTerm() {

          let v = parseFactor();

          while (peek() === '*' || peek() === '/') {

            const op = consume();

            const r = parseFactor();

            if (op === '*') v = v * r;

            else {

              if (r === 0) throw new Error('div0');

              v = v / r;

            }

          }

          return v;

        }



        function parseFactor() {

          if (peek() === '+') {

            consume();

            return parseFactor();

          }

          if (peek() === '-') {

            consume();

            return -parseFactor();

          }

          if (peek() === '(') {

            consume();

            const v = parseExpr();

            if (peek() !== ')') throw new Error('paren');

            consume();

            return v;

          }

          return parseNumber();

        }



        function parseNumber() {

          const start = i;

          while (peek() >= '0' && peek() <= '9') consume();

          if (peek() === '.') {

            consume();

            if (!(peek() >= '0' && peek() <= '9')) throw new Error('num');

            while (peek() >= '0' && peek() <= '9') consume();

          }

          if (i === start) throw new Error('num');

          const n = Number(s.slice(start, i));

          if (!Number.isFinite(n)) throw new Error('num');

          return n;

        }



        const result = parseExpr();

        if (i !== s.length) throw new Error('trail');

        return Number.isFinite(result) ? result : NaN;

      } catch (_) {

        return NaN;

      }

    }



    function isFormulaInput(raw) {

      const s = String(raw || '').trim().replace(/\s+/g, '');

      if (!s) return false;

      // 纯负数不算算式；含 * / () 或中间的 + - 才算

      if (/[*/×÷()]/.test(s)) return true;

      return /[+\-]/.test(s.slice(1));

    }



    function convert(amount, from, to) {

      if (!ratesByBase || !ratesByBase.rates) return NaN;

      const f = String(from).toUpperCase();

      const tCode = String(to).toUpperCase();

      if (f === tCode) return amount;

      const rates = ratesByBase.rates;

      const base = String(ratesByBase.base || 'CNY').toUpperCase();

      // rates are relative to `base`: 1 base = rates[X] of X

      const toBase = (code) => {

        if (code === base) return 1;

        const r = rates[code];

        return (typeof r === 'number' && r > 0) ? r : NaN;

      };

      const fromRate = toBase(f);

      const toRate = toBase(tCode);

      if (!Number.isFinite(fromRate) || !Number.isFinite(toRate) || fromRate === 0) return NaN;

      // amount_from / fromRate * toRate  (both vs base)

      // Wait: if rates[USD]=0.14 means 1 CNY = 0.14 USD

      // amount in FROM: first to base = amount / rates[FROM] (if FROM!=base)

      // then to TO = baseAmount * rates[TO]

      const amountInBase = f === base ? amount : (amount / fromRate);

      return amountInBase * (tCode === base ? 1 : toRate);

    }



    function buildListCodes() {

      const codes = [];

      const add = (c) => {

        const u = String(c || '').toUpperCase();

        if (!u || codes.includes(u)) return;

        codes.push(u);

      };

      add(localCurrency); // 当地货币第一

      COMMON_FX_CURRENCIES.forEach(add);

      add('CNY');

      return codes;

    }



    function refreshUiTexts() {

      title.textContent = tp('fxTitle', '汇率转换');

      updateSubtitle();

      fromLabel.textContent = tp('fxAmountWithOps', '金额（支持 + - * /）');

      toLabel.textContent = tp('fxTargetClickCopy', '目标货币 · 点击金额复制');

      resultAmount.title = tp('fxClickCopyAmount', '点击复制金额');

      toCard.title = tp('fxClickToCopy', '点击金额可复制');

      listHead.textContent = tp('fxRefRates', '参考汇率（兑目标货币）');

      closeBtn.setAttribute('aria-label', tp('fxClose', '关闭'));

      head.title = tp('fxDragHint', '按住拖动面板');

      amountInput.setAttribute('aria-label', tp('fxAmount', '金额'));

      amountInput.title = tp('fxAmountHint', '支持四则运算，如 100*0.2、100/1.2、100+50');

      const fromSelected = fromSelect.value;

      const toSelected = toSelect.value || localCurrency;

      try { fromSelect.__refreshLabels && fromSelect.__refreshLabels(); } catch (_) {}

      try { toSelect.__refreshLabels && toSelect.__refreshLabels(); } catch (_) {}

      fromSelect.value = fromSelected;

      toSelect.value = toSelected;

      fitCurrencySelects();

    }



    function render() {

      const amount = parseAmount(amountInput.value);

      const from = fromSelect.value || 'CNY';

      const to = localCurrency;



      if (!ratesByBase) {

        resultAmount.textContent = '—';

        lastCopiedText = '';

        rateHint.textContent = loading

          ? tp('fxLoadingRates', '加载汇率中…')

          : tp('fxNoRateData', '暂无汇率数据');

        list.innerHTML = '';

        return;

      }



      if (!Number.isFinite(amount)) {

        resultAmount.textContent = '—';

        lastCopiedText = '';

        rateHint.textContent = tp('fxInvalidAmount', '请输入有效金额或算式（如 100*0.2）');

      } else {

        const converted = convert(amount, from, to);

        if (Number.isFinite(converted)) {

          const shown = formatFxAmount(converted, to);

          resultAmount.textContent = shown;

          // 复制「金额 + 货币」，去掉千分位，便于粘贴到报价/聊天

          const plain = String(shown).replace(/,/g, '');

          lastCopiedText = (plain && plain !== '—')

            ? `${plain} ${to}`

            : `${converted} ${to}`;

        } else {

          resultAmount.textContent = '—';

          lastCopiedText = '';

        }

        const unit = convert(1, from, to);

        const formulaNote = isFormulaInput(amountInput.value)

          ? ` = ${formatFxAmount(amount, from)} ${from}`

          : '';

        if (Number.isFinite(unit)) {

          rateHint.textContent = formulaNote

            ? `${String(amountInput.value).trim()}${formulaNote} · 1 ${from} ≈ ${formatFxAmount(unit, to)} ${to}`

            : `1 ${from} ≈ ${formatFxAmount(unit, to)} ${to}`;

        } else {

          rateHint.textContent = tp('fxUnableConvert', '无法换算该货币对');

        }

      }



      if (ratesByBase.updatedAt) {

        try {

          const d = new Date(ratesByBase.updatedAt);

          foot.textContent = tp('fxRatesUpdated', '汇率更新于 {time}').replace('{time}', d.toLocaleString());

        } catch (_) {

          foot.textContent = '';

        }

      }



      const codes = buildListCodes();

      list.innerHTML = '';

      codes.forEach((code) => {

        const row = document.createElement('div');

        row.className = 'wa-fx-rate-item' + (code === localCurrency ? ' is-local' : '');

        const left = document.createElement('div');

        left.className = 'wa-fx-rate-left';

        const codeEl = document.createElement('span');

        codeEl.className = 'wa-fx-rate-code';

        codeEl.textContent = code;

        const nameEl = document.createElement('span');

        nameEl.className = 'wa-fx-rate-name';

        nameEl.textContent = getCurrencyShortName(code, currencyMetaLang());

        left.appendChild(codeEl);

        left.appendChild(nameEl);



        const right = document.createElement('div');

        right.className = 'wa-fx-rate-right';

        // 显示：1 该货币 = ? 当地货币

        const unitToLocal = convert(1, code, localCurrency);

        if (code === localCurrency) {

          right.textContent = `1 ${code} = 1 ${localCurrency}`;

        } else if (Number.isFinite(unitToLocal)) {

          right.textContent = `1 ${code} = ${formatFxAmount(unitToLocal, localCurrency)} ${localCurrency}`;

        } else {

          right.textContent = '—';

        }



        if (code === localCurrency) {

          const badge = document.createElement('span');

          badge.className = 'wa-fx-local-badge';

          badge.textContent = tp('fxTargetBadge', '目标');

          left.appendChild(badge);

        }



        row.appendChild(left);

        row.appendChild(right);

        list.appendChild(row);

      });

    }



    async function loadRates() {

      loading = true;

      rateHint.textContent = tp('fxLoadingRates', '加载汇率中…');

      render();

      try {

        // 以 CNY 为基准拉取，便于默认人民币换算

        const resp = await fetchExchangeRatesViaBackground('CNY');

        ratesByBase = {

          base: String(resp.base || 'CNY').toUpperCase(),

          rates: resp.rates || {},

          updatedAt: resp.updatedAt || Date.now()

        };

        // 确保基准币自身汇率为 1

        ratesByBase.rates[ratesByBase.base] = 1;

        loading = false;

        render();

      } catch (err) {

        loading = false;

        rateHint.textContent = tp('fxLoadFailed', '汇率加载失败，请稍后重试');

        foot.textContent = String((err && err.message) || err || '');

        console.warn('汇率加载失败:', err);

      }

    }



    amountInput.addEventListener('input', () => {

      fitAmountInputWidth();

      render();

    });

    fromSelect.addEventListener('change', () => {

      fitCurrencySelects();

      render();

    });



    // 读取界面语言 +（未识别时）上次手动目标货币

    try {

      var cfgUi = 'zh';

      try {

        var tc = window.__faloTranslateCfg;

        if (tc && typeof tc.uiLang === 'string' && tc.uiLang.trim()) cfgUi = tc.uiLang;

      } catch (_) {}

      var res = {

        uiLang: cfgUi,

        fx_manual_target_currency: fxLsGet('fx_manual_target_currency', ''),

        fx_pinned_currencies: fxLsGet('fx_pinned_currencies', [])

      };

      uiLang = getUiLangFromRes(res, 'zh');

      pinnedCurrencies = normalizePinnedList(res.fx_pinned_currencies);

      if (!currencyDetected) {

        const saved = String(res.fx_manual_target_currency || '').toUpperCase();

        if (saved && currencyOptions.includes(saved)) {

          localCurrency = saved;

        } else {

          localCurrency = 'USD';

        }

        toSelect.value = localCurrency;

      }

      refreshUiTexts();

      render();

      fitCurrencySelects();

    } catch (_) {

      uiLang = 'zh';

      if (!currencyDetected) {

        localCurrency = 'USD';

        toSelect.value = localCurrency;

      }

      refreshUiTexts();

      fitCurrencySelects();

    }



    setTimeout(() => {

      try {

        amountInput.focus();

        amountInput.select();

        fitCurrencySelects();

      } catch (_) {}

    }, 50);



    updateSubtitle();

    loadRates();

    fitCurrencySelects();

  } catch (e) {

    console.error('打开汇率转换弹窗失败:', e);

  }

}



  try {

    window.__faloShowFxPopup = showCurrencyConverterPopup;

    window.__faloTranslateHelpers = Object.assign(window.__faloTranslateHelpers || {}, {

      showCurrencyConverterPopup: showCurrencyConverterPopup

    });

  } catch (_) {}

})();