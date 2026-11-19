# GTA 6 Blackout

A Chrome extension that hides GTA 6 content across the web so the hype doesn't talk you into buying it.

## What it blocks

**Before a page loads.** URL rules send GTA 6 searches, r/GTA6, `rockstargames.com/VI`, store pages and articles to a block screen. The searches covered are on Google, YouTube, Bing and DuckDuckGo. Searches that only point at the game also count, like "rockstar next game", "lucia caminos" or "gta trailer".

**Whole pages about GTA 6.** If the tab title, `og:title`, canonical URL or main heading mentions it, you get the block screen. Any video already playing is paused. On single-page apps like YouTube, Reddit and X, it reacts as soon as the page changes, in about 60–100 ms in tests.

**GTA 6 items inside other pages.** These are hidden as they appear:
- YouTube thumbnails, Shorts and ads
- Reddit posts and comments
- Tweets and trends
- Google, Bing and DDG results
- TikToks and shop listings
- Any card, list item or paragraph that mentions it

This includes content inside web components (shadow DOM). Image alt text, tooltips and links to GTA 6 pages count too.

### What counts as GTA 6

| Kind | Examples |
|---|---|
| The name | GTA 6, GTA VI, GTA6, #GTA6Trailer, Grand Theft Auto VI |
| Other languages | ГТА 6, 侠盗猎车手6, 俠盜獵車手６, グランド・セフト・オートVI |
| Indirect references | Jason and Lucia, Lucia Caminos, Jason Duval, Leonida, Port Gellhorn, "Rockstar's next game", "the next GTA", "GTA trailer", "GTA release date", "returning to Vice City" |

Not blocked: GTA V, GTA IV, GTA Online, Vice City (the old game), "new GTA Online update", "GTA 5 mods", "I quit GTA 6 months ago", Rockstar energy drinks.

## Strict mode

Strict mode is in the toolbar popup. It also blocks:
- The whole GTA series and GTA Online
- Rockstar Games, Take-Two and the Social Club
- Los Santos, Vice City and similar place names
- gtaforums.com, gtabase.com and the GTA wiki

**Turning it on is instant. Turning it off takes an hour**, so an impulse has time to pass. You can cancel the countdown at any time.

There's no off switch for the extension itself. To turn it off, you have to go to `chrome://extensions` and do it yourself.

## Install

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick the **`extension`** folder.
4. Optional: open the extension's **Details** and turn on **Allow in Incognito**, so private windows are covered too.

## Files

```
extension/            the extension itself (load this folder)
  manifest.json       Manifest V3 config
  rules.json          URL rules: redirect GTA 6 URLs before they load
  strict_rules.json   extra URL rules, enabled by Strict mode
  patterns.js         text and URL matchers shared by everything
  hooks.js            runs in the page: reports SPA navigation and shadow roots
  content.js/.css     hides matching items, blocks matching pages
  background.js       counters, badge, Strict mode and its cooldown
  blocked.*           the block screen
  popup.*             toolbar popup
tests/
  patterns.test.js    matcher and URL-rule unit tests (no dependencies)
  e2e.test.js         loads the extension in Chromium and tests it on real pages
tools/make_icons.py   regenerates extension/icons (standard-library Python)
```

## Test

```sh
npm test               # matcher and URL-rule tests
npm install            # once, for the browser test
npm run test:e2e       # needs Playwright's Chromium: npx playwright install chromium
```

Branded Google Chrome no longer accepts `--load-extension`, so the browser test uses Playwright's Chromium. You can also set `CHROME_PATH`.

## Publish to the Chrome Web Store

```sh
npm run package        # tests, then builds dist/gta6-blackout-<version>.zip
npm run store-assets   # regenerates the screenshots and promo tile in store/
```

`store/LISTING.md` has every dashboard field ready to paste: description, category, permission justifications and privacy answers. GitHub Pages serves `docs/` (the project page and privacy policy) at https://martha889.github.io/gta6-blackout/. For an update, bump `version` in both `extension/manifest.json` and `package.json`, rebuild, and upload the new zip.

## Limits

- Images with no text (key art in an ad, a meme with no caption) can't be detected.
- Content inside *closed* shadow roots isn't reachable, and no extension can run on `chrome://` pages or the Chrome Web Store.
- Chrome's own address-bar suggestions can't be filtered by an extension.
