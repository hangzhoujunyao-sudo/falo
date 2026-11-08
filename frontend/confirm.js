// In-app dialogs — macOS WKWebView (Tauri/wry) ignores window.confirm/alert/prompt
// (confirm→false, prompt→null, alert→no-op), so guarded actions appear broken.
(function (global) {
  let resolvePending = null;
  let mode = "confirm"; // confirm | alert | prompt

  function ensureModal() {
    let root = document.getElementById("app-confirm-modal");
    if (root) return root;

    root = document.createElement("div");
    root.id = "app-confirm-modal";
    root.className = "app-confirm-modal";
    root.hidden = true;
    root.innerHTML =
      '<div class="app-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="app-confirm-msg">' +
      '<p id="app-confirm-msg" class="app-confirm-msg"></p>' +
      '<input id="app-confirm-input" class="app-confirm-input" type="text" hidden />' +
      '<div class="app-confirm-actions">' +
      '<button type="button" id="app-confirm-cancel" class="app-confirm-btn app-confirm-cancel">Cancel</button>' +
      '<button type="button" id="app-confirm-ok" class="app-confirm-btn app-confirm-ok">OK</button>' +
      "</div></div>";
    document.body.appendChild(root);

    const finish = (ok) => {
      const input = document.getElementById("app-confirm-input");
      const value = input ? String(input.value || "") : "";
      root.hidden = true;
      if (input) {
        input.hidden = true;
        input.value = "";
        input.type = "text";
      }
      const resolve = resolvePending;
      resolvePending = null;
      if (!resolve) return;
      if (mode === "prompt") resolve(ok ? value : null);
      else if (mode === "alert") resolve(true);
      else resolve(!!ok);
    };

    root.addEventListener("click", (ev) => {
      if (ev.target === root) finish(mode === "alert");
    });
    document.getElementById("app-confirm-cancel").addEventListener("click", () => finish(false));
    document.getElementById("app-confirm-ok").addEventListener("click", () => finish(true));
    document.addEventListener("keydown", (ev) => {
      if (root.hidden || !resolvePending) return;
      if (ev.key === "Escape") {
        ev.preventDefault();
        finish(mode === "alert");
      } else if (ev.key === "Enter") {
        ev.preventDefault();
        finish(true);
      }
    });

    return root;
  }

  function openDialog(nextMode, message, opts) {
    const root = ensureModal();
    if (resolvePending) {
      const prev = resolvePending;
      resolvePending = null;
      if (mode === "prompt") prev(null);
      else prev(false);
    }
    mode = nextMode;
    const o = opts || {};
    const msg = document.getElementById("app-confirm-msg");
    const okBtn = document.getElementById("app-confirm-ok");
    const cancelBtn = document.getElementById("app-confirm-cancel");
    const input = document.getElementById("app-confirm-input");
    if (msg) msg.textContent = message || "";
    if (okBtn) okBtn.textContent = o.okLabel || "OK";
    if (cancelBtn) {
      cancelBtn.textContent = o.cancelLabel || "Cancel";
      cancelBtn.hidden = nextMode === "alert";
    }
    if (input) {
      const isPrompt = nextMode === "prompt";
      input.hidden = !isPrompt;
      input.type = o.password ? "password" : "text";
      input.value = isPrompt ? String(o.defaultValue != null ? o.defaultValue : "") : "";
      input.placeholder = o.placeholder || "";
    }
    root.hidden = false;
    queueMicrotask(() => {
      try {
        if (nextMode === "prompt" && input) {
          input.focus();
          input.select();
        } else if (okBtn) {
          okBtn.focus();
        }
      } catch (_) {}
    });
    return new Promise((resolve) => {
      resolvePending = resolve;
    });
  }

  /**
   * @param {string} message
   * @param {{ okLabel?: string, cancelLabel?: string }} [opts]
   * @returns {Promise<boolean>}
   */
  global.appConfirm = function appConfirm(message, opts) {
    return openDialog("confirm", message, opts);
  };

  /**
   * @param {string} message
   * @param {{ okLabel?: string }} [opts]
   * @returns {Promise<void>}
   */
  global.appAlert = function appAlert(message, opts) {
    return openDialog("alert", message, opts).then(() => undefined);
  };

  /**
   * @param {string} message
   * @param {string} [defaultValue]
   * @param {{ okLabel?: string, cancelLabel?: string, password?: boolean, placeholder?: string }} [opts]
   * @returns {Promise<string|null>}
   */
  global.appPrompt = function appPrompt(message, defaultValue, opts) {
    const o = Object.assign({}, opts || {}, { defaultValue: defaultValue != null ? defaultValue : "" });
    return openDialog("prompt", message, o);
  };
})(typeof window !== "undefined" ? window : globalThis);
