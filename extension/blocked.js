const REMINDERS = [
  "$70 now, plus the console upgrade, the special edition, and the Shark Cards later.",
  "You can buy it in a year, when it's cheaper. You probably won't want it by then.",
  "That $70 is a nice dinner out, a month of a gym, or a good start on an emergency fund.",
  "Hype fades in a few weeks. Money you didn't spend stays.",
  "Every trailer, review and clip is there to make you want to buy it. Skipping them is how you win.",
  "Think about the hours, not just the money. What else could you do with 100 of them?",
  "You already have games you haven't finished.",
];

if (new URLSearchParams(location.search).get("src") === "strict") {
  document.getElementById("lede").textContent =
    "Strict mode is on, so anything GTA or Rockstar is blocked. The money stays in your account.";
}

document.getElementById("reminder").textContent =
  REMINDERS[Math.floor(Math.random() * REMINDERS.length)];

document.getElementById("back").addEventListener("click", () => {
  if (history.length > 1) history.back();
  else location.href = "about:blank";
});

async function render() {
  const t = await chrome.storage.local.get({ hidden: 0, pages: 0, since: null });
  document.getElementById("pages").textContent = t.pages.toLocaleString();
  document.getElementById("hidden").textContent = t.hidden.toLocaleString();
  const days = t.since ? Math.floor((Date.now() - t.since) / 86400000) : 0;
  document.getElementById("days").textContent = days.toLocaleString();
}

chrome.runtime.sendMessage({ type: "pageBlocked" }).catch(() => {}).finally(() => {
  // Give the background a moment to write the new total.
  setTimeout(render, 150);
});
render();
