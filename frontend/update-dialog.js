// WATransChat — authored and maintained solely by @benedictusrey.
// Update dialog (parity with WATransChat Desktop Lite update-dialog.js).

async function invoke(cmd, args) {
  const fn = window.__TAURI__?.core?.invoke;
  if (typeof fn !== "function") {
    throw new Error("WATransChat update dialog requires the desktop runtime.");
  }
  return fn(cmd, args);
}

async function listen(event, handler) {
  const fn = window.__TAURI__?.event?.listen;
  if (typeof fn !== "function") return null;
  return fn(event, handler);
}

const STRINGS = {
  en: {
    updateTitleNew: "Update available",
    updateTitleForce: "Update required",
    updateClose: "Close",
    updateChangelog: "What's new",
    updateLater: "Remind me later",
    updateNow: "Update now",
    updateCurrent: (v) => `Current version: ${v}`,
    updateLatest: (v) => `Latest version: ${v}`,
    updateDownloading: "Downloading update…",
    updateInstalling: "Installing…",
    updateDownloadDoneInstalling: "Download complete, installing…",
    updateRetry: "Retry",
    errChecksum: "Package verification failed. Please try again later.",
    errDownload: "Download failed. Check your network and try again.",
    errTimeout: "Download timed out. Please try again later.",
    errNoUrl: "Download URL not found. Please contact support.",
    errUnsupported: "Automatic updates are not supported on this system.",
    errInstallerMissing: "Installer missing or corrupted. Please download again.",
    errSpawnFailed: "Could not start the installer. Please run the downloaded package manually.",
  },
  zh: {
    updateTitleNew: "发现新版本",
    updateTitleForce: "需要更新",
    updateClose: "关闭",
    updateChangelog: "更新内容",
    updateLater: "稍后提醒",
    updateNow: "立即更新",
    updateCurrent: (v) => `当前版本：${v}`,
    updateLatest: (v) => `最新版本：${v}`,
    updateDownloading: "正在下载更新…",
    updateInstalling: "正在安装…",
    updateDownloadDoneInstalling: "下载完成，正在安装…",
    updateRetry: "重试",
    errChecksum: "安装包校验失败，请稍后重试。",
    errDownload: "下载失败，请检查网络后重试。",
    errTimeout: "下载超时，请稍后重试。",
    errNoUrl: "未找到下载地址，请联系客服。",
    errUnsupported: "当前系统不支持自动更新。",
    errInstallerMissing: "安装包缺失或损坏，请重新下载。",
    errSpawnFailed: "无法启动安装程序，请手动运行已下载的安装包。",
  },
};

function uiLang() {
  const raw = String(window.__UPDATE_UI_LANG || "zh").toLowerCase();
  return raw === "en" || raw.startsWith("en-") || raw.startsWith("en_") ? "en" : "zh";
}

function t(key, ...args) {
  const pack = STRINGS[uiLang()] || STRINGS.zh;
  const value = pack[key];
  if (typeof value === "function") return value(...args);
  return value || key;
}

const titleEl = document.getElementById("update-title");
const btnClose = document.getElementById("btn-close");
const currentEl = document.getElementById("update-current");
const latestEl = document.getElementById("update-latest");
const changelogWrap = document.getElementById("update-changelog-wrap");
const changelogLabel = document.getElementById("update-changelog-label");
const changelogEl = document.getElementById("update-changelog");
const statusEl = document.getElementById("update-status");
const progressWrap = document.getElementById("update-progress-wrap");
const progressBar = document.getElementById("update-progress-bar");
const errorEl = document.getElementById("update-error");
const btnLater = document.getElementById("update-btn-later");
const btnInstall = document.getElementById("update-btn-install");

let activeResult = null;
let working = false;
let progressUnlisten = null;
let lastFitHeight = 0;
let fitTimer = null;

function isForceUpdate(result) {
  return !!(result && (result.forceUpdate || result.force_update));
}

