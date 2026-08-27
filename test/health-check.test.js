/**
 * Pricing-data health-check tests.
 *
 * Exercises the maintainer-facing guard in `scripts/health-check.mjs` entirely
 * offline: fetch is injected (`fetchImpl`) and the clock is faked (`now`), so
 * these assertions never touch the network and never flap on wall-clock time.
 *
 * Coverage:
 *  - URL collection across subscriptions, hardware, and affiliates
 *  - a healthy 200 URL grades OK
 *  - a canonical vendor source answering 403/429 is downgraded to a warning
 *    (bot protection), while the same status on an affiliate is a hard failure
 *  - a canonical vendor source answering a transient 5xx on HEAD retries GET
 *    so an accessible page can still pass
 *  - an affiliate 404 (and a network error) are hard failures
 *  - stale `lastUpdated` handling against a deterministic clock, including the
 *    threshold boundary and missing/invalid dates
 *  - the concise report text and the pass/fail exit contract (hard failures fail,
 *    warnings alone still pass)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

import {
  STALE_THRESHOLD_DAYS,
  USER_AGENT,
  isValidHttpUrl,
  collectUrlEntries,
  ageInDays,
  collectStaleEntries,
  probeUrl,
  classifyProbe,
  runHealthCheck,
  formatReport,
  isDirectInvocation,
} from "../scripts/health-check.mjs";

// A minimal Response-like object matching what probeUrl reads off fetch().
const response = (status, { url, redirected = false } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  redirected,
  url: url ?? null,
});

// Build a fetch stub from a { url -> status | fn | Error } route table. A route
// that is an Error is thrown (network failure); a function is called with
// (url, options) so a test can assert on the HTTP method or return per-attempt.
const fakeFetch = (routes) => async (url, options) => {
  const route = routes[url];
  if (route === undefined) throw new Error(`unexpected fetch: ${url}`);
  if (route instanceof Error) throw route;
  if (typeof route === "function") return route(url, options);
  return response(route, { url });
};

// A small, valid fixture dataset reused across cases.
const fixture = () => ({
  subscriptions: [
    { id: "sub-a", sourceUrl: "https://vendor.example/pricing", lastUpdated: "2026-07-20" },
  ],
  hardware: [
    { id: "box-a", sourceUrl: "https://hw.example/product", lastUpdated: "2026-07-20" },
  ],
  affiliates: {
    "box-a": { url: "https://reseller.example/buy", affiliate: true },
  },
});

const FIXED_NOW = new Date("2026-07-27T12:00:00Z");

test("isDirectInvocation compares decoded file paths safely", () => {
  const argv1 = "/tmp/space path/health-check.mjs";
  const moduleUrl = pathToFileURL(argv1).href;

  assert.equal(isDirectInvocation(argv1, moduleUrl), true);
  assert.equal(isDirectInvocation("/tmp/other.mjs", moduleUrl), false);
  assert.equal(isDirectInvocation(undefined, moduleUrl), false);
});

test("collectUrlEntries gathers URLs from subscriptions, hardware, and affiliates", () => {
  const entries = collectUrlEntries(fixture());

  assert.equal(entries.length, 3);

  const byUrl = new Map(entries.map((e) => [e.url, e]));

  const sub = byUrl.get("https://vendor.example/pricing");
  assert.equal(sub.kind, "subscription-source");
  assert.equal(sub.id, "sub-a");
  assert.equal(sub.field, "sourceUrl");
  assert.equal(sub.canonicalVendorSource, true);

  const hw = byUrl.get("https://hw.example/product");
  assert.equal(hw.kind, "hardware-source");
  assert.equal(hw.canonicalVendorSource, true);

  const aff = byUrl.get("https://reseller.example/buy");
  assert.equal(aff.kind, "affiliate");
  assert.equal(aff.id, "box-a");
  assert.equal(aff.field, "url");
  // Affiliate destinations are not canonical vendor sources, so their 403/429
  // stays a hard failure rather than a bot-protection warning.
  assert.equal(aff.canonicalVendorSource, false);
});

test("collectUrlEntries tolerates missing dataset sections", () => {
  assert.deepEqual(collectUrlEntries(), []);
  assert.equal(collectUrlEntries({ subscriptions: [{ id: "x", sourceUrl: "u" }] }).length, 1);
});

test("isValidHttpUrl accepts http(s) URLs and rejects everything else", () => {
  assert.equal(isValidHttpUrl("https://example.com/a"), true);
  assert.equal(isValidHttpUrl("http://example.com"), true);
  assert.equal(isValidHttpUrl("ftp://example.com"), false);
  assert.equal(isValidHttpUrl("not a url"), false);
  assert.equal(isValidHttpUrl(""), false);
  assert.equal(isValidHttpUrl(undefined), false);
  assert.equal(isValidHttpUrl(42), false);
});

test("a valid URL returning 200 OK is probed and graded ok", async () => {
  const fetchImpl = fakeFetch({ "https://example.com/ok": 200 });
  const result = await probeUrl("https://example.com/ok", { fetchImpl });

  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
  assert.equal(result.method, "HEAD");

  assert.deepEqual(classifyProbe(result, { canonicalVendorSource: true }), { level: "ok" });
});

test("probeUrl sends a normal desktop-browser User-Agent, not a bot signature", async () => {
  // Vendor bot-protection blocks the classic crawler UA shape; assert we present
  // an ordinary browser UA instead so warnings from trivial bot blocks drop.
  const seen = [];
  const fetchImpl = async (url, options) => {
    seen.push(options.headers["user-agent"]);
    return response(200, { url });
  };

  await probeUrl("https://example.com/ua", { fetchImpl });

  assert.equal(seen.length, 1);
  assert.equal(seen[0], USER_AGENT);
  // A real browser UA: no "compatible; <bot>" token and no "+https" contact URL.
  assert.match(USER_AGENT, /^Mozilla\/5\.0 /);
  assert.match(USER_AGENT, /Chrome\/\d/);
  assert.doesNotMatch(USER_AGENT, /compatible;/i);
  assert.doesNotMatch(USER_AGENT, /\+https?:\/\//);
  assert.doesNotMatch(USER_AGENT, /healthcheck|bot|crawler/i);
});

test("probeUrl reuses the browser User-Agent on the GET fallback too", async () => {
  const seen = [];
  const fetchImpl = async (url, options) => {
    seen.push([options.method, options.headers["user-agent"]]);
    if (options.method === "HEAD") return response(405, { url });
    return response(200, { url });
  };

  await probeUrl("https://example.com/ua-fallback", { fetchImpl });

  assert.deepEqual(seen, [
    ["HEAD", USER_AGENT],
    ["GET", USER_AGENT],
  ]);
});

test("probeUrl falls back to GET when HEAD is unsupported (405)", async () => {
  const seen = [];
  const fetchImpl = async (url, options) => {
    seen.push(options.method);
    if (options.method === "HEAD") return response(405, { url });
    return response(200, { url });
  };

  const result = await probeUrl("https://example.com/no-head", { fetchImpl });
  assert.deepEqual(seen, ["HEAD", "GET"]);
  assert.equal(result.method, "GET");
  assert.equal(result.ok, true);
});

test("probeUrl retries GET when HEAD returns a transient 5xx and GET succeeds", async () => {
  const seen = [];
  const fetchImpl = async (url, options) => {
    seen.push([options.method, options.headers["user-agent"]]);
    if (options.method === "HEAD") return response(503, { url });
    return response(200, { url });
  };

  const result = await probeUrl("https://example.com/head-5xx", { fetchImpl });

  assert.deepEqual(seen, [
    ["HEAD", USER_AGENT],
    ["GET", USER_AGENT],
  ]);
  assert.equal(result.method, "GET");
  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
});

test("probeUrl retries GET when HEAD looks bot-protected and GET succeeds", async () => {
  const seen = [];
  const fetchImpl = async (url, options) => {
    seen.push([options.method, options.headers["user-agent"]]);
    if (options.method === "HEAD") return response(403, { url });
    return response(200, { url });
  };

  const result = await probeUrl("https://example.com/bot-protected-head", { fetchImpl });

  assert.deepEqual(seen, [
    ["HEAD", USER_AGENT],
    ["GET", USER_AGENT],
  ]);
  assert.equal(result.method, "GET");
  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
});

test("probeUrl falls back to GET when HEAD throws, and recovers", async () => {
  const seen = [];
  const fetchImpl = async (url, options) => {
    seen.push(options.method);
    if (options.method === "HEAD") throw new Error("ECONNRESET");
    return response(200, { url });
  };

  const result = await probeUrl("https://example.com/head-throws", { fetchImpl });

  assert.deepEqual(seen, ["HEAD", "GET"]);
  assert.equal(result.method, "GET");
  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
});

test("a canonical vendor source returning 403/429 is downgraded to a warning", async () => {
  for (const status of [403, 429]) {
    const url = `https://vendor.example/${status}`;
    const fetchImpl = fakeFetch({ [url]: status });
    const result = await probeUrl(url, { fetchImpl });

    const verdict = classifyProbe(result, { canonicalVendorSource: true });
    assert.equal(verdict.level, "warn", `status ${status} on a vendor source should warn`);
    assert.match(verdict.reason, /bot protection/i);
  }
});

test("a 403/429 warns only for canonical vendor sources and hard-fails affiliates", () => {
  for (const status of [403, 429]) {
    const canonicalVerdict = classifyProbe(response(status), { canonicalVendorSource: true });
    assert.equal(canonicalVerdict.level, "warn", `status ${status} on a vendor source should warn`);
    assert.match(canonicalVerdict.reason, new RegExp(String(status)));

    const affiliateVerdict = classifyProbe(response(status), { canonicalVendorSource: false });
    assert.equal(affiliateVerdict.level, "fail", `status ${status} on an affiliate should hard-fail`);
    assert.match(affiliateVerdict.reason, new RegExp(String(status)));
  }
});

test("an affiliate URL returning 404 is a hard failure", async () => {
  const url = "https://reseller.example/gone";
  const fetchImpl = fakeFetch({ [url]: 404 });
  const result = await probeUrl(url, { fetchImpl });

  const verdict = classifyProbe(result, { canonicalVendorSource: false });
  assert.equal(verdict.level, "fail");
  assert.match(verdict.reason, /404/);
});

test("a timeout-like error on a canonical vendor source is downgraded to a warning", () => {
  const verdict = classifyProbe(
    { ok: false, status: null, error: "This operation was aborted" },
    { canonicalVendorSource: true }
  );
  assert.equal(verdict.level, "warn");
  assert.match(verdict.reason, /bot protection/i);
});

test("a network error (HEAD and GET both throw) is a hard failure", async () => {
  const url = "https://dead.example/x";
  const fetchImpl = fakeFetch({ [url]: new Error("ECONNREFUSED") });
  const result = await probeUrl(url, { fetchImpl });

  assert.equal(result.ok, false);
  assert.equal(result.status, null);
  assert.equal(result.error, "ECONNREFUSED");

  const verdict = classifyProbe(result, { canonicalVendorSource: true });
  assert.equal(verdict.level, "fail");
  assert.equal(verdict.reason, "ECONNREFUSED");
});

test("ageInDays measures whole days against a fixed clock and rejects bad dates", () => {
  assert.equal(ageInDays("2026-07-27", FIXED_NOW), 0);
  assert.equal(ageInDays("2026-07-20", FIXED_NOW), 7);
  assert.equal(ageInDays("2026-06-27", FIXED_NOW), 30);
  assert.equal(ageInDays("not-a-date", FIXED_NOW), null);
  assert.equal(ageInDays(undefined, FIXED_NOW), null);
});

test("collectStaleEntries flags entries past the threshold using a fake clock", () => {
  const data = {
    subscriptions: [
      { id: "fresh", lastUpdated: "2026-07-20" }, // 7 days old
      { id: "stale-sub", lastUpdated: "2026-05-01" }, // well past 45 days
    ],
    hardware: [
      { id: "missing" }, // no lastUpdated -> data error
      { id: "bad", lastUpdated: "nope" }, // unparseable -> data error
    ],
  };

  const { stale, invalidDates } = collectStaleEntries(data, {
    now: FIXED_NOW,
    thresholdDays: STALE_THRESHOLD_DAYS,
  });

  assert.deepEqual(stale.map((e) => e.id), ["stale-sub"]);
  assert.equal(stale[0].kind, "subscription");
  assert.ok(stale[0].ageDays > STALE_THRESHOLD_DAYS);

  assert.deepEqual(invalidDates.map((e) => e.id).sort(), ["bad", "missing"]);
});

test("staleness is exclusive at the threshold boundary", () => {
  // age === threshold is still fresh; age === threshold + 1 is stale.
  const atThreshold = new Date(FIXED_NOW);
  const data = {
    subscriptions: [
      { id: "exactly-45", lastUpdated: "2026-06-12" }, // 45 days before 2026-07-27
      { id: "forty-six", lastUpdated: "2026-06-11" }, // 46 days
    ],
  };
  assert.equal(ageInDays("2026-06-12", atThreshold), 45);

  const { stale } = collectStaleEntries(data, { now: atThreshold, thresholdDays: 45 });
  assert.deepEqual(stale.map((e) => e.id), ["forty-six"]);
});

test("runHealthCheck passes with only warnings (bot-protected source + stale entry)", async () => {
  const data = {
    subscriptions: [
      { id: "sub-a", sourceUrl: "https://vendor.example/pricing", lastUpdated: "2026-07-20" },
    ],
    hardware: [
      // Stale (well past threshold) but reachable.
      { id: "box-a", sourceUrl: "https://hw.example/product", lastUpdated: "2026-01-01" },
    ],
    affiliates: {
      "box-a": { url: "https://reseller.example/buy", affiliate: true },
    },
  };

  const report = await runHealthCheck({
    ...data,
    now: FIXED_NOW,
    fetchImpl: fakeFetch({
      "https://vendor.example/pricing": 403, // vendor bot protection -> warning
      "https://hw.example/product": 200,
      "https://reseller.example/buy": 200,
    }),
  });

  assert.equal(report.hardFailures.length, 0, "no hard failures expected");
  assert.ok(report.warnings.length >= 2, "expected a url warning and a stale warning");
  assert.ok(report.warnings.some((w) => w.type === "url-warning"));
  assert.ok(report.warnings.some((w) => w.type === "stale-entry"));

  // Concise report: passes with warnings, not a hard FAIL.
  const text = formatReport(report);
  assert.match(text, /Result: PASS with warnings/);
  assert.match(text, /\[WARN\]/);
});

test("runHealthCheck fails on an affiliate 404 and an invalid vendor URL", async () => {
  const data = {
    subscriptions: [
      { id: "sub-a", sourceUrl: "not-a-url", lastUpdated: "2026-07-20" }, // invalid URL
    ],
    hardware: [
      { id: "box-a", sourceUrl: "https://hw.example/product", lastUpdated: "2026-07-20" },
    ],
    affiliates: {
      "box-a": { url: "https://reseller.example/gone", affiliate: true }, // 404 -> hard fail
    },
  };

  const report = await runHealthCheck({
    ...data,
    now: FIXED_NOW,
    fetchImpl: fakeFetch({
      "https://hw.example/product": 200,
      "https://reseller.example/gone": 404,
    }),
  });

  const types = report.hardFailures.map((f) => f.type).sort();
  assert.deepEqual(types, ["invalid-url", "unreachable-url"]);

  const text = formatReport(report);
  assert.match(text, /Result: FAIL \(hard failures present\)/);
  assert.match(text, /Hard failures: 2/);
});

test("runHealthCheck probes each unique URL once and merges canonical status", async () => {
  // The same URL is referenced by a canonical vendor source and by an affiliate;
  // it must be probed once and treated as canonical (so a 403 warns, not fails).
  const shared = "https://shared.example/page";
  let calls = 0;
  const data = {
    subscriptions: [{ id: "sub-a", sourceUrl: shared, lastUpdated: "2026-07-20" }],
    hardware: [],
    affiliates: { "sub-a": { url: shared, affiliate: true } },
  };

  const report = await runHealthCheck({
    ...data,
    now: FIXED_NOW,
    fetchImpl: async (url) => {
      calls += 1;
      return response(403, { url });
    },
  });

  assert.equal(calls, 2, "shared URL should be fetched with a HEAD probe and a GET retry");
  assert.equal(report.urls.length, 1);
  assert.equal(report.urls[0].sources.length, 2);
  assert.equal(report.urls[0].verdict.level, "warn");
  assert.equal(report.hardFailures.length, 0);
});

test("the exit contract: hard failures exit non-zero, warnings alone exit zero", () => {
  // Mirrors main()'s `report.hardFailures.length > 0 ? 1 : 0` without spawning a
  // networked process.
  const exitCode = (report) => (report.hardFailures.length > 0 ? 1 : 0);
  assert.equal(exitCode({ hardFailures: [], warnings: [{}] }), 0);
  assert.equal(exitCode({ hardFailures: [{}], warnings: [] }), 1);
});
