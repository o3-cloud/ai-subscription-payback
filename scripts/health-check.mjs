#!/usr/bin/env node
/**
 * Pricing-data health check.
 *
 * A maintainer-facing guard over the hand-curated data in
 * `assets/js/data.js`. Prices, sources, and affiliate CTAs rot silently:
 * vendors move a pricing page, a reseller link 404s, or an entry drifts far
 * enough past its last-verified date to be worth re-checking. This script
 * surfaces all three without touching the site or needing a backend.
 *
 * What it does:
 *  1. Imports `subscriptions`, `hardware`, and `affiliates` from the data
 *     module and collects every `sourceUrl` / affiliate `url`.
 *  2. Validates each URL syntactically (must be a well-formed http(s) URL).
 *  3. Probes each unique URL with a HEAD request, falling back to GET when the
 *     server does not allow/support HEAD (405/501), when the HEAD attempt
 *     errors, or when the HEAD response itself looks bot-protected (403/429)
 *     and a normal GET may still succeed.
 *  4. Classifies the result: a canonical vendor source that still answers
 *     403/429 after the GET retry is treated as a warning (these official
 *     pages are commonly bot-protected), while other 4xx/5xx responses and
 *     network errors are hard failures.
 *  5. Flags entries whose `lastUpdated` is older than a staleness threshold
 *     (default 45 days) as warnings.
 *  6. Prints a concise report and exits non-zero only when there are hard
 *     failures; warnings alone still exit zero so the check can run
 *     unattended without flapping on bot-protected pages.
 *
 * The probing surface is injectable (`fetchImpl`) and the pure logic is
 * exported, so the behavior can be tested without real network access.
 */

/** Entries older than this many days are flagged as stale (warning only). */
export const STALE_THRESHOLD_DAYS = 45;

/** HEAD responses that mean "use GET instead" rather than a real failure. */
const HEAD_UNSUPPORTED = new Set([405, 501]);

/** HTTP statuses treated as bot-protection warnings on canonical vendor sources. */
const BOT_PROTECTION_STATUSES = new Set([403, 429]);

/**
 * User-Agent sent with every probe. Vendor bot-protection commonly blocks the
 * classic crawler shape (`Mozilla/5.0 (compatible; <bot>/1.0; +https://...)`),
 * so we present an ordinary desktop-browser UA instead to reduce false 403/429s.
 */
export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * True when `value` is a syntactically valid absolute http(s) URL.
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidHttpUrl(value) {
  if (typeof value !== "string" || value.trim() === "") return false;
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

/**
 * Flatten the datasets into one list of `{ url, kind, id, field }` link entries.
 * @param {{subscriptions?: object[], hardware?: object[], affiliates?: Record<string, object>}} data
 * @returns {{url: unknown, kind: string, id: string, field: string, canonicalVendorSource: boolean}[]}
 */
export function collectUrlEntries({ subscriptions = [], hardware = [], affiliates = {} } = {}) {
  const entries = [];
  for (const sub of subscriptions) {
    entries.push({
      url: sub.sourceUrl,
      kind: "subscription-source",
      id: sub.id,
      field: "sourceUrl",
      canonicalVendorSource: true,
    });
  }
  for (const box of hardware) {
    entries.push({
      url: box.sourceUrl,
      kind: "hardware-source",
      id: box.id,
      field: "sourceUrl",
      canonicalVendorSource: true,
    });
  }
  for (const [id, affiliate] of Object.entries(affiliates)) {
    entries.push({
      url: affiliate.url,
      kind: "affiliate",
      id,
      field: "url",
      // Some CTAs are official buy pages rather than commissioned affiliate
      // links (`affiliate: false` in the data). Those should be treated like a
      // canonical vendor source because they are still the authoritative
      // destination for the product.
      canonicalVendorSource: affiliate.affiliate === false,
    });
  }
  return entries;
}

/**
 * Whole-day age of an ISO (YYYY-MM-DD) date relative to `now`.
 * @returns {number|null} days elapsed, or null if the date is unparseable
 */
export function ageInDays(isoDate, now = new Date()) {
  if (typeof isoDate !== "string") return null;
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.floor((now.getTime() - parsed.getTime()) / MS_PER_DAY);
}

/**
 * Split priced entries into fresh, stale (past the threshold), and entries with
 * a missing/unparseable `lastUpdated` (a data error).
 * @returns {{stale: object[], invalidDates: object[]}}
 */
export function collectStaleEntries(
  { subscriptions = [], hardware = [] } = {},
  { now = new Date(), thresholdDays = STALE_THRESHOLD_DAYS } = {}
) {
  const stale = [];
  const invalidDates = [];
  const scan = (list, kind) => {
    for (const entry of list) {
      const age = ageInDays(entry.lastUpdated, now);
      if (age === null) {
        invalidDates.push({ id: entry.id, kind, lastUpdated: entry.lastUpdated ?? null });
      } else if (age > thresholdDays) {
        stale.push({ id: entry.id, kind, lastUpdated: entry.lastUpdated, ageDays: age });
      }
    }
  };
  scan(subscriptions, "subscription");
  scan(hardware, "hardware");
  return { stale, invalidDates };
}

/**
 * Probe a single URL: HEAD first, GET fallback when HEAD is unsupported/errors.
 * @param {string} url
 * @param {{fetchImpl?: typeof fetch, timeoutMs?: number}} [options]
 * @returns {Promise<{url: string, method: string, ok: boolean, status: number|null, redirected: boolean, finalUrl: string, error?: string}>}
 */
export async function probeUrl(url, { fetchImpl = globalThis.fetch, timeoutMs = 15000 } = {}) {
  const attempt = async (method) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, {
        method,
        redirect: "follow",
        signal: controller.signal,
        headers: { "user-agent": USER_AGENT },
      });
      return {
        method,
        ok: Boolean(res.ok),
        status: res.status,
        redirected: Boolean(res.redirected),
        finalUrl: res.url || url,
      };
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    const head = await attempt("HEAD");
    if (HEAD_UNSUPPORTED.has(head.status)) {
      return { url, ...(await attempt("GET")) };
    }
    if (BOT_PROTECTION_STATUSES.has(head.status)) {
      try {
        return { url, ...(await attempt("GET")) };
      } catch {
        return { url, ...head };
      }
    }
    return { url, ...head };
  } catch {
    // HEAD threw (aborted, method rejected, connection reset) — try GET before
    // declaring the URL unreachable.
    try {
      return { url, ...(await attempt("GET")) };
    } catch (getErr) {
      return {
        url,
        method: "GET",
        ok: false,
        status: null,
        redirected: false,
        finalUrl: url,
        error: getErr?.message || String(getErr),
      };
    }
  }
}

