const http = require("http");
const path = require("path");
const os = require("os");
const fs = require("fs");
const { chromium } = require("playwright-core");

// Run: npm install && npm run test:e2e
// Needs a Chromium that allows --load-extension (branded Chrome doesn't):
// Playwright's Chromium (npx playwright install chromium), or set CHROME_PATH.
const EXT = path.join(__dirname, "..", "extension");
const EXE = process.env.CHROME_PATH || findChromium();

// Playwright's expected build, else the newest Playwright Chromium installed.
function findChromium() {
  const expected = chromium.executablePath();
  if (fs.existsSync(expected)) return expected;
  const cache = path.join(os.homedir(), os.platform() === "darwin" ? "Library/Caches/ms-playwright" : ".cache/ms-playwright");
  const builds = fs.existsSync(cache)
    ? fs.readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort((a, b) => b.split("-")[1] - a.split("-")[1])
    : [];
  const candidates = [
    "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
    "chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
    "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
    "chrome-linux/chrome",
    "chrome-linux64/chrome",
    "chrome-win/chrome.exe",
    "chrome-win64/chrome.exe",
  ];
  for (const b of builds) {
    for (const c of candidates) {
      const p = path.join(cache, b, c);
      if (fs.existsSync(p)) return p;
    }
  }
  throw new Error("No Chromium found. Run `npx playwright install chromium` or set CHROME_PATH.");
}

