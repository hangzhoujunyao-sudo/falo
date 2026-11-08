// WATransChat — authored and maintained solely by @benedictusrey.
const invoke =
  window.__TAURI__?.core?.invoke ??
  (async () => {
    throw new Error("WATransChat login requires the desktop runtime.");
  });

const STR = {
  en: {
    brand: "WATransChat",
    subtitleLogin: "Sign in with your membership account to continue.",
    subtitleRegister: "Create an account to start your free trial.",
    tabLogin: "Sign in",
    tabRegister: "Register",
    email: "Email",
    password: "Password",
    confirm: "Confirm password",
    signIn: "Sign in",
    signingIn: "Signing in…",
    register: "Create account",
    registering: "Creating account…",
    registerHint: "New accounts start with a free trial.",
    showPassword: "Show password",
    hidePassword: "Hide password",
    quit: "Quit",
    needEmail: "Enter your email.",
    needPassword: "Enter your password.",
    fillAll: "Please fill in all fields.",
    invalidEmail: "Enter a valid email address.",
    emailNoSpaces: "Email cannot contain spaces.",
    emailNoChinese: "Email cannot contain Chinese characters.",
    passwordMismatch: "Passwords do not match.",
    passwordMinLen: "Password must be at least 6 characters.",
    registerOk: "Registered. Signing you in…",
    emailAlready: "This email is already registered.",
    networkError: "Network error. Please try again.",
    incorrectPassword: "Incorrect password",
    acctNotExist: "Account does not exist",
    loginFailed: "Sign-in failed",
    invalidEmailOrPassword: "Incorrect email or password",
    deviceMismatch: "You are already signed in on another device. Sign out there first.",
    deviceFullTitle: "Device limit reached",
    deviceFullBody: "Sign out an old device, then try again.",
    deviceLimitCapSuffix: " (limit {n})",
    signedInDevices: "Signed-in devices",
    logoutAll: "Sign out all devices",
    refreshShort: "Refresh",
    retry: "Retry",
    close: "Close",
    logoutOne: "Sign out",
    unknownDevice: "Unknown device",
    noDeviceList: "No active devices to sign out.",
    loggedOut: "Signed out: {name}",
    confirmOk: "OK",
    confirmCancel: "Cancel",
    confirmLogoutAll: "Sign out all signed-in devices?",
    confirmSignOutThisDevice: "Sign out this device?",
    signingOut: "Signing out…",
    signingOutAllDevices: "Signing out all devices…",
    signingOutDeviceProgress: "Signing out device ({current}/{total})…",
    allDevicesSignedOutRetryLogin: "All devices signed out. Retrying login…",
    signedOutRetryLogin: "Signed out. Retrying login…",
    noActiveDevicesToSignOut: "No active devices to sign out.",
    deviceListLoadFailRelogin: "Failed to load devices. Please try logging in again.",
    someDevicesSignOutFailed: "{n} device(s) failed to sign out. Please retry.",
    signOutFailed: "Sign out failed. Please try again.",
    loadingDevicesList: "Loading devices…",
    lastActivePrefix: "Last active: ",
    statusActiveShort: "Online",
    statusOfflineShort: "Offline",
    selectAllDevices: "Select all",
    selectOfflineDevices: "Select offline",
    logoutSelectedDevices: "Sign out selected",
    confirmSignOutSelectedDevices: "Sign out {n} selected device(s)?",
    signingOutSelectedDevices: "Signing out selected ({current}/{total})…",
    loggingOutProgress: "Signing out device ({i}/{n})…",
    reenter: "Close this dialog, re-enter email/password, then sign in again.",
    stillFull: "A seat is still in use. Sign out another device.",
  },
  zh: {
    brand: "WATransChat",
    subtitleLogin: "请使用会员账号登录后继续。",
    subtitleRegister: "注册账号即可开始免费试用。",
    tabLogin: "登录",
    tabRegister: "注册",
    email: "邮箱",
    password: "密码",
    confirm: "确认密码",
    signIn: "登录",
    signingIn: "正在登录…",
    register: "创建账号",
    registering: "正在注册…",
    registerHint: "新账号将自动开通试用。",
    showPassword: "显示密码",
    hidePassword: "隐藏密码",
    quit: "退出",
    needEmail: "请输入邮箱。",
    needPassword: "请输入密码。",
    fillAll: "请填写所有字段。",
    invalidEmail: "请输入有效的邮箱地址。",
    emailNoSpaces: "邮箱不能包含空格。",
    emailNoChinese: "邮箱不能包含中文。",
    passwordMismatch: "两次输入的密码不一致。",
    passwordMinLen: "密码长度至少 6 位。",
    registerOk: "注册成功，正在登录…",
    emailAlready: "该邮箱已注册。",
    networkError: "网络错误，请稍后重试。",
    incorrectPassword: "密码错误",
    acctNotExist: "账号不存在",
    loginFailed: "登录失败",
    invalidEmailOrPassword: "邮箱或密码不正确",
    deviceMismatch: "你已经在另一台设备登录，请先在旧设备退出登录",
    deviceFullTitle: "设备已超限",
    deviceFullBody: "请注销一台旧设备后再登录。",
    deviceLimitCapSuffix: "（上限 {n} 台）",
    signedInDevices: "已登录设备",
    logoutAll: "注销所有设备",
    refreshShort: "刷新",
    retry: "注销后重试",
    close: "关闭",
    logoutOne: "注销此设备",
    unknownDevice: "未知设备",
    noDeviceList: "暂无可注销的在线设备。",
    loggedOut: "已注销：{name}",
    confirmOk: "确定",
    confirmCancel: "取消",
    confirmLogoutAll: "确定要注销所有已登录设备吗？",
    confirmSignOutThisDevice: "确定要注销此设备吗？",
    signingOut: "正在注销…",
    signingOutAllDevices: "正在注销所有设备…",
    signingOutDeviceProgress: "正在注销设备 ({current}/{total})…",
    allDevicesSignedOutRetryLogin: "已注销所有设备，正在重新登录…",
    signedOutRetryLogin: "注销成功，正在重新登录…",
    noActiveDevicesToSignOut: "暂无可注销的在线设备。",
    deviceListLoadFailRelogin: "设备列表加载失败，请重新登录再试。",
    someDevicesSignOutFailed: "仍有 {n} 台设备注销失败，请重试。",
    signOutFailed: "注销失败，请重试。",
    loadingDevicesList: "正在加载设备列表…",
    lastActivePrefix: "最近活动：",
    statusActiveShort: "在线",
    statusOfflineShort: "离线",
    selectAllDevices: "全选",
    selectOfflineDevices: "全选离线",
    logoutSelectedDevices: "注销已选",
    confirmSignOutSelectedDevices: "确定要注销已选的 {n} 台设备吗？",
    signingOutSelectedDevices: "正在注销已选设备 ({current}/{total})…",
    loggingOutProgress: "正在注销设备（{i}/{n}）…",
    reenter: "请关闭此对话框，重新输入邮箱密码后再登录。",
    stillFull: "仍有席位占用，请再注销一台设备。",
  },
};

