// WATransChat — authored and maintained solely by @benedictusrey.
// Local tabs chrome for Scheme B (shell window + child account webviews).
const invoke =
  window.__TAURI__?.core?.invoke ??
  window.__TAURI_INTERNALS__?.invoke ??
  (async () => {
    throw new Error("WATransChat tabs require the desktop runtime.");
  });

const titleLabelEl = document.getElementById("title-label");
const barEl = document.getElementById("bar");
const tabsEl = document.getElementById("tabs");
const addBtn = document.getElementById("add");
const pinBtn = document.getElementById("pin");
const settingsBtn = document.getElementById("settings");
const winMinBtn = document.getElementById("win-min");
const winMaxBtn = document.getElementById("win-max");
const winMaxIcon = document.getElementById("win-max-icon");
const winCloseBtn = document.getElementById("win-close");
const composerEl = document.getElementById("composer");
const nameInput = document.getElementById("new-name");
const composerOk = document.getElementById("composer-ok");
const composerCancel = document.getElementById("composer-cancel");
const composerError = document.getElementById("composer-error");
const seatPickEl = document.getElementById("seat-pick");
const seatPickList = document.getElementById("seat-pick-list");
const seatPickConfirm = document.getElementById("seat-pick-confirm");
const seatPickHint = document.getElementById("seat-pick-hint");
const seatPickNote = document.getElementById("seat-pick-note");
const appWindow =
  window.__TAURI__?.window?.getCurrentWindow?.() ??
  window.__TAURI__?.window?.getCurrent?.() ??
  null;
let lastJson = "";
let refreshTimer = 0;
let adding = false;
let pinBusy = false;
let seatPickLimit = 2;
let seatPickOpen = false;
let uiLang = "zh";

const STR = {
  en: {
    pinOn: "Keep window on top",
    pinOff: "Unpin from top",
    minimize: "Minimize",
    maximize: "Maximize",
    restore: "Restore",
    close: "Close",
    addAccount: "Add account",
    settings: "Settings",
    accountsAria: "WATransChat accounts",
    accountName: "Account name",
    add: "Add",
    cancel: "Cancel",
    enterName: "Enter a name",
    seatTitle: "Choose seats to keep",
    seatBody:
      "Your plan has fewer seats than open accounts. Pick which accounts to keep. Others close their tabs and free seats; local data is kept.",
    seatConfirm: "Confirm",
    seatHint: "Selected {selected} / {limit}",
    seatNeedExact: "Select exactly {n} account(s).",
    seatApplying: "Applying…",
  },
  zh: {
    pinOn: "窗口置顶",
    pinOff: "取消置顶",
    minimize: "最小化",
    maximize: "最大化",
    restore: "还原",
    close: "关闭",
    addAccount: "添加账号",
    settings: "设置",
    accountsAria: "WATransChat 账号",
    accountName: "账号名称",
    add: "添加",
    cancel: "取消",
    enterName: "请输入名称",
    seatTitle: "选择要保留的坐席",
    seatBody:
      "套餐坐席不足，请选择要继续使用的账号。未选中的账号将关闭标签并释放坐席，本地数据保留。",
    seatConfirm: "确认保留",
    seatHint: "已选 {selected} / {limit}",
    seatNeedExact: "请精确选择 {n} 个账号。",
    seatApplying: "正在应用…",
  },
};

function normalizeLang(raw) {
  const u = String(raw || "")
    .trim()
    .toLowerCase();
  if (u === "en" || u.startsWith("en-") || u.startsWith("en_")) return "en";
  return "zh";
}

function t(key, vars) {
  const pack = STR[uiLang] || STR.zh;
  let s = pack[key] ?? STR.en[key] ?? STR.zh[key] ?? key;
  if (vars && typeof vars === "object") {
    Object.keys(vars).forEach((k) => {
      s = s.split(`{${k}}`).join(String(vars[k]));
    });
  }
  return s;
}

