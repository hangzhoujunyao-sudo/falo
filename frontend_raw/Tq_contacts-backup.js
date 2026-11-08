/**
 * Contacts backup panel — port of Falo contacts-backup-panel.js
 * Uses Tauri RPC into each open account webview (falo-store-bridge).
 */
(function () {
  "use strict";

  const invoke =
    window.__TAURI__?.core?.invoke ??
    (async () => {
      throw new Error("Falo settings require the desktop runtime.");
    });
  const listen = window.__TAURI__?.event?.listen;

  function t(key, vars) {
    return window.FaloI18n ? window.FaloI18n.t(key, vars) : key;
  }

  let countryTable = null;
  let metaCache = null;
  let exportRows = [];
  let exporting = false;
  let currentSource = "groups";
  let accounts = [];
  let progressUnlisten = null;

  function fillTpl(tmpl, vars) {
    let s = String(tmpl == null ? "" : tmpl);
    Object.keys(vars || {}).forEach((k) => {
      s = s.split("{" + k + "}").join(String(vars[k]));
    });
    return s;
  }

  async function loadCountryTable() {
    if (countryTable) return countryTable;
    try {
      const resp = await fetch("country-dial-codes.json");
      countryTable = await resp.json();
      if (!Array.isArray(countryTable)) countryTable = [];
    } catch (_) {
      countryTable = [];
    }
    return countryTable;
  }

  function setStatus(state, text) {
    const el = document.getElementById("cb-status");
    if (!el) return;
    el.setAttribute("data-state", state || "unknown");
    el.textContent = text || "";
  }

  function setProgress(current, total, visible) {
    const wrap = document.getElementById("cb-progress");
    if (!wrap) return;
    if (!visible) {
      wrap.hidden = true;
      return;
    }
    wrap.hidden = false;
    const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
    const fill = document.getElementById("cb-progress-fill");
    if (fill) fill.style.width = pct + "%";
    const text = document.getElementById("cb-progress-text");
    if (text) text.textContent = fillTpl(t("cb.progress"), { c: current || 0, t: total || 0 });
  }

  function updateDownloadButton() {
    const btn = document.getElementById("cb-btn-download");
    if (!btn) return;
    btn.disabled = exporting || !Array.isArray(exportRows) || exportRows.length === 0;
  }

  function selectedAccountId() {
    const sel = document.getElementById("cb-account");
    return sel ? String(sel.value || "") : "";
  }

  function selectedAccountName() {
    const id = selectedAccountId();
    const found = accounts.find((a) => a.id === id);
    return found ? found.name : id;
  }

  async function callBackup(accountId, action, payload) {
    return invoke("contacts_backup_call", {
      accountId,
      action,
      payload: payload || {},
    });
  }

  function renderAccountSelect() {
    const sel = document.getElementById("cb-account");
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = "";
    if (!accounts.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = t("cb.noOpenAccounts");
      sel.appendChild(opt);
      return;
    }
    accounts.forEach((a) => {
      const opt = document.createElement("option");
      opt.value = a.id;
      opt.textContent = a.name || a.id;
      sel.appendChild(opt);
    });
    if (prev && accounts.some((a) => a.id === prev)) sel.value = prev;
  }

  async function refreshAccounts() {
    try {
      accounts = (await invoke("list_open_account_tabs")) || [];
    } catch (_) {
      accounts = [];
    }
    renderAccountSelect();
    return accounts;
  }

  function renderChecklist(root, items, valueKey, labelFn, metaFn) {
    if (!root) return;
    root.innerHTML = "";
    if (!items || !items.length) {
      const empty = document.createElement("div");
      empty.className = "cb-item-meta cb-empty-hint";
      empty.textContent = t("cb.noItems");
      root.appendChild(empty);
      return;
    }
    items.forEach((item) => {
      const val = String(item[valueKey]);
      const label = document.createElement("label");
      label.className = "contacts-backup-check";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = val;
      cb.checked = true;
      const text = document.createElement("span");
      text.appendChild(document.createTextNode(labelFn(item)));
      if (metaFn) {
        const meta = document.createElement("div");
        meta.className = "cb-item-meta";
        meta.textContent = metaFn(item);
        text.appendChild(meta);
      }
      label.appendChild(cb);
      label.appendChild(text);
      root.appendChild(label);
    });
  }

  function renderMeta(meta) {
    metaCache = meta || null;
    if (!meta) return;
    renderChecklist(
      document.getElementById("cb-group-list"),
      meta.groupList || [],
      "id",
      (g) => g.name || g.id,
      (g) => fillTpl(t("cb.groupMeta"), { n: g.participantsCount || 0 })
    );
    renderChecklist(
      document.getElementById("cb-label-list"),
      meta.labelList || [],
      "id",
      (l) => l.name || l.id,
      (l) => fillTpl(t("cb.labelMeta"), { n: l.count || 0 })
    );
    renderChecklist(
      document.getElementById("cb-country-list"),
      meta.countryData || [],
      "dialCode",
      (c) => `${c.name} (+${c.dialCode})`,
      (c) => fillTpl(t("cb.countryMeta"), { n: c.count || 0 })
    );
    const chatData = meta.chatData || {};
    const summary = document.getElementById("cb-chats-summary");
    if (summary) {
      summary.textContent = fillTpl(t("cb.chatsSummary"), {
        a: chatData.chatsLength || 0,
        b: chatData.contactsLength || 0,
      });
    }
  }

  function switchSource(source) {
    currentSource = source;
    document.querySelectorAll(".contacts-backup-tab").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-source") === source);
    });
    ["groups", "chats", "labels", "countries"].forEach((id) => {
      const panel = document.getElementById("cb-panel-" + id);
      if (!panel) return;
      const on = id === source;
      panel.classList.toggle("active", on);
      panel.hidden = !on;
    });
  }

  function selectedValues(root) {
    if (!root) return [];
    return Array.from(root.querySelectorAll('input[type="checkbox"]:checked')).map((el) =>
      String(el.value)
    );
  }

  function getFormat() {
    const el = document.querySelector('input[name="cb-format"]:checked');
    return (el && el.value) || "excel";
  }

  async function loadMeta() {
    exportRows = [];
    updateDownloadButton();
    const result = document.getElementById("cb-result-summary");
    if (result) result.textContent = "";
    setProgress(0, 0, false);

    await refreshAccounts();
    const accountId = selectedAccountId();
    if (!accountId) {
      setStatus("missing", t("cb.statusMissing"));
      metaCache = null;
      return;
    }

    setStatus("unknown", t("cb.statusLoading"));
    await loadCountryTable();

    let ping = await callBackup(accountId, "PING", {});
    if (!ping || ping.error === "no_whatsapp_tab") {
      setStatus("missing", t("cb.statusMissing"));
      return;
    }
    if (!ping.ok) {
      const err = String(ping.error || "");
      if (err === "timeout" || err === "no_rpc") {
        setStatus("not_ready", t("cb.statusNotReady") + t("cb.refreshWaHint"));
      } else {
        setStatus("error", t("cb.statusError") + (err ? ` (${err})` : ""));
      }
      return;
    }
    if (!(ping.data && ping.data.ready)) {
      await new Promise((r) => setTimeout(r, 1500));
      ping = await callBackup(accountId, "PING", {});
      if (!ping || !ping.ok || !(ping.data && ping.data.ready)) {
        const hint = ping && ping.error ? ` (${ping.error})` : "";
        setStatus("not_ready", t("cb.statusNotReady") + hint);
        return;
      }
    }

    const metaResp = await callBackup(accountId, "GET_META", { countryTable });
    if (!metaResp || !metaResp.ok) {
      const err = String((metaResp && metaResp.error) || "");
      if (err === "no_whatsapp_tab") setStatus("missing", t("cb.statusMissing"));
      else if (err.indexOf("not_ready") === 0)
        setStatus("not_ready", t("cb.statusNotReady") + (err ? ` (${err})` : ""));
      else if (err === "busy") setStatus("error", t("cb.busyRefreshHint"));
      else setStatus("error", t("cb.statusError") + (err ? ` (${err})` : ""));
      return;
    }
    renderMeta(metaResp.data);
    setStatus("ready", t("cb.statusReady"));
  }

  function buildExportRequest(source, meta, forAll) {
    let action = "";
    let payload = {};
    if (source === "groups") {
      const groupIds = forAll
        ? (meta.groupList || []).map((g) => String(g.id))
        : selectedValues(document.getElementById("cb-group-list"));
      if (!groupIds.length) return null;
      action = "EXPORT_GROUP";
      payload = {
        groupIds,
        hasAdmin: document.getElementById("cb-include-admin")?.checked !== false,
      };
    } else if (source === "chats") {
      action = "EXPORT_CHAT";
      payload = {
        chatsName:
          document.querySelector('input[name="cb-chats-mode"]:checked')?.value || "chats",
      };
    } else if (source === "labels") {
      const labelIds = forAll
        ? (meta.labelList || []).map((l) => String(l.id))
        : selectedValues(document.getElementById("cb-label-list"));
      if (!labelIds.length) return null;
      action = "EXPORT_LABEL";
      payload = { labelIds };
    } else if (source === "countries") {
      const countryIds = forAll
        ? (meta.countryData || []).map((c) => String(c.dialCode))
        : selectedValues(document.getElementById("cb-country-list"));
      if (!countryIds.length) return null;
      action = "EXPORT_COUNTRY";
      payload = { coutryIds: countryIds, countryIds };
    }
    return { action, payload };
  }

  async function startExport() {
    if (exporting) return;
    const accountId = selectedAccountId();
    if (!accountId) {
      setStatus("missing", t("cb.statusMissing"));
      return;
    }
    const req = buildExportRequest(currentSource, metaCache, false);
    if (!req) {
      const result = document.getElementById("cb-result-summary");
      if (result) result.textContent = t("cb.noSelection");
      return;
    }

    exporting = true;
    exportRows = [];
    document.getElementById("cb-btn-export")?.setAttribute("disabled", "disabled");
    updateDownloadButton();
    setStatus("unknown", t("cb.statusExporting"));
    setProgress(0, 1, true);
    const result = document.getElementById("cb-result-summary");
    if (result) result.textContent = "";

    const resp = await callBackup(accountId, req.action, req.payload);

    exporting = false;
    document.getElementById("cb-btn-export")?.removeAttribute("disabled");
    setProgress(0, 0, false);

    if (!resp || !resp.ok) {
      const err = (resp && resp.error) || "";
      exportRows = [];
      updateDownloadButton();
      if (err === "no_whatsapp_tab") setStatus("missing", t("cb.statusMissing"));
      else if (err === "not_ready" || String(err).indexOf("not_ready") === 0)
        setStatus("not_ready", t("cb.statusNotReady"));
      else setStatus("error", t("cb.exportFail") + (err ? ` (${err})` : ""));
      return;
    }

    const rows = (resp.data && resp.data.rows) || [];
    exportRows = rows;
    updateDownloadButton();
    if (!rows.length) {
      if (result) result.textContent = t("cb.exportEmpty");
      setStatus("ready", t("cb.statusReady"));
      return;
    }
    if (result) result.textContent = fillTpl(t("cb.exportDone"), { n: rows.length });
    setStatus("ready", t("cb.statusReady"));
  }

  async function exportAllOpenAccounts() {
    if (exporting) return;
    await refreshAccounts();
    if (!accounts.length) {
      setStatus("missing", t("cb.statusMissing"));
      return;
    }

    exporting = true;
    document.getElementById("cb-btn-export")?.setAttribute("disabled", "disabled");
    document.getElementById("cb-btn-export-all")?.setAttribute("disabled", "disabled");
    updateDownloadButton();
    setStatus("unknown", t("cb.statusExporting"));
    setProgress(0, accounts.length, true);
    await loadCountryTable();

    let doneFiles = 0;
    const errors = [];
    const result = document.getElementById("cb-result-summary");

    for (let i = 0; i < accounts.length; i++) {
      const acct = accounts[i];
      setProgress(i, accounts.length, true);
      if (result) {
        result.textContent = fillTpl(t("cb.exportAllProgress"), {
          name: acct.name || acct.id,
          i: i + 1,
          n: accounts.length,
        });
      }

      const ping = await callBackup(acct.id, "PING", {});
      if (!ping || !ping.ok || !(ping.data && ping.data.ready)) {
        errors.push(`${acct.name || acct.id}: ${t("cb.statusNotReady")}`);
        continue;
      }
      const metaResp = await callBackup(acct.id, "GET_META", { countryTable });
      if (!metaResp || !metaResp.ok) {
        errors.push(`${acct.name || acct.id}: ${(metaResp && metaResp.error) || "meta"}`);
        continue;
      }
      const req = buildExportRequest(currentSource, metaResp.data, true);
      if (!req) {
        errors.push(`${acct.name || acct.id}: ${t("cb.noSelection")}`);
        continue;
      }
      const resp = await callBackup(acct.id, req.action, req.payload);
      if (!resp || !resp.ok) {
        errors.push(`${acct.name || acct.id}: ${(resp && resp.error) || "export"}`);
        continue;
      }
      const rows = (resp.data && resp.data.rows) || [];
      if (!rows.length) continue;
      downloadContacts(rows, acct.name || acct.id);
      doneFiles += 1;
    }

    exporting = false;
    document.getElementById("cb-btn-export")?.removeAttribute("disabled");
    document.getElementById("cb-btn-export-all")?.removeAttribute("disabled");
    setProgress(accounts.length, accounts.length, false);
    updateDownloadButton();

    if (result) {
      let msg = fillTpl(t("cb.exportAllDone"), { n: doneFiles });
      if (errors.length) msg += " — " + errors.slice(0, 3).join("; ");
      result.textContent = msg;
    }
    setStatus("ready", t("cb.statusReady"));
  }

  function escapeCsvCell(val) {
    const s = val == null ? "" : String(val);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  function rowsToCsv(rows) {
    if (!rows.length) return "\ufeff";
    const keys = Object.keys(rows[0]);
    const lines = [keys.map(escapeCsvCell).join(",")];
    for (let i = 0; i < rows.length; i++) {
      lines.push(keys.map((k) => escapeCsvCell(rows[i][k])).join(","));
    }
    return "\ufeff" + lines.join("\r\n");
  }

  function rowsToVcard(rows) {
    const parts = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const name = r["Saved Name"] || r["Public Name"] || r["Phone Number"] || "Unknown";
      const tel = r["Formatted Phone"] || (r["Phone Number"] ? `+${r["Phone Number"]}` : "");
      const adr = r["Country Name"] || "";
      parts.push("BEGIN:VCARD");
      parts.push("VERSION:3.0");
      parts.push(`FN:${String(name).replace(/\n/g, " ")}`);
      if (tel) parts.push(`TEL;TYPE=CELL:${tel}`);
      if (adr) parts.push(`ADR;TYPE=HOME:;;${String(adr).replace(/\n/g, " ")};;;;`);
      parts.push("END:VCARD");
    }
    return parts.join("\r\n");
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

  function sanitizeExcelCell(val) {
    if (val == null) return "";
    if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
    if (typeof val === "number") return Number.isFinite(val) ? val : "";
    let s = typeof val === "string" ? val : String(val);
    s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, " ");
    s = s.replace(/[\uD800-\uDFFF]/g, "");
    if (s.length > 32000) s = s.slice(0, 32000);
    return s;
  }

  function rowsToExcelAoA(rows) {
    const headerSet = [];
    const seen = new Set();
    for (let i = 0; i < rows.length; i++) {
      const keys = Object.keys(rows[i] || {});
      for (let k = 0; k < keys.length; k++) {
        if (seen.has(keys[k])) continue;
        seen.add(keys[k]);
        headerSet.push(keys[k]);
      }
    }
    const aoa = [headerSet];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] || {};
      aoa.push(headerSet.map((h) => sanitizeExcelCell(row[h])));
    }
    return aoa;
  }

  function safeFilePart(name) {
    return String(name || "account")
      .replace(/[\\/:*?"<>|]+/g, "_")
      .replace(/\s+/g, "_")
      .slice(0, 40);
  }

  function downloadContacts(rows, accountName) {
    if (!rows || !rows.length) return;
    const format = getFormat();
    const stamp = Date.now();
    const prefix = `contacts-${safeFilePart(accountName)}-${currentSource}-${stamp}`;
    if (format === "csv") {
      downloadBlob(new Blob([rowsToCsv(rows)], { type: "text/csv;charset=utf-8" }), prefix + ".csv");
      return;
    }
    if (format === "json") {
      downloadBlob(
        new Blob([JSON.stringify(rows, null, 2)], { type: "application/json;charset=utf-8" }),
        prefix + ".json"
      );
      return;
    }
    if (format === "vcard") {
      downloadBlob(
        new Blob([rowsToVcard(rows)], { type: "text/vcard;charset=utf-8" }),
        prefix + ".vcf"
      );
      return;
    }
    const XLSX = window.XLSX;
    if (!XLSX) {
      downloadBlob(
        new Blob([rowsToCsv(rows)], { type: "text/csv;charset=utf-8" }),
        prefix + ".csv"
      );
      return;
    }
    const aoa = rowsToExcelAoA(rows);
    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "WhatsApp");
    const wbout = XLSX.write(book, { bookType: "xlsx", type: "array", compression: true });
    downloadBlob(
      new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      prefix + ".xlsx"
    );
  }

  async function ensureProgressListener() {
    if (!listen || progressUnlisten) return;
    progressUnlisten = await listen("contacts-backup-progress", (event) => {
      if (!exporting) return;
      const p = event.payload || {};
      setProgress(p.current || 0, p.total || 0, true);
    });
  }

  function bind() {
    document.querySelectorAll(".contacts-backup-tab").forEach((btn) => {
      btn.addEventListener("click", () => switchSource(btn.getAttribute("data-source")));
    });
    document.getElementById("cb-btn-refresh")?.addEventListener("click", () => {
      loadMeta().catch(() => {});
    });
    document.getElementById("cb-btn-open-wa")?.addEventListener("click", async () => {
      const id = selectedAccountId();
      if (!id) {
        setStatus("missing", t("cb.statusMissing"));
        return;
      }
      try {
        await invoke("open_account", { id });
      } catch (e) {
        setStatus("error", String(e));
      }
    });
    document.getElementById("cb-btn-export")?.addEventListener("click", () => {
      startExport().catch(() => {});
    });
    document.getElementById("cb-btn-export-all")?.addEventListener("click", () => {
      exportAllOpenAccounts().catch(() => {});
    });
    document.getElementById("cb-btn-download")?.addEventListener("click", () => {
      if (exporting || !exportRows.length) return;
      downloadContacts(exportRows, selectedAccountName());
    });
    document.getElementById("cb-account")?.addEventListener("change", () => {
      loadMeta().catch(() => {});
    });
  }

  window.FaloContactsBackup = {
    init() {
      bind();
      ensureProgressListener().catch(() => {});
      updateDownloadButton();
      setStatus("unknown", t("cb.statusUnknown"));
    },
    onPanelShow() {
      loadMeta().catch(() => {});
    },
    refreshUi() {
      // i18n re-applied via data-i18n; keep status text in sync if empty
      const el = document.getElementById("cb-status");
      if (el && !el.textContent) setStatus("unknown", t("cb.statusUnknown"));
      if (metaCache) renderMeta(metaCache);
    },
  };
})();