/**
 * Grade a probe result into ok / warn / fail with a human reason.
 * @param {{ok: boolean, status: number|null, error?: string}} result
 * @param {{canonicalVendorSource: boolean}} context
 * @returns {{level: "ok"|"warn"|"fail", reason?: string}}
 */
export function classifyProbe(result, { canonicalVendorSource } = {}) {
  if (result.error) {
    if (canonicalVendorSource && /aborted|timed out|timeout/i.test(result.error)) {
      return {
        level: "warn",
        reason: `${result.error} (likely transient bot protection on vendor page)`,
      };
    }
    return { level: "fail", reason: result.error };
  }
  if (result.ok) return { level: "ok" };
  if (canonicalVendorSource && BOT_PROTECTION_STATUSES.has(result.status)) {
    return {
      level: "warn",
      reason: `HTTP ${result.status} (likely bot protection on vendor page)`,
    };
  }
  return { level: "fail", reason: `HTTP ${result.status ?? "no response"}` };
}

/**
 * Run the full health check over the supplied datasets.
 * @param {{
 *   subscriptions?: object[],
 *   hardware?: object[],
 *   affiliates?: Record<string, object>,
 *   fetchImpl?: typeof fetch,
 *   now?: Date,
 *   thresholdDays?: number,
 * }} [options]
 * @returns {Promise<object>} the structured report
 */
