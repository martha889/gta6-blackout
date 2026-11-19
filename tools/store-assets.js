// Generates Chrome Web Store images into store/ from the real extension.
//   store/screenshot-1-feed.png      1280x800  before/after on a demo feed
//   store/screenshot-2-blocked.png   1280x800  the block screen
//   store/screenshot-3-popup.png     1280x800  popup and Strict mode
//   store/promo-small.png            440x280   small promo tile
// Usage: npm install && npm run store-assets   (needs Playwright's Chromium)
const http = require("http");
const path = require("path");
const os = require("os");
const fs = require("fs");
const { chromium } = require("playwright-core");

const ROOT = path.join(__dirname, "..");
const EXT = path.join(ROOT, "extension");
const OUT = path.join(ROOT, "store");
const W = 1280, H = 800;

function findChromium() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const expected = chromium.executablePath();
  if (fs.existsSync(expected)) return expected;
  const cache = path.join(os.homedir(), os.platform() === "darwin" ? "Library/Caches/ms-playwright" : ".cache/ms-playwright");
  const builds = fs.existsSync(cache)
    ? fs.readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort((a, b) => b.split("-")[1] - a.split("-")[1])
    : [];
  for (const b of builds) {
    for (const c of [
      "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
      "chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
      "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
      "chrome-linux/chrome", "chrome-linux64/chrome", "chrome-win/chrome.exe", "chrome-win64/chrome.exe",
    ]) {
      const p = path.join(cache, b, c);
      if (fs.existsSync(p)) return p;
    }
  }
  throw new Error("No Chromium found. Run `npx playwright install chromium` or set CHROME_PATH.");
}