let lang = "zh";
let mode = "login";
let busy = false;
let deviceManageToken = "";
let deviceLimitModalLimit = 2;
let pendingLoginCreds = null;
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

function confirmOpts() {
  return { okLabel: t("confirmOk"), cancelLabel: t("confirmCancel") };
}

async function askConfirm(message) {
  if (typeof window.appConfirm === "function") {
    return window.appConfirm(message, confirmOpts());
  }
  // Fallback only; macOS WKWebView confirm() is a silent no-op.
  return window.confirm(message);
}

function t(key, vars) {
  const table = STR[lang] || STR.en;
  let s = table[key] || STR.en[key] || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return s;
}

function applyTheme(theme) {
  if (window.WhatsNowTheme) {
    window.WhatsNowTheme.apply(document, theme, systemDark.matches);
  }
}

function applyCopy() {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  const appVer =
    (window.__whatsnowAppVersion && String(window.__whatsnowAppVersion)) || "0.0.0";
  const brand = "WATransChat v" + appVer;
  document.title =
    mode === "register" ? t("tabRegister") + " · " + brand : t("tabLogin") + " · " + brand;
  document.getElementById("login-heading").textContent = t("brand");
  document.getElementById("login-subtitle").textContent =
    mode === "register" ? t("subtitleRegister") : t("subtitleLogin");
  document.getElementById("tab-login").textContent = t("tabLogin");
  document.getElementById("tab-register").textContent = t("tabRegister");
  document.getElementById("label-login-email").textContent = t("email");
  document.getElementById("label-login-password").textContent = t("password");
  document.getElementById("label-register-email").textContent = t("email");
  document.getElementById("label-register-password").textContent = t("password");
  document.getElementById("label-register-confirm").textContent = t("confirm");
  document.getElementById("register-hint").textContent = t("registerHint");
  document.getElementById("login-submit").textContent = busy && mode === "login" ? t("signingIn") : t("signIn");
  document.getElementById("register-submit").textContent =
    busy && mode === "register" ? t("registering") : t("register");
  renderDeviceLimitTexts();
  const quit = document.getElementById("login-quit");
  quit.setAttribute("aria-label", t("quit"));
  quit.title = t("quit");
  document.querySelectorAll(".eye-btn").forEach(syncEyeLabel);
}