const pages = {
  "/feed": `<!doctype html><title>My Feed</title><body><main>
    <ul id="list">
      <li id="a"><h3>New GTA 6 trailer breakdown</h3><p>Everything we know</p></li>
      <li id="b"><h3>Best GTA 5 mods of 2026</h3></li>
      <li id="c"><h3>GTA <b>VI</b> preorder bonuses</h3></li>
      <li id="d"><h3>Cooking pasta at home</h3></li>
      <li id="ctx1"><h3>Everything about Rockstar's next game</h3></li>
      <li id="ctx2"><h3>Jason and Lucia's story explained</h3></li>
      <li id="fp1"><h3>I quit GTA 6 months ago and feel great</h3></li>
      <li id="fp2"><h3>New GTA Online update is out</h3></li>
      <li id="ru"><h3>ГТА 6: всё что известно</h3></li>
    </ul>
    <figure id="e"><img alt="Grand Theft Auto VI cover art" src="data:,"><figcaption>Cover</figcaption></figure>
    <div class="card" id="f"><div><a href="/r/GTA6/top">see thread</a> <span>12 comments</span></div></div>
    <div class="card" id="g"><div><span>GTA Vice City retrospective</span></div></div>
    <p id="h">Long article paragraph that is not about anything bad. ${"filler text ".repeat(60)}</p>
    <p id="i">A paragraph mentioning #GTA6 in passing.</p>
    <div id="recycled-wrap"><article id="r"><h3>GTA 6 gameplay leak</h3></article></div>
    <yt-card id="shadow1"></yt-card>
    <div id="shadow-slot"></div>
    <script>
      customElements.define("yt-card", class extends HTMLElement {
        constructor() {
          super();
          const root = this.attachShadow({ mode: "open" });
          root.innerHTML = "<div class='inner'><span>" + (this.getAttribute("label") || "GTA 6 trailer reaction") + "</span></div>";
        }
      });
      // A component created and filled before it's connected, then inserted later.
      setTimeout(() => {
        const el = document.createElement("yt-card");
        el.id = "shadow2";
        document.getElementById("shadow-slot").appendChild(el);
        el.shadowRoot.querySelector("span").textContent = "Leonida map size compared";
      }, 300);
      // A safe component should stay visible.
      setTimeout(() => {
        const el = document.createElement("yt-card");
        el.id = "shadow3";
        el.setAttribute("label", "Baking bread");
        document.getElementById("shadow-slot").appendChild(el);
        el.shadowRoot.querySelector("span").textContent = "Baking bread at home";
      }, 350);
      setTimeout(() => {
        const li = document.createElement("li"); li.id = "dyn";
        li.innerHTML = "<h3>Rockstar drops Grand Theft Auto 6 price</h3>";
        document.getElementById("list").appendChild(li);
      }, 400);
      setTimeout(() => { document.querySelector("#r h3").textContent = "Cat video compilation"; }, 1200);
    </script>
  </main></body>`,
  "/article": `<!doctype html><title>GTA 6 release date confirmed</title><body><h1>Hi</h1></body>`,
  "/safe": `<!doctype html><title>GTA V tips</title><body><p id="x">GTA V and GTA Online tips</p></body>`,
  "/spa": `<!doctype html><title>App</title><body><button id="go" onclick="history.pushState({}, '', '/news/gta-6-hype')">go</button></body>`,
  "/watch": `<!doctype html><title>Video</title><body><div id="player"></div>
    <button id="nav" onclick="history.pushState({}, '', '/watch?v=abc123');
      setTimeout(() => { const h = document.createElement('h1'); h.textContent = 'Official Trailer 3 | Grand Theft Auto VI'; document.body.prepend(h); }, 50)">nav</button></body>`,
  "/multi-h1": `<!doctype html><title>Gaming news</title><body><h1>Gaming news</h1>
    <section><h1 id="card-h1">GTA 6 sales numbers</h1></section><p id="other">Other news</p></body>`,
  "/tips": `<!doctype html><title>Weekend tips</title><body><p id="x">GTA V and GTA Online tips</p><p id="y">Gardening tips</p></body>`,
  "/search": `<!doctype html><title>Search</title><body>results</body>`,
  // Structure copied from the real r/GTA (Nov 2026): the header <h1> holds a
  // status emoji labelled "GTA_6_Logo", which used to block the whole subreddit.
  "/r/GTA/": `<!doctype html><title>Grand Theft Auto</title><body><shreddit-app>
    <section id="header"><div><h1 id="sub-h1">r/GTA
      <rpl-hovercard><button type="button" aria-label="Community status: GTA_6_Logo" id="status-btn"><img alt="GTA_6_Logo" src="data:,"></button></rpl-hovercard>
    </h1></div></section>
    <shreddit-feed id="feed">
      <article id="a1"><shreddit-post id="t3_1"><a slot="title">Gta 6 Map</a>
        <shreddit-post-flair><a><span><div aria-label="Flair: GTA VI">GTA VI</div></span></a></shreddit-post-flair></shreddit-post></article>
      <article id="a2"><shreddit-post id="t3_2"><a slot="title">San Andreas still has the best radio</a>
        <shreddit-post-flair><a><span><div aria-label="Flair: GTA SA">GTA SA</div></span></a></shreddit-post-flair></shreddit-post></article>
      <article id="a3"><shreddit-post id="t3_3"><a slot="title">Which GTA protagonist is your favourite?</a></shreddit-post></article>
      <article id="a4"><shreddit-post id="t3_4"><a slot="title">Discussion</a>
        <shreddit-post-flair><a><span><div aria-label="Flair: GTA VI">GTA VI</div></span></a></shreddit-post-flair></shreddit-post></article>
    </shreddit-feed>
    <aside id="rail"><shreddit-subreddit-header><span><rpl-hovercard><button aria-label="Community status: GTA_6_Logo"></button></rpl-hovercard></span>
      <p>About r/GTA: the Grand Theft Auto community</p></shreddit-subreddit-header></aside>
    <section id="trending"><h2 id="trend-h2">Trending: GTA 6</h2><article id="ta">Cats being cats</article><article id="tb">Dog does a flip</article></section>
  </shreddit-app></body>`,
  "/r/GTA/comments/abc/gta_6_map_leak/": `<!doctype html><title>Discussion</title><body>
    <h1 id="post-h1">GTA 6 map leak compared to Los Santos</h1></body>`,
  "/big": `<!doctype html><title>Big</title><body><ul>${
    Array.from({ length: 5000 }, (_, i) => `<li><a href="/v/${i}" title="Video ${i}"><img alt="thumb ${i}" src="data:,"></a><h3>${i % 500 === 0 ? "GTA 6 news" : "Some normal video " + i}</h3><span>${i} views</span></li>`).join("")
  }</ul></body>`,
};

