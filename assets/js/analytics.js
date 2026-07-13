/**
 * Privacy-friendly, cookieless analytics.
 *
 * Thin wrapper around a Plausible-style event queue (`window.plausible`). The
 * provider is chosen for privacy: no cookies, no localStorage, no cross-site or
 * device identifiers, and no personally identifiable information — only
 * aggregate event counts. See docs/bdd/privacy-and-analytics.md for the full
 * rationale and the events we send.
 *
 * Design rules this module upholds:
 *  - It is DOM-free and takes its `window` by dependency injection, so it can be
 *    unit-tested in Node with a plain object (no jsdom, no browser).
 *  - It never throws: analytics failures (blocked script, ad-blocker, missing
 *    provider) must never break the calculator.
 *  - It honors the browser's Do Not Track signal — when DNT is on, nothing is
 *    sent, including page views. This is the opt-out the PRD calls for.
 *
 * Page views use Plausible's manual mode (`plausible('pageview')`) so that the
 * page view goes through the same DNT-respecting path as custom events instead
 * of firing automatically on script load.
 */

/** Analytics event names. Kept as constants so callers can't typo them apart. */
export const EVENTS = {
  pageview: "pageview",
  calculatorInteract: "Calculator: Interact",
  scenarioShare: "Scenario: Share",
  outboundClick: "Outbound Link: Click",
};

/**
 * True when the visitor has asked not to be tracked via the browser Do Not
 * Track signal (or the older vendor-prefixed variants). Treated as an opt-out
 * from all analytics, page views included.
 * @param {Window} win
 * @returns {boolean}
 */
export function doNotTrack(win) {
  if (!win) return false;
  const nav = win.navigator || {};
  const signal = nav.doNotTrack || win.doNotTrack || nav.msDoNotTrack;
  return signal === "1" || signal === "yes";
}

/**
 * Send a single aggregate, non-PII event to the analytics provider.
 *
 * No-ops (and never throws) when there is no window or the visitor opted out.
 * If the provider script has not loaded yet, the call is buffered on the
 * `window.plausible.q` queue and replayed once it does — the standard Plausible
 * install pattern — so early events (like the page view) are not lost.
 *
 * @param {Window} win
 * @param {string} name - event name, e.g. EVENTS.scenarioShare
 * @param {Record<string, string|number|boolean>} [props] - aggregate metadata
 */
export function track(win, name, props) {
  if (!win || doNotTrack(win) || !name) return;
  try {
    const plausible =
      win.plausible ||
      function queue() {
        (win.plausible.q = win.plausible.q || []).push(arguments);
      };
    win.plausible = plausible;
    if (props && Object.keys(props).length) {
      plausible(name, { props });
    } else {
      plausible(name);
    }
  } catch {
    /* analytics must never break the calculator */
  }
}

/** Wrap a function so it only ever runs once (later calls are ignored). */
function once(fn) {
  let called = false;
  return (...args) => {
    if (called) return undefined;
    called = true;
    return fn(...args);
  };
}

/**
 * Build the small set of trackers the calculator wires to user actions.
 *
 * `trackInteraction` fires at most once per page load: we only want to know
 * *that* a visitor engaged with the calculator, not to stream every keystroke —
 * that keeps the signal aggregate and avoids collecting a behavioral trace.
 *
 * @param {Window} win
 */
export function createAnalytics(win) {
  return {
    /** Record the page view (manual Plausible page view, DNT-respecting). */
    trackPageview: () => track(win, EVENTS.pageview),
    /** Record that the visitor engaged with the calculator (once per load). */
    trackInteraction: once(() => track(win, EVENTS.calculatorInteract)),
    /** Record that the visitor copied a shareable scenario link. */
    trackShare: () => track(win, EVENTS.scenarioShare),
    /**
     * Record an outbound click, tagging whether it is a commissioned link.
     * @param {string} url - destination href
     * @param {boolean} affiliate - true for affiliate / sponsored links
     */
    trackOutbound: (url, affiliate) =>
      track(win, EVENTS.outboundClick, {
        url: String(url || ""),
        affiliate: Boolean(affiliate),
      }),
  };
}
