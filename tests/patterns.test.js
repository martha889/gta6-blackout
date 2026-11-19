// Run: node tests/patterns.test.js
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const root = path.join(__dirname, "..");
const ctx = { globalThis: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "extension", "patterns.js"), "utf8"), ctx);
const { matchesText, matchesUrl } = ctx.globalThis.GTA6_BLACKOUT;

// The URL rules use RE2 syntax with no lookarounds, so JS RegExp with the
// "i" flag (Chrome's default for regexFilter) behaves the same.
const loadRules = (file) =>
  JSON.parse(fs.readFileSync(path.join(root, "extension", file), "utf8"))
    .filter((r) => r.condition.regexFilter)
    .map((r) => new RegExp(r.condition.regexFilter, "i"));
const mainRules = loadRules("rules.json");
const strictRules = loadRules("strict_rules.json");
const ruleBlocks = (u) => mainRules.some((re) => re.test(u));
const strictRuleBlocks = (u) => ruleBlocks(u) || strictRules.some((re) => re.test(u));

// ---- always blocked -------------------------------------------------------
const textYes = [
  // Named directly
  "GTA 6", "gta6", "GTA VI", "Grand Theft Auto VI", "grand theft auto 6",
  "#GTA6", "#GTA6Trailer", "GTA-6 leaks", "The GTA 6 trailer is out", "GTA_VI",
  "Rockstar confirms GTA: VI price", "gta six", "Grand Theft Auto: VI", "GTA 6's map",
  "GTA 6 players are mad", "GTA 6 mapped out",
  // Other languages
  "ГТА 6 дата выхода", "гта 6", "侠盗猎车手6", "俠盜獵車手６", "グランド・セフト・オートVI", "GTA六",
  // Indirect references
  "Lucia Caminos revealed", "Jason Duval", "Jason and Lucia", "Jason & Lucia trailer",
  "Welcome to Leonida", "Port Gellhorn map", "Rockstar's next game", "Rockstar Games' new open-world",
  "the new Rockstar game", "the next GTA", "When is the next GTA coming out?", "new GTA game",
  "GTA trailer 3 dropped", "GTA release date", "GTA preorders open", "GTA leaks",
  "returning to Vice City", "Vice City 2026 is huge", "Rockstar trailer 3 tomorrow",
  "Rockstar Games pre-orders",
];
const textNo = [
  "GTA 5", "GTA V", "GTA Vice City", "gta video", "GTA 60fps mod", "GTA IV",
  "Grand Theft Auto V", "magta6", "GTA Online", "vigta", "I paid $6 for gta",
  // Durations after a bare 6
  "I quit GTA 6 months ago", "played gta 6 years straight", "GTA 6 times in a row",
  "gta 6 hours a day", "GTA 6% off",
  // Near misses for the indirect references
  "new GTA Online update", "new GTA 5 mods", "next GTA V patch", "new GTA RP server",
  "Jason", "Lucia", "Rockstar energy drink", "I'm a rockstar", "Vice City soundtrack",
  "Red Dead Redemption 2", "Leonidas", "GTA V trailer",
];
// ---- only blocked in Strict mode -------------------------------------------
const strictOnlyText = [
  "GTA 5", "GTA V", "GTA Online", "GTAV", "Grand Theft Auto V", "GTA Vice City",
  "Rockstar Games", "Los Santos", "San Andreas", "Shark Cards on sale", "Take-Two earnings",
  "Strauss Zelnick", "Rockstar Social Club", "Liberty City",
];
const strictStillNo = ["Rockstar energy drink", "I'm a rockstar", "take two minutes", "agtav"];

const urlYes = [
  "https://www.google.com/search?q=gta+6&oq=gta+6",
  "https://www.google.com/search?q=gta%206%20price",
  "https://www.youtube.com/results?search_query=grand+theft+auto+vi",
  "https://www.reddit.com/r/GTA6/",
  "https://www.rockstargames.com/VI",
  "https://www.rockstargames.com/en-US/VI/",
  "https://store.playstation.com/en-us/concept/grand-theft-auto-vi",
  "https://www.ign.com/articles/gta-6-release-date",
  "https://www.bing.com/search?q=%23gta6",
  "https://duckduckgo.com/?q=gta+vi+preorder",
  "https://www.google.com/search?q=lucia+caminos",
  "https://www.google.com/search?q=jason+and+lucia",
  "https://www.youtube.com/results?search_query=leonida+map",
  "https://www.google.com/search?q=rockstar+next+game",
  "https://www.google.com/search?q=rockstar%27s+new+game",
  "https://www.google.com/search?q=next+gta",
  "https://www.google.com/search?q=new+gta+trailer",
  "https://www.google.com/search?q=gta+trailer",
  "https://www.google.com/search?q=gta+release+date",
  "https://www.google.com/search?q=gta+preorder",
];
const urlNo = [
  "https://www.google.com/search?q=gta+5+mods",
  "https://www.rockstargames.com/gta-v",
  "https://www.rockstargames.com/videos",
  "https://www.reddit.com/r/GTAV/",
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "https://en.wikipedia.org/wiki/Grand_Theft_Auto_V",
  "https://www.google.com/search?q=gta+vice+city",
  "https://www.google.com/search?q=new+gta+online+update",
  "https://www.google.com/search?q=leonidas+300",
  "https://www.google.com/search?q=rockstar+energy",
];
const strictOnlyUrl = [
  "https://www.google.com/search?q=gta+5+mods",
  "https://www.reddit.com/r/GTAV/",
  "https://en.wikipedia.org/wiki/Grand_Theft_Auto_V",
  "https://www.google.com/search?q=gta+vice+city",
  "https://www.google.com/search?q=gta+online",
];

let failures = 0;
let total = 0;
function check(label, fn, input, expected) {
  total++;
  try {
    assert.strictEqual(fn(input), expected);
  } catch {
    failures++;
    console.error(`FAIL ${label}: ${JSON.stringify(input)} expected ${expected}`);
  }
}

const strictText = (s) => matchesText(s, true);
const strictUrl = (u) => matchesUrl(u, true);

for (const s of textYes) { check("text", matchesText, s, true); check("strictText", strictText, s, true); }
for (const s of textNo) check("text", matchesText, s, false);
for (const s of strictOnlyText) { check("text", matchesText, s, false); check("strictText", strictText, s, true); }
for (const s of strictStillNo) check("strictText", strictText, s, false);

for (const u of urlYes) {
  check("contentUrl", matchesUrl, u, true);
  check("dnrRule", ruleBlocks, u, true);
}
for (const u of urlNo) {
  check("contentUrl", matchesUrl, u, false);
  check("dnrRule", ruleBlocks, u, false);
}
for (const u of strictOnlyUrl) {
  check("strictContentUrl", strictUrl, u, true);
  check("strictDnrRule", strictRuleBlocks, u, true);
}
check("strictContentUrl", strictUrl, "https://www.rockstargames.com/newswire", true);
check("contentUrl", matchesUrl, "https://www.rockstargames.com/newswire", false);

if (failures) {
  console.error(`\n${failures}/${total} checks failed`);
  process.exit(1);
}
console.log(`All ${total} checks passed`);
