 ensureLangSearchSelect — searchable language picker */
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
    if (global.__whatsnowLangSearchOutsideBound) return;
    global.__whatsnowLangSearchOutsideBound = true;
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

  global.__whatsnowLangList = {
    langNames: LANG_NAMES,
    listTranslateLanguages: listTranslateLanguages,
    formatLanguageDisplayName: formatLanguageDisplayName,
    fillSelect: fillSelect,
    enhanceSelect: enhanceSelect,
    syncSearchInput: syncSearchInput,
    autoLabel: autoLabel,
  };
})(typeof window !== "undefined" ? window : globalThis);