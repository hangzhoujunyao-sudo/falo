/*! Falo translate language list — 1:1 from Falo i18n-data.js langNames.
 * Used by settings-ui (你的语言 / 默认客户语言) and falo-ui (客户语言设置).
 */
(function (global) {
  "use strict";
  if (global.__faloLangList) return;

  var LANG_NAMES = {"zh":{"ab":"阿布哈兹语","sq":"阿尔巴尼亚语","aa":"阿法尔语","ar":"阿拉伯语","alz":"阿卢尔语","am":"阿姆哈拉语","ach":"阿乔利语","as":"阿萨姆语","az":"阿塞拜疆语","awa":"阿瓦德语","av":"阿瓦尔语","ee":"埃维语","ay":"艾马拉语","ga":"爱尔兰语","et":"爱沙尼亚语","or":"奥迪亚语（奥利亚语）","oc":"奥克语","om":"奥罗莫语","os":"奥塞梯语","tpi":"巴布亚皮钦语","bew":"巴达维语","ban":"巴厘语","ba":"巴什基尔语","eu":"巴斯克语","btx":"巴塔克卡罗语","bbc":"巴塔克托巴语","bts":"巴塔克西马隆贡语","bci":"巴乌雷语","be":"白俄罗斯语","bm":"班巴拉语","pag":"邦阿西楠语","pam":"邦板牙语","bg":"保加利亚语","nso":"北索托语","bem":"奔巴语","bik":"比科尔语","bal":"俾路支语","is":"冰岛语","pl":"波兰语","bs":"波斯尼亚语","fa":"波斯语","bho":"博杰普尔语","bua":"布里亚特语","br":"布列塔尼语","bo":"藏语","chm":"草原马里语","ch":"查莫罗语","ce":"车臣语","chk":"楚克语","cv":"楚瓦什语","tn":"茨瓦纳语","ts":"聪加语","fa-AF":"达里语","tt":"鞑靼语","da":"丹麦语","shn":"掸语","tet":"德顿语","de":"德语","dv":"迪维希语","dyu":"迪尤拉语","tiv":"蒂夫语","din":"丁卡语","doi":"多格拉语","ru":"俄语","ndc-ZW":"恩道语","nr":"恩德贝莱语（南部）","dov":"恩敦贝语","bm-Nkoo":"恩科语","fo":"法罗语","fr":"法语","fr-CA":"法语（加拿大）","sa":"梵语","tl":"菲律宾语","fj":"斐济语","fi":"芬兰语","fon":"丰语","fy":"弗里西语","fur":"弗留利语","ff":"富拉尼语","kg":"刚果语","km":"高棉语","kl":"格陵兰语","ka":"格鲁吉亚语","gom":"贡根语","gu":"古吉拉特语","gn":"瓜拉尼语","cnh":"哈卡钦语","kk":"哈萨克语","ht":"海地克里奥尔语","ko":"韩语","ha":"豪萨语","nl":"荷兰语","hrx":"洪斯吕克语","ky":"吉尔吉斯语","ktu":"吉土巴语","gl":"加利西亚语","ca":"加泰罗尼亚语","gaa":"加语","cs":"捷克语","kac":"景颇语","kn":"卡纳达语","kr":"卡努里语","kha":"卡西语","kek":"凯克其语","kv":"科米语","xh":"科萨语","co":"科西嘉语","crh-Latn":"克里米亚鞑靼语（拉丁文）","crh":"克里米亚鞑靼语（西里尔文）","hr":"克罗地亚语","qu":"克丘亚语","ku":"库尔德语（库尔曼吉语）","ckb":"库尔德语（索拉尼）","trp":"廓克博若克语","la":"拉丁语","ltg":"拉特加莱语","lv":"拉脱维亚语","lo":"老挝语","lt":"立陶宛语","lij":"利古里亚语","li":"林堡语","ln":"林加拉语","rn":"隆迪语","luo":"卢奥语","lg":"卢干达语","lb":"卢森堡语","rw":"卢旺达语","lmo":"伦巴第语","ro":"罗马尼亚语","rom":"罗姆语","mad":"马都拉语","gv":"马恩岛语","mg":"马尔加什语","mwr":"马尔瓦迪语","mt":"马耳他语","mr":"马拉地语","ml":"马拉雅拉姆语","ms":"马来语","ms-Arab":"马来语（爪夷文）","mk":"马其顿语","mh":"马绍尔语","mam":"玛姆语","mai":"迈蒂利语","mfe":"毛里求斯克里奥尔语","mi":"毛利语","mni-Mtei":"梅泰语（曼尼普尔语）","mn":"蒙古语","bn":"孟加拉语","min":"米南语","lus":"米佐语","my":"缅甸语","hmn":"苗语","nhe":"纳瓦特尔语（东部瓦斯特卡）","af":"南非荷兰语","st":"南索托语","new":"尼泊尔巴萨语","ne":"尼泊尔语","nus":"努尔语","no":"挪威语","pap":"帕皮阿门托语","pa":"旁遮普语（果鲁穆奇文）","pa-Arab":"旁遮普语（沙木基文）","pt":"葡萄牙语（巴西）","pt-PT":"葡萄牙语（葡萄牙）","ps":"普什图语","ny":"齐切瓦语","cgg":"奇加语","lua":"奇卢伯语","ak":"契维语","ja":"日语","sv":"瑞典语","zap":"萨巴特克语","se":"萨米语（北部）","sm":"萨摩亚语","sr":"塞尔维亚语","kri":"塞拉利昂克里奥尔语","crs":"塞舌尔克里奥尔语","sg":"桑戈语","sat":"桑塔利语（奥尔奇基文）","sat-Latn":"桑塔利语（拉丁文）","si":"僧伽罗语","eo":"世界语","sk":"斯洛伐克语","sl":"斯洛文尼亚语","ss":"斯瓦特语","sw":"斯瓦希里语","gd":"苏格兰盖尔语","sus":"苏苏语","ceb":"宿务语","so":"索马里语","tg":"塔吉克语","ber-Latn":"塔马齐格特语","ber":"塔马齐格特语（提非纳文）","ty":"塔希提语","te":"泰卢固语","ta":"泰米尔语","th":"泰语","to":"汤加语","ti":"提格里尼亚语","tcy":"图鲁语","tum":"图姆布卡语","tyv":"图瓦语","tr":"土耳其语","tk":"土库曼语","war":"瓦瑞语","mak":"望加锡语","cy":"威尔士语","vec":"威尼斯语","ug":"维吾尔语","ve":"文达语","wo":"沃洛夫语","udm":"乌德穆尔特语","ur":"乌尔都语","uk":"乌克兰语","uz":"乌兹别克语","es":"西班牙语","szl":"西里西亚语","scn":"西西里语","iw":"希伯来语","el":"希腊语","hil":"希利盖农语","haw":"夏威夷语","sd":"信德语","hu":"匈牙利语","sn":"修纳语","su":"巽他语","jam":"牙买加土语","sah":"雅库特语","hy":"亚美尼亚语","ace":"亚齐语","iba":"伊班语","ig":"伊博语","ilo":"伊洛卡诺语","it":"意大利语","yi":"意第绪语","iu-Latn":"因纽特语（拉丁文）","iu":"因纽特语（音节文字）","hi":"印地语","id":"印尼语","en":"英语","yua":"尤卡坦玛雅语","yo":"约鲁巴语","yue":"粤语","vi":"越南语","jw":"爪哇语","zh-TW":"中文（繁体）","zh-CN":"中文（简体）","dz":"宗卡语","zu":"祖鲁语"},"en":{"ab":"Abkhaz","ace":"Acehnese","ach":"Acholi","aa":"Afar","af":"Afrikaans","sq":"Albanian","alz":"Alur","am":"Amharic","ar":"Arabic","hy":"Armenian","as":"Assamese","av":"Avar","awa":"Awadhi","ay":"Aymara","az":"Azerbaijani","ban":"Balinese","bal":"Baluchi","bm":"Bambara","bci":"Baoulé","ba":"Bashkir","eu":"Basque","btx":"Batak Karo","bts":"Batak Simalungun","bbc":"Batak Toba","be":"Belarusian","bem":"Bemba","bn":"Bengali","bew":"Betawi","bho":"Bhojpuri","bik":"Bikol","bs":"Bosnian","br":"Breton","bg":"Bulgarian","bua":"Buryat","yue":"Cantonese","ca":"Catalan","ceb":"Cebuano","ch":"Chamorro","ce":"Chechen","ny":"Chichewa","zh-CN":"Chinese (Simplified)","zh-TW":"Chinese (Traditional)","chk":"Chuukese","cv":"Chuvash","co":"Corsican","crh":"Crimean Tatar (Cyrillic)","crh-Latn":"Crimean Tatar (Latin)","hr":"Croatian","cs":"Czech","da":"Danish","fa-AF":"Dari","dv":"Dhivehi","din":"Dinka","doi":"Dogri","dov":"Dombe","nl":"Dutch","dyu":"Dyula","dz":"Dzongkha","en":"English","eo":"Esperanto","et":"Estonian","ee":"Ewe","fo":"Faroese","fj":"Fijian","tl":"Filipino","fi":"Finnish","fon":"Fon","fr":"French","fr-CA":"French (Canada)","fy":"Frisian","fur":"Friulian","ff":"Fulani","gaa":"Ga","gl":"Galician","ka":"Georgian","de":"German","el":"Greek","gn":"Guarani","gu":"Gujarati","ht":"Haitian Creole","cnh":"Hakha Chin","ha":"Hausa","haw":"Hawaiian","iw":"Hebrew","hil":"Hiligaynon","hi":"Hindi","hmn":"Hmong","hu":"Hungarian","hrx":"Hunsrik","iba":"Iban","is":"Icelandic","ig":"Igbo","ilo":"Ilocano","id":"Indonesian","iu-Latn":"Inuktut (Latin)","iu":"Inuktut (Syllabics)","ga":"Irish","it":"Italian","jam":"Jamaican Patois","ja":"Japanese","jw":"Javanese","kac":"Jingpo","kl":"Kalaallisut","kn":"Kannada","kr":"Kanuri","pam":"Kapampangan","kk":"Kazakh","kha":"Khasi","km":"Khmer","cgg":"Kiga","kg":"Kikongo","rw":"Kinyarwanda","ktu":"Kituba","trp":"Kokborok","kv":"Komi","gom":"Konkani","ko":"Korean","kri":"Krio","ku":"Kurdish (Kurmanji)","ckb":"Kurdish (Sorani)","ky":"Kyrgyz","lo":"Lao","ltg":"Latgalian","la":"Latin","lv":"Latvian","lij":"Ligurian","li":"Limburgish","ln":"Lingala","lt":"Lithuanian","lmo":"Lombard","lg":"Luganda","luo":"Luo","lb":"Luxembourgish","mk":"Macedonian","mad":"Madurese","mai":"Maithili","mak":"Makassar","mg":"Malagasy","ms":"Malay","ms-Arab":"Malay (Jawi)","ml":"Malayalam","mt":"Maltese","mam":"Mam","gv":"Manx","mi":"Maori","mr":"Marathi","mh":"Marshallese","mwr":"Marwadi","mfe":"Mauritian Creole","chm":"Meadow Mari","mni-Mtei":"Meiteilon (Manipuri)","min":"Minang","lus":"Mizo","mn":"Mongolian","my":"Myanmar (Burmese)","nhe":"Nahuatl (Eastern Huasteca)","ndc-ZW":"Ndau","nr":"Ndebele (South)","new":"Nepalbhasa (Newari)","ne":"Nepali","bm-Nkoo":"NKo","no":"Norwegian","nus":"Nuer","oc":"Occitan","or":"Odia (Oriya)","om":"Oromo","os":"Ossetian","pag":"Pangasinan","pap":"Papiamento","ps":"Pashto","fa":"Persian","pl":"Polish","pt":"Portuguese (Brazil)","pt-PT":"Portuguese (Portugal)","pa":"Punjabi (Gurmukhi)","pa-Arab":"Punjabi (Shahmukhi)","qu":"Quechua","kek":"Qʼeqchiʼ","rom":"Romani","ro":"Romanian","rn":"Rundi","ru":"Russian","se":"Sami (North)","sm":"Samoan","sg":"Sango","sa":"Sanskrit","sat-Latn":"Santali (Latin)","sat":"Santali (Ol Chiki)","gd":"Scots Gaelic","nso":"Sepedi","sr":"Serbian","st":"Sesotho","crs":"Seychellois Creole","shn":"Shan","sn":"Shona","scn":"Sicilian","szl":"Silesian","sd":"Sindhi","si":"Sinhala","sk":"Slovak","sl":"Slovenian","so":"Somali","es":"Spanish","su":"Sundanese","sus":"Susu","sw":"Swahili","ss":"Swati","sv":"Swedish","ty":"Tahitian","tg":"Tajik","ber-Latn":"Tamazight","ber":"Tamazight (Tifinagh)","ta":"Tamil","tt":"Tatar","te":"Telugu","tet":"Tetum","th":"Thai","bo":"Tibetan","ti":"Tigrinya","tiv":"Tiv","tpi":"Tok Pisin","to":"Tongan","lua":"Tshiluba","ts":"Tsonga","tn":"Tswana","tcy":"Tulu","tum":"Tumbuka","tr":"Turkish","tk":"Turkmen","tyv":"Tuvan","ak":"Twi","udm":"Udmurt","uk":"Ukrainian","ur":"Urdu","ug":"Uyghur","uz":"Uzbek","ve":"Venda","vec":"Venetian","vi":"Vietnamese","war":"Waray","cy":"Welsh","wo":"Wolof","xh":"Xhosa","sah":"Yakut","yi":"Yiddish","yo":"Yoruba","yua":"Yucatec Maya","zap":"Zapotec","zu":"Zulu"}};

  function normalizeUi(ui) {
    var raw = String(ui || "zh").trim().toLowerCase().replace(/_/g, "-");
    if (raw.indexOf("zh") === 0) return "zh";
    if (raw.indexOf("en") === 0) return "en";
    return LANG_NAMES[raw] ? raw : "zh";
  }

  function autoLabel(ui, kind) {
    var u = normalizeUi(ui);
    if (kind === "defaultCustomer") {
      return u === "zh"
        ? "自动识别（根据号码区号推断）"
        : "Auto detect (by phone country code)";
    }
    return u === "zh" ? "自动检测语言" : "Auto detect";
  }

  /**
   * 常用语言置顶顺序（与 Falo i18n-runtime.js 一致）：
   * 英语、西班牙语、法语、德语、阿拉伯语、俄语、葡萄牙语、日语、韩语、印地语、
   * 土耳其语、泰语、意大利语、荷兰语、越南语、印尼语/马来语、波兰语、孟加拉语、乌尔都语。
   */
  var PINNED_TRANSLATE_LANGS = [
    "en", "es", "fr", "de", "ar", "ru", "pt", "pt-PT", "ja", "ko", "hi",
    "tr", "th", "it", "nl", "vi", "id", "ms", "ms-Arab", "pl", "bn", "ur"
  ];

  /** Same contract as FaloI18n.listTranslateLanguages */
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

  /** Minimal CSS for WhatsApp page popup (settings-ui has its own style.css). */
  function ensureLangSearchStyles() {
    if (typeof document === "undefined") return;
    if (document.getElementById("falo-lang-search-styles")) return;
    var parent = document.head || document.documentElement;
    if (!parent) return;
    var s = document.createElement("style");
    s.id = "falo-lang-search-styles";
    s.textContent =
      "select.lang-search-select-native{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;opacity:0;pointer-events:none}" +
      ".lang-search-select{position:relative;width:100%}" +
      ".lang-search-select-input{width:100%;box-sizing:border-box;height:36px;padding:0 10px;border:1px solid #ced4da;border-radius:8px;background:#fff;font-size:13px;color:#343a40;outline:none}" +
      ".lang-search-select-dropdown{position:absolute;left:0;right:0;top:calc(100% + 4px);max-height:260px;overflow:auto;background:#fff;color:#343a40;border:1px solid #ced4da;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:100000}" +
      ".lang-search-select-dropdown[hidden]{display:none!important}" +
      ".lang-search-select-item{padding:10px 12px;cursor:pointer;user-select:none;font-size:13px;line-height:16px}" +
      ".lang-search-select-item:hover,.lang-search-select-item.is-active{background:rgba(0,0,0,.06)}" +
      ".lang-search-select-empty{padding:10px 12px;font-size:12px;color:#868e96}";
    parent.appendChild(s);
  }

  /** Falo options.js ensureLangSearchSelect — searchable language picker */
  function syncSearchInput(wrap) {
    if (!wrap) return;
    var select = wrap.querySelector("select");
    var input = wrap.querySelector(".lang-search-select-input");
    if (!select || !input) return;
    var val = select.value || "";
    var label = "";
    var opts = select.options || [];
    for (var i = 0; i < opts.length; i++) {
      if (opts[i].value === val) {
        label = opts[i].textContent || "";
        break;
      }
    }
    if (!label) label = formatLanguageDisplayName(val, wrap.getAttribute("data-ui-lang") || "zh");
    input.value = label;
    input.placeholder = "搜索语言...";
  }

  function closeSearchDropdown(wrap, restore) {
    if (!wrap) return;
    var dropdown = wrap.querySelector(".lang-search-select-dropdown");
    if (dropdown) {
      dropdown.setAttribute("hidden", "true");
      dropdown.innerHTML = "";
    }
    if (restore) syncSearchInput(wrap);
  }

  function closeAllSearchDropdowns(except, restore) {
    document.querySelectorAll(".lang-search-select").forEach(function (w) {
      if (except && except === w) return;
      closeSearchDropdown(w, restore);
    });
  }

  function renderSearchDropdown(wrap, query) {
    var select = wrap.querySelector("select");
    var dropdown = wrap.querySelector(".lang-search-select-dropdown");
    if (!select || !dropdown) return;
    var q = String(query || "").trim().toLowerCase();
    var currentVal = select.value || "";
    var opts = [];
    Array.prototype.forEach.call(select.options || [], function (opt) {
      if (opt.value == null || opt.value === "") return;
      opts.push({ value: opt.value, text: String(opt.textContent || opt.value) });
    });
    var filtered = q
      ? opts.filter(function (o) {
          return (
            (o.text || "").toLowerCase().indexOf(q) >= 0 ||
            (o.value || "").toLowerCase().indexOf(q) >= 0
          );
        })
      : opts;
    dropdown.innerHTML = "";
    if (!filtered.length) {
      var empty = document.createElement("div");
      empty.className = "lang-search-select-empty";
      empty.textContent = "未找到匹配语言";
      dropdown.appendChild(empty);
    } else {
      filtered.slice(0, 300).forEach(function (o) {
        var item = document.createElement("div");
        item.className = "lang-search-select-item";
        item.setAttribute("role", "option");
        item.setAttribute("data-value", o.value);
        item.textContent = o.text;
        if (o.value === currentVal) item.classList.add("is-active");
        item.addEventListener("mousedown", function (ev) {
          ev.preventDefault();
          select.value = o.value;
          try {
            select.dispatchEvent(new Event("change", { bubbles: true }));
          } catch (_) {}
          syncSearchInput(wrap);
          closeSearchDropdown(wrap);
        });
        dropdown.appendChild(item);
      });
    }
    dropdown.removeAttribute("hidden");
  }

  function openSearchDropdown(wrap, useCurrentInput) {
    if (!wrap) return;
    closeAllSearchDropdowns(wrap, false);
    var input = wrap.querySelector(".lang-search-select-input");
    var q = useCurrentInput && input ? input.value || "" : "";
    renderSearchDropdown(wrap, q);
  }

  function ensureOutsideClose() {
    if (global.__faloLangSearchOutsideBound) return;
    global.__faloLangSearchOutsideBound = true;
    document.addEventListener(
      "pointerdown",
      function (ev) {
        var t = ev.target;
        if (t && t.closest && t.closest(".lang-search-select")) return;
        closeAllSearchDropdowns(null, true);
      },
      true
    );
  }

  /**
   * Wrap a <select> with searchable input + dropdown (extension ensureLangSearchSelect).
   * Returns the wrapper element.
   */
  function enhanceSelect(selectEl, opts) {
    if (!selectEl || selectEl.nodeType !== 1) return null;
    opts = opts || {};
    ensureLangSearchStyles();
    var wrap = selectEl.closest && selectEl.closest(".lang-search-select");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "lang-search-select";
      var id = selectEl.id || "";
      if (id) wrap.setAttribute("data-lang-search", id);
      wrap.setAttribute("data-ui-lang", opts.uiLang || "zh");
      var input = document.createElement("input");
      input.type = "text";
      input.className = "lang-search-select-input";
      input.setAttribute("autocomplete", "off");
      input.setAttribute("spellcheck", "false");
      if (id) input.id = id + "-input";
      if (opts.inputStyle) input.style.cssText = opts.inputStyle;
      var dropdown = document.createElement("div");
      dropdown.className = "lang-search-select-dropdown";
      dropdown.setAttribute("role", "listbox");
      dropdown.setAttribute("hidden", "true");
      if (opts.dropdownStyle) dropdown.style.cssText = opts.dropdownStyle;
      var parent = selectEl.parentNode;
      if (!parent) return null;
      parent.insertBefore(wrap, selectEl);
      wrap.appendChild(selectEl);
      wrap.appendChild(input);
      wrap.appendChild(dropdown);
    }
    selectEl.classList.add("lang-search-select-native");
    selectEl.setAttribute("tabindex", "-1");
    selectEl.setAttribute("aria-hidden", "true");
    if (wrap.getAttribute("data-lang-search-bound") === "1") {
      syncSearchInput(wrap);
      return wrap;
    }
    wrap.setAttribute("data-lang-search-bound", "1");
    var inputEl = wrap.querySelector(".lang-search-select-input");
    inputEl.addEventListener("focus", function () {
      openSearchDropdown(wrap, false);
      try {
        inputEl.select();
      } catch (_) {}
    });
    inputEl.addEventListener("click", function () {
      openSearchDropdown(wrap, false);
    });
    inputEl.addEventListener("input", function () {
      openSearchDropdown(wrap, true);
    });
    inputEl.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") {
        ev.preventDefault();
        syncSearchInput(wrap);
        closeSearchDropdown(wrap);
        return;
      }
      if (ev.key === "Enter") {
        var q = String(inputEl.value || "").trim().toLowerCase();
        if (!q) return;
        var matched = null;
        Array.prototype.forEach.call(selectEl.options || [], function (opt) {
          if (matched) return;
          var value = String(opt.value || "");
          var text = String(opt.textContent || "").toLowerCase();
          if (text === q || value.toLowerCase() === q) matched = value;
        });
        if (matched != null) {
          ev.preventDefault();
          selectEl.value = matched;
          try {
            selectEl.dispatchEvent(new Event("change", { bubbles: true }));
          } catch (_) {}
          syncSearchInput(wrap);
          closeSearchDropdown(wrap);
        }
      }
    });
    wrap.addEventListener("pointerdown", function (ev) {
      ev.stopPropagation();
    });
    ensureOutsideClose();
    syncSearchInput(wrap);
    return wrap;
  }

  global.__faloLangList = {
    langNames: LANG_NAMES,
    listTranslateLanguages: listTranslateLanguages,
    formatLanguageDisplayName: formatLanguageDisplayName,
    fillSelect: fillSelect,
    enhanceSelect: enhanceSelect,
    syncSearchInput: syncSearchInput,
    autoLabel: autoLabel,
  };
})(typeof window !== "undefined" ? window : globalThis);