function applyChromeLang(lang) {
  uiLang = normalizeLang(lang);
  document.documentElement.lang = uiLang === "en" ? "en" : "zh-CN";
  const setLabel = (el, key) => {
    if (!el) return;
    const text = t(key);
    el.title = text;
    el.setAttribute("aria-label", text);
  };
  setLabel(winMinBtn, "minimize");
  setLabel(winCloseBtn, "close");
  setLabel(addBtn, "addAccount");
  setLabel(settingsBtn, "settings");
  if (barEl) barEl.setAttribute("aria-label", t("accountsAria"));
  if (composerEl) composerEl.setAttribute("aria-label", t("addAccount"));
  if (nameInput) nameInput.placeholder = t("accountName");
  if (composerOk) composerOk.textContent = t("add");
  if (composerCancel) composerCancel.textContent = t("cancel");
  const seatTitle = document.getElementById("seat-pick-title");
  const seatBody = document.getElementById("seat-pick-body");
  if (seatTitle) seatTitle.textContent = t("seatTitle");
  if (seatBody) seatBody.textContent = t("seatBody");
  if (seatPickConfirm) seatPickConfirm.textContent = t("seatConfirm");
  setPinPressed(pinBtn.getAttribute("aria-pressed") === "true");
  refreshMaximizeState().catch(() => {});
  updateSeatPickConfirm();
}

const MAX_ICON_MAXIMIZE =
  '<rect x="1.5" y="1.5" width="9" height="9" />';
const MAX_ICON_RESTORE =
  '<path d="M3.5 3.5h6v6h-6zM2 4.5V2h8.5v8.5H8" />';

async function refreshTitleLabel() {
  if (!appWindow || !titleLabelEl) return;
  try {
    const title = await appWindow.title();
    if (title) titleLabelEl.textContent = title;
  } catch (_) {
    // Ignore — window API may not be ready yet.
  }
}

/** Match shell set_theme / native_theme(): light personalities → light caption. */
function chromeIsLight(theme) {
  const t = String(theme || "").toLowerCase();
  return (
    t === "light" ||
    t === "blush" ||
    t === "lavender" ||
    t === "candy" ||
    t === "aurora"
  );
}

async function refreshChromeTheme() {
  try {
    const theme = await invoke("get_theme");
    document.documentElement.setAttribute(
      "data-chrome",
      chromeIsLight(theme) ? "light" : "dark",
    );
  } catch (_) {
    // Fall back to prefers-color-scheme CSS when theme is unavailable.
  }
}

async function refreshMaximizeState() {
  if (!appWindow || !winMaxBtn || !winMaxIcon) return;
  try {
    const maximized = await appWindow.isMaximized();
    winMaxIcon.innerHTML = maximized ? MAX_ICON_RESTORE : MAX_ICON_MAXIMIZE;
    winMaxBtn.title = maximized ? t("restore") : t("maximize");
    winMaxBtn.setAttribute(
      "aria-label",
      maximized ? t("restore") : t("maximize"),
    );
  } catch (_) {
    // Ignore — window API may not be ready yet.
  }
}

function setPinPressed(onTop) {
  const active = !!onTop;
  pinBtn.setAttribute("aria-pressed", active ? "true" : "false");
  pinBtn.title = active ? t("pinOff") : t("pinOn");
  pinBtn.setAttribute("aria-label", active ? t("pinOff") : t("pinOn"));
}

async function refreshPinState() {
  try {
    const onTop = await invoke("get_always_on_top");
    setPinPressed(onTop);
  } catch (_) {
    // Host may call before unlock / before accounts are ready.
  }
}

async function togglePin() {
  if (pinBusy || seatPickOpen) return;
  pinBusy = true;
  try {
    const onTop = await invoke("toggle_always_on_top");
    setPinPressed(onTop);
  } catch (_) {
    await refreshPinState();
  } finally {
    pinBusy = false;
  }
}

function render(tabs) {
  const list = Array.isArray(tabs) ? tabs : [];
  const signature = JSON.stringify(list);
  if (signature === lastJson && tabsEl.childNodes.length) {
    return;
  }
  lastJson = signature;
  tabsEl.textContent = "";
  for (const tab of list) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tab";
    btn.setAttribute("role", "tab");
    btn.setAttribute("data-account-id", tab.id);
    if (tab.active) btn.setAttribute("aria-current", "true");
    const label = document.createElement("span");
    label.className = "tab-label";
    label.textContent = String(tab.name || tab.id || "Account");
    btn.appendChild(label);
    const unread = tab.unread >>> 0;
    if (unread > 0) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = unread > 99 ? "99+" : String(unread);
      btn.appendChild(badge);
    }
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      if (seatPickOpen) return;
      if (tab.active) return;
      invoke("switch_account", { id: tab.id });
    });
    tabsEl.appendChild(btn);
  }
}

