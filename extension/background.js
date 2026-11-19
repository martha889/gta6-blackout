// Counters, per-tab badge, and Strict mode.

const DEFAULTS = { hidden: 0, pages: 0, since: null, strict: false, strictOffAt: null };
// Turning Strict mode on is instant; turning it off waits this long, so an
// impulse has time to pass.
const STRICT_COOLDOWN_MS = 60 * 60 * 1000;
const STRICT_ALARM = "strict-off";

// Serialize storage updates so concurrent messages don't lose increments.
let queue = Promise.resolve();
function update(fn) {
  const run = queue.then(fn);
  queue = run.catch((e) => console.error("[GTA 6 Blackout]", e));
  return run;
}

async function addTotals({ hidden = 0, pages = 0 }) {
  const t = await chrome.storage.local.get(DEFAULTS);
  await chrome.storage.local.set({
    hidden: t.hidden + hidden,
    pages: t.pages + pages,
    since: t.since || Date.now(),
  });
}

async function bumpBadge(tabId, n) {
  const key = `tab:${tabId}`;
  const s = await chrome.storage.session.get({ [key]: 0 });
  const count = s[key] + n;
  await chrome.storage.session.set({ [key]: count });
  try {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: "#d7263d" });
    await chrome.action.setBadgeText({ tabId, text: count > 999 ? "999+" : String(count) });
  } catch (_) {
    // Tab closed in the meantime.
  }
}

// ---- Strict mode -------------------------------------------------------

async function setStrict(on) {
  await chrome.storage.local.set({ strict: on, strictOffAt: null });
  await chrome.alarms.clear(STRICT_ALARM);
  await syncRulesets();
}

async function requestStrictOff() {
  const { strict, strictOffAt } = await chrome.storage.local.get(DEFAULTS);
  if (!strict || strictOffAt) return;
  const when = Date.now() + STRICT_COOLDOWN_MS;
  await chrome.storage.local.set({ strictOffAt: when });
  await chrome.alarms.create(STRICT_ALARM, { when });
}

async function cancelStrictOff() {
  await chrome.storage.local.set({ strictOffAt: null });
  await chrome.alarms.clear(STRICT_ALARM);
}

// Apply a pending turn-off if its time has come, and make the network rules
// match the stored setting. Runs on alarm, startup and install.
async function reconcileStrict() {
  const { strict, strictOffAt } = await chrome.storage.local.get(DEFAULTS);
  if (strict && strictOffAt && Date.now() >= strictOffAt) {
    await chrome.storage.local.set({ strict: false, strictOffAt: null });
  } else if (strict && strictOffAt) {
    // Alarms can be lost when the browser updates; recreate it.
    const existing = await chrome.alarms.get(STRICT_ALARM);
    if (!existing) await chrome.alarms.create(STRICT_ALARM, { when: strictOffAt });
  }
  await syncRulesets();
}

async function syncRulesets() {
  const { strict } = await chrome.storage.local.get(DEFAULTS);
  await chrome.declarativeNetRequest.updateEnabledRulesets(
    strict ? { enableRulesetIds: ["strict_rules"] } : { disableRulesetIds: ["strict_rules"] }
  );
}

// ---- events ------------------------------------------------------------

chrome.runtime.onInstalled.addListener(() => {
  update(async () => {
    const t = await chrome.storage.local.get(DEFAULTS);
    if (!t.since) await chrome.storage.local.set({ since: Date.now() });
    await reconcileStrict();
  });
});

chrome.runtime.onStartup.addListener(() => update(reconcileStrict));

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === STRICT_ALARM) update(reconcileStrict);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Only the extension's own pages may change settings.
  const fromExtensionPage = sender.url?.startsWith(chrome.runtime.getURL(""));
  switch (msg?.type) {
    case "hidden":
      if (Number.isFinite(msg.count) && msg.count > 0) {
        update(() => addTotals({ hidden: msg.count }));
        const tabId = sender.tab?.id;
        if (tabId != null) update(() => bumpBadge(tabId, msg.count));
      }
      return false;
    case "pageBlocked":
      if (fromExtensionPage) update(() => addTotals({ pages: 1 }));
      return false;
    case "strictOn":
    case "strictRequestOff":
    case "strictCancelOff": {
      if (!fromExtensionPage) return false;
      const fn = { strictOn: () => setStrict(true), strictRequestOff: requestStrictOff, strictCancelOff: cancelStrictOff }[msg.type];
      update(fn).then(() => sendResponse({ ok: true }), (e) => sendResponse({ ok: false, error: String(e) }));
      return true; // async response
    }
  }
  return false;
});

chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === "loading") {
    update(() => chrome.storage.session.remove(`tab:${tabId}`));
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  update(() => chrome.storage.session.remove(`tab:${tabId}`));
});
