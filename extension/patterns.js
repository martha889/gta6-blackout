// Shared GTA 6 matchers. Loaded before content.js and by the tests.
(() => {
  const R = String.raw;

  // Separators people put between words: "GTA 6", "GTA-VI", "#GTA_6", "gta+6".
  const SEP = R`[\s\-_.:#/+]*`;
  // The name, including Russian, Chinese (simplified and traditional) and Japanese.
  const NAME = R`(?:gta|grand${SEP}theft${SEP}auto|гта|侠盗猎车手|俠盜獵車手|グランド・?セフト・?オート)`;
  // Durations and counts after a bare "6" ("I quit GTA 6 months ago").
  const NOT_TIME = R`(?!\s*(?:months?|mos?|years?|yrs?|weeks?|wks?|days?|hours?|hrs?|minutes?|mins?|seconds?|secs?|times?|%)(?![a-z]))`;
  // "6" can't be followed by another digit (GTA 60fps) but may be followed by
  // letters (#GTA6Trailer). "VI"/"six" must be whole words (GTA: Vice City,
  // "gta video").
  const NUM = R`(?:6(?!\d)${NOT_TIME}|[６六]|(?:vi|six)(?![a-z0-9]))`;
  const CORE = new RegExp(R`(?<![a-z0-9])${NAME}${SEP}${NUM}`, "i");

  // References that point at GTA 6 without naming it.
  const W = R`[\s\-_]+`; // word gap
  const CONTEXT = new RegExp(
    [
      // Characters and places.
      R`lucia${W}caminos`, R`jason${W}duval`, R`jason\s*(?:&|and)\s*lucia`, R`lucia\s*(?:&|and)\s*jason`,
      R`(?<![a-z])leonida(?![a-z])`, R`port${W}gellhorn`,
      // "Rockstar's next game", "the new Rockstar game".
      R`rockstar(?:${W}games)?(?:'s|’s|'|’|s)?${W}(?:new|next|upcoming|latest|unannounced)${W}(?:game|title|open[\s\-]world|gta)`,
      R`(?:new|next|upcoming|latest)${W}rockstar${W}(?:game|title)`,
      // "the next GTA" (but not "the new GTA Online update" or "new GTA 5 mods").
      R`(?:new|next|upcoming)${W}gta(?![a-z0-9])(?!${W}(?:online|v|5|iv|4|san|vice|trilogy|mods?|rp|roleplay|\+)(?![a-z0-9]))`,
      // GTA hype words: only GTA 6 has a trailer, preorders or a release date to talk about.
      R`(?<![a-z0-9])gta${W}(?:trailer|pre-?orders?|release${W}date|countdown|launch${W}day|leaks?)(?![a-z])`,
      // Vice City in a GTA 6 context.
      R`(?:return(?:s|ing)?|back|heading)${W}to${W}vice${W}city`,
      R`vice${W}city.{0,40}(?:2025|2026|2027|lucia|jason|leonida|pre-?order|next[\s\-]gen)`,
      // Rockstar hype within a few words of each other.
      R`rockstar(?:${W}games)?.{0,40}(?:trailer\s*[23]|pre-?orders?|release${W}date|launch${W}date|countdown)`,
    ].join("|"),
    "i"
  );

  // Strict mode: the whole series, Rockstar Games and the publisher.
  const STRICT = new RegExp(
    [
      R`(?<![a-z0-9])gta(?:[ivx]+|\d+|online|o)?(?![a-z0-9])`,
      R`grand${SEP}theft${SEP}auto`,
      R`rockstar${W}?games`, R`rockstar${W}(?:north|launcher|social${W}club)`, R`social${W}club`,
      R`vice${W}city`, R`los${W}santos`, R`san${W}andreas`, R`liberty${W}city`, R`shark${W}cards?`,
      R`take-two(?:${W}(?:interactive|ceo|earnings|stock|shares))?`, R`strauss${W}zelnick`,
    ].join("|"),
    "i"
  );

  const URL_EXTRA = [/rockstargames\.com\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?vi(?![a-z0-9])/i];

  function matchesText(s, strict = false) {
    if (!s) return false;
    return CORE.test(s) || CONTEXT.test(s) || (strict && STRICT.test(s));
  }

  function matchesUrl(u, strict = false) {
    if (!u) return false;
    let d = u;
    try { d = decodeURIComponent(u); } catch (_) {}
    d = d.replace(/\+/g, " ");
    if (URL_EXTRA.some((r) => r.test(d))) return true;
    if (strict && /(?:^|[./])(?:rockstargames\.com|gtaforums\.com|gtabase\.com|gta\.fandom\.com)(?:[/:?#]|$)/i.test(d)) return true;
    return matchesText(d, strict);
  }

  globalThis.GTA6_BLACKOUT = { CORE, CONTEXT, STRICT, matchesText, matchesUrl };
})();