const server = http.createServer((req, res) => {
  const p = req.url.split("?")[0];
  res.writeHead(pages[p] ? 200 : 404, { "content-type": "text/html; charset=utf-8" });
  res.end(pages[p] || "nope");
});

(async () => {
  await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}`;
  const userDir = fs.mkdtempSync(path.join(os.tmpdir(), "gta6-blackout-"));
  const ctx = await chromium.launchPersistentContext(userDir, {
    executablePath: EXE,
    headless: true,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  });
  const sw = ctx.serviceWorkers()[0] || (await ctx.waitForEvent("serviceworker", { timeout: 10000 }));
  const extId = new URL(sw.url()).host;

  const results = [];
  const ok = (name, cond, extra = "") => results.push([cond ? "PASS" : "FAIL", name + (extra ? `  (${extra})` : "")]);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // 0. Every regex in the rulesets is accepted by Chrome's RE2.
  const regexReport = await sw.evaluate(async () => {
    const out = [];
    for (const file of ["rules.json", "strict_rules.json"]) {
      const rules = await (await fetch(chrome.runtime.getURL(file))).json();
      for (const r of rules) {
        if (!r.condition.regexFilter) continue;
        const res = await chrome.declarativeNetRequest.isRegexSupported({ regex: r.condition.regexFilter });
        out.push([file, r.id, res.isSupported, res.reason || ""]);
      }
    }
    return out;
  });
  ok("all rule regexes supported by Chrome", regexReport.every((r) => r[2]), JSON.stringify(regexReport.filter((r) => !r[2])));

  const hiddenIds = () => page.evaluate(() =>
    [...document.querySelectorAll("[data-gta6-blackout]")].map((e) => e.id || e.tagName));

  // 1. Feed hiding
  await page.goto(base + "/feed");
  await page.waitForTimeout(800);
  let h = await hiddenIds();
  console.log("hidden after load:", h);
  ok("hides GTA 6 list item", h.includes("a"));
  ok("keeps GTA 5 item", !h.includes("b"));
  ok("hides split-tag GTA <b>VI</b>", h.includes("c"));
  ok("keeps unrelated item", !h.includes("d"));
  ok("hides 'Rockstar's next game'", h.includes("ctx1"));
  ok("hides 'Jason and Lucia'", h.includes("ctx2"));
  ok("keeps 'GTA 6 months ago'", !h.includes("fp1"));
  ok("keeps 'New GTA Online update'", !h.includes("fp2"));
  ok("hides Russian ГТА 6", h.includes("ru"));
  ok("hides figure via img alt", h.includes("e"));
  ok("hides card via link href", h.some((x) => x === "f" || x === "DIV"));
  ok("keeps Vice City card", !h.includes("g"));
  ok("keeps long unrelated paragraph", !h.includes("h"));
  ok("hides #GTA6 paragraph", h.includes("i"));
  ok("hides dynamically added item", h.includes("dyn"));
  ok("hides shadow DOM component", h.includes("shadow1"));
  ok("hides shadow component inserted later", h.includes("shadow2"));
  ok("keeps safe shadow component", !h.includes("shadow3"));
  ok("parent list never hidden", !h.includes("list") && !h.includes("recycled-wrap"));
  ok("body/main never hidden", !["BODY", "MAIN", "HTML"].some((t) => h.includes(t)));
  ok("visually hidden", await page.evaluate(() => getComputedStyle(document.getElementById("a")).display === "none"));
  await page.waitForTimeout(1600);
  h = await hiddenIds();
  ok("recycled element un-hidden after text change", !h.includes("r"));
  ok("no page errors from hooks", errors.length === 0, errors.join("; "));

  // 2. Page title -> block page
  await page.goto(base + "/article");
  await page.waitForURL(/blocked\.html/, { timeout: 5000 }).catch(() => {});
  ok("title match redirects to block page", page.url().includes("blocked.html"));

  // 3. URL rules
  for (const q of ["gta+6", "rockstar+next+game", "lucia+caminos", "gta+trailer"]) {
    await page.goto(`${base}/search?q=${q}`).catch(() => {});
    await page.waitForTimeout(200);
    ok(`search '${q}' redirected by rule`, page.url().includes("blocked.html"));
  }
  ok("block page shows counters", (await page.textContent("#pages").catch(() => "")) !== "–");

  // 4. Safe page untouched
  await page.goto(base + "/safe");
  await page.waitForTimeout(800);
  ok("GTA V page not blocked", page.url().endsWith("/safe"));
  ok("GTA V text not hidden", (await hiddenIds()).length === 0);

  // 5. SPA navigation is instant (hooks.js), not the fallback timer
  await page.goto(base + "/spa");
  let t0 = Date.now();
  await page.click("#go");
  await page.waitForURL(/blocked\.html/, { timeout: 4000 }).catch(() => {});
  let dt = Date.now() - t0;
  ok("pushState to GTA 6 URL redirects fast", page.url().includes("blocked.html") && dt < 500, `${dt} ms`);

  // 6. YouTube-style: URL has no title, but the main heading does
  await page.goto(base + "/watch");
  t0 = Date.now();
  await page.click("#nav");
  await page.waitForURL(/blocked\.html/, { timeout: 4000 }).catch(() => {});
  dt = Date.now() - t0;
  ok("main <h1> mentioning GTA 6 blocks the page", page.url().includes("blocked.html"), `${dt} ms`);

  // 7. A later <h1> used as a card heading only hides the card
  await page.goto(base + "/multi-h1");
  await page.waitForTimeout(500);
  ok("non-first h1 doesn't block whole page", page.url().endsWith("/multi-h1"));
  h = await hiddenIds();
  ok("non-first h1 card hidden", h.includes("card-h1") || h.includes("SECTION"));

  // 7b. Reddit: hide GTA 6 posts, never the subreddit.
  await page.goto(base + "/r/GTA/");
  await page.waitForTimeout(800);
  ok("reddit: GTA 6 emoji in subreddit h1 doesn't block the page", page.url().endsWith("/r/GTA/"), page.url());
  h = await hiddenIds();
  console.log("reddit hidden:", h);
  ok("reddit: GTA 6 post hidden", h.includes("t3_1") || h.includes("a1"));
  ok("reddit: post with 'GTA VI' flair hidden", h.includes("t3_4") || h.includes("a4"));
  ok("reddit: other GTA posts visible", !["t3_2", "a2", "t3_3", "a3"].some((x) => h.includes(x)));
  ok("reddit: header, feed and sidebar visible", !["header", "sub-h1", "feed", "rail", "SHREDDIT-APP"].some((x) => h.includes(x)));
  ok("reddit: section with GTA 6 heading keeps its other posts", !["trending", "ta", "tb"].some((x) => h.includes(x)));
  ok("reddit: GTA 6 heading itself hidden", h.includes("trend-h2"));
  ok("reddit: feed visibly renders", await page.evaluate(() =>
    getComputedStyle(document.getElementById("feed")).display !== "none" && document.getElementById("a2").offsetHeight > 0));
  await page.goto(base + "/r/GTA/comments/abc/gta_6_map_leak/");
  await page.waitForURL(/blocked\.html/, { timeout: 4000 }).catch(() => {});
  ok("reddit: a GTA 6 post's own page is still blocked", page.url().includes("blocked.html"));

  // 8. Performance: 5000-item page
  await page.goto(base + "/big");
  await page.waitForTimeout(300);
  const perf = await page.evaluate(() => {
    const t = performance.now();
    const ul = document.querySelector("ul");
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 2000; i++) {
      const li = document.createElement("li");
      li.innerHTML = `<a href="/x/${i}" title="Clip ${i}"><img alt="t" src="data:,"></a><h3>${i % 200 === 0 ? "Grand Theft Auto VI clip" : "Normal clip " + i}</h3>`;
      frag.appendChild(li);
    }
    ul.appendChild(frag);
    return new Promise((r) => setTimeout(() => r({
      ms: Math.round(performance.now() - t),
      hidden: document.querySelectorAll("[data-gta6-blackout]").length,
    }), 0));
  });
  ok("big page: correct items hidden", perf.hidden === 10 + 10, `${perf.hidden} hidden`);
  ok("big page: 2000-node insert handled quickly", perf.ms < 300, `${perf.ms} ms incl. observer`);

  // 9. Strict mode
  const live = await ctx.newPage();
  await live.goto(base + "/tips");
  await live.waitForTimeout(400);
  const liveHidden = () => live.evaluate(() => [...document.querySelectorAll("[data-gta6-blackout]")].map((e) => e.id));
  ok("before strict: GTA V text visible", !(await liveHidden()).includes("x"));
  const popup = await ctx.newPage();
  await popup.goto(`chrome-extension://${extId}/popup.html`);
  await popup.click("#strict-on");
  await popup.waitForTimeout(300);
  ok("strict: open page hides GTA V text live", (await liveHidden()).includes("x"));
  ok("strict: open page keeps unrelated text", !(await liveHidden()).includes("y"));
  let rulesets = await sw.evaluate(() => chrome.declarativeNetRequest.getEnabledRulesets());
  ok("strict: ruleset enabled", rulesets.includes("strict_rules"), rulesets.join(","));
  await page.goto(base + "/feed");
  await page.waitForTimeout(800);
  h = await hiddenIds();
  ok("strict: GTA 5 item hidden", h.includes("b"));
  ok("strict: Vice City card hidden", h.includes("g"));
  ok("strict: unrelated still visible", !h.includes("d"));
  await page.goto(base + "/search?q=gta+5+mods").catch(() => {});
  await page.waitForTimeout(200);
  ok("strict: 'gta 5 mods' search blocked", page.url().includes("blocked.html"));
  await page.goto("https://www.rockstargames.com/newswire").catch(() => {});
  await page.waitForTimeout(300);
  ok("strict: rockstargames.com blocked", page.url().includes("blocked.html?src=strict"), page.url());
  ok("strict: block page explains strict", (await page.textContent("#lede")).includes("Strict mode"));

  await page.goto(base + "/safe");
  await page.waitForTimeout(300);
  ok("strict: page titled 'GTA V tips' blocked", page.url().includes("blocked.html"));

  await popup.click("#strict-off");
  await popup.waitForTimeout(300);
  let st = await sw.evaluate(() => chrome.storage.local.get(["strict", "strictOffAt"]));
  ok("strict off: still on during cooldown", st.strict === true && st.strictOffAt > Date.now() + 59 * 60000);
  ok("strict off: popup shows countdown", (await popup.textContent("#strict-text")).includes("Turning off in"));
  const alarm = await sw.evaluate(() => chrome.alarms.get("strict-off"));
  ok("strict off: alarm scheduled", !!alarm);

  await popup.click("#strict-cancel");
  await popup.waitForTimeout(300);
  st = await sw.evaluate(() => chrome.storage.local.get(["strict", "strictOffAt"]));
  ok("strict cancel: stays on, timer cleared", st.strict === true && !st.strictOffAt);

  // Simulate the hour passing.
  await popup.click("#strict-off");
  await popup.waitForTimeout(200);
  await sw.evaluate(async () => {
    await chrome.storage.local.set({ strictOffAt: Date.now() - 1000 });
    await reconcileStrict();
  });
  await page.waitForTimeout(1200);
  st = await sw.evaluate(() => chrome.storage.local.get(["strict"]));
  rulesets = await sw.evaluate(() => chrome.declarativeNetRequest.getEnabledRulesets());
  ok("strict expired: off and ruleset disabled", st.strict === false && !rulesets.includes("strict_rules"));
  ok("strict expired: open page un-hides GTA V text", !(await liveHidden()).includes("x"));

  // 10. Counters and popup
  const totals = await sw.evaluate(() => chrome.storage.local.get(null));
  ok("counters recorded", totals.hidden > 0 && totals.pages >= 5, `hidden=${totals.hidden} pages=${totals.pages}`);
  await popup.reload();
  await popup.waitForTimeout(300);
  ok("popup shows hidden count", (await popup.textContent("#hidden")) !== "0");

  for (const [s, n] of results) console.log(s, n);
  console.log(`${results.filter((r) => r[0] === "PASS").length}/${results.length} passed`);
  await ctx.close();
  server.close();
  fs.rmSync(userDir, { recursive: true, force: true });
  fs.rmSync(path.join(EXT, "_metadata"), { recursive: true, force: true });
  process.exit(results.some(([s]) => s === "FAIL") ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
