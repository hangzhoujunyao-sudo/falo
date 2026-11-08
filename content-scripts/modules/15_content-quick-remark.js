 1:1) ----------
  /**
   * Locked header stack: title → country → remark → subtitle.
   * Shared with watrans-country-fx so same-frame inserts never leave remark above country.
   */
  function stabilizeConversationHeaderStack(infoHeader) {
    if (!infoHeader) return;
    var country =
      infoHeader.querySelector(":scope > .wa-country-info-row") ||
      infoHeader.querySelector(".wa-country-info-row");
    var remark =
      infoHeader.querySelector(":scope > .wa-quick-remark-header") ||
      infoHeader.querySelector(".wa-quick-remark-header");
    // Narrow compact mode: remark lives inside country row (or country is below header) — skip
    if (country && country.classList.contains("wa-country-info-row--compact")) return;
    if (!country || !remark) return;
    if (country.parentNode !== infoHeader || remark.parentNode !== infoHeader) return;
    try {
      if (
        remark.compareDocumentPosition(country) & Node.DOCUMENT_POSITION_FOLLOWING
      ) {
        infoHeader.insertBefore(country, remark);
      }
      if (country.nextElementSibling !== remark) {
        infoHeader.insertBefore(remark, country.nextSibling);
      }
    } catch (_) {}
  }
  try {
    window.__whatsnowStabilizeHeaderStack = stabilizeConversationHeaderStack;
  } catch (_) {}

  var STORAGE_KEY = "chatQuickRemarks";
  var MAX_LEN = 200;
  var MARK_CLASS = "wa-quick-remark-ipt";
  var LIST_TEXT_CLASS = "wa-quick-remark-text";
  var HEADER_WRAP_CLASS = "wa-quick-remark-header";
  var LIST_WRAP_CLASS = "wa-quick-remark-list";

  /** null=未确认，先试官方；true=商业版官方；false=个人版仅本地 */
  var preferNative = null;
  /** @type {Record<string, { remarks?: string, updatedAt?: number }>} */
  var remarkMap = {};
  /** 官方备注内存缓存（商业版列表展示） */
  var waCache = {};
  var activeNote = "";
  var lastHeaderKey = "";
  /** 最近一次官方 GET 的 chatId，用于匹配联系人面板改备注事件 */
  var lastActiveChatId = "";
  var scanTimer = null;
  var saveTimer = null;
  var headerWatchTimer = null;
  var lookupTimer = null;
  var listLookupDebounce = null;
  var activeInFlight = false;
  var lookupInFlight = false;
  /** refreshActive 进行中又切会话时，结束后补跑一次 */
  var pendingRefreshActive = false;
  var headerPollTicks = 0;

  function isRemarkEnabled() {
    try {
      return !!(cfg().showRemark !== false && canCore());
    } catch (_) {
      return false;
    }
  }

  function ensureRemarkStyles() {
    if (document.getElementById("whatsnow-remark-styles")) return;
    var parent = document.head || document.documentElement;
    if (!parent) return;
    var s = document.createElement("style");
    s.id = "whatsnow-remark-styles";
    s.textContent =
      "/* ========================= Quick Remark (Look World \u540c\u6b3e\uff1a\u540d\u5b57\u4e0b\u65b9\u53e0\u5c42) ========================= */\n.wa-quick-remark-list {\n  position: relative;\n  display: block;\n  box-sizing: border-box;\n  width: 100%;\n  height: 40px;\n  font-size: 16px;\n  white-space: nowrap;\n  overflow: visible;\n  pointer-events: none;\n  z-index: 2;\n}\n\n.wa-quick-remark-text {\n  position: absolute;\n  top: 24px;\n  left: 0;\n  right: 0;\n  z-index: 2;\n  box-sizing: border-box;\n  display: block;\n  width: 100%;\n  max-width: 100%;\n  height: 14px;\n  margin: 0;\n  padding: 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  font-size: 12px;\n  line-height: 1;\n  font-weight: 400;\n  color: #008069;\n  pointer-events: none;\n}\n\nheader[data-testid=\"conversation-header\"]:has(.wa-quick-remark-header),\nheader[data-testid=\"conversation-header\"]:has(.wa-native-note-row) {\n  height: auto !important;\n  min-height: var(--x20strc, auto);\n  overflow: visible;\n}\n\n.wa-native-note-row {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  box-sizing: border-box;\n  width: 100%;\n  min-width: 0;\n  max-width: 100%;\n  margin-top: 2px;\n  pointer-events: none;\n}\n\n.wa-native-note-label {\n  flex: 0 0 auto;\n  font-size: 12px;\n  line-height: 18px;\n  color: #667781;\n  opacity: 0.9;\n}\n\n.wa-native-note-text {\n  flex: 1 1 auto;\n  min-width: 0;\n  max-width: 360px;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  font-size: 12px;\n  line-height: 18px;\n  font-weight: 500;\n  color: #008069;\n}\n\n.dark .wa-native-note-label,\nbody.dark .wa-native-note-label,\nhtml[data-color-mode=\"dark\"] .wa-native-note-label {\n  color: #8696a0;\n}\n\n.dark .wa-native-note-text,\nbody.dark .wa-native-note-text,\nhtml[data-color-mode=\"dark\"] .wa-native-note-text {\n  color: #00a884;\n}\n\n.wa-quick-remark-header {\n  display: flex;\n  align-items: center;\n  justify-content: flex-start;\n  box-sizing: border-box;\n  width: 100%;\n  min-width: 0;\n  max-width: 100%;\n  margin-top: 4px;\n  pointer-events: auto;\n}\n\n.wa-quick-remark-ipt {\n  position: absolute;\n  top: 24px;\n  left: 0;\n  right: 0;\n  z-index: 2;\n  box-sizing: border-box;\n  display: block;\n  width: 100%;\n  max-width: 100%;\n  height: 14px;\n  margin: 0;\n  padding: 0;\n  border: none;\n  border-radius: 0;\n  outline: none;\n  font-size: 12px;\n  line-height: 1;\n  font-weight: 400;\n  color: #008069;\n  background: transparent;\n}\n\n.wa-quick-remark-ipt--header {\n  position: static;\n  top: auto;\n  left: auto;\n  right: auto;\n  z-index: auto;\n  width: 100%;\n  max-width: 320px;\n  height: 18px;\n  font-size: 12px;\n  line-height: 18px;\n  color: #008069;\n  background: transparent;\n}\n\n.wa-quick-remark-ipt:hover,\n.wa-quick-remark-ipt:focus {\n  background: transparent;\n  border: none;\n  color: #008069;\n}\n\n.wa-quick-remark-ipt::placeholder {\n  opacity: 0.55;\n}\n\n.dark .wa-quick-remark-text,\nbody.dark .wa-quick-remark-text,\nhtml[data-color-mode=\"dark\"] .wa-quick-remark-text {\n  color: #00a884;\n}\n\n.dark .wa-quick-remark-ipt,\n.dark .wa-quick-remark-ipt--header,\n.dark .wa-quick-remark-ipt:hover,\n.dark .wa-quick-remark-ipt:focus,\nbody.dark .wa-quick-remark-ipt,\nbody.dark .wa-quick-remark-ipt--header,\nbody.dark .wa-quick-remark-ipt:hover,\nbody.dark .wa-quick-remark-ipt:focus,\nhtml[data-color-mode=\"dark\"] .wa-quick-remark-ipt,\nhtml[data-color-mode=\"dark\"] .wa-quick-remark-ipt--header,\nhtml[data-color-mode=\"dark\"] .wa-quick-remark-ipt:hover,\nhtml[data-color-mode=\"dark\"] .wa-quick-remark-ipt:focus {\n  color: #00a884;\n}\n\n.dark .wa-quick-remark-ipt::placeholder,\nbody.dark .wa-quick-remark-ipt::placeholder,\nhtml[data-color-mode=\"dark\"] .wa-quick-remark-ipt::placeholder {\n  color: #8696a0;\n  opacity: 1;\n}\n/* ========================= End Quick Remark ========================= */";
    parent.appendChild(s);
  }

  function placeholderText() {
    return tUi("remarkPlaceholder", getUiLang() === "en" ? "Add note" : "添加备注");
  }

  function tooLongText() {
    return tUi(
      "remarkTooLong",
      getUiLang() === "en" ? "Notes cannot exceed 200 characters" : "备注不能超过200个字符"
    );
  }

  function extractPhoneNumberFromText(text) {
    try {
      var h = helpers();
      if (h.extractPhoneNumberFromText) return h.extractPhoneNumberFromText(text) || "";
    } catch (_) {}
    if (!text || typeof text !== "string") return "";
    var match = text.match(/\+[\d\s\-\(\)]+/);
    if (!match || !match[0]) return "";
    var cleaned = match[0].replace(/[\s\-\(\)]/g, "");
    return cleaned.replace(/\D/g, "").length < 7 ? "" : cleaned;
  }

  function getCustomerIdentifier() {
    try {
      var h = helpers();
      if (h.getCustomerIdentifier) return h.getCustomerIdentifier() || "";
      if (h.getCurrentCustomerIdentifier) return h.getCurrentCustomerIdentifier() || "";
    } catch (_) {}
    return "";
  }

  function callExport(action, payload, ms) {
    return callRemarkStore(action, payload, ms);
  }

  function callRemarkStore(action, payload, timeoutMs) {
    var ms = timeoutMs || 8000;
    try {
      var api = window.__whatsnowStorePhone;
      if (api) {
        if (action === "GET_ACTIVE_NOTE" && typeof api.getActiveContactNote === "function") {
          return Promise.resolve(api.getActiveContactNote())
            .then(function (data) {
              return { ok: true, data: data };
            })
            .catch(function (e) {
              return { ok: false, error: String(e && e.message ? e.message : e) };
            });
        }
        if (action === "SET_ACTIVE_NOTE" && typeof api.setActiveContactNote === "function") {
          return Promise.resolve(api.setActiveContactNote((payload && payload.content) || ""))
            .then(function (data) {
              return { ok: true, data: data };
            })
            .catch(function (e) {
              return { ok: false, error: String(e && e.message ? e.message : e) };
            });
        }
        if (action === "GET_NOTES_LOOKUP" && typeof api.buildNotesLookup === "function") {
          return Promise.resolve(api.buildNotesLookup(payload || {}))
            .then(function (data) {
              return { ok: true, data: data };
            })
            .catch(function (e) {
              return { ok: false, error: String(e && e.message ? e.message : e) };
            });
        }
        if (action === "GET_NOTE_CAPABILITY" && typeof api.getNoteCapability === "function") {
          try {
            return Promise.resolve({ ok: true, data: api.getNoteCapability() });
          } catch (e) {
            return Promise.resolve({
              ok: false,
              error: String(e && e.message ? e.message : e),
            });
          }
        }
        if (action === "GET_ACTIVE_PHONE" && typeof api.getActiveContactPhone === "function") {
          return Promise.resolve(api.getActiveContactPhone())
            .then(function (data) {
              return { ok: true, data: data };
            })
            .catch(function (e) {
              return { ok: false, error: String(e && e.message ? e.message : e) };
            });
        }
      }
    } catch (_) {}
    var reqId = "wnr_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    return new Promise(function (resolve) {
      var done = false;
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        window.removeEventListener("message", onMsg);
        resolve({ ok: false, error: "timeout" });
      }, ms);
      function finish(r) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        window.removeEventListener("message", onMsg);
        resolve(r);
      }
      function onMsg(event) {
        try {
          if (event.source !== window) return;
          var data = event.data;
          if (!data || data.source !== "whatsnow" || data.dir !== "p2c") return;
          if (String(data.type) !== "WAContactExport:result") return;
          var detail = data.payload;
          if (!detail || String(detail.reqId) !== reqId) return;
          finish({ ok: !!detail.ok, data: detail.data, error: detail.error || null });
        } catch (_) {}
      }
      window.addEventListener("message", onMsg);
      try {
        window.postMessage(
          {
            source: "whatsnow",
            dir: "c2p",
            type: "WAContactExport:cmd",
            requestId: reqId,
            payload: { reqId: reqId, action: action, payload: payload || {} },
          },
          "*"
        );
      } catch (e) {
        finish({ ok: false, error: String(e) });
      }
    });
  }

  function normalizeKey(raw) {
    var s = String(raw || "").trim();
    if (!s) return "";
    if (s.indexOf("refreshed") >= 0 || s.indexOf("default-contact") >= 0 || s.indexOf("wds-ic-") >= 0)
      return "";
    var phone = extractPhoneNumberFromText(s);
    if (phone) return phone;
    return s.slice(0, 80);
  }

  function sessionKey() {
    return normalizeKey(getCustomerIdentifier()) || headerTitleKey();
  }

  function headerTitleKey() {
    var header = getConversationHeader();
    if (!header) return "";
    var title =
      header.querySelector('span[data-testid="conversation-info-header-chat-title"]') ||
      header.querySelector('[data-testid="conversation-info-header-chat-title"]');
    if (!title) return normalizeKey(getCustomerIdentifier());
    return normalizeKey(title.getAttribute("title") || title.textContent || getCustomerIdentifier());
  }

  function isNativeUnsupported(err) {
    var msg = String(err || "");
    return (
      msg === "native_notes_unsupported" ||
      msg.indexOf("native_notes") >= 0 ||
      msg === "no_note_actions" ||
      msg.indexOf("no_note_") >= 0 ||
      msg.indexOf("invariant") >= 0 ||
      msg.indexOf("Minified invariant") >= 0
    );
  }

  function readMapFromPage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      var map = JSON.parse(raw);
      return map && typeof map === "object" && !Array.isArray(map) ? map : {};
    } catch (_) {
      return {};
    }
  }

  function writeMap(map) {
    var next = map && typeof map === "object" && !Array.isArray(map) ? map : {};
    remarkMap = next;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (_) {}
    return next;
  }

  function getLocalRemark(key) {
    var k = normalizeKey(key);
    if (!k) return "";
    var entry = remarkMap[k];
    if (!entry) return "";
    if (typeof entry === "string") return entry;
    return String(entry.remarks || "");
  }

  function setLocalRemark(key, text) {
    var k = normalizeKey(key);
    if (!k) return false;
    var value = String(text || "").slice(0, MAX_LEN);
    var next = Object.assign({}, remarkMap);
    if (!value.trim()) delete next[k];
    else next[k] = { remarks: value, updatedAt: Date.now() };
    writeMap(next);
    syncInputsForKey(k, value);
    return true;
  }

  function rememberWa(key, note) {
    var raw = String(key == null ? "" : key).trim();
    if (!raw) return;
    var text = String(note == null ? "" : note);
    // 空串也要写入，表示「已确认无备注」
    waCache[raw] = text;
    var k = normalizeKey(raw);
    if (k && k !== raw) waCache[k] = text;
  }

  /** 官方备注写入多个别名：chatId + 当前标题/电话，改名后仍能命中 */
  function rememberWaAliases(note, aliases) {
    var list = Array.isArray(aliases) ? aliases : [aliases];
    for (var i = 0; i < list.length; i++) {
      if (list[i] != null && String(list[i]).trim()) rememberWa(list[i], note);
    }
  }

  function readWaCache(key) {
    var raw = String(key == null ? "" : key).trim();
    if (!raw) return null;
    if (Object.prototype.hasOwnProperty.call(waCache, raw)) return String(waCache[raw] || "");
    var k = normalizeKey(raw);
    if (k && Object.prototype.hasOwnProperty.call(waCache, k)) return String(waCache[k] || "");
    return null;
  }

  function getRemark(key) {
    var k = normalizeKey(key);
    if (!k) return "";
    if (preferNative !== false) {
      var direct = readWaCache(k);
      if (direct != null) return direct;
      // 仅当前会话允许用 chatId 兜底（改名场景）。
      // 列表其它行绝不能回落到 lastActiveChatId，否则会全员串成同一条备注。
      if (k === sessionKey() && lastActiveChatId) {
        var byChat = readWaCache(lastActiveChatId);
        if (byChat != null) return byChat;
      }
    }
    return getLocalRemark(k);
  }

  /** 当前会话以 activeNote 为准（允许空串），其它行走 getRemark */
  function displayRemark(key) {
    var k = normalizeKey(key);
    if (!k) return "";
    if (k === sessionKey()) return String(activeNote || "");
    return getRemark(k);
  }

  function hydrateFromStorage() {
    remarkMap = readMapFromPage();
    return Promise.resolve();
  }

  function getChatListPane() {
    return (
      document.getElementById("pane-side") ||
      document.querySelector("#pane-side") ||
      document.querySelector("#side")
    );
  }

  function getConversationHeader() {
    return document.querySelector('header[data-testid="conversation-header"]');
  }

  function getRowTitleEl(row) {
    if (!row) return null;
    return (
      row.querySelector('[data-testid="cell-frame-title"] span[title]') ||
      row.querySelector('[data-testid="cell-frame-title"] span[dir="auto"]') ||
      row.querySelector('[data-testid="cell-frame-title"] span') ||
      row.querySelector('span[dir="auto"][title]')
    );
  }

  function getRowKey(row) {
    var titleEl = getRowTitleEl(row);
    if (!titleEl) return "";
    var title = (titleEl.getAttribute("title") || titleEl.textContent || "").trim();
    return normalizeKey(title);
  }

  function listChatRows(scope) {
    var root = scope || getChatListPane() || document;
    var rows = root.querySelectorAll('[role="row"], [data-testid="cell-frame-container"]');
    var out = [];
    var seen = new Set();
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var container =
        row.matches && row.matches('[data-testid="cell-frame-container"]')
          ? row
          : row.querySelector('[data-testid="cell-frame-container"]') || row;
      if (!container || seen.has(container)) continue;
      seen.add(container);
      out.push(container);
    }
    return out;
  }

  function stopEvt(e) {
    try {
      e.stopPropagation();
      e.stopImmediatePropagation();
    } catch (_) {}
  }

  /** 保存：先官方，不行再本地；空内容表示删除备注 */
  function saveRemark(boundKey, text) {
    var key = normalizeKey(boundKey);
    if (!key) return Promise.resolve(false);
    var value = String(text || "").slice(0, MAX_LEN);
    var sameSession = key === sessionKey();

    if (preferNative !== false && sameSession) {
      return callExport("SET_ACTIVE_NOTE", { content: value }, 12000)
        .then(function (res) {
          if (res && res.ok && !(res.data && res.data.nativeNotesSupported === false)) {
            preferNative = true;
            activeNote = String(res.data && res.data.note != null ? res.data.note : value);
            rememberWa(key, activeNote);
            // 同步清掉本地镜像，防止 activeNote 为空时被旧本地备注顶回
            setLocalRemark(key, activeNote);
            return true;
          }
          // 个人版常误判官方备注：写入失败（含 invariant）后锁定本地，避免刷新把备注清空
          if (res && res.error === "not_ready") {
            // 暂未就绪，本次仍落本地，但不永久锁定
          } else if (
            res &&
            (isNativeUnsupported(res.error) ||
              (res.data && res.data.nativeNotesSupported === false) ||
              !res.ok)
          ) {
            preferNative = false;
          }
          if (sameSession) activeNote = value;
          return setLocalRemark(key, value);
        })
        .catch(function () {
          preferNative = false;
          if (sameSession) activeNote = value;
          return setLocalRemark(key, value);
        });
    }

    if (sameSession) activeNote = value;
    return Promise.resolve(setLocalRemark(key, value));
  }

  function bindInputEvents(input) {
    var flush = function () {
      var key = normalizeKey(input.getAttribute("data-uid") || "");
      if (key) saveRemark(key, input.value);
    };
    input.addEventListener("click", stopEvt, true);
    input.addEventListener("mousedown", stopEvt, true);
    input.addEventListener("mouseup", stopEvt, true);
    input.addEventListener("pointerdown", stopEvt, true);
    input.addEventListener(
      "keydown",
      function (e) {
        stopEvt(e);
        if (e.key === "Enter") {
          e.preventDefault();
          input.blur();
        }
      },
      true
    );
    input.addEventListener("keyup", stopEvt, true);
    input.addEventListener("keypress", stopEvt, true);
    input.addEventListener("focus", stopEvt, true);
    input.addEventListener("input", function () {
      var val = input.value || "";
      if (val.length > MAX_LEN) {
        input.value = val.slice(0, MAX_LEN);
        try { if (window.__whatsnowNotice) window.__whatsnowNotice(tooLongText()); else if (window.__whatsnowAlert) window.__whatsnowAlert(tooLongText()); else if (window.appAlert) window.appAlert(tooLongText()); else alert(tooLongText()); } catch (_) {}
      }
      input.title = input.value || placeholderText();
      clearTimeout(saveTimer);
      saveTimer = setTimeout(flush, 250);
    });
    input.addEventListener("change", flush);
    input.addEventListener("blur", flush);
  }

  function createInput(key) {
    var input = document.createElement("input");
    input.type = "text";
    input.className = MARK_CLASS + " " + MARK_CLASS + "--header";
    input.setAttribute("data-uid", key);
    input.setAttribute("maxlength", String(MAX_LEN));
    input.setAttribute("spellcheck", "false");
    input.setAttribute("autocomplete", "off");
    input.placeholder = placeholderText();
    var value = displayRemark(key);
    input.value = value;
    input.title = value || placeholderText();
    bindInputEvents(input);
    return input;
  }

  function createListLabel(key, text) {
    var el = document.createElement("span");
    el.className = LIST_TEXT_CLASS;
    el.setAttribute("data-uid", key);
    el.setAttribute("title", text);
    el.textContent = text;
    return el;
  }

  function findListWrap(row) {
    if (!row) return null;
    return (
      row.querySelector("." + LIST_WRAP_CLASS) ||
      (row.closest && row.closest("." + LIST_WRAP_CLASS)) ||
      null
    );
  }

  function syncListLabel(wrap, key, text) {
    if (!wrap) return;
    wrap.querySelectorAll("." + MARK_CLASS).forEach(function (n) {
      try {
        n.remove();
      } catch (_) {}
    });
    var label = wrap.querySelector("." + LIST_TEXT_CLASS);
    if (!label) {
      label = createListLabel(key, text);
      wrap.insertBefore(label, wrap.firstChild);
      return;
    }
    label.setAttribute("data-uid", key);
    if (label.textContent !== text) label.textContent = text;
    label.title = text;
  }

  function ensureListRemark(row) {
    if (!row) return;
    var key = getRowKey(row);
    if (!key) return;

    var wrap = findListWrap(row);
    if (!wrap) {
      var titleEl0 = getRowTitleEl(row);
      var titleHost0 = titleEl0
        ? titleEl0.closest('[data-testid="cell-frame-title"]') || titleEl0.parentElement
        : null;
      if (
        titleHost0 &&
        titleHost0.parentElement &&
        titleHost0.parentElement.classList.contains(LIST_WRAP_CLASS)
      ) {
        wrap = titleHost0.parentElement;
      }
    }

    if (!isRemarkEnabled()) {
      if (wrap) unwrapRemark(wrap);
      return;
    }

    var text = String(getRemark(key) || "").trim();
    if (!text) {
      if (wrap) unwrapRemark(wrap);
      return;
    }

    if (wrap) {
      syncListLabel(wrap, key, text);
      return;
    }

    var titleEl = getRowTitleEl(row);
    var titleHost = titleEl
      ? titleEl.closest('[data-testid="cell-frame-title"]') || titleEl.parentElement
      : null;
    if (!titleHost || !titleHost.parentNode) return;

    wrap = document.createElement("div");
    wrap.className = LIST_WRAP_CLASS;
    try {
      titleHost.parentNode.insertBefore(wrap, titleHost);
      wrap.appendChild(createListLabel(key, text));
      wrap.appendChild(titleHost);
    } catch (_) {
      try {
        wrap.remove();
      } catch (_) {}
    }
  }

  function removeHeaderRemarkNodes(header) {
    var hdr = header || getConversationHeader();
    var roots = hdr ? [hdr, hdr.parentElement].filter(Boolean) : [document];
    roots.forEach(function (root) {
      try {
        root.querySelectorAll("." + HEADER_WRAP_CLASS).forEach(function (el) {
          unwrapRemark(el);
        });
      } catch (_) {}
    });
  }

  function ensureHeaderRemark() {
    ensureRemarkStyles();
    var header = getConversationHeader();
    if (!header) return;

    if (!isRemarkEnabled()) {
      removeHeaderRemarkNodes(header);
      return;
    }

    var key = sessionKey();
    if (!key) {
      removeHeaderRemarkNodes(header);
      return;
    }

    var infoHeader = header.querySelector('[data-testid="conversation-info-header"]');
    if (!infoHeader) return;

    var wrapping = infoHeader.parentElement;
    if (wrapping && wrapping.classList && wrapping.classList.contains(HEADER_WRAP_CLASS)) {
      unwrapRemark(wrapping);
    }

    infoHeader.querySelectorAll(".wa-native-note-row").forEach(function (el) {
      try {
        el.remove();
      } catch (_) {}
    });

    var panel = header.parentElement;
    var countryRow =
      (panel && panel.querySelector(":scope > .wa-country-info-row")) ||
      infoHeader.querySelector(".wa-country-info-row") ||
      header.querySelector(".wa-country-info-row");
    var narrow = !!(countryRow && countryRow.classList.contains("wa-country-info-row--compact"));

    var row =
      (countryRow && countryRow.querySelector(":scope > ." + HEADER_WRAP_CLASS)) ||
      infoHeader.querySelector(":scope > ." + HEADER_WRAP_CLASS) ||
      (panel && panel.querySelector(":scope > ." + HEADER_WRAP_CLASS)) ||
      header.querySelector("." + HEADER_WRAP_CLASS);

    function attachRemark(el) {
      if (!el) return;
      try {
        if (narrow && countryRow) {
          countryRow.appendChild(el);
        } else if (countryRow && countryRow.parentNode === infoHeader) {
          if (countryRow.nextSibling) infoHeader.insertBefore(el, countryRow.nextSibling);
          else infoHeader.appendChild(el);
        } else {
          var subtitleEl = infoHeader.querySelector('[data-testid="chat-subtitle"]');
          if (subtitleEl && subtitleEl.parentNode === infoHeader) {
            infoHeader.insertBefore(el, subtitleEl);
          } else {
            infoHeader.appendChild(el);
          }
        }
      } catch (_) {
        try {
          infoHeader.appendChild(el);
        } catch (_) {}
      }
    }

    if (row) {
      var wantParent = narrow && countryRow ? countryRow : infoHeader;
      if (row.parentElement !== wantParent) {
        try {
          attachRemark(row);
        } catch (_) {
          try {
            row.remove();
          } catch (_) {}
          row = null;
        }
      } else if (
        !narrow &&
        countryRow &&
        row.parentElement === infoHeader &&
        row.previousElementSibling !== countryRow
      ) {
        try {
          attachRemark(row);
        } catch (_) {}
      }
    }

    if (!row) {
      row = document.createElement("div");
      row.className = HEADER_WRAP_CLASS;
      row.appendChild(createInput(key));
      attachRemark(row);
      if (!narrow) stabilizeConversationHeaderStack(infoHeader);
      return;
    }

    if (!narrow) stabilizeConversationHeaderStack(infoHeader);

    var ipt = row.querySelector("." + MARK_CLASS);
    if (!ipt) {
      row.appendChild(createInput(key));
      return;
    }
    var uid = ipt.getAttribute("data-uid") || "";
    if (uid !== key) {
      row.replaceChild(createInput(key), ipt);
    } else if (document.activeElement !== ipt) {
      var val = displayRemark(key);
      if (ipt.value !== val) {
        ipt.value = val;
        ipt.title = val || placeholderText();
      }
      ipt.placeholder = placeholderText();
    }
  }

  function syncInputsForKey(key, value) {
    var k = normalizeKey(key);
    if (!k) return;
    var text = String(value || "").trim();

    document.querySelectorAll("." + MARK_CLASS).forEach(function (el) {
      if ((el.getAttribute("data-uid") || "") !== k) return;
      if (document.activeElement === el) return;
      el.value = value || "";
      el.title = value || placeholderText();
    });

    document.querySelectorAll("." + LIST_WRAP_CLASS).forEach(function (wrap) {
      var label = wrap.querySelector("." + LIST_TEXT_CLASS);
      var uid = (label && label.getAttribute("data-uid")) || "";
      var rowKey = getRowKey(wrap) || uid;
      if (rowKey !== k && uid !== k) return;
      if (!text) {
        unwrapRemark(wrap);
        return;
      }
      syncListLabel(wrap, k, text);
    });

    if (text) scheduleScan();
  }

  function refreshAllRemarkUiTexts() {
    document.querySelectorAll("." + MARK_CLASS).forEach(function (el) {
      el.placeholder = placeholderText();
      if (!el.value) el.title = placeholderText();
    });
  }

  function unwrapRemark(wrap) {
    if (!wrap || !wrap.parentNode) return;
    try {
      var keep = Array.from(wrap.children).filter(function (n) {
        return !n.classList.contains(MARK_CLASS) && !n.classList.contains(LIST_TEXT_CLASS);
      });
      keep.forEach(function (node) {
        try {
          wrap.parentNode.insertBefore(node, wrap);
        } catch (_) {}
      });
      wrap.remove();
    } catch (_) {
      try {
        wrap.remove();
      } catch (_) {}
    }
  }

  function removeAllRemarkUi() {
    document.querySelectorAll("." + LIST_WRAP_CLASS + ", ." + HEADER_WRAP_CLASS).forEach(unwrapRemark);
  }

  function scanAll() {
    ensureRemarkStyles();
    if (!isRemarkEnabled()) {
      removeAllRemarkUi();
      return;
    }
    try {
      listChatRows().forEach(ensureListRemark);
    } catch (_) {}
    try {
      ensureHeaderRemark();
    } catch (_) {}
  }

  function scheduleScan() {
    if (scanTimer) return;
    scanTimer = setTimeout(function () {
      scanTimer = null;
      scanAll();
      // 列表行变化后主动批量查官方备注，避免必须点进聊天才出现
      scheduleListLookup();
    }, 300);
  }

  /** 防抖拉取可见列表官方备注（无需点进会话） */
  function scheduleListLookup(delayMs) {
    if (preferNative === false || !isRemarkEnabled()) return;
    try {
      clearTimeout(listLookupDebounce);
    } catch (_) {}
    listLookupDebounce = setTimeout(
      function () {
        listLookupDebounce = null;
        try {
          refreshWaListLookup();
        } catch (_) {}
      },
      typeof delayMs === "number" ? delayMs : 500
    );
  }

  /** 加载当前会话备注：先官方，再本地 */
  function refreshActive() {
    var key = sessionKey();
    if (!key) {
      activeNote = "";
      lastHeaderKey = "";
      return Promise.resolve();
    }

    if (key !== lastHeaderKey) {
      clearTimeout(saveTimer);
      var prevNote = activeNote;
      lastHeaderKey = key;
      // 先展示缓存/本地；官方改名时新标题可能尚未入缓存，先保留旧备注防闪空
      var next = getRemark(key);
      if (!String(next || "").trim() && preferNative !== false && String(prevNote || "").trim()) {
        next = prevNote;
      }
      if (!String(next || "").trim()) next = getLocalRemark(key);
      activeNote = next;
      ensureHeaderRemark();
    }

    if (activeInFlight) {
      pendingRefreshActive = true;
      return Promise.resolve();
    }
    activeInFlight = true;

    var chain;
    if (preferNative !== false) {
      chain = callExport("GET_ACTIVE_NOTE", {}, 4000).then(function (res) {
        if ((!res || !res.ok) && res && res.error === "not_ready") {
          return new Promise(function (r) {
            setTimeout(function () {
              r(callExport("GET_ACTIVE_NOTE", {}, 4000));
            }, 300);
          });
        }
        return res;
      });
    } else {
      // 锁定本地后仍低频重探能力，避免误锁后永远不显示官方备注
      chain = callExport("GET_NOTE_CAPABILITY", {}, 2500)
        .then(function (cap) {
          if (cap && cap.ok && cap.data && cap.data.supported === true) {
            preferNative = null;
            return callExport("GET_ACTIVE_NOTE", {}, 4000);
          }
          return null;
        })
        .catch(function () {
          return null;
        });
    }

    return chain
      .then(function (res) {
        if (sessionKey() !== key) return;

        if (res && res.ok && res.data) {
          if (res.data.nativeNotesSupported === false) {
            preferNative = false;
            activeNote = getLocalRemark(key);
          } else if (res.data.pending || res.data.nativeNotesSupported == null) {
            activeNote = getRemark(key) || getLocalRemark(key);
          } else if (res.data.isGroup) {
            activeNote = "";
            removeHeaderRemarkNodes();
            return { __skipRemarkUi: true };
          } else {
            preferNative = true;
            activeNote = String(res.data.note || "");
            lastActiveChatId = String(res.data.chatId || "");
            // 同时按 chatId + 当前标题/电话缓存，改名只换 UI key，不丢备注
            rememberWaAliases(activeNote, [lastActiveChatId, key, headerTitleKey()]);
            return callExport("GET_ACTIVE_PHONE", {}, 2500)
              .then(function (phoneRes) {
                if (sessionKey() === key) {
                  var phone = phoneRes && phoneRes.ok && phoneRes.data && phoneRes.data.phone;
                  if (phone)
                    rememberWaAliases(activeNote, [phone, String(phone).replace(/\D/g, "")]);
                }
              })
              .catch(function () {});
          }
        } else if (preferNative === false) {
          activeNote = getLocalRemark(key);
        } else {
          activeNote = getRemark(key) || getLocalRemark(key);
        }
      })
      .then(function (mark) {
        if (mark && mark.__skipRemarkUi) return;
        if (sessionKey() !== key) return;
        ensureHeaderRemark();
        scheduleScan();
      })
      .catch(function () {
        activeNote = getRemark(key) || getLocalRemark(key);
        ensureHeaderRemark();
      })
      .then(function () {
        activeInFlight = false;
        if (pendingRefreshActive) {
          pendingRefreshActive = false;
          refreshActive();
        }
      });
  }

  function refreshWaListLookup() {
    if (preferNative === false || lookupInFlight) return Promise.resolve();
    lookupInFlight = true;
    var keys = [];
    var seen = new Set();
    try {
      listChatRows().forEach(function (row) {
        var k = getRowKey(row);
        if (k && !seen.has(k)) {
          seen.add(k);
          keys.push(k);
        }
        // 同时把原始标题也传给 lookup（normalize 前），提高姓名/电话匹配率
        try {
          var titleEl = getRowTitleEl(row);
          var raw = titleEl
            ? String(titleEl.getAttribute("title") || titleEl.textContent || "").trim()
            : "";
          if (raw && !seen.has(raw)) {
            seen.add(raw);
            keys.push(raw);
          }
        } catch (_) {}
      });
    } catch (_) {}
    var sk = sessionKey();
    if (sk && !seen.has(sk)) keys.push(sk);

    if (!keys.length) {
      lookupInFlight = false;
      return Promise.resolve();
    }

    return callExport(
      "GET_NOTES_LOOKUP",
      { retrieveMissing: true, lookupKeys: keys.slice(0, 80), concurrency: 8 },
      12000
    )
      .then(function (res) {
        if (!res || !res.ok || !res.data) return;
        if (res.data.nativeNotesSupported === false) {
          preferNative = false;
          return;
        }
        if (res.data.pending || res.data.nativeNotesSupported == null) {
          // Store 未就绪：稍后重试，不要干等
          scheduleListLookup(2000);
          return;
        }

        var apply = function (map) {
          if (!map || typeof map !== "object") return;
          Object.keys(map).forEach(function (k) {
            var val = String(map[k] || "").trim();
            if (!val) return;
            rememberWa(k, val);
          });
        };
        apply(res.data.byPhone);
        apply(res.data.byName);
        apply(res.data.byChatId);
        preferNative = true;
        // 当前会话若缓存已有官方备注，立刻回填顶栏（避免仅列表更新、顶栏仍空）
        try {
          var cur = sessionKey();
          var hit = cur && readWaCache(cur);
          if (hit != null && hit) {
            activeNote = hit;
            ensureHeaderRemark();
          }
        } catch (_) {}
        // 只重绘列表，不再 scheduleListLookup，避免死循环
        try {
          scanAll();
        } catch (_) {}
      })
      .catch(function () {})
      .then(function () {
        lookupInFlight = false;
      });
  }

  function setRemarkEnabled(next) {
    // WhatsNow: driven by cfg().showRemark + canCore via isRemarkEnabled();
    // force refresh when settings event fires.
    if (!next) removeAllRemarkUi();
    else {
      refreshActive();
      scheduleScan();
      if (preferNative !== false) refreshWaListLookup();
    }
  }

  // Keep tick hooks as thin wrappers used by the shared loop.
  function ensureRemarkHeaderTick() {
    ensureRemarkStyles();
    var key = sessionKey();
    if (key && key !== lastHeaderKey) {
      refreshActive();
      return;
    }
    ensureHeaderRemark();
  }
  function ensureRemarkListTick() {
    if (!isRemarkEnabled()) {
      document.querySelectorAll("." + LIST_WRAP_CLASS).forEach(unwrapRemark);
      return;
    }
    try {
      listChatRows().forEach(ensureListRemark);
    } catch (_) {}
  }

  // Aliases used by boot / config listeners (content-quick-remark parity names)
  var refreshActiveRemark = refreshActive;
  var scheduleRemarkScan = scheduleScan;
  var ensureRemarkHeader = ensureHeaderRemark;
  var ensureRemarkMap = function () {
    if (!remarkMap || typeof remarkMap !== "object") remarkMap = readMapFromPage();
    return remarkMap;
  };

  function sameChatJid(a, b) {
    var x = String(a || "").trim();
    var y = String(b || "").trim();
    if (!x || !y) return false;
    if (x === y) return true;
    var nx = normalizeKey(x);
    var ny = normalizeKey(y);
    return !!(nx && ny && nx === ny);
  }

  /** 联系人信息里改官方备注 → MAIN 推送 → 立刻刷新扩展 UI */
  function onNativeNoteChanged(detail) {
    try {
      if (preferNative === false) preferNative = null;
      var note = detail && detail.note != null ? String(detail.note) : "";
      var chatJid = detail && detail.chatJid ? String(detail.chatJid) : "";
      if (chatJid) rememberWa(chatJid, note);

      var ipt = document.querySelector("." + HEADER_WRAP_CLASS + " ." + MARK_CLASS);
      var editing = !!(ipt && document.activeElement === ipt);

      if (!editing && chatJid && lastActiveChatId && sameChatJid(chatJid, lastActiveChatId)) {
        preferNative = true;
        activeNote = note;
        var key = sessionKey();
        if (key) rememberWa(key, note);
        ensureHeaderRemark();
        scheduleScan();
      } else if (!editing) {
        // 其它联系人或尚无 chatId：拉当前会话官方备注
        refreshActive();
      }

      if (preferNative !== false) {
        try {
          clearTimeout(listLookupDebounce);
        } catch (_) {}
        listLookupDebounce = setTimeout(function () {
          try {
            refreshWaListLookup();
          } catch (_) {}
        }, 400);
      }
    } catch (_) {
      try {
        refreshActive();
      } catch (_) {}
    }
  }

  try {
    document.addEventListener("WAContactExport:noteChanged", function (ev) {
      onNativeNoteChanged(ev && ev.detail);
    });
  } catch (_) {}
  try {
    window.addEventListener("message", function (event) {
      try {
        if (event.source !== window) return;
        var data = event.data;
        if (!data || data.dir !== "p2c") return;
        if (data.source !== "whatsnow" && data.source !== "wa-transchat") return;
        if (data.type === "WAContactExport:noteChanged") onNativeNoteChanged(data.payload);
      } catch (_) {}
    });
  } catch (_) {}

  try {
    window.__whatsnowRefreshQuickRemarks = function () {
      refreshActive();
      scheduleScan();
      if (preferNative !== false) refreshWaListLookup();
    };
    window.__whatsnowGetChatQuickRemarksMap = function () {
      return Object.assign({}, remarkMap);
    };
  } catch (_) {}

  // Boot: hydrate + refresh + scan + list lookup (content-quick-remark 1:1)
  hydrateFromStorage().then(function () {
    refreshActive();
    scheduleScan();
    setTimeout(function () {
      scheduleListLookup(0);
    }, 800);
    setTimeout(function () {
      scheduleListLookup(0);
    }, 2500);
    setTimeout(function () {
      scheduleListLookup(0);
    }, 6000);
  });

  try {
    headerWatchTimer = setInterval(function () {
      try {
        var key = sessionKey();
        headerPollTicks += 1;
        if (key !== lastHeaderKey) {
          refreshActive();
          return;
        }
        var ipt = document.querySelector("." + HEADER_WRAP_CLASS + " ." + MARK_CLASS);
        var shown = ipt ? String(ipt.value || "").trim() : String(activeNote || "").trim();
        // 空：较快重拉；非空：约每 10s 对一下官方（联系人面板改备注的兜底）
        if (preferNative !== false) {
          if ((!shown && headerPollTicks % 3 === 0) || (shown && headerPollTicks % 8 === 0)) {
            refreshActive();
            return;
          }
        }
        ensureHeaderRemark();
      } catch (_) {}
    }, 1200);
  } catch (_) {}

  try {
    lookupTimer = setInterval(function () {
      if (isRemarkEnabled() && preferNative !== false) refreshWaListLookup();
    }, 20000);
  } catch (_) {}

  try {
    var remarkPane = getChatListPane();
    if (remarkPane) {
      remarkPane.addEventListener(
        "scroll",
        function () {
          scheduleScan();
          if (preferNative !== false) scheduleListLookup(400);
        },
        { passive: true }
      );
    }
  } catch (_) {}

  // ---------- Common phrases (content-quick-phrases + cloud sync 1:1) ----------
  var PHRASE_BAR = "waqp-phrase-bar";
  var PHRASE_MODAL_ID = "waqp-phrase-modal-overlay";
  var PHRASE_TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
  var phraseLastSyncAt = 0;
  var phraseDirtyIds = {};
  var phrasePushTimer = null;
  var phrasePushInFlight = false;
  var phrasePullInFlight = false;
  var phrasePrevLoggedIn = null;
  var phraseCloudBooted = false;

  function isPhraseLoggedIn() {
    try {
      var caps = window.__whatsnowCaps;
      if (caps && caps.loggedIn === true) return true;
      var m = window.__whatsnowMembership;
      if (m && m.loggedIn === true) return true;
    } catch (_) {}
    return false;
  }

  function invokePhrase(cmd, args) {
    try {
      if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
        return window.__TAURI__.core.invoke(cmd, args || {});
      }
    } catch (_) {}
    return Promise.reject(new Error("no_tauri"));
  }

  function ensurePhraseStyles() {
    if (document.getElementById("whatsnow-waqp-styles")) return;
    var parent = document.head || document.documentElement;
    if (!parent) return;
    var s = document.createElement("style");
    s.id = "whatsnow-waqp-styles";
    s.textContent = "/* WA Quick Phrases */\n.waqp-phrase-bar {\n  position: relative;\n  padding: 2px 8px 0;\n  margin: 0;\n  border: none;\n}\n\n.waqp-phrase-bar--empty {\n  min-height: 28px;\n}\n\n.waqp-phrase-settings {\n  position: absolute;\n  top: 2px;\n  right: 22px;\n  z-index: 2;\n  width: 22px;\n  height: 22px;\n  padding: 0;\n  border: none;\n  border-radius: 6px;\n  background: transparent;\n  color: #54656f;\n  cursor: pointer;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  line-height: 0;\n  opacity: 0.72;\n}\n\n.waqp-phrase-settings:hover {\n  opacity: 1;\n  background: rgba(11, 20, 26, 0.06);\n  color: #111b21;\n}\n\n.waqp-phrase-settings svg {\n  width: 15px;\n  height: 15px;\n  display: block;\n}\n\n.waqp-phrase-list {\n  margin: 0;\n  padding-left: 18px;\n  padding-right: 28px;\n  max-height: 160px;\n  overflow-y: auto;\n}\n\n.waqp-phrase-item {\n  font-size: 13px;\n  line-height: 1.45;\n  cursor: pointer;\n  white-space: nowrap;\n  text-overflow: ellipsis;\n  overflow: hidden;\n  width: 100%;\n  max-width: 100%;\n  display: block;\n}\n\n.waqp-phrase-item:hover {\n  background-color: rgba(69, 222, 69, 0.16);\n}\n\nbody.dark .waqp-phrase-settings,\nhtml[data-color-mode=\"dark\"] .waqp-phrase-settings {\n  color: #aebac1;\n}\n\nbody.dark .waqp-phrase-settings:hover,\nhtml[data-color-mode=\"dark\"] .waqp-phrase-settings:hover {\n  background: rgba(255, 255, 255, 0.08);\n  color: #e9edef;\n}\n\nbody.dark .waqp-phrase-item:hover,\nhtml[data-color-mode=\"dark\"] .waqp-phrase-item:hover {\n  background-color: rgba(69, 222, 69, 0.22);\n}\n\n/* WA Quick Phrases manage modal\uff1a\u6cbf\u7528\u539f\u5e03\u5c40\uff0c\u914d\u8272\u5bf9\u9f50 options \u5e38\u7528\u77ed\u8bed */\n.waqp-modal-overlay {\n  --wc-primary: #1c7ed6;\n  --wc-primary-hover: #1864ab;\n  --wc-danger: #c92a2a;\n  --wc-danger-border: #ffc9c9;\n  --wc-radius-sm: 8px;\n  --wc-btn-height: 34px;\n  --wc-text: #343a40;\n  --wc-muted: #868e96;\n  position: fixed;\n  inset: 0;\n  z-index: 2147483646;\n  background: rgba(17, 24, 39, 0.45);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: 16px;\n  box-sizing: border-box;\n}\n\n.waqp-modal {\n  width: min(480px, 94vw);\n  max-height: min(82vh, 720px);\n  overflow: hidden;\n  background: #fff;\n  color: #333;\n  border-radius: 14px;\n  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);\n  font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif;\n  display: flex;\n  flex-direction: column;\n  box-sizing: border-box;\n}\n\n.waqp-modal-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 12px;\n  padding: 14px 16px 10px;\n  flex-shrink: 0;\n}\n\n.waqp-modal-title {\n  margin: 0;\n  font-size: 16px;\n  font-weight: 600;\n  line-height: 1.3;\n  color: #555;\n}\n\n.waqp-modal-close {\n  width: 32px;\n  height: 32px;\n  padding: 0;\n  border: none;\n  border-radius: var(--wc-radius-sm);\n  background: transparent;\n  color: #868e96;\n  cursor: pointer;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  line-height: 0;\n  flex-shrink: 0;\n}\n\n.waqp-modal-close:hover {\n  background: #f1f3f5;\n  color: #343a40;\n}\n\n.waqp-modal-toggle {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  margin: 0 16px 8px;\n  padding: 8px 10px;\n  border-radius: var(--wc-radius-sm);\n  background: #f8f9fa;\n  cursor: pointer;\n  user-select: none;\n  flex-shrink: 0;\n}\n\n.waqp-modal-toggle-input {\n  width: 16px;\n  height: 16px;\n  margin: 0;\n  flex-shrink: 0;\n  accent-color: var(--wc-primary);\n  cursor: pointer;\n}\n\n.waqp-modal-toggle-label {\n  font-size: 13px;\n  line-height: 1.35;\n  color: #333;\n}\n\n.waqp-modal-body {\n  flex: 1 1 auto;\n  overflow-y: auto;\n  padding: 4px 16px 8px;\n  min-height: 80px;\n}\n\n.waqp-modal-empty {\n  font-size: 13px;\n  color: var(--wc-muted);\n  padding: 12px 0;\n}\n\n.waqp-modal-item {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  padding: 10px 0;\n  border-bottom: 1px solid #e9ecef;\n}\n\n.waqp-modal-item:last-child {\n  border-bottom: none;\n}\n\n.waqp-modal-item-text {\n  width: 100%;\n  min-height: 56px;\n  resize: vertical;\n  box-sizing: border-box;\n  padding: 8px 10px;\n  border: 1px solid #dee2e6;\n  border-radius: var(--wc-radius-sm);\n  font: inherit;\n  font-size: 14px;\n  line-height: 1.45;\n  color: #333;\n  background: #fff;\n}\n\n.waqp-modal-item-text:focus {\n  outline: none;\n  border-color: var(--wc-primary);\n  box-shadow: 0 0 0 3px rgba(28, 126, 214, 0.12);\n}\n\n.waqp-modal-item-actions {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  flex-wrap: wrap;\n}\n\n.waqp-modal-compose {\n  flex-shrink: 0;\n  padding: 10px 16px 16px;\n  border-top: 1px solid #e9ecef;\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  background: #fafbfc;\n}\n\n.waqp-modal-new {\n  width: 100%;\n  min-height: 72px;\n  resize: vertical;\n  box-sizing: border-box;\n  padding: 12px;\n  border: 1px solid #dee2e6;\n  border-radius: var(--wc-radius-sm);\n  font: inherit;\n  font-size: 14px;\n  line-height: 1.45;\n  color: #333;\n  background: #fff;\n}\n\n.waqp-modal-new:focus {\n  outline: none;\n  border-color: var(--wc-primary);\n  box-shadow: 0 0 0 3px rgba(28, 126, 214, 0.12);\n}\n\n.waqp-modal-compose-actions {\n  display: flex;\n  justify-content: flex-end;\n}\n\n.waqp-modal .wc-btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 6px;\n  height: var(--wc-btn-height);\n  padding: 0 14px;\n  margin: 0;\n  width: auto;\n  min-width: 0;\n  border-radius: var(--wc-radius-sm);\n  font-size: 13px;\n  font-weight: 500;\n  line-height: 1;\n  cursor: pointer;\n  border: 1px solid transparent;\n  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;\n  box-shadow: none;\n  transform: none;\n  box-sizing: border-box;\n}\n\n.waqp-modal .wc-btn:active:not(:disabled) {\n  transform: translateY(1px);\n}\n\n.waqp-modal .wc-btn:disabled {\n  opacity: 0.45;\n  cursor: not-allowed;\n}\n\n.waqp-modal .wc-btn svg {\n  flex-shrink: 0;\n}\n\n.waqp-modal .wc-btn-icon {\n  width: var(--wc-btn-height);\n  min-width: var(--wc-btn-height);\n  padding: 0;\n}\n\n.waqp-modal .wc-btn-secondary {\n  background: #fff;\n  color: var(--wc-text);\n  border-color: #ced4da;\n}\n\n.waqp-modal .wc-btn-secondary:hover:not(:disabled) {\n  background: #f8f9fa;\n  border-color: #adb5bd;\n}\n\n.waqp-modal .wc-btn-danger {\n  background: #fff;\n  color: var(--wc-danger);\n  border-color: var(--wc-danger-border);\n}\n\n.waqp-modal .wc-btn-danger:hover:not(:disabled) {\n  background: #fff5f5;\n  border-color: #ffa8a8;\n}\n\n.waqp-modal-overlay.dark .waqp-modal,\nbody.dark .waqp-modal-overlay .waqp-modal,\nhtml[data-color-mode=\"dark\"] .waqp-modal-overlay .waqp-modal {\n  background: #1b242b;\n  color: #e6e9ec;\n}\n\n.waqp-modal-overlay.dark .waqp-modal-title,\nbody.dark .waqp-modal-overlay .waqp-modal-title,\nhtml[data-color-mode=\"dark\"] .waqp-modal-overlay .waqp-modal-title {\n  color: #c5cdd3;\n}\n\n.waqp-modal-overlay.dark .waqp-modal-close,\nbody.dark .waqp-modal-overlay .waqp-modal-close,\nhtml[data-color-mode=\"dark\"] .waqp-modal-overlay .waqp-modal-close {\n  color: #8a99a6;\n}\n\n.waqp-modal-overlay.dark .waqp-modal-close:hover,\nbody.dark .waqp-modal-overlay .waqp-modal-close:hover,\nhtml[data-color-mode=\"dark\"] .waqp-modal-overlay .waqp-modal-close:hover {\n  background: rgba(255, 255, 255, 0.08);\n  color: #e6e9ec;\n}\n\n.waqp-modal-overlay.dark .waqp-modal-toggle,\nbody.dark .waqp-modal-overlay .waqp-modal-toggle,\nhtml[data-color-mode=\"dark\"] .waqp-modal-overlay .waqp-modal-toggle {\n  background: #121a20;\n}\n\n.waqp-modal-overlay.dark .waqp-modal-toggle-label,\nbody.dark .waqp-modal-overlay .waqp-modal-toggle-label,\nhtml[data-color-mode=\"dark\"] .waqp-modal-overlay .waqp-modal-toggle-label {\n  color: #e6e9ec;\n}\n\n.waqp-modal-overlay.dark .waqp-modal-empty,\nbody.dark .waqp-modal-overlay .waqp-modal-empty,\nhtml[data-color-mode=\"dark\"] .waqp-modal-overlay .waqp-modal-empty {\n  color: #8a99a6;\n}\n\n.waqp-modal-overlay.dark .waqp-modal-item,\nbody.dark .waqp-modal-overlay .waqp-modal-item,\nhtml[data-color-mode=\"dark\"] .waqp-modal-overlay .waqp-modal-item {\n  border-bottom-color: #2a3640;\n}\n\n.waqp-modal-overlay.dark .waqp-modal-item-text,\n.waqp-modal-overlay.dark .waqp-modal-new,\nbody.dark .waqp-modal-overlay .waqp-modal-item-text,\nbody.dark .waqp-modal-overlay .waqp-modal-new,\nhtml[data-color-mode=\"dark\"] .waqp-modal-overlay .waqp-modal-item-text,\nhtml[data-color-mode=\"dark\"] .waqp-modal-overlay .waqp-modal-new {\n  background: #121a20;\n  border-color: #3b4a54;\n  color: #e6e9ec;\n}\n\n.waqp-modal-overlay.dark .waqp-modal-item-text:focus,\n.waqp-modal-overlay.dark .waqp-modal-new:focus,\nbody.dark .waqp-modal-overlay .waqp-modal-item-text:focus,\nbody.dark .waqp-modal-overlay .waqp-modal-new:focus,\nhtml[data-color-mode=\"dark\"] .waqp-modal-overlay .waqp-modal-item-text:focus,\nhtml[data-color-mode=\"dark\"] .waqp-modal-overlay .waqp-modal-new:focus {\n  border-color: var(--wc-primary);\n  box-shadow: 0 0 0 3px rgba(28, 126, 214, 0.25);\n}\n\n.waqp-modal-overlay.dark .waqp-modal-compose,\nbody.dark .waqp-modal-overlay .waqp-modal-compose,\nhtml[data-color-mode=\"dark\"] .waqp-modal-overlay .waqp-modal-compose {\n  background: #121a20;\n  border-top-color: #2a3640;\n}\n\n.waqp-modal-overlay.dark .waqp-modal .wc-btn-secondary,\nbody.dark .waqp-modal-overlay .waqp-modal .wc-btn-secondary,\nhtml[data-color-mode=\"dark\"] .waqp-modal-overlay .waqp-modal .wc-btn-secondary {\n  background: #1b242b;\n  color: #e6e9ec;\n  border-color: #3b4a54;\n}\n\n.waqp-modal-overlay.dark .waqp-modal .wc-btn-secondary:hover:not(:disabled),\nbody.dark .waqp-modal-overlay .waqp-modal .wc-btn-secondary:hover:not(:disabled),\nhtml[data-color-mode=\"dark\"] .waqp-modal-overlay .waqp-modal .wc-btn-secondary:hover:not(:disabled) {\n  background: #243039;\n  border-color: #4a5a66;\n}\n\n.waqp-modal-overlay.dark .waqp-modal .wc-btn-danger,\nbody.dark .waqp-modal-overlay .waqp-modal .wc-btn-danger,\nhtml[data-color-mode=\"dark\"] .waqp-modal-overlay .waqp-modal .wc-btn-danger {\n  background: #1b242b;\n  color: #ff8787;\n  border-color: #862e2e;\n}\n\n.waqp-modal-overlay.dark .waqp-modal .wc-btn-danger:hover:not(:disabled),\nbody.dark .waqp-modal-overlay .waqp-modal .wc-btn-danger:hover:not(:disabled),\nhtml[data-color-mode=\"dark\"] .waqp-modal-overlay .waqp-modal .wc-btn-danger:hover:not(:disabled) {\n  background: #2b1d1d;\n  border-color: #a61e4d;\n}";
    parent.appendChild(s);
  }

  function phraseUid() {
    return "cp_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 9);
  }

  function phraseVersion(item) {
    if (!item || typeof item !== "object") return 0;
    var u = Number(item.updatedAt) || 0;
    var d = Number(item.deletedAt) || 0;
    return Math.max(u, d);
  }

  function normalizePhraseItem(raw, orderHint) {
    var now = Date.now();
    if (typeof raw === "string") {
      var text0 = raw.trim();
      if (!text0) return null;
      return {
        id: phraseUid(),
        text: text0,
        order: Number.isFinite(orderHint) ? orderHint : 0,
        updatedAt: now,
      };
    }
    if (!raw || typeof raw !== "object") return null;
    var text = String(raw.text || "").trim();
    var deletedAt = raw.deletedAt != null ? Number(raw.deletedAt) || 0 : 0;
    if (!text && !deletedAt) return null;
    var item = {
      id: String(raw.id || "").trim() || phraseUid(),
      text: text,
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

  function normalizePhraseList(raw) {
    var cutoff = Date.now() - PHRASE_TOMBSTONE_TTL_MS;
    var out = [];
    (Array.isArray(raw) ? raw : []).forEach(function (p, i) {
      var item = normalizePhraseItem(p, i);
      if (!item) return;
      if (item.deletedAt && item.deletedAt < cutoff) return;
      out.push(item);
    });
    return out;
  }

  function aliveSortedPhrases(list) {
    return normalizePhraseList(list)
      .filter(function (p) {
        return p && !p.deletedAt && !!String(p.text || "").trim();
      })
      .sort(function (a, b) {
        var ao = Number(a.order) || 0;
        var bo = Number(b.order) || 0;
        if (ao !== bo) return ao - bo;
        var aid = String(a.id || "");
        var bid = String(b.id || "");
        return aid < bid ? -1 : aid > bid ? 1 : 0;
      });
  }

  function mergePhraseLists(base, incoming) {
    var map = {};
    normalizePhraseList(base).forEach(function (it) {
      map[String(it.id)] = it;
    });
    normalizePhraseList(incoming).forEach(function (it) {
      var id = String(it.id);
      var prev = map[id];
      if (!prev || phraseVersion(it) >= phraseVersion(prev)) map[id] = it;
    });
    var out = [];
    Object.keys(map).forEach(function (k) {
      out.push(map[k]);
    });
    return normalizePhraseList(out);
  }

  function readSyncMetaFromCfg() {
    var c = cfg();
    var meta = { lastSyncAt: 0, dirtyIds: [] };
    try {
      var raw = c.quickPhrasesSyncMetaJson || "";
      if (raw) meta = JSON.parse(raw) || meta;
    } catch (_) {}
    phraseLastSyncAt = Number(meta.lastSyncAt) || 0;
    phraseDirtyIds = {};
    (Array.isArray(meta.dirtyIds) ? meta.dirtyIds : []).forEach(function (id) {
      if (id != null && id !== "") phraseDirtyIds[String(id)] = true;
    });
  }

  function syncMetaPayload() {
    return {
      lastSyncAt: Number(phraseLastSyncAt) || 0,
      dirtyIds: Object.keys(phraseDirtyIds),
    };
  }

  function readFullPhrasesFromCfg() {
    var c = cfg();
    var phrases = [];
    try {
      phrases = JSON.parse(c.quickPhrasesJson || "[]");
    } catch (_) {
      phrases = [];
    }
    return normalizePhraseList(phrases);
  }

  function phrasesCacheGet() {
    if (!window.__whatsnowPhrasesCache) {
      window.__whatsnowPhrasesCache = readFullPhrasesFromCfg();
    }
    return window.__whatsnowPhrasesCache;
  }

  function markPhrasesDirty(ids) {
    var list = Array.isArray(ids) ? ids : [ids];
    list.forEach(function (id) {
      if (id == null || id === "") return;
      phraseDirtyIds[String(id)] = true;
    });
  }

  function clearPhraseDirty(ids) {
    (ids || []).forEach(function (id) {
      delete phraseDirtyIds[String(id)];
    });
  }

  function bumpPhraseLastSyncAt(rev) {
    var n = Number(rev) || 0;
    if (n > phraseLastSyncAt) phraseLastSyncAt = n;
  }

  function seedPhrasesOnce() {
    if (window.__whatsnowPhrasesSeeded) return;
    window.__whatsnowPhrasesSeeded = true;
    readSyncMetaFromCfg();
    window.__whatsnowPhrasesCache = readFullPhrasesFromCfg();
  }

  function findComposer() {
    var helpers = window.__whatsnowTranslateHelpers;
    try {
      if (helpers && typeof helpers.getNativeComposerElement === "function") {
        var ed = helpers.getNativeComposerElement();
        if (ed) return ed;
      }
      if (helpers && typeof helpers.getMediaCaptionEditorEl === "function") {
        var cap = helpers.getMediaCaptionEditorEl();
        if (cap) return cap;
      }
    } catch (_) {}
    if (helpers && helpers.findComposeInput) {
      return helpers.findComposeInput(helpers.findComposeRoot && helpers.findComposeRoot());
    }
    return (
      document.querySelector('[data-testid="media-caption-input-container"][contenteditable="true"]') ||
      document.querySelector('[data-testid="conversation-compose-box-input"][contenteditable="true"]') ||
      document.querySelector('footer div[contenteditable="true"][data-lexical-editor="true"]')
    );
  }

  function pastePhrase(text) {
    var helpers = window.__whatsnowTranslateHelpers;
    var input = findComposer();
    if (!input) return;
    var wrote = false;
    if (helpers && typeof helpers.pasteReplaceText === "function") {
      try {
        helpers.pasteReplaceText(input, text);
        wrote = true;
      } catch (_) {}
    }
    if (!wrote && helpers && helpers.setEditableText) {
      helpers.setEditableText(input, text);
      wrote = true;
    }
    if (!wrote) {
      try {
        input.focus();
        document.execCommand("selectAll", false, null);
        document.execCommand("insertText", false, text);
      } catch (_) {
        input.textContent = text;
      }
    }
    try {
      if (typeof input.focus === "function") {
        try {
          input.focus({ preventScroll: true });
        } catch (_) {
          input.focus();
        }
      }
    } catch (_) {}
  }

  function schedulePhrasePush() {
    if (phrasePushTimer) clearTimeout(phrasePushTimer);
    phrasePushTimer = setTimeout(function () {
      phrasePushTimer = null;
      pushDirtyPhrases();
    }, 1500);
  }

  function persistPhrases(list, showPhrases, opts) {
    opts = opts || {};
    var full = normalizePhraseList(list);
    window.__whatsnowPhrasesCache = full;
    var json = JSON.stringify(full);
    var metaJson = JSON.stringify(syncMetaPayload());
    var c = cfg();
    var show = typeof showPhrases === "boolean" ? showPhrases : c.showPhrases !== false;
    if (window.__whatsnowApplyTranslateConfig) {
      window.__whatsnowApplyTranslateConfig(
        Object.assign({}, c, {
          quickPhrasesJson: json,
          quickPhrasesSyncMetaJson: metaJson,
          showPhrases: show,
        })
      );
    }
    invokePhrase("save_quick_phrases", {
      phrasesJson: json,
      showPhrases: show,
      syncMetaJson: metaJson,
    }).catch(function () {});
    if (!opts.skipCloudPush && isPhraseLoggedIn()) {
      schedulePhrasePush();
    }
    return full;
  }

  function markAndPersistPhrases(nextList, dirtyIds) {
    markPhrasesDirty(dirtyIds);
    return persistPhrases(nextList);
  }

  function clearLocalPhraseCloudState() {
    phraseLastSyncAt = 0;
    phraseDirtyIds = {};
    window.__whatsnowPhrasesCache = [];
    persistPhrases([], undefined, { skipCloudPush: true });
  }

  function collectDirtyPhraseChanges() {
    var ids = Object.keys(phraseDirtyIds);
    if (!ids.length) return [];
    var map = {};
    phrasesCacheGet().forEach(function (p) {
      if (p && p.id != null) map[String(p.id)] = p;
    });
    var out = [];
    ids.forEach(function (id) {
      if (map[id]) out.push(map[id]);
    });
    return out;
  }

  function pushDirtyPhrases() {
    if (phrasePushInFlight) return;
    if (!isPhraseLoggedIn()) return;
    var changes = collectDirtyPhraseChanges();
    if (!changes.length) return;
    phrasePushInFlight = true;
    var pushedIds = changes.map(function (c) {
      return String(c.id);
    });
    invokePhrase("common_phrases_push", { payload: { changes: changes } })
      .then(function (res) {
        if (res && res.ok) {
          clearPhraseDirty(pushedIds);
          bumpPhraseLastSyncAt(res.revision || res.server_time);
          persistPhrases(phrasesCacheGet(), undefined, { skipCloudPush: true });
        }
      })
      .catch(function () {})
      .then(function () {
        phrasePushInFlight = false;
      });
  }

  function pullPhrasesFromServer(opts) {
    opts = opts || {};
    if (!isPhraseLoggedIn()) return Promise.resolve(false);
    if (phrasePullInFlight) return Promise.resolve(false);
    phrasePullInFlight = true;
    var forceFull =
      !!opts.forceFull || aliveSortedPhrases(phrasesCacheGet()).length === 0;
    var since = forceFull ? 0 : phraseLastSyncAt;
    if (forceFull && phraseLastSyncAt > 0) {
      phraseLastSyncAt = 0;
    }
    return invokePhrase("common_phrases_pull", { since: since })
      .then(function (res) {
        if (!res || !res.ok || !Array.isArray(res.common_phrases)) return false;
        var merged = forceFull
          ? normalizePhraseList(res.common_phrases)
          : mergePhraseLists(phrasesCacheGet(), res.common_phrases);
        window.__whatsnowPhrasesCache = merged;
        bumpPhraseLastSyncAt(res.revision || res.server_time);
        persistPhrases(merged, undefined, { skipCloudPush: true });
        try {
          renderPhraseBar();
        } catch (_) {}
        return true;
      })
      .catch(function () {
        return false;
      })
      .then(function (ok) {
        phrasePullInFlight = false;
        return ok;
      });
  }

  function kickPhraseCloudSyncAfterAuth() {
    if (!isPhraseLoggedIn()) return;
    clearLocalPhraseCloudState();
    pullPhrasesFromServer({ forceFull: true }).then(function () {
      try {
        renderPhraseBar();
      } catch (_) {}
    });
  }

  function onPhraseMembershipUpdate() {
    var loggedIn = isPhraseLoggedIn();
    var prev = phrasePrevLoggedIn;
    phrasePrevLoggedIn = loggedIn;
    if (prev === null) {
      // First membership paint: boot sync if already logged in.
      if (loggedIn) {
        pullPhrasesFromServer({
          forceFull: aliveSortedPhrases(phrasesCacheGet()).length === 0,
        }).then(function () {
          if (Object.keys(phraseDirtyIds).length) pushDirtyPhrases();
          try {
            renderPhraseBar();
          } catch (_) {}
        });
      }
      return;
    }
    if (loggedIn && !prev) {
      kickPhraseCloudSyncAfterAuth();
    } else if (!loggedIn && prev) {
      clearLocalPhraseCloudState();
      try {
        removePhraseBar();
        closePhraseModal();
      } catch (_) {}
      try {
        renderPhraseBar();
      } catch (_) {}
    }
  }

  window.__whatsnowOnPhraseMembershipUpdate = onPhraseMembershipUpdate;

  function removePhraseBar() {
    try {
      document.querySelectorAll("." + PHRASE_BAR).forEach(function (el) {
        el.remove();
      });
    } catch (_) {}
  }

  function closePhraseModal() {
    try {
      var el = document.getElementById(PHRASE_MODAL_ID);
      if (el) el.remove();
    } catch (_) {}
    try {
      document.removeEventListener("keydown", onPhraseModalKeydown, true);
    } catch (_) {}
  }

  function onPhraseModalKeydown(e) {
    if (e && e.key === "Escape") {
      try {
        e.preventDefault();
      } catch (_) {}
      closePhraseModal();
    }
  }

  function renderPhraseModalList(bodyEl) {
    if (!bodyEl) return;
    bodyEl.innerHTML = "";
    var list = aliveSortedPhrases(phrasesCacheGet());
    if (!list.length) {
      var empty = document.createElement("div");
      empty.className = "waqp-modal-empty";
      empty.textContent = tUi("phrasesEmpty", "暂无常用短语，请在下方添加。");
      bodyEl.appendChild(empty);
      return;
    }
    list.forEach(function (phrase, index) {
      var row = document.createElement("div");
      row.className = "waqp-modal-item";
      row.dataset.id = String(phrase.id || "");

      var ta = document.createElement("textarea");
      ta.className = "waqp-modal-item-text";
      ta.rows = 2;
      ta.value = String(phrase.text || "");
      ta.addEventListener("change", function () {
        var target = normalizePhraseList(phrasesCacheGet()).find(function (p) {
          return String(p.id) === String(phrase.id);
        });
        if (!target) return;
        target.text = String(ta.value || "").trim();
        target.updatedAt = Date.now();
        markAndPersistPhrases(mergePhraseLists(phrasesCacheGet(), [target]), [target.id]);
        renderPhraseBar();
        renderPhraseModalList(bodyEl);
      });

      var actions = document.createElement("div");
      actions.className = "waqp-modal-item-actions";

      var upBtn = document.createElement("button");
      upBtn.type = "button";
      upBtn.className = "wc-btn wc-btn-secondary wc-btn-icon";
      upBtn.title = tUi("phrasesMoveUp", "上移");
      upBtn.setAttribute("aria-label", tUi("phrasesMoveUp", "上移"));
      upBtn.disabled = index === 0;
      upBtn.innerHTML =
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg>';
      upBtn.addEventListener("click", function (e) {
        try {
          e.preventDefault();
          e.stopPropagation();
        } catch (_) {}
        if (index === 0) return;
        var alive = aliveSortedPhrases(phrasesCacheGet());
        var tmp = alive[index - 1];
        alive[index - 1] = alive[index];
        alive[index] = tmp;
        var nowUp = Date.now();
        alive.forEach(function (p, i) {
          p.order = i;
          p.updatedAt = nowUp;
        });
        markAndPersistPhrases(
          mergePhraseLists(phrasesCacheGet(), alive),
          alive.map(function (p) {
            return p.id;
          })
        );
        renderPhraseBar();
        renderPhraseModalList(bodyEl);
      });

      var downBtn = document.createElement("button");
      downBtn.type = "button";
      downBtn.className = "wc-btn wc-btn-secondary wc-btn-icon";
      downBtn.title = tUi("phrasesMoveDown", "下移");
      downBtn.setAttribute("aria-label", tUi("phrasesMoveDown", "下移"));
      downBtn.disabled = index >= list.length - 1;
      downBtn.innerHTML =
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';
      downBtn.addEventListener("click", function (e) {
        try {
          e.preventDefault();
          e.stopPropagation();
        } catch (_) {}
        var alive = aliveSortedPhrases(phrasesCacheGet());
        if (index >= alive.length - 1) return;
        var tmp2 = alive[index + 1];
        alive[index + 1] = alive[index];
        alive[index] = tmp2;
        var nowDown = Date.now();
        alive.forEach(function (p, i) {
          p.order = i;
          p.updatedAt = nowDown;
        });
        markAndPersistPhrases(
          mergePhraseLists(phrasesCacheGet(), alive),
          alive.map(function (p) {
            return p.id;
          })
        );
        renderPhraseBar();
        renderPhraseModalList(bodyEl);
      });

      var delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "wc-btn wc-btn-danger";
      delBtn.innerHTML = '<span class="wc-btn-label">' + tUi("phrasesDelete", "删除") + "</span>";
      delBtn.addEventListener("click", function (e) {
        try {
          e.preventDefault();
          e.stopPropagation();
        } catch (_) {}
        var nowDel = Date.now();
        var tomb = {
          id: phrase.id,
          text: String(phrase.text || ""),
          order: Number(phrase.order) || 0,
          updatedAt: nowDel,
          deletedAt: nowDel,
        };
        markAndPersistPhrases(mergePhraseLists(phrasesCacheGet(), [tomb]), [tomb.id]);
        renderPhraseBar();
        renderPhraseModalList(bodyEl);
      });

      actions.appendChild(upBtn);
      actions.appendChild(downBtn);
      actions.appendChild(delBtn);
      row.appendChild(ta);
      row.appendChild(actions);
      bodyEl.appendChild(row);
    });
  }

  function setShowPhrasesEnabled(enabled) {
    var next = !!enabled;
    var c = cfg();
    if (window.__whatsnowApplyTranslateConfig) {
      window.__whatsnowApplyTranslateConfig(Object.assign({}, c, { showPhrases: next }));
    }
    persistPhrases(phrasesCacheGet(), next);
    if (!next) {
      removePhraseBar();
      closePhraseModal();
      return;
    }
    renderPhraseBar();
  }

  function openPhraseModal() {
    ensurePhraseStyles();
    closePhraseModal();
    var overlay = document.createElement("div");
    overlay.id = PHRASE_MODAL_ID;
    overlay.className = "waqp-modal-overlay";
    overlay.innerHTML =
      '<div class="waqp-modal" role="dialog" aria-modal="true" aria-labelledby="waqp-modal-title">' +
      '<div class="waqp-modal-head">' +
      '<h3 id="waqp-modal-title" class="waqp-modal-title">' +
      tUi("phrasesTitle", "常用短语") +
      "</h3>" +
      '<button type="button" class="waqp-modal-close" aria-label="' +
      tUi("phrasesClose", "关闭") +
      '">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7a1 1 0 0 0-1.4 1.4l4.9 4.9-4.9 4.9a1 1 0 1 0 1.4 1.4l4.9-4.9 4.9 4.9a1 1 0 0 0 1.4-1.4L13.4 12l4.9-4.9a1 1 0 0 0 0-1.4Z"/></svg>' +
      "</button>" +
      "</div>" +
      '<label class="waqp-modal-toggle">' +
      '<input id="waqp-toggle-show-phrases" type="checkbox" class="waqp-modal-toggle-input" />' +
      '<span class="waqp-modal-toggle-label">' +
      tUi("phrasesShowList", "显示常用语列表") +
      "</span>" +
      "</label>" +
      '<div class="waqp-modal-body"></div>' +
      '<div class="waqp-modal-compose">' +
      '<textarea id="waqp-new-phrase" class="waqp-modal-new" rows="3" placeholder="' +
      tUi("phrasesNewPlaceholder", "输入新的常用语") +
      '"></textarea>' +
      '<div class="waqp-modal-compose-actions">' +
      '<button type="button" class="wc-btn wc-btn-secondary" id="waqp-add-phrase">' +
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
      '<span class="wc-btn-label">' +
      tUi("phrasesAdd", "添加") +
      "</span>" +
      "</button>" +
      "</div>" +
      "</div>" +
      "</div>";

    var toggleInput = overlay.querySelector("#waqp-toggle-show-phrases");
    if (toggleInput) {
      toggleInput.checked = cfg().showPhrases !== false;
      toggleInput.addEventListener("change", function () {
        setShowPhrasesEnabled(!!toggleInput.checked);
      });
    }

    try {
      if (
        (document.body && document.body.classList.contains("dark")) ||
        document.documentElement.getAttribute("data-color-mode") === "dark" ||
        document.documentElement.classList.contains("dark")
      ) {
        overlay.classList.add("dark");
      }
    } catch (_) {}

    overlay.addEventListener("click", function (ev) {
      if (ev.target === overlay) closePhraseModal();
    });
    var closeBtn = overlay.querySelector(".waqp-modal-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", function (ev) {
        try {
          ev.preventDefault();
          ev.stopPropagation();
        } catch (_) {}
        closePhraseModal();
      });
    }

    var bodyEl = overlay.querySelector(".waqp-modal-body");
    renderPhraseModalList(bodyEl);

    var newTa = overlay.querySelector("#waqp-new-phrase");
    var addBtn = overlay.querySelector("#waqp-add-phrase");
    if (addBtn && newTa) {
      var doAdd = function () {
        var text = String(newTa.value || "").trim();
        if (!text) return;
        var nowAdd = Date.now();
        var item = {
          id: phraseUid(),
          text: text,
          order: aliveSortedPhrases(phrasesCacheGet()).length,
          updatedAt: nowAdd,
        };
        newTa.value = "";
        markAndPersistPhrases(mergePhraseLists(phrasesCacheGet(), [item]), [item.id]);
        renderPhraseBar();
        renderPhraseModalList(bodyEl);
        try {
          newTa.focus();
        } catch (_) {}
      };
      addBtn.addEventListener("click", function (ev) {
        try {
          ev.preventDefault();
          ev.stopPropagation();
        } catch (_) {}
        doAdd();
      });
      newTa.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
          try {
            ev.preventDefault();
          } catch (_) {}
          doAdd();
        }
      });
    }

    document.body.appendChild(overlay);
    try {
      document.addEventListener("keydown", onPhraseModalKeydown, true);
    } catch (_) {}
    try {
      if (newTa) newTa.focus();
    } catch (_) {}
  }

  function renderPhraseBar() {
    ensurePhraseStyles();
    if (!canCore()) {
      removePhraseBar();
      return;
    }
    var footer = document.querySelector("footer");
    if (!footer) return;

    var existing = footer.querySelector("." + PHRASE_BAR);
    if (existing) existing.remove();

    var c = cfg();
    if (c.showPhrases === false) return;

    var sorted = aliveSortedPhrases(phrasesCacheGet());
    // 无可用短语时不展示栏（含设置按钮），效果等同关闭常用短语
    if (!sorted.length) return;

    var bar = document.createElement("div");
    bar.className = PHRASE_BAR;

    var settingsBtn = document.createElement("button");
    settingsBtn.type = "button";
    settingsBtn.className = "waqp-phrase-settings";
    settingsBtn.title = tUi("phrasesTitle", "常用短语");
    settingsBtn.setAttribute("aria-label", tUi("phrasesTitle", "常用短语"));
    settingsBtn.innerHTML = PHRASES_GEAR_SVG;
    settingsBtn.addEventListener("click", function (e) {
      try {
        e.preventDefault();
        e.stopPropagation();
      } catch (_) {}
      openPhraseModal();
    });
    bar.appendChild(settingsBtn);

    var listEl = document.createElement("ol");
    listEl.className = "waqp-phrase-list";
    listEl.setAttribute("role", "list");
    sorted.forEach(function (p) {
      var text = String(p.text || "");
      if (!text) return;
      var li = document.createElement("li");
      li.className = "waqp-phrase-item";
      li.setAttribute("role", "listitem");
      li.textContent = text;
      li.title = text;
      li.addEventListener("click", function (e) {
        try {
          e.preventDefault();
          e.stopPropagation();
        } catch (_) {}
        pastePhrase(text);
      });
      listEl.appendChild(li);
    });
    bar.appendChild(listEl);

    var sig = sorted.map(function (p) {
      return p.id + ":" + p.text;
    }).join("|");
    bar.setAttribute("data-wn-sig", sig);
    footer.appendChild(bar);
  }

  function ensurePhraseBar() {
    ensurePhraseStyles();
    seedPhrasesOnce();
    if (!canCore() || cfg().showPhrases === false) {
      removePhraseBar();
      return;
    }
    var footer = document.querySelector("footer");
    if (!footer) return;
    var sorted = aliveSortedPhrases(phrasesCacheGet());
    if (!sorted.length) {
      removePhraseBar();
      return;
    }
    var sig = sorted.map(function (p) {
      return p.id + ":" + p.text;
    }).join("|");
    var bar = footer.querySelector("." + PHRASE_BAR);
    if (!bar || bar.getAttribute("data-wn-sig") !== sig) {
      renderPhraseBar();
    }
  }

  // WATransChat content-quick-phrases 1:1: storage/config → immediate re-paint
  window.addEventListener("whatsnow-translate-config", function () {
    try {
      readSyncMetaFromCfg();
      window.__whatsnowPhrasesCache = readFullPhrasesFromCfg();
    } catch (_) {}
    try {
      if (!canCore()) {
        removePhraseBar();
        closePhraseModal();
        return;
      }
      if (cfg().showPhrases === false) {
        removePhraseBar();
        closePhraseModal();
        return;
      }
      renderPhraseBar();
    } catch (_) {}
  });

  // WATransChat content-quick-phrases 1:1: dedicated undebounced MO.
  // Do NOT use shared domMutationBus (400ms debounce) — chat switch rebuilds
  // footer and the extension re-mounts the bar on the same mutation tick.
  try {
    function phraseDomTick() {
      if (!canCore()) {
        removePhraseBar();
        return;
      }
      if (cfg().showPhrases === false) {
        removePhraseBar();
        return;
      }
      var footer = document.querySelector("footer");
      if (!footer) return;
      var hasAlive = aliveSortedPhrases(phrasesCacheGet()).length > 0;
      var hasBar = footer.querySelector("." + PHRASE_BAR);
      if (!hasAlive) {
        if (hasBar) removePhraseBar();
        return;
      }
      if (!hasBar) renderPhraseBar();
    }
    function startPhraseObserve() {
      var phraseObserver = new MutationObserver(phraseDomTick);
      function attach(root) {
        if (!root) return;
        phraseObserver.observe(root, { childList: true, subtree: true });
      }
      if (document.body) attach(document.body);
      else {
        document.addEventListener(
          "DOMContentLoaded",
          function () {
            attach(document.body);
          },
          { once: true }
        );
      }
    }
    function bootPhraseCloudOnce() {
      if (phraseCloudBooted) return;
      phraseCloudBooted = true;
      try {
        onPhraseMembershipUpdate();
      } catch (_) {}
      // Caps may inject slightly later than this script.
      setTimeout(function () {
        try {
          onPhraseMembershipUpdate();
        } catch (_) {}
      }, 400);
      setTimeout(function () {
        try {
          onPhraseMembershipUpdate();
        } catch (_) {}
      }, 1500);
    }
    function bootPhraseBar() {
      try {
        seedPhrasesOnce();
      } catch (_) {}
      try {
        renderPhraseBar();
      } catch (_) {}
      startPhraseObserve();
      bootPhraseCloudOnce();
      setTimeout(function () {
        try {
          renderPhraseBar();
        } catch (_) {}
      }, 800);
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", bootPhraseBar, { once: true });
    } else {
      bootPhraseBar();
    }
  } catch (_) {}

  // ---------- Tick loop ----------
  var tickScheduled = 0;
  function tick() {
    try {
      ensureCustomerLangToolbar();
    } catch (_) {}
    try {
      ensureInlineTranslateBtn();
    } catch (_) {}
    try {
      ensureRemarkHeaderTick();
    } catch (_) {}
    try {
      ensureRemarkListTick();
    } catch (_) {}
    try {
      ensurePhraseBar();
    } catch (_) {}
    try {
      if (typeof ensurePhoneInputBar === "function") ensurePhoneInputBar();
    } catch (_) {}
  }
  function scheduleTick(ms) {
    if (tickScheduled) return;
    tickScheduled = setTimeout(function () {
      tickScheduled = 0;
      tick();
    }, typeof ms === "number" ? ms : 80);
  }

  // Remark boot/observers live in the quick-remark module (content-quick-remark 1:1).
  tick();
  setTimeout(tick, 50);
  setTimeout(tick, 150);
  setTimeout(tick, 400);
  setInterval(tick, 1200);

  try {
    function uiTickOnDom() {
      scheduleTick(80);
      scheduleScan();
      try {
        var key = sessionKey();
        if (key && key !== lastHeaderKey) refreshActive();
      } catch (_) {}
    }
    var bus =
      (window.__whatsnowTranslateHelpers &&
        window.__whatsnowTranslateHelpers.domMutationBus) ||
      window.__whatsnowDomMutationBus;
    if (bus && typeof bus.register === "function") {
      bus.register(uiTickOnDom, { id: "ui-tick" });
    } else {
      var mo = new MutationObserver(uiTickOnDom);
      var t = document.body || document.documentElement;
      if (t) mo.observe(t, { childList: true, subtree: true });
    }
  } catch (_) {}
  window.addEventListener("whatsnow-translate-config", function () {
    scheduleTick(40);
    try {
      refreshAllRemarkUiTexts();
    } catch (_) {}
    try {
      setRemarkEnabled(isRemarkEnabled());
    } catch (_) {}
  });
  try {
    var themeMo = new MutationObserver(function () {
      applyToolbarTheme();
    });
    themeMo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "data-color-mode", "style"],
    });
  } catch (_) {}

  // ---------- Open chat by phone / @username (WATransChat NumberTextInput 1:1) ----------
  var PHONE_INPUT_STYLE_ID = "wa-phone-input-styles";
  var PHONE_INPUT_CSS =
    "#NumberTextInput::selection{background-color:#007bff;color:#fff}" +
    ".phone-input-container{display:flex;align-items:center;gap:8px;padding:0 20px 10px;box-sizing:border-box;background-color:#ffffff;color:#111b21}" +
    ".phone-input-container input#NumberTextInput{flex:1 1 auto;min-width:0;height:36px;box-sizing:border-box;border:1px solid transparent;border-radius:999px;padding:0 16px;outline:none;font-size:14px;line-height:20px;background:#f6f5f4;color:#111b21;transition:border-color .15s ease,background-color .15s ease}" +
    ".phone-input-container input#NumberTextInput::placeholder{color:#667781;opacity:1;font-size:14px}" +
    ".phone-input-container input#NumberTextInput:focus{background:#ffffff;border-color:#111b21}" +
    ".add-chat-btn{flex:0 0 auto;height:36px;margin:0;padding:0 14px;border:1px solid #d1d7db;border-radius:999px;cursor:pointer;font-size:14px;font-weight:400;white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;background-color:#ffffff;color:#54656f;box-shadow:none}" +
    ".add-chat-btn:hover{background-color:#f0f2f5}" +
    ".add-chat-btn:disabled{opacity:.55;cursor:default}" +
    ".dark .phone-input-container{color:#161717;background-color:#161717}" +
    ".dark .phone-input-container input#NumberTextInput{background:#2e2f2f;color:#e9edef;border-color:transparent}" +
    ".dark .phone-input-container input#NumberTextInput::placeholder{color:#a7aaac}" +
    ".dark .phone-input-container input#NumberTextInput:focus{background:#161717;border-color:#e9edef}" +
    ".dark .add-chat-btn{background-color:#182229;color:#8696a0;border:1px solid #2a3942}" +
    ".dark .add-chat-btn:hover{background-color:#202c33;color:#e9edef;border-color:#344651}";

  function ensurePhoneInputStyles() {
    if (document.getElementById(PHONE_INPUT_STYLE_ID)) return;
    try {
      var s = document.createElement("style");
      s.id = PHONE_INPUT_STYLE_ID;
      s.textContent = PHONE_INPUT_CSS;
      (document.head || document.documentElement).appendChild(s);
    } catch (_) {}
  }

  function refreshPhoneInputUiLang() {
    try {
      var ui = getUiLang();
      var phoneInput = document.getElementById("NumberTextInput");
      if (phoneInput) {
        phoneInput.placeholder = tUi("phonePlaceholder", "号码或@账号，如+1… / @name");
      }
      document.querySelectorAll(".add-chat-btn").forEach(function (btn) {
        btn.textContent = tUi("startChat", "聊天");
      });
    } catch (_) {}
  }

  function openChatByQuery(query) {
    if (typeof window.__whatsnowOpenChatByQuery === "function") {
      return window.__whatsnowOpenChatByQuery(query);
    }
    return Promise.resolve({ ok: false, error: "store_unavailable" });
  }

  function ensurePhoneInputBar() {
    try {
      if (document.querySelector(".phone-input-container #NumberTextInput")) {
        var sideOk = document.querySelector("#side");
        if (sideOk && !sideOk.classList.contains("textbox-added")) {
          sideOk.classList.add("textbox-added");
        }
        return true;
      }
      var side = document.querySelector("#side");
      if (!side || !side.parentNode) return false;

      // Prefer inserting before #side (WATransChat 1:1). If parent is weird, still try.
      ensurePhoneInputStyles();

      var inputElement = document.createElement("input");
      inputElement.type = "text";
      inputElement.id = "NumberTextInput";
      inputElement.placeholder = tUi("phonePlaceholder", "号码或@账号，如+1… / @name");
      inputElement.style.width = "auto";
      inputElement.style.flex = "1 1 auto";
      inputElement.style.height = "36px";
      inputElement.style.boxSizing = "border-box";

      var addButton = document.createElement("button");
      addButton.type = "button";
      addButton.textContent = tUi("startChat", "聊天");
      addButton.className = "add-chat-btn";
      addButton.style.flex = "0 0 auto";
      addButton.style.whiteSpace = "nowrap";
      addButton.style.height = "36px";
      addButton.style.padding = "0 12px";
      addButton.style.display = "inline-flex";
      addButton.style.alignItems = "center";
      addButton.style.justifyContent = "center";

      var startOpen = function () {
        var inputValue = (document.getElementById("NumberTextInput") || inputElement).value
          .trim()
          .replace(/\s+/g, "");
        if (!inputValue) return;
        var isUsername = inputValue.charAt(0) === "@" || /[A-Za-z]/.test(inputValue);
        addButton.disabled = true;
        Promise.resolve()
          .then(function () {
            return openChatByQuery(inputValue);
          })
          .then(function (result) {
            if (result && result.ok) {
              try {
                var el = document.getElementById("NumberTextInput") || inputElement;
                if (el) el.value = "";
              } catch (_) {}
              return;
            }
            var msg = isUsername
              ? tUi("openChatByUsernameFailed", "无法打开聊天，请确认该 @账号 有效")
              : tUi("openChatByPhoneFailed", "无法打开聊天，请确认号码已在 WhatsApp 注册");
            try { if (window.__whatsnowNotice) window.__whatsnowNotice(msg); else if (window.__whatsnowAlert) window.__whatsnowAlert(msg); else if (window.appAlert) window.appAlert(msg); else alert(msg); } catch (_) {}
          })
          .catch(function () {
            if (!isUsername) {
              try {
                window.location.href =
                  "https://web.whatsapp.com/send?phone=" +
                  encodeURIComponent(inputValue.replace(/^\+/, ""));
              } catch (_) {}
            }
          })
          .then(function () {
            addButton.disabled = false;
          });
      };

      addButton.addEventListener("click", startOpen);
      inputElement.addEventListener("keydown", function (ev) {
        if (ev && (ev.key === "Enter" || ev.keyCode === 13)) {
          try {
            ev.preventDefault();
          } catch (_) {}
          startOpen();
        }
      });

      var containerDiv = document.createElement("div");
      containerDiv.className = "phone-input-container";
      containerDiv.style.display = "flex";
      containerDiv.style.alignItems = "center";
      containerDiv.appendChild(inputElement);
      containerDiv.appendChild(addButton);
      side.parentNode.insertBefore(containerDiv, side);
      side.classList.add("textbox-added");
      return true;
    } catch (e) {
      try {
        if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
          window.__TAURI__.core.invoke("dlog", {
            msg: "phone-input inject failed: " + String((e && e.message) || e),
          });
        }
      } catch (_) {}
      return false;
    }
  }

  // initialization_script 时 body/#side 尚未就绪：挂在 documentElement，并纳入 tick 重试
  var phoneInputObserverTimer = null;
  function schedulePhoneInputEnsure() {
    if (phoneInputObserverTimer) return;
    phoneInputObserverTimer = setTimeout(function () {
      phoneInputObserverTimer = null;
      try {
        ensurePhoneInputBar();
      } catch (_) {}
    }, 200);
  }
  try {
    var phoneMo = new MutationObserver(function () {
      schedulePhoneInputEnsure();
    });
    var phoneRoot = document.body || document.documentElement;
    if (phoneRoot) {
      phoneMo.observe(phoneRoot, { childList: true, subtree: true });
    }
    if (!document.body) {
      var bodyWait = new MutationObserver(function () {
        if (!document.body) return;
        try {
          bodyWait.disconnect();
        } catch (_) {}
        try {
          phoneMo.observe(document.body, { childList: true, subtree: true });
        } catch (_) {}
        schedulePhoneInputEnsure();
      });
      try {
        bodyWait.observe(document.documentElement, { childList: true });
      } catch (_) {}
    }
  } catch (_) {}
  try {
    ensurePhoneInputBar();
  } catch (_) {}
  // WA 登录后 #side 才出现，持续补挂（与 remark/phrases tick 同节奏）
  var phoneRetryN = 0;
  var phoneRetryTimer = setInterval(function () {
    phoneRetryN += 1;
    var ok = false;
    try {
      ok = !!ensurePhoneInputBar();
    } catch (_) {}
    if (ok || phoneRetryN >= 180) {
      try {
        clearInterval(phoneRetryTimer);
      } catch (_) {}
    }
  }, 1000);
  window.addEventListener("whatsnow-translate-config", function () {
    try {
      refreshPhoneInputUiLang();
    } catch (_) {}
    try {
      ensurePhoneInputBar();
    } catch (_) {}
  });
  window.__whatsnowEnsurePhoneInputBar = ensurePhoneInputBar;

  try {
    if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
      window.__TAURI__.core.invoke("dlog", { msg: "watrans-ui: customer-lang/remark/inline/phrases ready" });
    }
  } catch (_) {}
})();