function syncEyeLabel(btn) {
  const shown = btn.getAttribute("aria-pressed") === "true";
  btn.setAttribute("aria-label", shown ? t("hidePassword") : t("showPassword"));
}

function setError(msg, kind) {
  const el = document.getElementById("login-error");
  el.textContent = msg || "";
  el.classList.toggle("is-info", kind === "info");
  el.classList.toggle("is-success", kind === "success");
}

/** WATransChat options.js parity: map server English auth errors to UI language. */
function localizeAuthError(raw) {
  let err = String(raw == null ? "" : raw).trim();
  if (!err) return t("loginFailed");
  // Strip Rust `HTTP 401: …` / `ERROR_CODE: …` wrappers.
  err = err.replace(/^HTTP\s*\d+\s*:\s*/i, "");
  err = err.replace(/^[A-Z0-9_]+\s*:\s*/, "");
  const lower = err.toLowerCase();
  if (lower.includes("user not found") || lower.includes("account not found") || lower.includes("email not found")) {
    return t("acctNotExist");
  }
  if (
    lower.includes("incorrect password") ||
    lower.includes("wrong password") ||
    lower.includes("invalid credentials") ||
    lower.includes("invalid password")
  ) {
    return t("incorrectPassword");
  }
  if (lower.includes("invalid email") || lower.includes("email or password")) {
    return t("invalidEmailOrPassword");
  }
  if (
    lower.includes("already registered") ||
    lower.includes("email already") ||
    err.includes("已注册")
  ) {
    return t("emailAlready");
  }
  if (
    lower.includes("another device") ||
    lower.includes("device mismatch") ||
    lower.includes("already logged in") ||
    lower.includes("already signed in")
  ) {
    return t("deviceMismatch");
  }
  if (
    lower.includes("network") ||
    lower.includes("request failed") ||
    lower.includes("timed out") ||
    lower.includes("timeout") ||
    lower.includes("connection")
  ) {
    return t("networkError");
  }
  // Keep server Chinese (or already-localized) messages as-is.
  if (/[\u4e00-\u9fff]/.test(err)) return err;
  return err || t("loginFailed");
}

function setBusy(on) {
  busy = !!on;
  ["login-submit", "register-submit", "tab-login", "tab-register"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.disabled = busy;
  });
  document.querySelectorAll("#login-form input, #register-form input").forEach((el) => {
    el.disabled = busy;
  });
  applyCopy();
}

