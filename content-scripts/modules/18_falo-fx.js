 ----------



  function showCurrencyConverterPopup(opts) {



    try {



      var fn = window.__faloShowFxPopup;



      if (typeof fn === 'function') return fn(opts);



    } catch (_) {}



    try {



      var h = window.__faloTranslateHelpers;



      if (h && typeof h.showCurrencyConverterPopup === 'function') {



        return h.showCurrencyConverterPopup(opts);



      }



    } catch (_) {}



  }







  // ---------- Chat list country ----------



  var MARK_CLASS = "chat-country-added";



  var LABEL_CLASS = "wa-country-info";







  function resolveChatListCountryLabel(countryInfo) {



    if (!countryInfo || !countryInfo.region) return "未知国家";



    var name = formatRegionDisplayName(countryInfo.region, "zh");



    if (name && String(name).toUpperCase() !== String(countryInfo.region).toUpperCase()) return name;



    return "未知国家";



  }







  function ensureCountryLabel(titleEl) {



    if (!titleEl || !showCountry()) {



      try {



        var old = titleEl && titleEl.parentNode && titleEl.parentNode.querySelector("." + LABEL_CLASS);



        if (old) old.remove();



        if (titleEl) titleEl.classList.remove(MARK_CLASS);



      } catch (_) {}



      return;



    }



    var raw = (titleEl.getAttribute("title") || titleEl.textContent || "").trim();



    var phone = extractPhoneNumberFromText(raw);



    if (phone && !phone.startsWith("+")) {



      var digits0 = phone.replace(/\D/g, "");



      phone = digits0 ? "+" + digits0 : "";



    }



    if (!phone) phone = lookupCachedStorePhone(raw);



    var iso = lookupCachedStoreIso(raw);



    if (!phone && !iso) {



      // name-only until Store lookup fills cache



      try {



        var sib = titleEl.nextElementSibling;



        if (sib && sib.classList && sib.classList.contains(LABEL_CLASS)) sib.remove();



        titleEl.classList.remove(MARK_CLASS);



      } catch (_) {}



      return;



    }



    var info = phone ? computeCountryInfoFromPhone(phone) : unknownCountryInfo();



    if (!hasValidCountryMetadata(info) && iso) info = computeCountryInfoFromRegion(iso);



    var countryName = resolveChatListCountryLabel(info);



    var countryElement = titleEl.nextElementSibling;



    if (!countryElement || !countryElement.classList || !countryElement.classList.contains(LABEL_CLASS)) {



      countryElement = document.createElement("span");



      countryElement.className = LABEL_CLASS;



      countryElement.style.cssText =



        "margin-left:8px;margin-top:2px;font-size:14px;color:#667781;font-weight:normal;display:inline;";



      try {



        titleEl.parentNode.insertBefore(countryElement, titleEl.nextSibling);



      } catch (_) {



        return;



      }



    }



    countryElement.textContent = countryName;



    countryElement.setAttribute("data-wa-region", info.region || "");



    countryElement.setAttribute("data-wa-lang-id", info.id || "");



    countryElement.setAttribute("data-wa-phone", phone || "");



    countryElement.setAttribute("data-wa-iso", iso || info.region || "");



    titleEl.classList.add(MARK_CLASS);



  }







  function scanChatListCountries() {



    ensureStyles();



    if (!showCountry()) {



      document.querySelectorAll("." + LABEL_CLASS).forEach(function (n) {



        try {



          n.remove();



        } catch (_) {}



      });



      document.querySelectorAll("." + MARK_CLASS).forEach(function (n) {



        n.classList.remove(MARK_CLASS);



      });



      return;



    }



    var pane =



      document.getElementById("pane-side") ||



      document.querySelector("#pane-side") ||



      document.querySelector("#side") ||



      document;



    var titles = pane.querySelectorAll(



      '[data-testid="cell-frame-title"] span[title], [data-testid="cell-frame-title"] span[dir="auto"]'



    );



    var seen = new Set();



    var titleTexts = [];



    for (var i = 0; i < titles.length; i++) {



      var el = titles[i];



      var host = el.closest('[data-testid="cell-frame-title"]') || el.parentElement;



      // prefer span[title] within same host



      var prefer =



        (host && host.querySelector("span[title]")) || el;



      if (seen.has(prefer)) continue;



      seen.add(prefer);



      ensureCountryLabel(prefer);



      var tx = (prefer.getAttribute("title") || prefer.textContent || "").trim();



      if (tx) titleTexts.push(tx);



    }



    // Name-only rows: ask Store for real E.164 (extension scheduleVisiblePhoneLookup).



    try {



      scheduleVisiblePhoneLookup(false, titleTexts);



    } catch (_) {}



  }







  var lookupTimer = 0;



  var lastLookupSig = "";



  function scheduleVisiblePhoneLookup(force, titlesOpt) {



    if (lookupTimer) {



      if (!force) return;



      clearTimeout(lookupTimer);



      lookupTimer = 0;



    }



    lookupTimer = setTimeout(function () {



      lookupTimer = 0;



      var titles = titlesOpt;



      if (!titles || !titles.length) {



        try {



          var pane =



            document.getElementById("pane-side") ||



            document.querySelector("#pane-side") ||



            document.querySelector("#side") ||



            document;



          var els = pane.querySelectorAll(



            '[data-testid="cell-frame-title"] span[title], [data-testid="cell-frame-title"] span[dir="auto"]'



          );



          titles = [];



          for (var i = 0; i < els.length; i++) {



            var tx = (els[i].getAttribute("title") || els[i].textContent || "").trim();



            if (tx) titles.push(tx);



          }



        } catch (_) {



          titles = [];



        }



      }



      var need = titles.filter(function (t) {



        if (extractPhoneNumberFromText(t)) return false;



        return !lookupCachedStorePhone(t);



      });



      var sig = need.join("|");



      if (!force && sig === lastLookupSig) return;



      lastLookupSig = sig;



      if (titles.length) refreshPhoneLookup(titles);



    }, force ? 60 : 220);



  }







  // ---------- Header country · currency · local time ----------



  var countryInfo = unknownCountryInfo();



  var headerScanTimer = null;







  function findConversationPanelRoot(header) {



    try {



      var h = header || document.querySelector('header[data-testid="conversation-header"]');



      if (!h) return null;



      return (



        h.closest('[data-testid="conversation-panel-wrapper"]') ||



        h.parentElement ||



        null



      );



    } catch (_) {



      return null;



    }



  }







  function removeCountryInfoRows(scope) {



    var root = scope || document;



    try {



      root.querySelectorAll(".wa-country-info-row").forEach(function (el) {



        try {



          if (el._waMetaRo) {



            try { el._waMetaRo.disconnect(); } catch (_) {}



            el._waMetaRo = null;



          }



        } catch (_) {}



        try { el.remove(); } catch (_) {}



      });



    } catch (_) {}



  }







  function countCountryInfoRows(scope) {



    try {



      var root = scope || document;



      return root.querySelectorAll(".wa-country-info-row").length;



    } catch (_) {



      return 0;



    }



  }







  function pickConversationTitleElement(header) {



    if (!header) return null;



    try {



      return (



        header.querySelector('span[data-testid="conversation-info-header-chat-title"]') ||



        header.querySelector('[data-testid="conversation-info-header-chat-title"]') ||



        header.querySelector('[data-testid="conversation-info-header"] span[title]') ||



        header.querySelector('[data-testid="conversation-info-header"] span[dir="auto"]') ||



        null



      );



    } catch (_) {



      return null;



    }



  }





  var activeCountryInfoRow = null;







  function getLiveCountryInfoRow() {



    try {



      if (activeCountryInfoRow && activeCountryInfoRow.isConnected) return activeCountryInfoRow;



    } catch (_) {}



    try {



      var all = document.querySelectorAll(".wa-country-info-row");



      if (all.length === 1 && all[0].isConnected) {



        activeCountryInfoRow = all[0];



        return all[0];



      }



    } catch (_) {}



    return null;



  }







  function createHeaderInfo(targetElement) {



    if (!showCountry() && !showFx()) return;







    // Wide and narrow both insert into React-managed trees / flex panels.



    // Always operate document-wide so orphans outside the current parent cannot stack.



    try {



      var live0 = getLiveCountryInfoRow();



      document.querySelectorAll(".wa-country-info-row").forEach(function (el) {



        if (live0 && el === live0) return;



        try {



          if (el._waMetaRo) {



            try { el._waMetaRo.disconnect(); } catch (_) {}



            el._waMetaRo = null;



          }



        } catch (_) {}



        try { el.remove(); } catch (_) {}



      });



    } catch (_) {}







    targetElement.classList.add("language-added");



    var titleForGeo = String(getConversationHeaderChatTitleText() || "").trim();



    var phoneForGeo =



      extractPhoneNumberFromText(getComposerAriaLabelText()) ||



      extractPhoneNumberFromText(titleForGeo) ||



      extractPhoneNumberFromText(targetElement.getAttribute("title") || targetElement.textContent || "") ||



      lookupCachedStorePhone(titleForGeo) ||



      "";



    countryInfo = computeCountryInfoFromPhone(phoneForGeo);



    if (!hasValidCountryMetadata(countryInfo)) {



      var cachedIso0 = lookupCachedStoreIso(titleForGeo);



      if (cachedIso0) countryInfo = computeCountryInfoFromRegion(cachedIso0);



    }



    if (!hasValidCountryMetadata(countryInfo)) {



      var expectKey = titleForGeo;



      resolveActivePhoneFromStore(true).then(function (phoneOrIso) {



        if (!phoneOrIso) return;



        var nowKey = String(getConversationHeaderChatTitleText() || "").trim();



        if (expectKey && nowKey && expectKey !== nowKey) return;



        if (String(phoneOrIso).indexOf("ISO:") === 0) {



          var isoOnly = String(phoneOrIso).slice(4);



          countryInfo = computeCountryInfoFromRegion(isoOnly);



          rememberStoreIso(expectKey || nowKey, isoOnly);



        } else {



          countryInfo = computeCountryInfoFromPhone(phoneOrIso);



          rememberStorePhone(expectKey || nowKey, phoneOrIso);



          if (storePhoneCache.countryIso) {



            rememberStoreIso(expectKey || nowKey, storePhoneCache.countryIso);



          }



        }



        try {



          scanConversationHeaderCountryInfo();



        } catch (_) {}



        // Force rebuild of row text via ticker / re-scan



        try {



          var row = document.querySelector(



            'header[data-testid="conversation-header"] .country-info'



          );



          if (row && hasValidCountryMetadata(countryInfo)) {



            var currentTime = getCurrentTimeInTimeZone(countryInfo.timeZone);



            var countryLabel = formatRegionDisplayName(countryInfo.region, "zh");



            row.textContent = countryLabel



              ? countryLabel + " · " + countryInfo.currency + " · " + currentTime



              : countryInfo.currency + " · " + currentTime;



          }



        } catch (_) {}



      });



    }







    var infoRow = getLiveCountryInfoRow();



    var infoElement;



    var fxBtn;



    var reused = false;







    if (infoRow) {



      reused = true;



      infoElement = infoRow.querySelector(".country-info");



      fxBtn = infoRow.querySelector(".wa-currency-fx-btn");



      if (!infoElement) {



        infoElement = document.createElement("div");



        infoElement.className = "country-info";



        infoRow.insertBefore(infoElement, infoRow.firstChild);



      }



      if (!fxBtn) {



        fxBtn = document.createElement("button");



        fxBtn.type = "button";



        fxBtn.className = "wa-currency-fx-btn";



        fxBtn.title = "汇率转换";



        fxBtn.setAttribute("aria-label", "汇率转换");



        fxBtn.innerHTML = FX_BTN_SVG;



        infoRow.appendChild(fxBtn);



      }



    } else {



      infoRow = document.createElement("div");



      infoRow.className = "wa-country-info-row";



      infoElement = document.createElement("div");



      infoElement.className = "country-info";



      fxBtn = document.createElement("button");



      fxBtn.type = "button";



      fxBtn.className = "wa-currency-fx-btn";



      fxBtn.title = "汇率转换";



      fxBtn.setAttribute("aria-label", "汇率转换");



      fxBtn.innerHTML = FX_BTN_SVG;



      infoRow.appendChild(infoElement);



      infoRow.appendChild(fxBtn);



    }







    activeCountryInfoRow = infoRow;



    if (!showFx()) fxBtn.style.display = "none";



    else fxBtn.style.display = "";



    if (!showCountry()) infoElement.style.display = "none";



    else infoElement.style.display = "";







    // >=800: under title (country then remark); <800: below conversation-header (same line)

    var META_WIDE_MIN = 800;

    var convHeader =

      targetElement.closest('header[data-testid="conversation-header"]') ||

      document.querySelector('header[data-testid="conversation-header"]');

    var infoHeader = targetElement.closest('[data-testid="conversation-info-header"]');

    var panel = convHeader && convHeader.parentElement;

    var subtitleEl = infoHeader ? infoHeader.querySelector('[data-testid="chat-subtitle"]') : null;

    var titleRow = null;

    if (infoHeader) {

      var n = targetElement;

      while (n && n.parentNode !== infoHeader) n = n.parentNode;

      if (n && n.parentNode === infoHeader) titleRow = n;

    }



    function findRemark() {

      try {

        return (

          infoRow.querySelector(":scope > .wa-quick-remark-header") ||

          (infoHeader && infoHeader.querySelector(":scope > .wa-quick-remark-header")) ||

          (panel && panel.querySelector(":scope > .wa-quick-remark-header")) ||

          null

        );

      } catch (_) {

        return null;

      }

    }



    function placeMetaRow() {

      var w = convHeader ? convHeader.getBoundingClientRect().width : META_WIDE_MIN;

      var narrow = w < META_WIDE_MIN;

      infoRow.classList.toggle("wa-country-info-row--compact", narrow);

      var remark = findRemark();



      if (narrow && panel && convHeader) {

        panel.insertBefore(infoRow, convHeader.nextSibling);

        if (remark && remark.parentNode !== infoRow) infoRow.appendChild(remark);

        return;

      }



      if (infoHeader && subtitleEl && subtitleEl.parentNode === infoHeader) {

        infoHeader.insertBefore(infoRow, subtitleEl);

      } else if (infoHeader && titleRow) {

        if (titleRow.nextSibling) infoHeader.insertBefore(infoRow, titleRow.nextSibling);

        else infoHeader.appendChild(infoRow);

      } else if (infoHeader) {

        infoHeader.appendChild(infoRow);

      } else if (targetElement.parentNode) {

        targetElement.parentNode.insertBefore(infoRow, targetElement.nextSibling);

      }



      if (remark && infoHeader) {

        if (infoRow.nextSibling) infoHeader.insertBefore(remark, infoRow.nextSibling);

        else infoHeader.appendChild(remark);

      }

      try {

        if (typeof window.__faloStabilizeHeaderStack === "function") {

          window.__faloStabilizeHeaderStack(infoHeader);

        }

      } catch (_) {}

    }



    try {

      document.querySelectorAll(".wa-country-info-row").forEach(function (el) {

        if (el === infoRow) return;

        try {

          if (el._waMetaRo) {

            try { el._waMetaRo.disconnect(); } catch (_) {}

            el._waMetaRo = null;

          }

        } catch (_) {}

        try { el.remove(); } catch (_) {}

      });

      activeCountryInfoRow = infoRow;

    } catch (_) {}



    placeMetaRow();

    try {

      if (typeof ResizeObserver === "function" && convHeader) {

        if (infoRow._waMetaRo) {

          try { infoRow._waMetaRo.disconnect(); } catch (_) {}

          infoRow._waMetaRo = null;

        }

        var t = null;

        var ro = new ResizeObserver(function () {

          if (t) return;

          t = setTimeout(function () {

            t = null;

            try {

              // Guard: never let resize re-entry create siblings — only move the singleton.

              if (countCountryInfoRows(document) > 1) {

                document.querySelectorAll(".wa-country-info-row").forEach(function (el) {

                  if (el !== infoRow) {

                    try { el.remove(); } catch (_) {}

                  }

                });

              }

              placeMetaRow();

            } catch (_) {}

          }, 80);

        });

        ro.observe(convHeader);

        infoRow._waMetaRo = ro;

      }

    } catch (_) {}







    infoElement.style.cursor = "pointer";







    if (!infoRow._waCountryFxBound) {



      infoRow._waCountryFxBound = true;



      infoElement.addEventListener("click", function (e) {



        try {



          e.preventDefault();



          e.stopPropagation();



        } catch (_) {}



        openCustomerLangFromCountry(infoElement);



      });



      fxBtn.addEventListener("click", function (e) {



        try {



          e.preventDefault();



          e.stopPropagation();



        } catch (_) {}



        var detected = !!(hasValidCountryMetadata(countryInfo) && countryInfo.currency);



        showCurrencyConverterPopup({



          localCurrency: detected ? String(countryInfo.currency).toUpperCase() : "",



          currencyDetected: detected,



          anchorEl: fxBtn,



        });



      });



    }







    function updateInfo() {



      if (!infoElement.isConnected) {



        if (window.__waCountryInfoTimer) {



          clearInterval(window.__waCountryInfoTimer);



          window.__waCountryInfoTimer = null;



        }



        return;



      }



      if (!showCountry()) {



        infoElement.style.display = "none";



      } else {



        infoElement.style.display = "";



      }



      fxBtn.style.display = showFx() ? "" : "none";







      var titleNow = String(getConversationHeaderChatTitleText() || "").trim();



      var phoneNow =



        extractPhoneNumberFromText(getComposerAriaLabelText()) ||



        extractPhoneNumberFromText(titleNow) ||



        lookupCachedStorePhone(titleNow) ||



        (storePhoneCache.key === titleNow ? storePhoneCache.phone : "") ||



        "";



      if (phoneNow) countryInfo = computeCountryInfoFromPhone(phoneNow);



      if (!hasValidCountryMetadata(countryInfo)) {



        var cachedIso1 = lookupCachedStoreIso(titleNow) ||



          (storePhoneCache.key === titleNow ? storePhoneCache.countryIso : "");



        if (cachedIso1) countryInfo = computeCountryInfoFromRegion(cachedIso1);



      }







      if (!hasValidCountryMetadata(countryInfo)) {



        infoElement.textContent = "默认英语";



        // one shot store resolve per title



        if (titleNow && updateInfo._storeTriedKey !== titleNow) {



          updateInfo._storeTriedKey = titleNow;



          resolveActivePhoneFromStore(true).then(function (phoneOrIso) {



            if (!phoneOrIso) return;



            if (String(phoneOrIso).indexOf("ISO:") === 0) {



              var isoOnly2 = String(phoneOrIso).slice(4);



              countryInfo = computeCountryInfoFromRegion(isoOnly2);



              rememberStoreIso(titleNow, isoOnly2);



            } else {



              countryInfo = computeCountryInfoFromPhone(phoneOrIso);



              rememberStorePhone(titleNow, phoneOrIso);



              if (storePhoneCache.countryIso) rememberStoreIso(titleNow, storePhoneCache.countryIso);



            }



            try {



              updateInfo();



            } catch (_) {}



          });



        }



        return;



      }



      var currentTime = getCurrentTimeInTimeZone(countryInfo.timeZone);



      var countryLabel = formatRegionDisplayName(countryInfo.region, "zh");



      infoElement.textContent = countryLabel



        ? countryLabel + " · " + countryInfo.currency + " · " + currentTime



        : countryInfo.currency + " · " + currentTime;



    }







    try {



      if (window.__waCountryInfoTimer) {



        clearInterval(window.__waCountryInfoTimer);



        window.__waCountryInfoTimer = null;



      }



    } catch (_) {}



    updateInfo();



    window.__waCountryInfoTimer = setInterval(updateInfo, 1000);



  }







  function scanConversationHeaderCountryInfo() {



    ensureStyles();



    if (!showCountry() && !showFx()) {



      activeCountryInfoRow = null;



      removeCountryInfoRows(document);



      document.querySelectorAll("header.wa-country-info-added").forEach(function (h) {



        h.classList.remove("wa-country-info-added");



        h.removeAttribute("data-wa-customer-key");



      });



      document.querySelectorAll(".language-added").forEach(function (el) {



        el.classList.remove("language-added");



      });



      return;



    }







    var header = document.querySelector('header[data-testid="conversation-header"]');



    if (!header || !header.querySelector('[data-tab="6"]')) return;







    var targetElement = pickConversationTitleElement(header);



    if (!targetElement) return;







    // Always document-wide: header width <800 on a wide monitor still uses panel sibling insert.



    var rowCount = countCountryInfoRows(document);



    if (rowCount > 1) {



      var keep = getLiveCountryInfoRow();



      document.querySelectorAll(".wa-country-info-row").forEach(function (el) {



        if (keep && el === keep) return;



        try {



          if (el._waMetaRo) {



            try { el._waMetaRo.disconnect(); } catch (_) {}



            el._waMetaRo = null;



          }



        } catch (_) {}



        try { el.remove(); } catch (_) {}



      });



      if (!(keep && keep.isConnected)) {



        activeCountryInfoRow = null;



        removeCountryInfoRows(document);



        try {



          header.classList.remove("wa-country-info-added");



          header.removeAttribute("data-wa-customer-key");



        } catch (_) {}



        try {



          header.querySelectorAll(".language-added").forEach(function (el) {



            el.classList.remove("language-added");



          });



        } catch (_) {}



        rowCount = 0;



      } else {



        activeCountryInfoRow = keep;



        rowCount = 1;



      }



    }







    var customerKey = (targetElement.getAttribute("title") || targetElement.textContent || "").trim();



    var liveRow = getLiveCountryInfoRow();



    var rowAlive = !!(liveRow && liveRow.isConnected);







    if (header.classList.contains("wa-country-info-added")) {



      var prevKey = header.getAttribute("data-wa-customer-key") || "";



      if (prevKey && customerKey && prevKey !== customerKey) {



        activeCountryInfoRow = null;



        removeCountryInfoRows(document);



        try {



          header.querySelectorAll(".language-added").forEach(function (el) {



            el.classList.remove("language-added");



          });



        } catch (_) {}



        header.classList.remove("wa-country-info-added");



        header.removeAttribute("data-wa-customer-key");



        try {



          var hLang = window.__faloTranslateHelpers;



          if (hLang && typeof hLang.loadSessionLanguageSettings === "function") {



            hLang.loadSessionLanguageSettings();



          }



        } catch (_) {}



        rowAlive = false;



      } else if (rowAlive) {



        try {



          var ih = header.querySelector('[data-testid="conversation-info-header"]');



          if (typeof window.__faloStabilizeHeaderStack === "function") {



            window.__faloStabilizeHeaderStack(ih);



          }



        } catch (_) {}



        return;



      } else {



        try {



          header.classList.remove("wa-country-info-added");



          header.removeAttribute("data-wa-customer-key");



        } catch (_) {}



        try {



          targetElement.classList.remove("language-added");



        } catch (_) {}



      }



    } else if (rowAlive) {



      // Row exists but header lost the mark (React re-render) — keep singleton, re-mark, do not create.



      try {



        header.classList.add("wa-country-info-added");



        if (customerKey) header.setAttribute("data-wa-customer-key", customerKey);



        targetElement.classList.add("language-added");



      } catch (_) {}



      try {



        createHeaderInfo(targetElement); // reuse path repositions the same node



      } catch (_) {}



      return;



    }







    if (targetElement.classList.contains("language-added") && rowAlive) return;







    createHeaderInfo(targetElement);



    try {



      var liveHeader = document.querySelector('header[data-testid="conversation-header"]') || header;



      liveHeader.classList.add("wa-country-info-added");



      if (customerKey) liveHeader.setAttribute("data-wa-customer-key", customerKey);



    } catch (_) {}



  }



  function tickAll() {



    try {



      scanChatListCountries();



    } catch (_) {}



    try {



      scanConversationHeaderCountryInfo();



    } catch (_) {}



  }







  var moTimer = 0;



  function schedule(ms) {



    if (moTimer) return;



    moTimer = setTimeout(function () {



      moTimer = 0;



      tickAll();



    }, typeof ms === "number" ? ms : 80);



  }







  // Immediate + burst (extension starts scan on ready, not after 800ms).



  tickAll();



  scheduleVisiblePhoneLookup(true);



  setTimeout(tickAll, 50);



  setTimeout(tickAll, 150);



  setTimeout(tickAll, 400);



  setInterval(tickAll, 1500);







  // Warm Store ASAP, then force phone lookup for visible name titles.



  whenStoreReady(20000).then(function (ok) {



    if (!ok) return;



    try {



      tickAll();



      scheduleVisiblePhoneLookup(true);



    } catch (_) {}



    try {



      if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {



        window.__TAURI__.core.invoke("dlog", { msg: "falo-country-fx: store ready" });



      }



    } catch (_) {}



  });







  try {



    var bus =



      (window.__faloTranslateHelpers &&



        window.__faloTranslateHelpers.domMutationBus) ||



      window.__faloDomMutationBus;



    if (bus && typeof bus.register === "function") {



      bus.register(function () {



        schedule(80);



      }, { id: "country-fx" });



    } else {



      var mo = new MutationObserver(function () {



        schedule(80);



      });



      var root = document.body || document.documentElement;



      if (root) mo.observe(root, { childList: true, subtree: true });



    }



  } catch (_) {}



  try {



    var pane =



      document.getElementById("pane-side") ||



      document.querySelector("#pane-side") ||



      document.querySelector("#side");



    if (pane) {



      pane.addEventListener(



        "scroll",



        function () {



          schedule(60);



        },



        { passive: true }



      );



    }



  } catch (_) {}



  window.addEventListener("falo-translate-config", function () {



    schedule(40);



  });







  try {



    window.__faloGetCountryInfo = function () {



      try {



        return countryInfo || unknownCountryInfo();



      } catch (_) {



        return unknownCountryInfo();



      }



    };



  } catch (_) {}







  try {



    if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {



      window.__TAURI__.core.invoke("dlog", { msg: "falo-country-fx: ready (fast path)" });



    }



  } catch (_) {}



})();