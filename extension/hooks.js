// Runs in the page's own JavaScript world (manifest "world": "MAIN") at
// document_start. The isolated content script can't see these two things
// happen, so this announces them:
//   - pushState/replaceState navigations in single-page apps (YouTube, Reddit,
//     X), as a "gta6-blackout:navigate" event on document
//   - newly attached open shadow roots (web components), by marking the host
//     with a data-gta6-shadow attribute
(() => {
  if (window.__gta6BlackoutHooks) return;
  Object.defineProperty(window, "__gta6BlackoutHooks", { value: true });

  const announceNav = () => document.dispatchEvent(new Event("gta6-blackout:navigate"));
  for (const name of ["pushState", "replaceState"]) {
    const original = history[name];
    if (typeof original !== "function") continue;
    history[name] = function (...args) {
      const result = original.apply(this, args);
      try { announceNav(); } catch (_) {}
      return result;
    };
  }

  const originalAttach = Element.prototype.attachShadow;
  if (typeof originalAttach === "function") {
    Element.prototype.attachShadow = function (init) {
      const root = originalAttach.call(this, init);
      if (init && init.mode === "open") {
        // Mark the host so the content script can find it, even if it isn't in
        // the document yet. Deferred: custom element constructors may not add
        // attributes.
        const host = this;
        queueMicrotask(() => {
          try { host.setAttribute("data-gta6-shadow", ""); } catch (_) {}
        });
      }
      return root;
    };
  }
})();