function latestVersionOf(result) {
  if (!result) return "";
  return String(result.latestVersion || result.latest_version || "").trim();
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function setError(message) {
  errorEl.textContent = message || "";
  errorEl.classList.toggle("hidden", !message);
}

function setStatus(message) {
  statusEl.textContent = message || "";
  statusEl.classList.toggle("hidden", !message);
}

function setProgress(received, total) {
  if (!total || total <= 0) {
    progressWrap.classList.add("hidden");
    return;
  }
  progressWrap.classList.remove("hidden");
  const percent = Math.min(100, Math.round((received / total) * 100));
  progressBar.style.width = `${percent}%`;
}

function setWorking(isWorking) {
  working = isWorking;
  const force = isForceUpdate(activeResult);
  btnInstall.disabled = isWorking;
  btnLater.disabled = isWorking || force;
  btnClose.disabled = isWorking || force;
}

function preferredDialogHeight() {
  const titlebar = document.querySelector(".update-titlebar");
  const actions = document.querySelector(".update-actions");
  const changelog = document.querySelector(".update-changelog");

  let height = 16; // panel bottom padding
  height += titlebar ? titlebar.offsetHeight : 0;
  height += actions ? actions.offsetHeight + 16 : 0; // actions + margin-top

  const metas = document.querySelectorAll(".update-meta");
  metas.forEach((el) => {
    height += el.offsetHeight;
  });
  ["update-status", "update-progress-wrap", "update-error"].forEach((id) => {
    const el = document.getElementById(id);
    if (el && !el.classList.contains("hidden")) {
      height += el.offsetHeight + 10;
    }
  });

  if (changelogWrap && !changelogWrap.classList.contains("hidden")) {
    height += 12; // wrap margin-top
    height += changelogLabel ? changelogLabel.offsetHeight + 6 : 0;
    if (changelog) {
      const natural = changelog.scrollHeight;
      height += Math.min(Math.max(natural, 72), 180);
    }
  }

  // Shadow / DPI / frameless chrome buffer
  return Math.ceil(height) + 20;
}

function fitWindowSize() {
  if (fitTimer) clearTimeout(fitTimer);
  fitTimer = setTimeout(() => {
    fitTimer = null;
    const height = preferredDialogHeight();
    if (height === lastFitHeight) return;
    lastFitHeight = height;
    invoke("update_resize", { height }).catch(() => {
      lastFitHeight = 0;
      setTimeout(() => {
        const retryHeight = preferredDialogHeight();
        lastFitHeight = retryHeight;
        invoke("update_resize", { height: retryHeight }).catch(() => {
          lastFitHeight = 0;
        });
      }, 120);
    });
  }, 16);
}

function renderUpdateDialog(result) {
  if (!result) return;
  activeResult = result;
  const response = result.response || {};
  const changelog = String(response.changelog || "").trim();
  const forceUpdate = isForceUpdate(result);

  titleEl.textContent = forceUpdate ? t("updateTitleForce") : t("updateTitleNew");
  currentEl.textContent = t(
    "updateCurrent",
    result.currentVersion || result.current_version || ""
  );
  latestEl.textContent = t("updateLatest", latestVersionOf(result));
  changelogLabel.textContent = t("updateChangelog");
  btnClose.title = t("updateClose");
  btnClose.setAttribute("aria-label", t("updateClose"));
  btnLater.textContent = t("updateLater");
  btnInstall.textContent = t("updateNow");

  if (changelog) {
    changelogEl.textContent = changelog;
    changelogWrap.classList.remove("hidden");
  } else {
    changelogWrap.classList.add("hidden");
  }

  btnLater.classList.toggle("hidden", forceUpdate);
  btnClose.classList.toggle("hidden", forceUpdate);
  setWorking(false);
  setError("");
  setStatus("");
  setProgress(0, 0);
  progressWrap.classList.add("hidden");
  progressBar.style.width = "0%";
  lastFitHeight = 0;
  fitWindowSize();
}

window.__renderUpdate = renderUpdateDialog;

async function closeDialog() {
  if (working) return;
  try {
    await invoke("update_close");
  } catch (_) {
    // Ignore close IPC errors; window may already be gone.
  }
}

async function onLater() {
  if (!activeResult || working || isForceUpdate(activeResult)) return;
  try {
    await invoke("update_snooze", { latestVersion: latestVersionOf(activeResult) });
  } catch (_) {
    // Still close even if snooze fails (ACL / transient IPC).
  }
  await closeDialog();
}

async function onInstall() {
  if (!activeResult || working) return;

  setWorking(true);
  setError("");
  setStatus(t("updateDownloading"));

  if (progressUnlisten) {
    try {
      progressUnlisten();
    } catch (_) {}
    progressUnlisten = null;
  }
  progressUnlisten = await listen("update-progress", (event) => {
    const payload = event?.payload || {};
    const received = Number(payload.received) || 0;
    const total = Number(payload.total) || 0;
    if (total > 0) {
      const percent = Math.round((received / total) * 100);
      setStatus(`${t("updateDownloading")} ${percent}%`);
      setProgress(received, total);
    } else {
      setStatus(`${t("updateDownloading")} (${formatBytes(received)})`);
    }
    fitWindowSize();
  });

  try {
    btnInstall.textContent = t("updateInstalling");
    setStatus(t("updateDownloadDoneInstalling"));
    fitWindowSize();
    const result = await invoke("update_download_and_install", {
      response: activeResult.response,
    });
    if (result && result.ok === false) {
      throw new Error(result.code || "update_failed");
    }
  } catch (err) {
    const code = err && err.message ? err.message : String(err || "unknown");
    const messages = {
      checksum_mismatch: t("errChecksum"),
      download_failed: t("errDownload"),
      download_timeout: t("errTimeout"),
      no_download_url: t("errNoUrl"),
      unsupported_platform: t("errUnsupported"),
      installer_missing: t("errInstallerMissing"),
      spawn_failed: t("errSpawnFailed"),
    };
    setError(messages[code] || `${t("updateRetry")}: ${code}`);
    setStatus("");
    setWorking(false);
    btnInstall.textContent = t("updateRetry");
    fitWindowSize();
  }
}

btnLater.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  onLater();
});
btnInstall.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  onInstall();
});
btnClose.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  onLater();
});

if (window.__UPDATE_BOOT) {
  renderUpdateDialog(window.__UPDATE_BOOT);
}

fitWindowSize();
// Tauri IPC may not be ready 