const FONT = `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;

// A generic, fictional video feed (no real site's branding).
const CARDS = [
  ["GTA 6 trailer 3: every detail you missed", "#7c3aed,#db2777"],
  ["Sourdough for beginners, step by step", "#f59e0b,#ef4444"],
  ["Jason and Lucia's story explained", "#0ea5e9,#6366f1"],
  ["Two weeks in Portugal on a budget", "#10b981,#0ea5e9"],
  ["Rockstar's next game: everything we know", "#f43f5e,#f97316"],
  ["Learn guitar chords in 30 days", "#84cc16,#14b8a6"],
  ["#GTA6 map leak compared to Los Santos", "#a855f7,#ec4899"],
  ["20-minute workout, no equipment", "#06b6d4,#3b82f6"],
  ["Grand Theft Auto VI preorder bonuses", "#eab308,#dc2626"],
];
const feedPage = `<!doctype html><html><head><meta charset="utf-8"><title>Feed</title><style>
  body { margin: 0; background: #0f0f10; color: #f1f1f1; font: 14px/1.4 ${FONT}; }
  header { height: 56px; display: flex; align-items: center; padding: 0 24px; gap: 10px; border-bottom: 1px solid #222; }
  .logo { width: 28px; height: 20px; border-radius: 6px; background: #3b82f6; }
  .search { margin-left: 40px; flex: 0 1 420px; height: 34px; border-radius: 17px; background: #1c1c1e; border: 1px solid #2c2c2e; }
  ul { list-style: none; margin: 0; padding: 20px 24px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
  li { min-width: 0; }
  .thumb { aspect-ratio: 16/9; border-radius: 10px; }
  h3 { margin: 8px 0 2px; font-size: 14px; font-weight: 600; }
  .meta { color: #9a9a9a; font-size: 12px; }
</style></head><body><header><div class="logo"></div><b>Feed</b><div class="search"></div></header><ul>
${CARDS.map(([t, g], i) => `<li><div class="thumb" style="background:linear-gradient(135deg,${g})"></div><h3>${t}</h3><div class="meta">${(i * 37 + 12) % 900}K views · ${i === 0 ? "1 day" : `${i + 1} days`} ago</div></li>`).join("\n")}
</ul></body></html>`;

const frame = (title, subtitle, body) => `<!doctype html><html><head><meta charset="utf-8"><style>
  html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; }
  body { background: radial-gradient(1200px 600px at 50% -10%, #2a1016, #0f1115 60%); color: #eef0f4; font-family: ${FONT};
         display: flex; flex-direction: column; align-items: center; }
  h1 { margin: 44px 0 6px; font-size: 40px; letter-spacing: -0.02em; }
  p.sub { margin: 0 0 30px; color: #9aa3b2; font-size: 19px; }
  .row { display: flex; gap: 28px; align-items: flex-start; }
  figure { margin: 0; text-align: center; }
  figure img { display: block; border-radius: 12px; border: 1px solid #2a2f3a; box-shadow: 0 20px 50px rgba(0,0,0,.45); }
  figcaption { margin-top: 12px; color: #9aa3b2; font-size: 15px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }
  figcaption.on { color: #f87171; }
  ul { margin: 0; padding: 0; list-style: none; max-width: 470px; }
  li { margin: 0 0 18px; padding-left: 30px; position: relative; font-size: 18px; line-height: 1.45; color: #d6dae3; }
  li::before { content: ""; position: absolute; left: 0; top: 6px; width: 14px; height: 14px; border-radius: 50%; border: 3px solid #d7263d; }
  li b { color: #fff; }
</style></head><body><h1>${title}</h1><p class="sub">${subtitle}</p>${body}</body></html>`;

const dataUrl = (buf) => `data:image/png;base64,${buf.toString("base64")}`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.rmSync(path.join(EXT, "_metadata"), { recursive: true, force: true });
  const exe = findChromium();
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(req.url.startsWith("/article")
      ? `<!doctype html><title>GTA 6 release date confirmed</title><body>article</body>`
      : feedPage);
  });
  await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}`;

  // "Before": plain browser, no extension.
  const plain = await chromium.launch({ executablePath: exe, headless: true });
  const p0 = await plain.newPage({ viewport: { width: 1000, height: 820 }, deviceScaleFactor: 1 });
  await p0.goto(base + "/feed");
  const before = await p0.screenshot();
  const tileCtx = await plain.newPage({ viewport: { width: 440, height: 280 } });

  // "After" and extension pages: browser with the extension loaded.
  const userDir = fs.mkdtempSync(path.join(os.tmpdir(), "gta6-assets-"));
  const ctx = await chromium.launchPersistentContext(userDir, {
    executablePath: exe,
    headless: true,
    viewport: { width: W, height: H },
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  });
  const sw = ctx.serviceWorkers()[0] || (await ctx.waitForEvent("serviceworker"));
  const extId = new URL(sw.url()).host;
  // Plausible, round stats for the screenshots.
  await sw.evaluate(() => chrome.storage.local.set({ hidden: 1284, pages: 57, since: Date.now() - 23 * 86400000 }));

  const p1 = await ctx.newPage();
  await p1.setViewportSize({ width: 1000, height: 820 });
  await p1.goto(base + "/feed");
  await p1.waitForTimeout(600);
  const after = await p1.screenshot();

  const comp = await ctx.newPage();
  await comp.setViewportSize({ width: W, height: H });
  const save = async (name, html, size = { width: W, height: H }) => {
    await comp.setViewportSize(size);
    await comp.setContent(html);
    await comp.waitForTimeout(100);
    await comp.screenshot({ path: path.join(OUT, name) });
    console.log("store/" + name);
  };

  await save("screenshot-1-feed.png", frame(
    "GTA 6 disappears from the web",
    "Videos, posts, search results and links about GTA 6 are hidden as pages load.",
    `<div class="row">
      <figure><img src="${dataUrl(before)}" width="560"><figcaption>Without</figcaption></figure>
      <figure><img src="${dataUrl(after)}" width="560"><figcaption class="on">With GTA 6 Blackout</figcaption></figure>
    </div>`));

  // Block screen, as the user sees it.
  const p2 = await ctx.newPage();
  await p2.setViewportSize({ width: W, height: H });
  await p2.goto(base + "/article");
  await p2.waitForURL(/blocked\.html/);
  await p2.evaluate(() => {
    document.getElementById("reminder").textContent =
      "$70 now, plus the console upgrade, the special edition, and the Shark Cards later.";
  });
  await p2.waitForTimeout(400);
  await p2.screenshot({ path: path.join(OUT, "screenshot-2-blocked.png") });
  console.log("store/screenshot-2-blocked.png");

  // Popup, with Strict mode counting down.
  await sw.evaluate(() => chrome.storage.local.set({ strict: true, strictOffAt: Date.now() + 42 * 60000 }));
  const p3 = await ctx.newPage();
  await p3.setViewportSize({ width: 336, height: 470 });
  await p3.goto(`chrome-extension://${extId}/popup.html`);
  await p3.waitForTimeout(300);
  const popupShot = await p3.screenshot({ deviceScaleFactor: 1 });
  await sw.evaluate(() => chrome.storage.local.set({ strict: false, strictOffAt: null }));

  await save("screenshot-3-popup.png", frame(
    "Built to resist the impulse",
    "No off switch in the popup. Strict mode takes an hour to turn off.",
    `<div class="row" style="align-items:center; gap:64px; margin-top:6px">
      <figure><img src="${dataUrl(popupShot)}" width="336"></figure>
      <ul>
        <li><b>Blocks GTA 6 searches and pages</b> before they load, on any site.</li>
        <li><b>Catches indirect references</b> like "Rockstar's next game", Jason and Lucia, Leonida.</li>
        <li><b>Strict mode</b> also blocks the whole GTA series and Rockstar Games.</li>
        <li><b>Nothing leaves your browser.</b> No accounts, no tracking, no data collected.</li>
      </ul>
    </div>`));

  // Small promo tile.
  const icon = fs.readFileSync(path.join(EXT, "icons", "icon128.png"));
  await tileCtx.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    html, body { margin: 0; width: 440px; height: 280px; overflow: hidden; }
    body { background: radial-gradient(500px 300px at 30% 0%, #3a121a, #0f1115 70%); color: #eef0f4; font-family: ${FONT};
           display: flex; align-items: center; gap: 22px; padding: 0 34px; box-sizing: border-box; }
    h1 { margin: 0 0 6px; font-size: 34px; line-height: 1.05; letter-spacing: -0.02em; }
    p { margin: 0; color: #b4bccb; font-size: 16px; line-height: 1.35; }
  </style></head><body><img src="${dataUrl(icon)}" width="112" height="112">
    <div><h1>GTA 6<br>Blackout</h1><p>Hide the hype.<br>Keep your money.</p></div></body></html>`);
  await tileCtx.waitForTimeout(100);
  await tileCtx.screenshot({ path: path.join(OUT, "promo-small.png") });
  console.log("store/promo-small.png");

  await ctx.close();
  await plain.close();
  server.close();
  fs.rmSync(userDir, { recursive: true, force: true });
  fs.rmSync(path.join(EXT, "_metadata"), { recursive: true, force: true });
})().catch((e) => { console.error(e); process.exit(1); });