export async function runHealthCheck({
  subscriptions = [],
  hardware = [],
  affiliates = {},
  fetchImpl = globalThis.fetch,
  now = new Date(),
  thresholdDays = STALE_THRESHOLD_DAYS,
} = {}) {
  const entries = collectUrlEntries({ subscriptions, hardware, affiliates });

  // Group valid URLs so each unique URL is probed once, keeping every entry
  // that references it. A URL is a canonical vendor source if any referencing
  // entry treats it as one.
  const invalidUrls = [];
  const byUrl = new Map();
  for (const entry of entries) {
    if (!isValidHttpUrl(entry.url)) {
      invalidUrls.push(entry);
      continue;
    }
    const existing = byUrl.get(entry.url);
    if (existing) {
      existing.sources.push(entry);
      existing.canonicalVendorSource ||= entry.canonicalVendorSource;
    } else {
      byUrl.set(entry.url, {
        url: entry.url,
        sources: [entry],
        canonicalVendorSource: entry.canonicalVendorSource,
      });
    }
  }

  const urls = [];
  for (const group of byUrl.values()) {
    const result = await probeUrl(group.url, { fetchImpl });
    const verdict = classifyProbe(result, group);
    urls.push({ ...group, result, verdict });
  }

  const { stale, invalidDates } = collectStaleEntries(
    { subscriptions, hardware },
    { now, thresholdDays }
  );

  const hardFailures = [
    ...invalidUrls.map((e) => ({
      type: "invalid-url",
      detail: `${e.kind} ${e.id}: ${JSON.stringify(e.url)} is not a valid http(s) URL`,
    })),
    ...urls
      .filter((u) => u.verdict.level === "fail")
      .map((u) => ({ type: "unreachable-url", detail: `${u.url} — ${u.verdict.reason}` })),
    ...invalidDates.map((e) => ({
      type: "invalid-date",
      detail: `${e.kind} ${e.id}: missing/invalid lastUpdated (${JSON.stringify(e.lastUpdated)})`,
    })),
  ];

  const warnings = [
    ...urls
      .filter((u) => u.verdict.level === "warn")
      .map((u) => ({ type: "url-warning", detail: `${u.url} — ${u.verdict.reason}` })),
    ...stale.map((e) => ({
      type: "stale-entry",
      detail: `${e.kind} ${e.id}: last verified ${e.lastUpdated} (${e.ageDays}d ago, threshold ${thresholdDays}d)`,
    })),
  ];

  return {
    now,
    thresholdDays,
    urls,
    invalidUrls,
    stale,
    invalidDates,
    hardFailures,
    warnings,
  };
}

/**
 * Render a report object as a concise, human-readable text block.
 * @param {object} report
 * @returns {string}
 */
export function formatReport(report) {
  const lines = [];
  lines.push("Pricing-data health check");
  lines.push("=========================");
  lines.push(`Run at ${report.now.toISOString()} · stale threshold ${report.thresholdDays}d`);
  lines.push("");

  lines.push(`URLs probed: ${report.urls.length}`);
  const sorted = [...report.urls].sort((a, b) => {
    const rank = { fail: 0, warn: 1, ok: 2 };
    return rank[a.verdict.level] - rank[b.verdict.level];
  });
  for (const u of sorted) {
    const mark = u.verdict.level === "ok" ? "OK  " : u.verdict.level === "warn" ? "WARN" : "FAIL";
    const status = u.result.status ?? "ERR";
    let line = `  [${mark}] ${status} ${u.result.method} ${u.url}`;
    if (u.verdict.reason) line += ` — ${u.verdict.reason}`;
    lines.push(line);
    if (u.result.redirected && u.result.finalUrl && u.result.finalUrl !== u.url) {
      lines.push(`         ↳ redirected to ${u.result.finalUrl}`);
    }
  }
  lines.push("");

  if (report.invalidUrls.length > 0) {
    lines.push(`Invalid URLs: ${report.invalidUrls.length}`);
    for (const e of report.invalidUrls) {
      lines.push(`  [FAIL] ${e.kind} ${e.id}: ${JSON.stringify(e.url)}`);
    }
    lines.push("");
  }

  lines.push(`Stale entries (> ${report.thresholdDays}d): ${report.stale.length}`);
  for (const e of report.stale) {
    lines.push(`  [WARN] ${e.kind} ${e.id}: last verified ${e.lastUpdated} (${e.ageDays}d ago)`);
  }
  lines.push("");

  if (report.invalidDates.length > 0) {
    lines.push(`Missing/invalid lastUpdated: ${report.invalidDates.length}`);
    for (const e of report.invalidDates) {
      lines.push(`  [FAIL] ${e.kind} ${e.id}: ${JSON.stringify(e.lastUpdated)}`);
    }
    lines.push("");
  }

  lines.push("Summary");
  lines.push("-------");
  lines.push(`  Hard failures: ${report.hardFailures.length}`);
  lines.push(`  Warnings:      ${report.warnings.length}`);
  lines.push(
    report.hardFailures.length > 0
      ? "  Result: FAIL (hard failures present)"
      : report.warnings.length > 0
        ? "  Result: PASS with warnings"
        : "  Result: PASS"
  );

  return lines.join("\n") + "\n";
}

/** CLI entry point: probe the real datasets and exit non-zero on hard failures. */
async function main() {
  const data = await import(new URL("../assets/js/data.js", import.meta.url));
  const report = await runHealthCheck({
    subscriptions: data.subscriptions,
    hardware: data.hardware,
    affiliates: data.affiliates,
  });
  process.stdout.write(formatReport(report));
  process.exit(report.hardFailures.length > 0 ? 1 : 0);
}

// Run only when invoked directly (`node scripts/health-check.mjs`), not on import.
const invokedPath = process.argv[1] ? new URL(`file://${process.argv[1]}`).pathname : "";
if (invokedPath && import.meta.url === new URL(`file://${invokedPath}`).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
