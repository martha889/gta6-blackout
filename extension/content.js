// Hides GTA 6 content on every page, and sends whole pages about GTA 6 to the
// block screen. Runs at document_start; mutations are handled synchronously in
// the observer callback, which runs before the browser paints them.
(() => {
  if (!globalThis.GTA6_BLACKOUT) return;
  const { matchesText, matchesUrl } = globalThis.GTA6_BLACKOUT;

  const ATTR = "data-gta6-blackout";
  const SHADOW_ATTR = "data-gta6-shadow"; // set by hooks.js on open shadow hosts
  const HIDDEN_SEL = `[${ATTR}]`;
  const IS_TOP = window.top === window;
  const BLOCK_PAGE = chrome.runtime.getURL("blocked.html");

  let strict = false;
  const m = (s) => matchesText(s, strict);
  const mu = (u) => matchesUrl(u, strict);

  // Site-specific "card" containers: hide the whole item, not just its title.
  const SITE_CONTAINERS = [
    // YouTube
    "ytd-rich-item-renderer", "ytd-video-renderer", "ytd-compact-video-renderer",
    "ytd-grid-video-renderer", "ytd-reel-item-renderer", "ytd-playlist-renderer",
    "ytd-radio-renderer", "ytd-channel-renderer", "ytd-comment-thread-renderer",
    "ytd-post-renderer", "ytd-backstage-post-thread-renderer", "ytd-notification-renderer",
    "yt-lockup-view-model", "ytm-shorts-lockup-view-model", "ytm-shorts-lockup-view-model-v2",
    "ytd-movie-renderer", "ytd-universal-watch-card-renderer", "ytd-ad-slot-renderer",
    "ytd-in-feed-ad-layout-renderer",
    // Reddit
    "shreddit-post", "shreddit-comment", "shreddit-ad-post", "faceplate-tracker[noun='post']",
    "search-telemetry-tracker", ".thing",
    // X / Twitter
    "[data-testid='cellInnerDiv']", "[data-testid='trend']",
    // Google
    ".MjjYud", "div.g", "g-inner-card", "div[data-news-cluster-id]", ".commercial-unit-desktop-top",
    // Bing / DuckDuckGo
    "li.b_algo", ".news-card", "article[data-testid='result']", "li[data-layout='organic']",
    // TikTok
    "[data-e2e='recommend-list-item-container']", "[data-e2e='search_top-item']",
    "[data-e2e='search-card-item']",
    // Twitch / Instagram / Facebook
    "[data-a-target='preview-card']", "[role='article']",
    // Shops
    "[data-component-type='s-search-result']", ".search_result_row", ".tab_item",
  ].join(",");

  const GENERIC_CONTAINERS =
    "article,li,[role='listitem'],[role='option'],tr,figure,dd,blockquote";
  // A match inside one of these means the page itself is about GTA 6.
  const PAGE_TITLE_SEL = "h1, ytd-watch-metadata #title, #above-the-fold #title, [itemprop='headline']";
  const NEVER_HIDE = new Set(["HTML", "HEAD", "BODY", "MAIN"]);
  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "TEXTAREA", "INPUT", "TITLE", "SVG"]);
  const ATTR_NAMES = ["alt", "title", "aria-label"];
  // Cheap native prefilter: only attributes containing one of these words get
  // the full regex check. Covers every pattern family in patterns.js.
  const ATTR_KEYWORDS = [
    "gta", "theft", "rockstar", "leonida", "lucia", "jason", "gellhorn", "vice",
    "santos", "andreas", "liberty", "shark", "take-two", "zelnick", "social",
    "гта", "侠盗", "俠盜", "グランド",
  ];
  const ATTR_SEL = [
    ...ATTR_NAMES.map((a) => ATTR_KEYWORDS.map((k) => `[${a}*='${k}' i]`)).flat(),
    // Hrefs hold non-Latin words percent-encoded.
    ...ATTR_KEYWORDS.map((k) => `a[href*='${encodeURIComponent(k)}' i]`),
  ].join(",");
  const OBSERVE_OPTS = {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["alt", "title", "aria-label", "href", "content", SHADOW_ATTR],
  };

  // hidden element -> { node, kind }: what caused it to be hidden.
  const hidden = new Map();
  const prevDisplay = new WeakMap();
  const observedRoots = new WeakSet();
  let redirected = false;

  // ---- counting --------------------------------------------------------
  let pending = 0;
  let flushTimer = null;
  function bump() {
    pending++;
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      const count = pending;
      pending = 0;
      try {
        chrome.runtime.sendMessage({ type: "hidden", count }).catch(() => {});
      } catch (_) {
        // Extension was reloaded; this content script is orphaned.
      }
    }, 800);
  }

  // ---- composed-tree helpers (cross shadow-root boundaries) -------------
  function parentOf(el) {
    if (el.parentElement) return el.parentElement;
    const p = el.parentNode;
    return p && p.nodeType === Node.DOCUMENT_FRAGMENT_NODE && p.host ? p.host : null;
  }

  function closestComposed(el, sel) {
    for (let e = el; e; e = parentOf(e)) if (e.matches(sel)) return e;
    return null;
  }

  function containsComposed(ancestor, node) {
    for (let e = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement; e; e = parentOf(e)) {
      if (e === ancestor) return true;
    }
    return false;
  }

  // ---- whole-page block ------------------------------------------------
  function blockPage() {
    if (redirected) return;
    redirected = true;
    document.documentElement.setAttribute(ATTR, "");
    // Stop any GTA 6 trailer that already started.
    for (const v of document.querySelectorAll("video,audio")) { try { v.pause(); } catch (_) {} }
    // In a frame (an embed or an ad), blanking it is enough.
    if (IS_TOP) location.replace(BLOCK_PAGE + "?src=page");
  }

  function checkPage() {
    if (redirected) return;
    if (mu(location.href) || m(document.title)) return blockPage();
    for (const meta of document.querySelectorAll(
      "meta[property='og:title'],meta[name='twitter:title'],meta[property='og:url'],link[rel='canonical']"
    )) {
      const v = meta.content || meta.href;
      if (m(v) || mu(v)) return blockPage();
    }
  }

  // Is this text hit the page's own title? Only the heading's text counts, not
  // icons, flair or buttons inside it: r/GTA's <h1> is "r/GTA" plus a status
  // emoji labelled "GTA_6_Logo", and that must not block the whole subreddit.
  function isPageTitle(el, kind) {
    if (kind !== "text" || !IS_TOP || !el.isConnected) return false;
    const t = el.closest(PAGE_TITLE_SEL);
    if (!t) return false;
    // Only the first <h1>: some sites (wrongly) use h1 for every card in a feed.
    if (t.tagName === "H1" && document.querySelector("h1") !== t) return false;
    let text = "";
    const walker = document.createTreeWalker(t, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => {
        const extra = n.parentElement.closest("button,[role='button'],[aria-hidden='true'],[hidden]");
        return extra && extra !== t && t.contains(extra) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      },
    });
    while (walker.nextNode()) text += walker.currentNode.nodeValue;
    return m(text);
  }

  // ---- element hiding --------------------------------------------------
  // Text length including open shadow roots (light-DOM textContent skips them).
  function textLen(el) {
    let n = (el.textContent || "").length;
    if (el.shadowRoot) n += el.shadowRoot.textContent.length;
    for (const host of el.querySelectorAll(`[${SHADOW_ATTR}]`)) {
      if (host.shadowRoot) n += host.shadowRoot.textContent.length;
    }
    return n;
  }

  const INLINE = new Set(["SPAN", "A", "B", "I", "EM", "STRONG", "SMALL", "MARK", "U", "LABEL", "FONT", "IMG"]);

  // True when el sits among same-shaped siblings, like one card in a grid.
  function isRepeatedItem(el) {
    if (INLINE.has(el.tagName)) return false;
    const parent = el.parentNode;
    if (!parent) return false;
    for (const s of parent.children) {
      if (s !== el && s.tagName === el.tagName && s.className === el.className) return true;
    }
    return false;
  }

  // Top-level feed items. Anything holding two or more of these is a feed,
  // sidebar or page section, never a single item, so it's never hidden.
  const ITEM_SEL = [
    "article", "[role='article']", "shreddit-post", "ytd-rich-item-renderer", "ytd-video-renderer",
    "ytd-compact-video-renderer", "ytd-grid-video-renderer", "ytd-reel-item-renderer",
    "[data-testid='cellInnerDiv']", ".MjjYud", "li.b_algo", "[data-e2e='recommend-list-item-container']",
    "[data-component-type='s-search-result']",
  ].join(",");

  function isList(c) {
    let n = 0;
    for (const x of c.querySelectorAll(ITEM_SEL)) {
      // Nested items of the same kind (replies under a comment) don't count.
      if (x.tagName !== c.tagName && ++n >= 2) return true;
    }
    return false;
  }

  const hideable = (c) => c && !NEVER_HIDE.has(c.tagName) && !isList(c);

  function containerFor(el) {
    if (!el) return null;
    let c = closestComposed(el, SITE_CONTAINERS);
    if (hideable(c)) return c;
    c = closestComposed(el, GENERIC_CONTAINERS);
    if (hideable(c) && textLen(c) < 4000) return c;
    // No known container: climb to the biggest ancestor that's still "card
    // sized", so a headline takes its blurb and thumbnail with it. Stop at a
    // repeated item or a web component (custom tags are natural card
    // boundaries) so neighbouring cards aren't taken along, including ones
    // the page hasn't inserted yet.
    let best = el;
    for (let p = parentOf(el); p && !NEVER_HIDE.has(p.tagName); p = parentOf(p)) {
      if (isRepeatedItem(best) || best.tagName.includes("-") || textLen(p) > 400 || isList(p)) break;
      best = p;
    }
    return NEVER_HIDE.has(best.tagName) || isList(best) ? null : best;
  }

  function hide(el, node, kind) {
    if (!el || closestComposed(el, HIDDEN_SEL)) return;
    prevDisplay.set(el, [el.style.getPropertyValue("display"), el.style.getPropertyPriority("display")]);
    el.setAttribute(ATTR, "");
    // Inline style too: content.css can't reach inside shadow roots.
    el.style.setProperty("display", "none", "important");
    hidden.set(el, { node, kind });
    bump();
  }

  function unhide(el) {
    el.removeAttribute(ATTR);
    const [value, priority] = prevDisplay.get(el) || ["", ""];
    if (value) el.style.setProperty("display", value, priority);
    else el.style.removeProperty("display");
    hidden.delete(el);
  }

  function hit(el, kind) {
    if (isPageTitle(el, kind)) return blockPage();
    hide(containerFor(el), el, kind);
  }

  function attrMatches(el) {
    for (const a of ATTR_NAMES) {
      const v = el.getAttribute(a);
      if (v && m(v)) return true;
    }
    if (el.tagName === "A") {
      const h = el.getAttribute("href");
      if (h && mu(h)) return true;
    }
    return false;
  }

  function isEditable(el) {
    return el.isContentEditable || !!el.closest("[contenteditable=''],[contenteditable='true']");
  }

  // Text of el, ignoring <script>/<style>/etc. children and children we've
  // already hidden (otherwise a hidden item would get its parent list hidden too).
  function ownText(el) {
    let s = "";
    for (const n of el.childNodes) {
      if (n.nodeType === Node.TEXT_NODE) s += n.nodeValue;
      else if (
        n.nodeType === Node.ELEMENT_NODE &&
        !SKIP_TAGS.has(n.tagName.toUpperCase()) &&
        !n.hasAttribute(ATTR)
      ) s += n.textContent;
    }
    return s;
  }

  // Collect the deepest elements whose visible text matches. Handles matches
  // split across tags, like "GTA <b>6</b>".
  function findTextHits(el, out) {
    let childHit = false;
    for (const c of el.children) {
      if (SKIP_TAGS.has(c.tagName.toUpperCase()) || c.hasAttribute(ATTR)) continue;
      if (m(c.textContent)) {
        childHit = true;
        findTextHits(c, out);
      }
    }
    if (!childHit && el.nodeType === Node.ELEMENT_NODE && m(ownText(el))) out.push(el);
  }

  function watchShadow(host) {
    const root = host.shadowRoot;
    if (!root || observedRoots.has(root)) return;
    observedRoots.add(root);
    observer.observe(root, OBSERVE_OPTS);
    scan(root);
  }

  function scan(node) {
    if (!node || redirected) return;

    if (node.nodeType === Node.TEXT_NODE) {
      const p = node.parentElement;
      if (!p) return;
      if (p.tagName === "TITLE") return checkPage();
      if (!SKIP_TAGS.has(p.tagName.toUpperCase()) && m(node.nodeValue) && !isEditable(p)) hit(p, "text");
      return;
    }

    const isRoot = node.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
    if (!isRoot && node.nodeType !== Node.ELEMENT_NODE) return;

    if (!isRoot) {
      const tag = node.tagName.toUpperCase();
      if (tag === "TITLE" || tag === "META" || tag === "LINK") return checkPage();
      if (SKIP_TAGS.has(tag) || closestComposed(node, HIDDEN_SEL)) return;
      if (node.hasAttribute(SHADOW_ATTR)) watchShadow(node);
    }
    for (const host of node.querySelectorAll(`[${SHADOW_ATTR}]`)) watchShadow(host);

    if (m(node.textContent)) {
      const hits = [];
      findTextHits(node, hits);
      for (const h of hits) if (!isEditable(h)) hit(h, "text");
    }

    if (!isRoot && node.matches(ATTR_SEL) && attrMatches(node)) hit(node, "attr");
    for (const el of node.querySelectorAll(ATTR_SEL)) {
      if (attrMatches(el)) hit(el, "attr");
    }
  }

  // Sites like YouTube recycle elements for different videos. If whatever
  // caused an element to be hidden no longer matches, show it again and
  // rescan it in case it now matches for another reason.
  function recheckHidden() {
    for (const [el, why] of [...hidden]) {
      if (!el.isConnected) { hidden.delete(el); continue; }
      const still =
        why.node.isConnected &&
        containsComposed(el, why.node) &&
        (why.kind === "attr" ? attrMatches(why.node) : m(ownText(why.node)));
      if (!still) {
        unhide(el);
        scan(el);
      }
    }
  }

  function fullScan() {
    checkPage();
    scan(document.documentElement);
  }

  // ---- wiring ----------------------------------------------------------
  const observer = new MutationObserver((mutations) => {
    if (redirected) return;
    for (const mu_ of mutations) {
      const t = mu_.target;
      if (mu_.type === "characterData") {
        scan(t);
      } else if (mu_.type === "attributes") {
        if (mu_.attributeName === SHADOW_ATTR) watchShadow(t);
        else if (t.tagName === "META" || t.tagName === "LINK") checkPage();
        else if (attrMatches(t)) hit(t, "attr");
      } else if (t.nodeName === "TITLE") {
        checkPage();
      } else {
        for (const n of mu_.addedNodes) scan(n);
      }
    }
  });

  checkPage();
  observer.observe(document.documentElement, OBSERVE_OPTS);

  document.addEventListener("DOMContentLoaded", fullScan, { once: true });
  window.addEventListener("load", fullScan, { once: true });

  // Single-page-app navigation: hooks.js reports pushState/replaceState
  // instantly; the timer is a fallback in case the page replaced history.
  let lastHref = location.href;
  const onNavigate = () => { lastHref = location.href; checkPage(); };
  document.addEventListener("gta6-blackout:navigate", onNavigate);
  window.addEventListener("popstate", onNavigate);
  window.addEventListener("hashchange", onNavigate);
  setInterval(() => {
    if (redirected) return;
    if (location.href !== lastHref) onNavigate();
    recheckHidden();
  }, 750);

  // Strict mode: also block the whole GTA series and Rockstar Games.
  const applyStrict = (value) => {
    const was = strict;
    strict = !!value;
    if (strict && !was) fullScan();
    else if (!strict && was) recheckHidden();
  };
  chrome.storage.local.get({ strict: false }).then((s) => applyStrict(s.strict)).catch(() => {});
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.strict) applyStrict(changes.strict.newValue);
  });
})();