async function refreshAccountTabs() {
  try {
    const tabs = await invoke("list_account_tabs");
    render(tabs || []);
  } catch (_) {
    // Host may call refresh before unlock / before accounts are ready.
  }
}

function scheduleRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshTimer = 0;
    refreshAccountTabs();
  }, 80);
}

function setComposerError(message) {
  if (!message) {
    composerError.textContent = "";
    composerError.classList.remove("show");
    return;
  }
  composerError.textContent = String(message);
  composerError.classList.add("show");
}

function openComposer() {
  if (seatPickOpen) return;
  adding = false;
  setComposerError("");
  nameInput.value = "";
  barEl.classList.add("hidden");
  composerEl.classList.add("open");
  nameInput.focus();
}

function closeComposer() {
  adding = false;
  setComposerError("");
  composerEl.classList.remove("open");
  barEl.classList.remove("hidden");
}

async function submitNewAccount() {
  if (adding || seatPickOpen) return;
  const name = nameInput.value.trim();
  if (!name) {
    setComposerError(t("enterName"));
    nameInput.focus();
    return;
  }
  adding = true;
  setComposerError("");
  composerOk.disabled = true;
  try {
    await invoke("add_account", { name });
    closeComposer();
    scheduleRefresh();
  } catch (error) {
    setComposerError(String(error));
    nameInput.focus();
  } finally {
    adding = false;
    composerOk.disabled = false;
  }
}

function selectedSeatPickIds() {
  return Array.from(
    seatPickList.querySelectorAll('input[type="checkbox"]:checked'),
  ).map((el) => el.value);
}

function updateSeatPickConfirm() {
  const ids = selectedSeatPickIds();
  seatPickConfirm.disabled = ids.length !== seatPickLimit;
  seatPickHint.textContent = t("seatHint", {
    selected: ids.length,
    limit: seatPickLimit,
  });
}

function renderSeatPickAccounts(accounts) {
  seatPickList.textContent = "";
  const claimed = (accounts || []).filter((a) => a.has_seat).map((a) => a.id);
  let pre = 0;
  for (const a of accounts || []) {
    const li = document.createElement("li");
    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = a.id;
    if (claimed.includes(a.id) && pre < seatPickLimit) {
      cb.checked = true;
      pre += 1;
    }
    cb.addEventListener("change", () => {
      if (selectedSeatPickIds().length > seatPickLimit) {
        cb.checked = false;
      }
      updateSeatPickConfirm();
    });
    const span = document.createElement("span");
    span.textContent = a.name || a.id;
    label.appendChild(cb);
    label.appendChild(span);
    li.appendChild(label);
    seatPickList.appendChild(li);
  }
  updateSeatPickConfirm();
}

async function openSeatPickFromStatus(status) {
  if (!status || !status.pending) {
    closeSeatPick();
    return;
  }
  seatPickLimit = Math.max(1, Number(status.device_limit) || 1);
  const accounts = Array.isArray(status.accounts) ? status.accounts : [];
  if (!accounts.length) return;
  renderSeatPickAccounts(accounts);
  seatPickNote.textContent = "";
  seatPickOpen = true;
  document.body.classList.add("seat-pick");
  seatPickEl.classList.add("open");
  barEl.classList.add("hidden");
  composerEl.classList.remove("open");
}

function closeSeatPick() {
  seatPickOpen = false;
  document.body.classList.remove("seat-pick");
  seatPickEl.classList.remove("open");
  barEl.classList.remove("hidden");
  seatPickNote.textContent = "";
}

async function refreshSeatPick() {
  try {
    const status = await invoke("seat_pick_status");
    await openSeatPickFromStatus(status);
  } catch (_) {
    // ignore — lock / not ready
  }
}

async function confirmSeatPick() {
  const ids = selectedSeatPickIds();
  if (ids.length !== seatPickLimit) {
    seatPickNote.textContent = t("seatNeedExact", { n: seatPickLimit });
    return;
  }
  seatPickConfirm.disabled = true;
  seatPickNote.textContent = t("seatApplying");
  try {
    await invoke("membership_apply_seat_pick", { ids });
    closeSeatPick();
    scheduleRefresh();
  } catch (e) {
    seatPickNote.textContent = String(e);
    updateSeatPickConfirm();
  }
}

