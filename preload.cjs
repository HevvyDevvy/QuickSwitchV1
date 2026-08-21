// preload.cjs
//
// Runs with contextIsolation: true / nodeIntegration: false / sandbox: true
// (per electron-main.cjs's BrowserWindow config), so this is the ONLY place
// with a foot in both worlds: it can see ipcRenderer, but index.html /
// renderer.js only ever see the plain `window.quickswitch` object below.
//
// Matches the real handlers registered in electron-main.cjs:
//   ipcMain.handle("qs:get-actions")
//   ipcMain.handle("qs:run-action", actionId)
//   ipcMain.handle("qs:reveal-advanced", actionId)
//
// All three are simple invoke/response — main runs the action to completion
// (via sudo-prompt) and resolves once, there's no streaming/progress channel
// to wire up here.

const { contextBridge, ipcRenderer } = require("electron");

const ALLOWED_INVOKE = new Set([
  "qs:get-actions",
  "qs:run-action",
  "qs:reveal-advanced",
]);

function safeInvoke(channel, payload) {
  if (!ALLOWED_INVOKE.has(channel)) {
    return Promise.reject(new Error(`Blocked IPC channel: ${channel}`));
  }
  return ipcRenderer.invoke(channel, payload);
}

contextBridge.exposeInMainWorld("quickswitch", {
  // -> { platform, actions: [{id,label}], advanced: [{id,label}] }
  getActions: () => safeInvoke("qs:get-actions"),

  // -> { ok, output }
  runAction: (actionId) => safeInvoke("qs:run-action", actionId),

  // -> { ok }  (opens the script's containing folder via shell.showItemInFolder)
  revealAdvanced: (actionId) => safeInvoke("qs:reveal-advanced", actionId),
});
