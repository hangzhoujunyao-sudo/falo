).
  // No header stub panel — that conflicted with the extension message-toolbar UX.

  // ---------------------------------------------------------------------------
  // F2 / F3：在已打开账号标签间左右循环（聊天页有焦点时也能用）
  // ---------------------------------------------------------------------------
  (function setupTabCycleHotkeys() {
    // 监听键盘：F2 上一个标签，F3 下一个标签
    function onKeyDown(ev) {
      if (!ev || (ev.key !== "F2" && ev.key !== "F3")) return;
      // 带修饰键时不处理，避免与系统/其它快捷键冲突
      if (ev.ctrlKey || ev.altKey || ev.metaKey || ev.shiftKey) return;
      try {
        ev.preventDefault();
      } catch (_) {}
      // delta: -1 = 左，+1 = 右
      var delta = ev.key === "F2" ? -1 : 1;
      invoke("cycle_account_tab", { delta });
    }
    try {
      window.addEventListener("keydown", onKeyDown, true);
    } catch (_) {
      if (document.addEventListener) {
        document.addEventListener("keydown", onKeyDown, true);
      }
    }
  })();

  // ---------------------------------------------------------------------------
  // Phase 4 — debug-only visible-list export (formal backup is Settings → Backup
  // via __whatsnowContactExportRpc / watrans-store-bridge).
  // ---------------------------------------------------------------------------
  (function setupRestHooks() {
    window.__whatsnowExportVisibleContacts = function () {
      var rows = document.querySelectorAll('[data-testid="cell-frame-container"]');
      var out = [];
      rows.forEach(function (row) {
        var nameEl =
          row.querySelector('[data-testid="cell-frame-title"]') ||
          row.querySelector("span[dir='auto']");
        var name = nameEl ? (nameEl.textContent || "").trim() : "";
        if (name) out.push({ name: name });
      });
      try {
        var blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "whatsnow-contacts-" + Date.now() + ".json";
        a.click();
      } catch (e) {
        invoke("dlog", { msg: "contacts export fail: " + e });
      }
      return out.length;
    };
    invoke("dlog", { msg: "translate: helper modules ready" });
  })();
})();