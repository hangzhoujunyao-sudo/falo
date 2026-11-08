 一致）：
   * 英语、西班牙语、法语、德语、阿拉伯语、俄语、葡萄牙语、日语、韩语、印地语、
   * 土耳其语、泰语、意大利语、荷兰语、越南语、印尼语/马来语、波兰语、孟加拉语、乌尔都语。
   */
  var PINNED_TRANSLATE_LANGS = [
    "en", "es", "fr", "de", "ar", "ru", "pt", "pt-PT", "ja", "ko", "hi",
    "tr", "th", "it", "nl", "vi", "id", "ms", "ms-Arab", "pl", "bn", "ur"
  ];

  /** Same contract as WATransChatI18n.listTranslateLanguages */
  function listTranslateLanguages(uiLang, extras) {
    extras = extras || {};
    var ui = normalizeUi(uiLang);
    var table = LANG_NAMES[ui] || LANG_NAMES.zh || LANG_NAMES.en || {};
    var out = [];
    if (extras.includeAuto !== false) {
      out.push({
        value: "auto",
        text: autoLabel(ui, extras.autoKind || "detect"),
      });
    }

    var pinRank = {};
    for (var i = 0; i < PINNED_TRANSLATE_LANGS.length; i++) {
      pinRank[PINNED_TRANSLATE_LANGS[i]] = i;
    }

    var codes = Object.keys(table);
    var collatorLocale = ui === "zh" ? "zh-CN" : ui;
    codes.sort(function (a, b) {
      var ra = Object.prototype.hasOwnProperty.call(pinRank, a) ? pinRank[a] : -1;
      var rb = Object.prototype.hasOwnProperty.call(pinRank, b) ? pinRank[b] : -1;
      var aPinned = ra >= 0;
      var bPinned = rb >= 0;
      if (aPinned && bPinned) return ra - rb;
      if (aPinned) return -1;
      if (bPinned) return 1;
      var ta = String(table[a] || a);
      var tb = String(table[b] || b);
      try {
        return ta.localeCompare(tb, collatorLocale, { sensitivity: "base" });
      } catch (_) {
        if (ta < tb) return -1;
        if (ta > tb) return 1;
        return 0;
      }
    });

    for (var j = 0; j < codes.length; j++) {
      var code = codes[j];
      out.push({ value: code, text: table[code] });
    }
    return out;
  }

  function formatLanguageDisplayName(code, uiLang) {
    var ui = normalizeUi(uiLang);
    if (!code || code === "auto") return autoLabel(ui, "detect");
    var table = LANG_NAMES[ui] || LANG_NAMES.zh || {};
    if (table[code]) return table[code];
    if (LANG_NAMES.en && LANG_NAMES.en[code]) return LANG_NAMES.en[code];
    if (LANG_NAMES.zh && LANG_NAMES.zh[code]) return LANG_NAMES.zh[code];
    return String(code);
  }

  function fillSelect(selectEl, opts) {
    if (!selectEl) return;
    opts = opts || {};
    var ui = opts.uiLang || "zh";
    var prev = selectEl.value;
    var list = listTranslateLanguages(ui, {
      includeAuto: opts.includeAuto !== false,
      autoKind: opts.autoKind || "detect",
    });
    selectEl.innerHTML = "";
    list.forEach(function (item) {
      if (!item || !item.value) return;
      var o = document.createElement("option");
      o.value = item.value;
      o.textContent = item.text;
      selectEl.appendChild(o);
    });
    var preferred = opts.value != null ? opts.value : prev;
    if (preferred) {
      try {
        selectEl.value = preferred;
      } catch (_) {}
      if (selectEl.value !== preferred) {
        // keep unknown saved value visible
        var miss = document.createElement("option");
        miss.value = preferred;
        miss.textContent = formatLanguageDisplayName(preferred, ui) || preferred;
        selectEl.insertBefore(miss, selectEl.firstChild);
        selectEl.value = preferred;
      }
    }
  }

  /** Minimal CSS for WhatsApp page popup (settings-ui has its own