function switchTab(next) {
  mode = next === "register" ? "register" : "login";
  const loginTab = document.getElementById("tab-login");
  const registerTab = document.getElementById("tab-register");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  loginTab.classList.toggle("active", mode === "login");
  registerTab.classList.toggle("active", mode === "register");
  loginTab.setAttribute("aria-selected", mode === "login" ? "true" : "false");
  registerTab.setAttribute("aria-selected", mode === "register" ? "true" : "false");
  loginForm.hidden = mode !== "login";
  registerForm.hidden = mode !== "register";
  loginForm.classList.toggle("active", mode === "login");
  registerForm.classList.toggle("active", mode === "register");
  setError("");
  clearRegisterEmailError();
  applyCopy();
  const focusId = mode === "register" ? "register-email" : "login-email";
  document.getElementById(focusId)?.focus();
}

function bindEyeToggle(btnId, inputId) {
  const btn = document.getElementById(btnId);
  const input = document.getElementById(inputId);
  if (!btn || !input) return;
  btn.addEventListener("click", () => {
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.setAttribute("aria-pressed", show ? "true" : "false");
    syncEyeLabel(btn);
  });
}

function isValidEmail(email) {
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(
    String(email || "").trim(),
  );
}

function showRegisterEmailError(message) {
  const tip = document.getElementById("register-email-error");
  const input = document.getElementById("register-email");
  if (tip) {
    tip.textContent = message || "";
    tip.hidden = !message;
  }
  if (input) input.classList.toggle("input-invalid", !!message);
  setError("");
}

function clearRegisterEmailError() {
  showRegisterEmailError("");
}

function showNote(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || "";
}

function setDeviceLimitStatus(message) {
  const el = document.getElementById("dl-status");
  if (el) el.textContent = message || "";
}

const LOGIN_WINDOW_SIZE = { width: 360, height: 500 };
const DEVICE_LIMIT_WINDOW_SIZE = { width: 600, height: 680 };

function getLoginWindow() {
  return (
    window.__TAURI__ &&
    window.__TAURI__.window &&
    window.__TAURI__.window.getCurrentWindow &&
    window.__TAURI__.window.getCurrentWindow()
  );
}

async function resizeLoginWindow(size) {
  try {
    const tw = window.__TAURI__ && window.__TAURI__.window;
    const win = getLoginWindow();
    if (!tw || !win || !tw.LogicalSize || !win.setSize) return;
    await win.setSize(new tw.LogicalSize(size.width, size.height));
    if (win.center) await win.center();
  } catch (_) {}
}

function closeDeviceLimitModal() {
  const modal = document.getElementById("device-limit-modal");
  if (modal) modal.hidden = true;
  setDeviceLimitStatus("");
  deviceManageToken = "";
  resizeLoginWindow(LOGIN_WINDOW_SIZE).catch(() => {});
}

function deviceLabel(d) {
  return d.device_name || d.name || d.device_id || t("unknownDevice");
}

function buildDeviceLimitDescText(deviceLimit) {
  const nRaw = parseInt(deviceLimit, 10);
  const n = Number.isFinite(nRaw) && nRaw > 0 ? nRaw : 2;
  return t("deviceFullBody") + t("deviceLimitCapSuffix", { n });
}

function renderDeviceLimitTexts() {
  const title = document.getElementById("dl-title");
  const desc = document.getElementById("dl-desc");
  const listTitle = document.getElementById("dl-list-title");
  const logoutAll = document.getElementById("dl-logout-all");
  const refresh = document.getElementById("dl-refresh");
  const cancel = document.getElementById("dl-cancel");
  if (title) title.textContent = t("deviceFullTitle");
  if (desc) desc.textContent = buildDeviceLimitDescText(deviceLimitModalLimit);
  if (listTitle) listTitle.textContent = t("signedInDevices");
  if (logoutAll) logoutAll.textContent = t("logoutAll");
  if (refresh) refresh.textContent = t("refreshShort");
  const selectAllLabel = document.getElementById("dl-select-all-label");
  const selectOffline = document.getElementById("dl-select-offline");
  const logoutSelected = document.getElementById("dl-logout-selected");
  if (selectAllLabel) selectAllLabel.textContent = t("selectAllDevices");
  if (selectOffline) selectOffline.textContent = t("selectOfflineDevices");
  if (logoutSelected) logoutSelected.textContent = t("logoutSelectedDevices");
  const closeLabel = t("close");
  if (cancel) {
    cancel.title = closeLabel;
    cancel.setAttribute("aria-label", closeLabel);
  }
}

