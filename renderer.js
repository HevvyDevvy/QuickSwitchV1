const log = (msg) => {
  const el = document.getElementById("log");
  el.textContent = msg;
  el.scrollTop = el.scrollHeight;
};

async function init() {
  const { actions, advanced } = await window.quickswitch.getActions();

  const actionsEl = document.getElementById("actions");
  if (actions.length === 0) {
    actionsEl.textContent = "No actions available for this platform.";
  }
  for (const a of actions) {
    const btn = document.createElement("button");
    btn.className = "action";
    btn.textContent = a.label;
    btn.onclick = async () => {
      btn.disabled = true;
      log(`Running: ${a.label}\n(you may be prompted for admin/authorization)`);
      const result = await window.quickswitch.runAction(a.id);
      log(result.output);
      btn.disabled = false;
    };
    actionsEl.appendChild(btn);
  }

  const advancedEl = document.getElementById("advanced");
  for (const a of advanced) {
    const btn = document.createElement("button");
    btn.className = "action advanced";
    btn.textContent = `${a.label} — reveal script`;
    btn.onclick = async () => {
      await window.quickswitch.revealAdvanced(a.id);
    };
    advancedEl.appendChild(btn);
  }
}

init();