/** Host (Rust) calls this after downgrade / login over-limit. */
window.__whatsnowSeatPickRequired = function seatPickRequired() {
  refreshSeatPick().catch(() => {});
};

window.__whatsnowRefreshAccountTabs = scheduleRefresh;
window.__whatsnowRefreshPin = () => {
  refreshPinState().catch(() => {});
};
window.__whatsnowRefreshTitle = () => {
  refreshTitleLabel().catch(() => {});
};
window.__whatsnowRefreshChromeTheme = () => {
  refreshChromeTheme().catch(() => {});
};

addBtn.addEventListener("click", (ev) => {
  ev.preventDefault();
  openComposer();
});
pinBtn.addEventListener("click", (ev) => {
  ev.preventDefault();
  togglePin().catch(() => {});
});
settingsBtn.addEventListener("click", (ev) => {
  ev.preventDefault();
  if (seatPickOpen) return;
  // Opens after IPC unwinds (Rust defer_after_ipc) — expect ~150ms delay.
  invoke("open_accounts_settings").catch((error) => {
    console.error("open_accounts_settings failed:", error);
  });
});
winMinBtn.addEventListener("click", (ev) => {
  ev.preventDefault();
  if (!appWindow) return;
  appWindow.minimize().catch(() => {});
});
winMaxBtn.addEventListener("click", (ev) => {
  ev.preventDefault();
  if (!appWindow) return;
  appWindow
    .toggleMaximize()
    .then(() => refreshMaximizeState())
    .catch(() => {});
});
winCloseBtn.addEventListener("click", (ev) => {
  ev.preventDefault();
  if (!appWindow) return;
  appWindow.close().catch(() => {});
});
composerOk.addEventListener("click", (ev) => {
  ev.preventDefault();
  submitNewAccount();
});
composerCancel.addEventListener("click", (ev) => {
  ev.preventDefault();
  closeComposer();
});
nameInput.addEventListener("keydown", (ev) => {
  if (ev.key === "Enter") {
    ev.preventDefault();
    submitNewAccount();
  } else if (ev.key === "Escape") {
    ev.preventDefault();
    closeComposer();
  }
});
// F2 左切 / F3 右切已打开的账号标签（添加账号、席位选择弹层打开时忽略）
document.addEventListener("keydown", (ev) => {
  if (ev.key !== "F2" && ev.key !== "F3") return;
  if (adding || seatPickOpen) return;
  if (ev.ctrlKey || ev.altKey || ev.metaKey || ev.shiftKey) return;
  ev.preventDefault();
  // F2 = 上一个，F3 = 下一个
  const delta = ev.key === "F2" ? -1 : 1;
  invoke("cycle_account_tab", { delta }).catch((error) => {
    console.error("cycle_account_tab failed:", error);
  });
});
seatPickConfirm.addEventListener("click", (ev) => {
  ev.preventDefault();
  confirmSeatPick().catch(() => {});
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    scheduleRefresh();
    refreshSeatPick().catch(() => {});
    refreshPinState().catch(() => {});
    refreshMaximizeState().catch(() => {});
    refreshTitleLabel().catch(() => {});
    refreshChromeTheme().catch(() => {});
  }
});

if (appWindow?.onResized) {
  appWindow.onResized(() => {
    refreshMaximizeState().catch(() => {});
  }).catch(() => {});
}

async function refreshUiLang() {
  try {
    const s = await invoke("get_lock_status");
    applyChromeLang(s.ui_lang);
  } catch (_) {
    try {
      const settings = await invoke("get_settings");
      applyChromeLang(settings.ui_lang);
    } catch (__) {
      applyChromeLang("zh");
    }
  }
}

window.__whatsnowRefreshTabsLang = () => {
  refreshUiLang().catch(() => {});
};

refreshUiLang()
  .catch(() => applyChromeLang("zh"))
  .finally(() => {
    scheduleRefresh();
    refreshSeatPick().catch(() => {});
    refreshPinState().catch(() => {});
    refreshMaximizeState().catch(() => {});
    refreshTitleLabel().catch(() => {});
    refreshChromeTheme().catch(() => {});
  });
