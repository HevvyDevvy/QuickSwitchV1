// Electron main process for QuickSwitch.
//
// QuickSwitch has no server/dashboard to host (unlike a typical local-API
// desktop wrapper) — it's a launcher UI over a small set of OS-specific
// network reset scripts (release/renew IP, flush DNS cache) that are meant
// to be paired with a firewall/IDS tool already running on the machine.
//
// CommonJS (.cjs) on purpose — Electron's main process loads this directly
// with Node's CJS loader.

const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const sudoPrompt = require("sudo-prompt");

const isDev = !app.isPackaged;

// In a packaged app, extraResources land in process.resourcesPath/scripts.
// In dev, they're just the sibling resources/scripts folder.
const scriptsRoot = isDev
  ? path.resolve(__dirname, "resources", "scripts")
  : path.join(process.resourcesPath, "scripts");

// Registry of one-click actions. Each entry maps to a real file under
// resources/scripts/. "advanced" entries need an interpreter/toolchain
// (Ruby, Rust, a running Suricata/Snort instance) that QuickSwitch does not
// bundle, so those are surfaced as "reveal in folder" rather than "run".
const ACTIONS = {
  win32: [
    {
      id: "win-firewall",
      label: "Windows Firewall — release/renew IP, flush DNS",
      file: "windows/quick_switch_windows_firewall.ps1",
      runner: (p) => `powershell -NoProfile -ExecutionPolicy Bypass -File "${p}"`,
    },
    {
      id: "win-defender",
      label: "Windows Defender — release/renew IP, flush DNS",
      file: "windows/quick_switch_windows_defender.ps1",
      runner: (p) => `powershell -NoProfile -ExecutionPolicy Bypass -File "${p}"`,
    },
    {
      id: "win-defender-firewall-batch",
      label: "Windows Defender Firewall (batch variant)",
      file: "windows/quick_switch_windows_defender_firewall.bat",
      runner: (p) => `"${p}"`,
    },
    {
      id: "win-netsh",
      label: "Full stack reset — Winsock + TCP/IP + DNS (netsh)",
      file: "windows/quick_switch_netsh.bat",
      runner: (p) => `"${p}"`,
    },
  ],
  linux: [
    {
      id: "linux-ufw",
      label: "ufw — network reset",
      file: "linux/quick_switch_ufw.sh",
      runner: (p) => `bash "${p}"`,
    },
    {
      id: "linux-iptables",
      label: "iptables — network reset",
      file: "linux/quick_switch_iptables.py",
      runner: (p) => `python3 "${p}"`,
    },
    {
      id: "linux-firewalld",
      label: "firewalld — network reset",
      file: "linux/quick_switch_firewalld.sh",
      runner: (p) => `bash "${p}"`,
    },
    {
      id: "linux-nftables",
      label: "nftables — network reset",
      file: "linux/quick_switch_nftables.sh",
      runner: (p) => `bash "${p}"`,
    },
    {
      id: "linux-snort",
      label: "Snort-paired — network reset",
      file: "linux/quick_switch_snort.sh",
      runner: (p) => `bash "${p}"`,
    },
  ],
  darwin: [
    {
      id: "mac-pf",
      label: "pf (built-in firewall) — network reset",
      file: "mac/quick_switch_pf.sh",
      runner: (p) => `bash "${p}"`,
    },
    {
      id: "mac-snort",
      label: "Snort-paired — network reset",
      file: "mac/quick_switch_snort.sh",
      runner: (p) => `bash "${p}"`,
    },
  ],
};

const ADVANCED = [
  { id: "adv-suricata-py", label: "Suricata (Python)", file: "advanced/quick_switch_suricata.py" },
  { id: "adv-snort-rb", label: "Snort (Ruby)", file: "advanced/quick_switch_snort.rb" },
  { id: "adv-suricata-rs", label: "Suricata (Rust, needs compiling)", file: "advanced/quick_switch_suricata.rs" },
];

function actionsForPlatform() {
  return ACTIONS[process.platform] || [];
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 720,
    height: 640,
    minWidth: 560,
    minHeight: 480,
    title: "QuickSwitch",
    backgroundColor: "#0b0d12",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));
}

ipcMain.handle("qs:get-actions", () => {
  return {
    platform: process.platform,
    actions: actionsForPlatform().map(({ id, label }) => ({ id, label })),
    advanced: ADVANCED.map(({ id, label }) => ({ id, label })),
  };
});

ipcMain.handle("qs:run-action", async (_event, actionId) => {
  const action = actionsForPlatform().find((a) => a.id === actionId);
  if (!action) {
    return { ok: false, output: `Unknown or unsupported action for this platform: ${actionId}` };
  }

  const scriptPath = path.join(scriptsRoot, action.file);
  if (!fs.existsSync(scriptPath)) {
    return { ok: false, output: `Script not found: ${scriptPath}` };
  }

  const command = action.runner(scriptPath);

  return new Promise((resolve) => {
    // sudo-prompt shows the native OS elevation prompt (UAC on Windows,
    // authorization dialog on macOS, pkexec/gksudo/kdesudo on Linux) and
    // runs the command elevated, since these scripts touch network config.
    sudoPrompt.exec(command, { name: "QuickSwitch" }, (error, stdout, stderr) => {
      const output = [stdout, stderr, error ? String(error.message || error) : ""]
        .filter(Boolean)
        .join("\n");
      resolve({ ok: !error, output: output || "Task completed successfully." });
    });
  });
});

ipcMain.handle("qs:reveal-advanced", async (_event, actionId) => {
  const entry = ADVANCED.find((a) => a.id === actionId);
  if (!entry) return { ok: false };
  const scriptPath = path.join(scriptsRoot, entry.file);
  shell.showItemInFolder(scriptPath);
  return { ok: true };
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