function normalizeDeviceList(raw) {
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((d) => ({
    id: d && d.id != null ? d.id : null,
    device_id: d && d.device_id != null ? String(d.device_id) : "",
    device_name:
      d && (d.device_name || d.name) ? String(d.device_name || d.name) : t("unknownDevice"),
    last_active:
      d && (d.last_active || d.last_seen) ? String(d.last_active || d.last_seen) : "",
    status: d && d.status != null ? d.status : 1,
  }));
}

function deviceRowKey(dev) {
  if (!dev) return "";
  if (dev.id != null && String(dev.id).trim() !== "") return String(dev.id);
  return String(dev.device_id || "").trim();
}

function syncDlSelectToolbar() {
  const list = document.getElementById("dl-devices-list");
  const selectAll = document.getElementById("dl-select-all");
  const logoutBtn = document.getElementById("dl-logout-selected");
  if (!list) return;
  const boxes = Array.from(list.querySelectorAll(".device-select-cb:not(:disabled)"));
  const checked = boxes.filter((b) => b.checked).length;
  const total = boxes.length;
  if (selectAll) {
    selectAll.checked = total > 0 && checked === total;
    selectAll.indeterminate = checked > 0 && checked < total;
  }
  if (logoutBtn) {
    logoutBtn.disabled = checked === 0;
    const base = t("logoutSelectedDevices");
    logoutBtn.textContent = checked > 0 ? `${base} (${checked})` : base;
  }
}

function renderDeviceLimitList(devices) {
  const list = document.getElementById("dl-devices-list");
  if (!list) return;
  list.textContent = "";
  const selectAll = document.getElementById("dl-select-all");
  // 离线设备仍占席位，需展示以便注销
  const items = normalizeDeviceList(devices);
  if (!items.length) {
    if (selectAll) {
      selectAll.checked = false;
      selectAll.indeterminate = false;
    }
    const empty = document.createElement("div");
    empty.className = "device-item";
    empty.textContent = t("noActiveDevicesToSignOut");
    list.appendChild(empty);
    syncDlSelectToolbar();
    return;
  }
  for (const dev of items) {
    const row = document.createElement("div");
    row.className = "device-item";
    const key = deviceRowKey(dev);
    const isActive = !(dev.status === 0 || dev.status === "0");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "device-select-cb";
    cb.setAttribute("data-device-key", key);
    cb.setAttribute("data-offline", isActive ? "0" : "1");
    cb.setAttribute("data-dev-json", JSON.stringify(dev));
    cb.disabled = !key;
    cb.addEventListener("change", syncDlSelectToolbar);
    const main = document.createElement("div");
    main.className = "device-main";
    const name = document.createElement("div");
    name.className = "device-name";
    name.appendChild(document.createTextNode(deviceLabel(dev)));
    const tag = document.createElement("span");
    tag.className =
      "device-status-tag " + (isActive ? "device-status-active" : "device-status-offline");
    tag.textContent = isActive ? t("statusActiveShort") : t("statusOfflineShort");
    name.appendChild(tag);
    const metaParts = [];
    if (dev.last_active) metaParts.push(t("lastActivePrefix") + dev.last_active);
    if (dev.device_id) metaParts.push("ID: " + dev.device_id);
    const meta = document.createElement("div");
    meta.className = "device-meta";
    meta.textContent = metaParts.join(" · ");
    main.appendChild(name);
    main.appendChild(meta);
    const actions = document.createElement("div");
    actions.className = "device-actions";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "device-remove-btn";
    btn.textContent = t("logoutOne");
    btn.addEventListener("click", async () => {
      if (!deviceManageToken) return;
      if (!(await askConfirm(t("confirmSignOutThisDevice")))) return;
      setDeviceLimitStatus(t("signingOut"));
      btn.disabled = true;
      try {
        await invoke("membership_logout_device_by_challenge", {
          token: deviceManageToken,
          id: dev.id != null ? Number(dev.id) : null,
          deviceId: dev.device_id ? String(dev.device_id) : null,
        });
        await refreshDeviceLimitList();
        setDeviceLimitStatus(t("signedOutRetryLogin"));
        setTimeout(() => {
          closeDeviceLimitModal();
          retryLoginAfterKick();
        }, 400);
      } catch (e) {
        setDeviceLimitStatus(String(e) || t("signOutFailed"));
        btn.disabled = false;
      }
    });
    actions.appendChild(btn);
    row.appendChild(cb);
    row.appendChild(main);
    row.appendChild(actions);
    list.appendChild(row);
  }
  syncDlSelectToolbar();
}

