/**
 * Pure, DOM-free helpers for calculator state.
 *
 * Kept free of any browser globals so the logic can be unit-tested in Node and
 * reused by future calculator work. No side effects.
 */

/** Numeric input fields and their validation bounds. */
export const NUMERIC_FIELDS = {
  boxPrice: { min: 0 },
  downPayment: { min: 0 },
  apr: { min: 0, max: 100 },
  term: { min: 1, max: 120 },
  electricityRate: { min: 0 },
  powerDraw: { min: 0 },
  hoursPerDay: { min: 0, max: 24 },
};

/** Boolean (checkbox) fields for optional assumptions. */
export const BOOLEAN_FIELDS = ["maintenance", "resale", "taxes"];

/**
 * Optional custom monthly subscription spend. Kept out of NUMERIC_FIELDS
 * because an empty value is meaningful (fall back to the checked subscriptions)
 * rather than an error; only a provided value is validated.
 */
export const CUSTOM_SPEND_FIELD = "customSpend";

/**
 * Validate the optional custom monthly spend. Blank is valid (the calculator
 * falls back to the checked subscriptions); any provided value must be a
 * non-negative number.
 * @param {unknown} value
 * @returns {{ valid: boolean, message: string }}
 */
export function validateCustomSpend(value) {
  // Whitespace-only entries collapse to blank so they fall back to the checked
  // subscriptions rather than validating as (and computing from) 0.
  const normalized = typeof value === "string" ? value.trim() : value;
  if (normalized === "" || normalized === null || normalized === undefined) {
    return { valid: true, message: "" };
  }
  return validateNumber(normalized, { min: 0 });
}

/**
 * Validate a single numeric field value.
 * @param {unknown} value
 * @param {{ min?: number, max?: number }} bounds
 * @returns {{ valid: boolean, message: string }}
 */
export function validateNumber(value, bounds = {}) {
  // A whitespace-only value is treated as absent, mirroring the share-param
  // parsing, so a required field flags "Enter a value." instead of reading as 0.
  const normalized = typeof value === "string" ? value.trim() : value;
  if (normalized === "" || normalized === null || normalized === undefined) {
    return { valid: false, message: "Enter a value." };
  }
  const num = Number(normalized);
  if (!Number.isFinite(num)) {
    return { valid: false, message: "Enter a number." };
  }
  if (bounds.min !== undefined && num < bounds.min) {
    return { valid: false, message: `Must be at least ${bounds.min}.` };
  }
  if (bounds.max !== undefined && num > bounds.max) {
    return { valid: false, message: `Must be at most ${bounds.max}.` };
  }
  return { valid: true, message: "" };
}

/**
 * Encode calculator state into a URLSearchParams string for shareable links.
 * @param {Record<string, number|boolean|string[]>} state
 * @returns {string}
 */
export function serializeState(state) {
  const params = new URLSearchParams();
  for (const key of Object.keys(NUMERIC_FIELDS)) {
    if (state[key] !== undefined && state[key] !== "") {
      params.set(key, String(state[key]));
    }
  }
  for (const key of BOOLEAN_FIELDS) {
    if (state[key]) params.set(key, "1");
  }
  if (state[CUSTOM_SPEND_FIELD] !== undefined) {
    params.set(CUSTOM_SPEND_FIELD, String(state[CUSTOM_SPEND_FIELD]));
  }
  if (Array.isArray(state.subscriptions)) {
    params.set("subs", state.subscriptions.join(","));
  }
  return params.toString();
}

/**
 * Extract the raw scenario parameter string from a location, preferring the
 * hash fragment (used by newly shared links) and falling back to the query
 * string so older "?"-style links keep working.
 * @param {{ search?: string, hash?: string }} location
 * @returns {string}
 */
export function readShareParams(location = {}) {
  const hash =
    typeof location.hash === "string" ? location.hash.replace(/^#/, "") : "";
  // Only treat the hash as scenario state when it carries key=value pairs; a
  // bare in-page anchor like "#calculator" must not shadow a "?"-style link.
  if (hash.includes("=")) return hash;
  const search = typeof location.search === "string" ? location.search : "";
  return search.replace(/^\?/, "");
}

/**
 * Build a shareable URL that stores the scenario in the hash fragment. The hash
 * survives static hosting that ignores unknown query params and never triggers
 * a navigation/reload when written to the address bar.
 *
 * The pathname is canonicalized by stripping a trailing "/index.html" or
 * "/index.htm" so copied links use the directory URL (e.g.
 * "/ai-subscription-payback/" rather than "/ai-subscription-payback/index.html")
 * — the same form the SEO canonical/sitemap surface advertises.
 * @param {{ origin?: string, pathname?: string }} location
 * @param {string} query - serialized state from serializeState()
 * @returns {string}
 */
export function buildShareUrl(location = {}, query = "") {
  const pathname = canonicalizePathname(location.pathname || "");
  const base = (location.origin || "") + pathname;
  return query ? `${base}#${query}` : base;
}

/**
 * Collapse a trailing directory-index filename to its directory URL so shared
 * links match the canonical form. "/dir/index.html" and "/dir/index.htm" both
 * become "/dir/"; other pathnames are returned unchanged.
 * @param {string} pathname
 * @returns {string}
 */
function canonicalizePathname(pathname) {
  return pathname.replace(/\/index\.html?$/i, "/");
}

/**
 * Decode calculator state from a query/hash param string, falling back to
 * defaults. Accepts either a "?"-prefixed search string or a bare hash body.
 * @param {string} search - e.g. location.search ("?boxPrice=3000") or hash body
 * @param {Record<string, number|boolean>} defaults
 * @returns {Record<string, number|boolean|string[]>}
 */
export function parseState(search, defaults = {}) {
  const params = new URLSearchParams(search);
  const state = { ...defaults };

  for (const key of Object.keys(NUMERIC_FIELDS)) {
    if (params.has(key)) {
      const raw = params.get(key) ?? "";
      const normalized = raw.trim();
      // Present-but-empty (e.g. "boxPrice=" or "boxPrice=%20") is treated as
      // absent so the default survives, matching the blank customSpend
      // behavior below.
      if (normalized !== "") {
        const num = Number(normalized);
        if (Number.isFinite(num)) state[key] = num;
      }
    }
  }
  for (const key of BOOLEAN_FIELDS) {
    if (params.has(key)) state[key] = params.get(key) === "1";
  }
  if (params.has(CUSTOM_SPEND_FIELD)) {
    const raw = params.get(CUSTOM_SPEND_FIELD) ?? "";
    const normalized = raw.trim();
    if (normalized === "") {
      state[CUSTOM_SPEND_FIELD] = "";
    } else {
      const num = Number(normalized);
      if (Number.isFinite(num)) state[CUSTOM_SPEND_FIELD] = num;
    }
  }
  if (params.has("subs")) {
    state.subscriptions = params.get("subs").split(",").filter(Boolean);
  }
  return state;
}

/**
 * Format a USD amount for display.
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a small USD rate (e.g. an electricity price per kWh) with cent
 * precision. Unlike formatCurrency, which rounds whole-dollar figures to no
 * decimals, sub-dollar rates like $0.17/kWh would collapse to "$0" — so this
 * keeps two fraction digits.
 * @param {number} amount
 * @returns {string}
 */
export function formatRate(amount) {
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a break-even month result.
 * @param {number|null} month - month index, or null if never reached
 * @returns {string}
 */
export function formatBreakEven(month) {
  if (month === null || month === undefined) return "Not reached";
  if (!Number.isFinite(month) || month < 1) return "—";
  return `Month ${Math.ceil(month)}`;
}
