/**
 * Settings backup panel — categorized export/import adapted from Falo.
 * App Settings via get_settings/set_settings; per-account pageData via contacts RPC.
 */
(function () {
  "use strict";

  const SCHEMA = "falo-backup";
  const SCHEMA_VERSION = 1;

  const invoke =
    window.__TAURI__?.core?.invoke ??
    (async () => {
      throw new Error("Falo settings require the desktop runtime.");
    });

  function t(key, vars) {
    return window.FaloI18n ? window.FaloI18n.t(key, vars) : key;
  }

  /** Categories map to Settings fields and/or page localStorage keys. */
  const CATEGORIES = [
    {
      id: "translation",
      settingsKeys: [
        "translate_enabled",
        "translate_incoming",
        "translate_compose",
        "translate_target_lang",
        "translate_engine",
        "chat_history_engine",
        "translate_source_lang",
        "default_customer_lang",
        "auto_send_input_translation",
        "enable_translate_button",
        "translate_text_color",
        "translate_font_size",
        "chatgpt_model",
        "openai_custom_api_url",
        "openai_custom_model",
        "deepseek_custom_api_url",
        "deepseek_custom_model",
        "ai_system_prompt",
        "ai_system_prompt_deepseek",
        "ai_system_prompt_volc_deepseek",
        "ai_system_prompt_chatgpt",
        "ai_system_prompt_openai_custom",
        "ai_system_prompt_deepseek_custom",
      ],
    },
    {
      id: "customerLang",
      pageKeys: ["customerLanguageSettings"],
    },
    {
      id: "uiDisplay",
      settingsKeys: [
        "ui_lang",
        "theme",
        "show_quick_phrases",
        "show_quick_remark",
        "show_msg_device",
        "show_business_badge",
        "show_chatlist_country",
        "show_fx",
        "show_followup_todos",
        "enable_translate_button",
        "auto_send_input_translation",
        "translate_text_color",
        "translate_font_size",
        "close_to_tray",
        "start_minimized",
        "autostart",
        "always_on_top",
        "hotkey_enabled",
        "hotkey",
        "notifications",
        "notification_previews",
        "notification_preview_duration_secs",
      ],
    },
    {
      id: "quickRemark",
      pageKeys: ["chatQuickRemarks"],
      settingsKeys: ["show_quick_remark"],
    },
    {
      id: "followup",
      settingsKeys: ["show_followup_todos"],
      // Follow-up shim stores under wa_chrome_local:<key>
      pageKeys: [
        "wa_chrome_local:followupTodos",
        "wa_chrome_local:followupEntryPlacement",
        "wa_chrome_local:followupTodosSyncMeta",
      ],
    },
    {
      id: "fx",
      settingsKeys: ["show_fx"],
      pageKeys: ["fx_pinned_currencies", "fx_manual_target_currency", "fx_panel_pos"],
    },
  ];

  function selectedCategoryIds() {
    return CATEGORIES.map((c) => c.id).filter((id) => {
      const el = document.getElementById("sb-cat-" + id);
      return el && el.checked;
    });
  }

  function setHint(text) {
    const el = document.getElementById("sb-hint");
    if (el) el.textContent = text || "";
  }

  function pickKeys(src, keys) {
    const out = {};
    (keys || []).forEach((k) => {
      if (src && Object.prototype.hasOwnProperty.call(src, k) && src[k] !== undefined) {
        out[k] = src[k];
      }
    });
    return out;
  }

  async function listOpenAccounts() {
    try {
      return (await invoke("list_open_account_tabs")) || [];
    } catch (_) {
      return [];
    }
  }

  async function callBackup(accountId, action, payload) {
    return invoke("contacts_backup_call", {
      accountId,
      action,
      payload: payload || {},
    });
  }

  async function collectPageData(pageKeys) {
    if (!pageKeys || !pageKeys.length) return {};
    const accounts = await listOpenAccounts();
    const accountsOut = {};
    const skipped = [];
    for (let i = 0; i < accounts.length; i++) {
      const a = accounts[i];
      const resp = await callBackup(a.id, "PAGE_DATA_GET", { keys: pageKeys });
      if (!resp || !resp.ok) {
        skipped.push(a.name || a.id);
        continue;
      }
      const values = (resp.data && resp.data.values) || {};
      const filtered = {};
      pageKeys.forEach((k) => {
        if (values[k] != null) filtered[k] = values[k];
      });
      if (Object.keys(filtered).length) {
        accountsOut[a.id] = { name: a.name, pageData: filtered };
      }
    }
    return { accounts: accountsOut, skipped };
  }

  async function applyPageData(accountsMap, pageKeys, mode) {
    if (!accountsMap || !pageKeys.length) return { applied: 0, skipped: [] };
    const open = await listOpenAccounts();
    const openIds = new Set(open.map((a) => a.id));
    let applied = 0;
    const skipped = [];
    const ids = Object.keys(accountsMap);
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      if (!openIds.has(id)) {
        skipped.push((accountsMap[id] && accountsMap[id].name) || id);
        continue;
      }
      const pageData = (accountsMap[id] && accountsMap[id].pageData) || {};
      const values = {};
      pageKeys.forEach((k) => {
        if (!Object.prototype.hasOwnProperty.call(pageData, k)) return;
        if (mode === "merge") {
          // merge: only write if incoming present (caller already merged maps when needed)
          values[k] = pageData[k];
        } else {
          values[k] = pageData[k];
        }
      });
      if (!Object.keys(values).length) continue;
      const resp = await callBackup(id, "PAGE_DATA_SET", { values });
      if (resp && resp.ok) applied += 1;
      else skipped.push((accountsMap[id] && accountsMap[id].name) || id);
    }
    return { applied, skipped };
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try {
        a.remove();
      } catch (_) {}
      try {
        URL.revokeObjectURL(url);
      } catch (_) {}
    }, 1000);
  }

  function tsOfConf(conf) {
    if (!conf || typeof conf !== "object") return 0;
    const n = Number(conf.updatedAt || conf.timestamp);
    return Number.isFinite(n) ? n : 0;
  }

  function mergeCustomerLanguageMaps(base, incoming) {
    const a = base && typeof base === "object" && !Array.isArray(base) ? base : {};
    const b = incoming && typeof incoming === "object" && !Array.isArray(incoming) ? incoming : {};
    const out = { ...a };
    Object.keys(b).forEach((id) => {
      const left = out[id];
      const right = b[id];
      if (!left) {
        out[id] = right;
        return;
      }
      if (!right) return;
      out[id] = tsOfConf(right) >= tsOfConf(left) ? { ...left, ...right } : { ...right, ...left };
    });
    return out;
  }

  function normalizeRemarkEntry(entry) {
    if (typeof entry === "string") {
      const text = entry.trim();
      return text ? { remarks: text, updatedAt: 0 } : null;
    }
    if (!entry || typeof entry !== "object") return null;
    const text = String(entry.remarks || "").trim();
    if (!text) return null;
    return { remarks: text, updatedAt: Number(entry.updatedAt) || 0 };
  }

  function mergeChatQuickRemarksMaps(base, incoming) {
    const a = base && typeof base === "object" && !Array.isArray(base) ? base : {};
    const b = incoming && typeof incoming === "object" && !Array.isArray(incoming) ? incoming : {};
    const out = {};
    Object.keys(a).forEach((id) => {
      const left = normalizeRemarkEntry(a[id]);
      if (left) out[id] = left;
    });
    Object.keys(b).forEach((id) => {
      const right = normalizeRemarkEntry(b[id]);
      if (!right) return;
      const left = out[id];
      if (!left || tsOfConf(right) >= tsOfConf(left)) out[id] = right;
    });
    return out;
  }

  function parseJsonSafe(raw) {
    if (raw == null || raw === "") return null;
    try {
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (_) {
      return null;
    }
  }

  async function doExport() {
    const cats = selectedCategoryIds();
    if (!cats.length) {
      setHint(t("sb.nothingSelected"));
      return;
    }
    try {
      const settings = await invoke("get_settings");
      const settingsOut = {};
      const pageKeys = new Set();
      cats.forEach((id) => {
        const cat = CATEGORIES.find((c) => c.id === id);
        if (!cat) return;
        Object.assign(settingsOut, pickKeys(settings, cat.settingsKeys || []));
        (cat.pageKeys || []).forEach((k) => pageKeys.add(k));
      });

      let accounts = {};
      let skipped = [];
      if (pageKeys.size) {
        const page = await collectPageData(Array.from(pageKeys));
        accounts = page.accounts || {};
        skipped = page.skipped || [];
      }

      const blob = {
        schema: SCHEMA,
        version: SCHEMA_VERSION,
        exportedAt: Date.now(),
        categories: cats,
        settings: settingsOut,
        accounts,
      };
      downloadBlob(
        new Blob([JSON.stringify(blob, null, 2)], { type: "application/json;charset=utf-8" }),
        `falo-settings-${Date.now()}.json`
      );
      let msg = t("sb.exportOk");
      if (skipped.length) msg += " — " + fillSkipped(skipped);
      setHint(msg);
    } catch (e) {
      setHint(t("sb.exportFail") + ": " + String(e));
    }
  }

  function fillSkipped(skipped) {
    return t("sb.skippedAccounts") + ": " + skipped.slice(0, 5).join(", ");
  }

  function importMode() {
    return document.querySelector('input[name="sb-import-mode"]:checked')?.value || "merge";
  }

  async function doImport(file) {
    const cats = selectedCategoryIds();
    if (!cats.length) {
      setHint(t("sb.nothingSelected"));
      return;
    }
    const mode = importMode();
    if (mode === "replace") {
      const ok =
        typeof window.appConfirm === "function"
          ? await window.appConfirm(t("sb.confirmReplace"), {
              okLabel: t("devices.confirmOk"),
              cancelLabel: t("devices.confirmCancel"),
            })
          : window.confirm(t("sb.confirmReplace"));
      if (!ok) return;
    }

    let parsed;
    try {
      const text = await file.text();
      parsed = JSON.parse(text);
    } catch (_) {
      setHint(t("sb.importBad"));
      return;
    }
    if (!parsed || parsed.schema !== SCHEMA || Number(parsed.version) !== SCHEMA_VERSION) {
      setHint(t("sb.importBad"));
      return;
    }

    try {
      const current = await invoke("get_settings");
      let next = { ...current };
      const pageKeys = new Set();

      cats.forEach((id) => {
        const cat = CATEGORIES.find((c) => c.id === id);
        if (!cat) return;
        (cat.pageKeys || []).forEach((k) => pageKeys.add(k));
        const incoming = pickKeys(parsed.settings || {}, cat.settingsKeys || []);
        if (mode === "replace") {
          Object.assign(next, incoming);
        } else {
          Object.keys(incoming).forEach((k) => {
            if (next[k] === undefined || next[k] === null || next[k] === "") next[k] = incoming[k];
            else if (typeof incoming[k] === "boolean" || typeof incoming[k] === "number")
              next[k] = incoming[k];
            else if (typeof incoming[k] === "string" && incoming[k]) next[k] = incoming[k];
          });
        }
      });

      await invoke("set_settings", { settings: next });

      // Per-account page data
      if (pageKeys.size && parsed.accounts) {
        const keys = Array.from(pageKeys);
        if (mode === "merge") {
          // Merge maps per account against live page data when possible
          const open = await listOpenAccounts();
          for (let i = 0; i < open.length; i++) {
            const a = open[i];
            const incoming = parsed.accounts[a.id];
            if (!incoming || !incoming.pageData) continue;
            const live = await callBackup(a.id, "PAGE_DATA_GET", { keys });
            const liveValues = (live && live.ok && live.data && live.data.values) || {};
            const merged = {};
            keys.forEach((k) => {
              const incRaw = incoming.pageData[k];
              const liveRaw = liveValues[k];
              if (incRaw == null && liveRaw == null) return;
              if (k === "customerLanguageSettings") {
                const left = parseJsonSafe(liveRaw) || {};
                const right = parseJsonSafe(incRaw) || {};
                merged[k] = JSON.stringify(mergeCustomerLanguageMaps(left, right));
              } else if (k === "chatQuickRemarks") {
                const left = parseJsonSafe(liveRaw) || {};
                const right = parseJsonSafe(incRaw) || {};
                merged[k] = JSON.stringify(mergeChatQuickRemarksMaps(left, right));
              } else if (incRaw != null) {
                merged[k] = incRaw;
              }
            });
            if (Object.keys(merged).length) {
              await callBackup(a.id, "PAGE_DATA_SET", { values: merged });
            }
          }
        } else {
          const r = await applyPageData(parsed.accounts, keys, "replace");
          if (r.skipped.length) setHint(t("sb.importOk") + " — " + fillSkipped(r.skipped));
          else setHint(t("sb.importOk"));
          return;
        }
      }

      setHint(t("sb.importOk"));
    } catch (e) {
      setHint(t("sb.importFail") + ": " + String(e));
    }
  }

  function bind() {
    document.getElementById("sb-select-all")?.addEventListener("click", () => {
      CATEGORIES.forEach((c) => {
        const el = document.getElementById("sb-cat-" + c.id);
        if (el) el.checked = true;
      });
    });
    document.getElementById("sb-clear-all")?.addEventListener("click", () => {
      CATEGORIES.forEach((c) => {
        const el = document.getElementById("sb-cat-" + c.id);
        if (el) el.checked = false;
      });
    });
    document.getElementById("sb-btn-export")?.addEventListener("click", () => {
      doExport().catch(() => {});
    });
    document.getElementById("sb-btn-import")?.addEventListener("click", () => {
      document.getElementById("sb-import-file")?.click();
    });
    document.getElementById("sb-import-file")?.addEventListener("change", (ev) => {
      const file = ev.target.files && ev.target.files[0];
      ev.target.value = "";
      if (!file) return;
      doImport(file).catch(() => {});
    });
  }

  window.FaloSettingsBackup = {
    init() {
      bind();
    },
  };
})();