async function fetchDeviceLimitItems() {
  if (!deviceManageToken) return null;
  try {
    const data = await invoke("membership_devices_by_challenge", {
      token: deviceManageToken,
    });
    if (!data || data.success === false) return null;
    return normalizeDeviceList(data.devices || []);
  } catch (_) {
    return null;
  }
}

async function refreshDeviceLimitList() {
  if (!deviceManageToken) return;
  setDeviceLimitStatus(t("loadingDevicesList"));
  try {
    const items = await fetchDeviceLimitItems();
    if (!items) {
      setDeviceLimitStatus(t("deviceListLoadFailRelogin"));
      return;
    }
    renderDeviceLimitList(items);
    setDeviceLimitStatus("");
  } catch (e) {
    setDeviceLimitStatus(String(e) || t("networkError"));
  }
}

function openDeviceLimitModal(payload) {
  deviceManageToken = String(payload.device_manage_token || "").trim();
  const nRaw = parseInt(payload.device_limit, 10);
  deviceLimitModalLimit = Number.isFinite(nRaw) && nRaw > 0 ? nRaw : 2;
  renderDeviceLimitTexts();
  const logoutAll = document.getElementById("dl-logout-all");
  if (logoutAll) logoutAll.disabled = false;
  const modal = document.getElementById("device-limit-modal");
  renderDeviceLimitList(payload.devices || []);
  resizeLoginWindow(DEVICE_LIMIT_WINDOW_SIZE)
    .catch(() => {})
    .finally(() => {
      if (modal) modal.hidden = false;
      if (deviceManageToken) refreshDeviceLimitList();
    });
}

async function doLogin(email, password) {
  pendingLoginCreds = { email, password };
  setBusy(true);
  setError("");
  try {
    const result = await invoke("membership_login", {
      email,
      password,
      apiBase: null,
    });
    if (result && result.kind === "device_limit") {
      openDeviceLimitModal(result);
      setError(result.message || t("deviceFullBody"));
      return;
    }
    pendingLoginCreds = null;
    closeDeviceLimitModal();
  } catch (e) {
    setError(localizeAuthError(e && e.message ? e.message : e));
  } finally {
    setBusy(false);
  }
}

async function onLoginSubmit(ev) {
  ev.preventDefault();
  if (busy) return;
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  if (!email) {
    setError(t("needEmail"));
    document.getElementById("login-email").focus();
    return;
  }
  if (!password) {
    setError(t("needPassword"));
    document.getElementById("login-password").focus();
    return;
  }
  await doLogin(email, password);
}

