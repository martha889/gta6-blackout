const $ = (id) => document.getElementById(id);

function fmtRemaining(ms) {
  const mins = Math.max(1, Math.ceil(ms / 60000));
  return mins >= 60 ? "1 hour" : `${mins} min`;
}

async function render() {
  const t = await chrome.storage.local.get({ hidden: 0, pages: 0, since: null, strict: false, strictOffAt: null });
  $("hidden").textContent = t.hidden.toLocaleString();
  $("pages").textContent = t.pages.toLocaleString();
  const days = t.since ? Math.floor((Date.now() - t.since) / 86400000) : 0;
  $("days").textContent = days.toLocaleString();

  $("strict-badge").hidden = !t.strict;
  $("strict-on").hidden = t.strict;
  $("strict-off").hidden = !t.strict || !!t.strictOffAt;
  $("strict-cancel").hidden = !t.strict || !t.strictOffAt;
  $("strict-text").textContent = !t.strict
    ? "Also blocks the whole GTA series, GTA Online and Rockstar Games. Turning it on is instant. Turning it off takes an hour."
    : t.strictOffAt
      ? `Turning off in ${fmtRemaining(t.strictOffAt - Date.now())}. Changed your mind? Keep it on.`
      : "Blocking the whole GTA series, GTA Online and Rockstar Games.";

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id != null) {
    const key = `tab:${tab.id}`;
    const s = await chrome.storage.session.get({ [key]: 0 });
    $("tab").textContent = s[key].toLocaleString();
  }
}

const send = (type) => chrome.runtime.sendMessage({ type }).then(render);
$("strict-on").addEventListener("click", () => send("strictOn"));
$("strict-off").addEventListener("click", () => send("strictRequestOff"));
$("strict-cancel").addEventListener("click", () => send("strictCancelOff"));

chrome.storage.onChanged.addListener(render);
render();
