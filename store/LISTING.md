# Chrome Web Store submission

Everything to paste into the developer dashboard, field by field.
Upload: `dist/gta6-blackout-<version>.zip` (build with `npm run package`).

---

## Store listing tab

**Name** (from the manifest)
GTA 6 Blackout

**Summary** (from the manifest, 132 characters max)
Hides GTA 6 videos, posts, searches and news across the web, so the hype doesn't talk you into buying it.

**Category**
Lifestyle → Well-being. If that isn't offered, use Productivity → Tools.

**Language**
English

**Description**

```
Trying not to spend $70 (and the console, and the special edition, and the Shark Cards) on GTA 6? The hardest part is that it's everywhere: trailers in your YouTube feed, posts on Reddit, headlines in Google News, "you won't believe the map" on every site you visit.

GTA 6 Blackout removes it, so the hype can't wear you down.

WHAT IT DOES
• Blocks GTA 6 searches and pages before they load. Search for "gta 6" on Google, YouTube, Bing or DuckDuckGo, or open an article, store page or subreddit about it, and you get a calm block screen instead.
• Hides GTA 6 items inside every other page. YouTube videos and Shorts, Reddit posts and comments, tweets and trends, search results, TikToks, shop listings, or any card or paragraph that mentions it disappear as the page loads, including ones that appear as you scroll.
• Catches indirect references, not just the name: "Rockstar's next game", "the next GTA", Jason and Lucia, Leonida, "GTA trailer", "GTA release date", and the name in other languages.
• Leaves everything else alone. GTA V, GTA Online, old Vice City and "I quit GTA 6 months ago" aren't touched.

BUILT TO RESIST THE IMPULSE
• No off switch in the popup. To turn it off you have to go into Chrome's extension settings yourself.
• Strict mode also blocks the whole GTA series, GTA Online and Rockstar Games. It turns on instantly but takes an hour to turn off, so an impulse has time to pass.
• The block screen keeps count of pages blocked, items hidden and days strong.

PRIVATE BY DESIGN
Everything happens inside your browser. No account, no analytics, no tracking, and nothing you browse is ever sent anywhere. The extension makes no network requests of its own.

TIP: To cover private windows too, open the extension's Details in chrome://extensions and turn on "Allow in Incognito".

GTA 6 Blackout is an independent project. It is not affiliated with, endorsed by or sponsored by Rockstar Games or Take-Two Interactive. Grand Theft Auto and GTA are trademarks of Take-Two Interactive Software, Inc., used here only to describe the content the extension blocks.
```

**Graphic assets** (all in `store/`, regenerate with `npm run store-assets`)

| Field | File | Size |
|---|---|---|
| Store icon | `extension/icons/icon128.png` | 128×128 |
| Screenshot 1 | `store/screenshot-1-feed.png` | 1280×800 |
| Screenshot 2 | `store/screenshot-2-blocked.png` | 1280×800 |
| Screenshot 3 | `store/screenshot-3-popup.png` | 1280×800 |
| Small promo tile | `store/promo-small.png` | 440×280 |

**Homepage URL**: https://martha889.github.io/gta6-blackout/
**Support URL**: https://github.com/martha889/gta6-blackout/issues

---

## Privacy practices tab

**Single purpose description**

```
GTA 6 Blackout has one purpose: helping the user avoid Grand Theft Auto VI content online, so they aren't tempted to buy the game. It hides web page elements that mention GTA 6 and redirects GTA 6 pages and searches to a local block screen.
```

**Permission justifications**

declarativeNetRequest:
```
Used to redirect top-level and frame navigations whose URL is about GTA 6 (for example a "gta 6" search, r/GTA6 or rockstargames.com/VI) to the extension's own block page before the page loads. The rules are static and bundled with the extension. An optional second ruleset is enabled only when the user turns on Strict mode.
```

storage:
```
Stores, locally on the device only: the number of items hidden and pages blocked, the install date (for the "days strong" counter), and the Strict mode setting and its scheduled turn-off time. Per-tab badge counts are kept in session storage. Nothing is synced or transmitted.
```

alarms:
```
Strict mode takes one hour to turn off, a deliberate delay against impulse purchases. An alarm turns Strict mode off when that hour is up, even if the popup is closed or the browser restarted.
```

Host permission (<all_urls>):
```
The extension's single purpose is hiding GTA 6 content wherever the user browses. GTA 6 content appears on any site (news, forums, video, social, shops), so the content script must run on all pages to find and hide elements that mention it, and to send pages about GTA 6 to the block screen. Host access is also required for declarativeNetRequest redirect rules. Page content is only read locally to match it against GTA 6 patterns. It is never stored or transmitted.
```

**Remote code**
No, I am not using remote code. (All JavaScript is in the package. Nothing is fetched or evaluated at runtime.)

**Data usage.** Check none of the data types:
- Personally identifiable information: no
- Health information: no
- Financial and payment information: no
- Authentication information: no
- Personal communications: no
- Location: no
- Web history: no
- User activity: no
- Website content: no. It's read locally to decide what to hide, but never collected or transmitted, which is what this form asks about.

Then tick all three certifications:
- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL**
https://martha889.github.io/gta6-blackout/privacy-policy.html
(Served by GitHub Pages from `docs/privacy-policy.html` on the `main` branch.)

---

## Distribution tab

- **Visibility**: Public. Or Unlisted, if you only want people with the link to find it.
- **Regions**: All regions
- **Pricing**: Free