async function onRegisterSubmit(ev) {
  ev.preventDefault();
  if (busy) return;
  const rawEmail = String(document.getElementById("register-email").value || "");
  if (/\s/.test(rawEmail)) {
    showRegisterEmailError(t("emailNoSpaces"));
    return;
  }
  if (/[\u4e00-\u9fff]/.test(rawEmail)) {
    showRegisterEmailError(t("emailNoChinese"));
    return;
  }
  const email = rawEmail.trim();
  const password = document.getElementById("register-password").value.trim();
  const confirm = document.getElementById("register-confirm").value.trim();
  if (!email || !password || !confirm) {
    clearRegisterEmailError();
    setError(t("fillAll"));
    return;
  }
  if (!isValidEmail(email)) {
    showRegisterEmailError(t("invalidEmail"));
    return;
  }
  clearRegisterEmailError();
  if (password !== confirm) {
    setError(t("passwordMismatch"));
    return;
  }
  if (password.length < 6) {
    setError(t("passwordMinLen"));
    return;
  }

  setBusy(true);
  setError(t("registering"), "info");
  try {
    const result = await invoke("membership_register", { email, password });
    if (result && result.kind === "device_limit") {
      document.getElementById("login-email").value = email;
      document.getElementById("login-password").value = password;
      switchTab("login");
      openDeviceLimitModal(result);
      setError(result.message || t("deviceFullBody"));
      return;
    }
    setError(t("registerOk"), "success");
    // Rust register() already logs in and finish_login_gate closes this window.
  } catch (e) {
    setError(localizeAuthError(e && e.message ? e.message : e));
  } finally {
    setBusy(false);
  }
}

async function retryLoginAfterKick() {
  if (!pendingLoginCreds) {
    setDeviceLimitStatus(t("reenter"));
    return;
  }
  const { email, password } = pendingLoginCreds;
  setBusy(true);
  setDeviceLimitStatus("");
  try {
    const result = await invoke("membership_login", {
      email,
      password,
      apiBase: null,
    });
    if (result && result.kind === "device_limit") {
      openDeviceLimitModal(result);
      setDeviceLimitStatus(t("stillFull"));
      return;
    }
    pendingLoginCreds = null;
    closeDeviceLimitModal();
  } catch (e) {
    setDeviceLimitStatus(localizeAuthError(e && e.message ? e.message : e));
  } finally {
    setBusy(false);
  }
}

async function logoutAllChallengeDevices() {
  if (!deviceManageToken) return;
  if (!(await askConfirm(t("confirmLogoutAll")))) return;
  const btn = document.getElementById("dl-logout-all");
  if (btn) btn.disabled = true;
  setDeviceLimitStatus(t("signingOutAllDevices"));
  try {
    const items = await fetchDeviceLimitItems();
    if (!items) {
      setDeviceLimitStatus(t("deviceListLoadFailRelogin"));
      if (btn) btn.disabled = false;
      return;
    }
    if (!items.length) {
      setDeviceLimitStatus(t("noActiveDevicesToSignOut"));
      if (btn) btn.disabled = false;
      return;
    }
    let failCount = 0;
    for (let i = 0; i < items.length; i++) {
      setDeviceLimitStatus(
        t("signingOutDeviceProgress", { current: i + 1, total: items.length }),
      );
      try {
        await invoke("membership_logout_device_by_challenge", {
          token: deviceManageToken,
          id: items[i].id != null ? Number(items[i].id) : null,
          deviceId: items[i].device_id ? String(items[i].device_id) : null,
        });
      } catch (_) {
        failCount += 1;
      }
    }
    if (failCount === 0) {
      setDeviceLimitStatus(t("allDevicesSignedOutRetryLogin"));
      setTimeout(() => {
        closeDeviceLimitModal();
        retryLoginAfterKick();
      }, 400);
      return;
    }
    await refreshDeviceLimitList();
    setDeviceLimitStatus(t("someDevicesSignOutFailed", { n: failCount }));
    if (btn) btn.disabled = false;
  } catch (e) {
    setDeviceLimitStatus(String(e) || t("networkError"));
    if (btn) btn.disabled = false;
  }
}

function closeLoginWindow() {
  const win =
    window.__TAURI__ &&
    window.__TAURI__.window &&
    window.__TAURI__.window.getCurrentWindow();
  if (win && win.close) {
    win.close().catch(() => window.close());
  } else {
    window.close();
  }
}

