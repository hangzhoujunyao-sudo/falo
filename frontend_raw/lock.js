// Falo — authored and maintained solely by @benedictusrey.
const invoke = window.__TAURI__?.core?.invoke ?? (async (command) => {
  if (command === "get_theme") return "light";
  if (command === "get_lock_status") {
    return { biometric_enabled: false, biometric_label: "", ui_lang: "zh" };
  }
  throw new Error("Falo lock controls require the desktop runtime.");
});
const pwd = document.getElementById("password");
const errEl = document.getElementById("error");

let busy = false;
let uiLang = "zh";
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

const STR = {
  en: {
    title: "Falo — Locked",
    heading: "Falo is locked",
    copy: "Unlock to reveal your accounts and message windows.",
    password: "Password",
    unlock: "Unlock",
    biometric: "Use biometric",
    useBiometric: "Use {label}",
    reset: "Forgot password? Reset…",
    needPassword: "Enter your password.",
    wrongPassword: "Wrong password.",
    biometricFail: "Biometric authentication failed — enter your password.",
    confirmOk: "OK",
    confirmCancel: "Cancel",
    resetConfirm:
      "Reset Falo?\n\nThis logs out ALL accounts and removes the app lock. " +
      "You will need to re-scan the WhatsApp QR code. Your chats stay on your phone.",
  },
  zh: {
    title: "Falo — 已锁定",
    heading: "Falo 已锁定",
    copy: "解锁后即可查看账号与消息窗口。",
    password: "密码",
    unlock: "解锁",
    biometric: "使用生物识别",
    useBiometric: "使用{label}",
    reset: "忘记密码？重置…",
    needPassword: "请输入密码。",
    wrongPassword: "密码错误。",
    biometricFail: "生物识别失败，请输入密码。",
    confirmOk: "确定",
    confirmCancel: "取消",
    resetConfirm:
      "重置 Falo？\n\n这将退出所有账号并移除应用锁。" +
      "之后需要重新扫描 WhatsApp 二维码。聊天记录仍保留在手机上。",
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

function applyUiLang(lang) {
  uiLang = normalizeLang(lang);
  document.documentElement.lang = uiLang === "en" ? "en" : "zh-CN";
  document.title = t("title");
  const heading = document.querySelector(".lock-card h1");
  const copy = document.querySelector(".lock-copy");
  const unlockBtn = document.getElementById("unlock");
  const bio = document.getElementById("biometric");
  const reset = document.getElementById("reset");
  if (heading) heading.textContent = t("heading");
  if (copy) copy.textContent = t("copy");
  if (pwd) {
    pwd.placeholder = t("password");
    pwd.setAttribute("aria-label", t("password"));
  }
  if (unlockBtn) unlockBtn.textContent = t("unlock");
  if (bio && bio.hidden) bio.textContent = t("biometric");
  if (reset) reset.textContent = t("reset");
}

function applyTheme(theme) {
  window.FaloTheme.apply(document, theme, systemDark.matches);
}

async function tryUnlock() {
  if (busy) return;
  const password = pwd.value;
  if (!password) {
    errEl.textContent = t("needPassword");
    return;
  }
  busy = true;
  document.getElementById("unlock").disabled = true;
  document.getElementById("biometric").disabled = true;
  errEl.textContent = "";
  try {
    const ok = await invoke("unlock_password", { password });
    if (!ok) {
      errEl.textContent = t("wrongPassword");
      pwd.value = "";
      pwd.focus();
    }
  } catch (e) {
    errEl.textContent = String(e);
  } finally {
    busy = false;
    document.getElementById("unlock").disabled = false;
    document.getElementById("biometric").disabled = false;
  }
}

async function tryBiometric() {
  if (busy) return;
  busy = true;
  document.getElementById("unlock").disabled = true;
  document.getElementById("biometric").disabled = true;
  errEl.textContent = "";
  try {
    const ok = await invoke("unlock_biometric");
    if (!ok) errEl.textContent = t("biometricFail");
  } catch (e) {
    errEl.textContent = String(e);
  } finally {
    busy = false;
    document.getElementById("unlock").disabled = false;
    document.getElementById("biometric").disabled = false;
  }
}

async function init() {
  try {
    applyTheme(await invoke("get_theme"));
  } catch (_) {
    applyTheme("light");
  }
  document.getElementById("unlock").addEventListener("click", tryUnlock);
  pwd.addEventListener("keydown", (e) => {
    if (e.key === "Enter") tryUnlock();
  });

  const bio = document.getElementById("biometric");
  bio.addEventListener("click", tryBiometric);

  document.getElementById("reset").addEventListener("click", async (e) => {
    e.preventDefault();
    const ok =
      typeof window.appConfirm === "function"
        ? await window.appConfirm(t("resetConfirm"), {
            okLabel: t("confirmOk"),
            cancelLabel: t("confirmCancel"),
          })
        : window.confirm(t("resetConfirm"));
    if (!ok) return;
    try {
      await invoke("reset_app_lock");
    } catch (err) {
      errEl.textContent = String(err);
    }
  });

  try {
    const s = await invoke("get_lock_status");
    applyUiLang(s.ui_lang);
    if (s.biometric_enabled) {
      bio.textContent = t("useBiometric", {
        label: s.biometric_label || (uiLang === "en" ? "biometrics" : "生物识别"),
      });
      bio.hidden = false;
      tryBiometric(); // auto-prompt on load
    }
  } catch (_) {
    applyUiLang("zh");
  }
  pwd.focus();
}

window.addEventListener("DOMContentLoaded", init);