async function init() {
  try {
    const settings = await invoke("get_settings");
    const raw = String((settings && settings.ui_lang) || "").toLowerCase();
    lang = raw === "en" || raw.indexOf("en-") === 0 ? "en" : "zh";
    applyTheme((settings && settings.theme) || "light");
  } catch (_) {
    try {
      applyTheme(await invoke("get_theme"));
    } catch (_) {
      applyTheme("light");
    }
  }
  applyCopy();

  document.getElementById("tab-login").addEventListener("click", () => switchTab("login"));
  document.getElementById("tab-register").addEventListener("click", () => switchTab("register"));
  document.getElementById("login-form").addEventListener("submit", onLoginSubmit);
  document.getElementById("register-form").addEventListener("submit", onRegisterSubmit);
  document.getElementById("login-quit").addEventListener("click", closeLoginWindow);
  document.getElementById("dl-cancel").addEventListener("click", closeDeviceLimitModal);
  document.getElementById("dl-refresh").addEventListener("click", () => {
    refreshDeviceLimitList().catch(() => {});
  });
  document.getElementById("dl-logout-all").addEventListener("click", logoutAllChallengeDevices);
  document.getElementById("dl-select-all")?.addEventListener("change", (ev) => {
    const on = !!(ev.target && ev.target.checked);
    document
      .querySelectorAll("#dl-devices-list .device-select-cb:not(:disabled)")
      .forEach((b) => {
        b.checked = on;
      });
    syncDlSelectToolbar();
  });
  document.getElementById("dl-select-offline")?.addEventListener("click", () => {
    document
      .querySelectorAll("#dl-devices-list .device-select-cb:not(:disabled)")
      .forEach((b) => {
        b.checked = b.getAttribute("data-offline") === "1";
      });
    syncDlSelectToolbar();
  });
  document.getElementById("dl-logout-selected")?.addEventListener("click", async () => {
    const list = document.getElementById("dl-devices-list");
    if (!list || !deviceManageToken) return;
    const payloads = Array.from(list.querySelectorAll(".device-select-cb:checked:not(:disabled)"))
      .map((b) => {
        try {
          return JSON.parse(b.getAttribute("data-dev-json") || "null");
        } catch (_) {
          return null;
        }
      })
      .filter(Boolean);
    if (!payloads.length) return;
    if (
      !(await askConfirm(
        t("confirmSignOutSelectedDevices").replace("{n}", String(payloads.length)),
      ))
    )
      return;
    const btn = document.getElementById("dl-logout-selected");
    if (btn) btn.disabled = true;
    let ok = 0;
    for (let i = 0; i < payloads.length; i++) {
      const dev = payloads[i];
      setDeviceLimitStatus(
        t("signingOutSelectedDevices")
          .replace("{current}", String(i + 1))
          .replace("{total}", String(payloads.length))
      );
      try {
        await invoke("membership_logout_device_by_challenge", {
          token: deviceManageToken,
          id: dev.id != null ? Number(dev.id) : null,
          deviceId: dev.device_id ? String(dev.device_id) : null,
        });
        ok += 1;
      } catch (_) {}
    }
    await refreshDeviceLimitList();
    if (ok > 0) {
      setDeviceLimitStatus(t("signedOutRetryLogin"));
      setTimeout(() => {
        closeDeviceLimitModal();
        retryLoginAfterKick();
      }, 400);
    } else {
      setDeviceLimitStatus(t("signOutFailed"));
      if (btn) btn.disabled = false;
    }
  });
  document.getElementById("device-limit-modal").addEventListener("click", (ev) => {
    if (ev.target && ev.target.id === "device-limit-modal") closeDeviceLimitModal();
  });

  bindEyeToggle("toggle-login-password", "login-password");
  bindEyeToggle("toggle-register-password", "register-password");
  bindEyeToggle("toggle-register-confirm", "register-confirm");

  document.getElementById("login-email").focus();
}

window.addEventListener("DOMContentLoaded", init);
