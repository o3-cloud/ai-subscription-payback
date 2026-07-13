/**
 * ES module scaffold checks.
 *
 * Confirms every client script exists and parses as an ES module, and that the
 * DOM-free modules (data.js, state.js) export the shape the rest of the app
 * imports. Syntax is verified with `node --check` so DOM-dependent modules
 * (calculator.js, main.js) can be validated without a browser or executing
 * their top-level browser globals.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const jsDir = new URL("../assets/js/", import.meta.url);
const modules = ["main.js", "calculator.js", "analytics.js", "state.js", "data.js"];

for (const name of modules) {
  test(`${name} exists and is syntactically valid`, () => {
    const path = fileURLToPath(new URL(name, jsDir));
    assert.ok(existsSync(path), `${name} is missing`);
    // `type: module` in package.json makes --check parse this as ESM without
    // running it; throws (non-zero exit) on a syntax error.
    execFileSync(process.execPath, ["--check", path], { stdio: "pipe" });
  });
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

test("data.js exports the datasets the UI renders", async () => {
  const data = await import(new URL("data.js", jsDir));
  assert.equal(typeof data.defaults, "object");
  assert.ok(Array.isArray(data.assumptions));
  assert.match(data.pricingLastUpdated, ISO_DATE);
  assert.match(data.siteLastUpdated, ISO_DATE);
});

test("every pricing entry carries a source URL and a last-updated date", async () => {
  const data = await import(new URL("data.js", jsDir));

  assert.ok(Array.isArray(data.subscriptions) && data.subscriptions.length > 0);
  for (const sub of data.subscriptions) {
    assert.equal(typeof sub.id, "string");
    assert.equal(typeof sub.name, "string");
    assert.equal(typeof sub.monthlyPrice, "number");
    assert.equal(typeof sub.sourceLabel, "string");
    assert.match(sub.sourceUrl, /^https?:\/\//, `${sub.id} needs a source URL`);
    assert.match(sub.lastUpdated, ISO_DATE, `${sub.id} needs a last-updated date`);
  }

  assert.ok(Array.isArray(data.hardware) && data.hardware.length > 0);
  for (const box of data.hardware) {
    assert.equal(typeof box.id, "string");
    assert.equal(typeof box.name, "string");
    assert.equal(typeof box.priceLow, "number");
    assert.equal(typeof box.priceHigh, "number");
    assert.ok(box.priceHigh >= box.priceLow, `${box.id} range is inverted`);
    assert.equal(typeof box.priceNote, "string");
    assert.equal(typeof box.sourceLabel, "string");
    assert.match(box.sourceUrl, /^https?:\/\//, `${box.id} needs a source URL`);
    assert.match(box.lastUpdated, ISO_DATE, `${box.id} needs a last-updated date`);
  }
});

test("hardware features the Mac Studio, DGX Spark, and Strix Halo classes", async () => {
  const { hardware } = await import(new URL("data.js", jsDir));
  const names = hardware.map((h) => h.name).join(" | ");
  for (const product of ["Mac Studio", "DGX Spark", "Strix Halo"]) {
    assert.match(names, new RegExp(product), `missing ${product}`);
  }
});

test("affiliate metadata is stored separately from pricing data", async () => {
  const data = await import(new URL("data.js", jsDir));

  // Affiliate links live in their own map, not on the pricing entries.
  assert.equal(typeof data.affiliates, "object");
  for (const entry of [...data.subscriptions, ...data.hardware]) {
    assert.ok(
      !("affiliate" in entry) && !("affiliateUrl" in entry),
      `${entry.id} leaks affiliate metadata into pricing data`
    );
  }

  // getAffiliate resolves a CTA for every featured box and is null for unknowns.
  for (const box of data.hardware) {
    const affiliate = data.getAffiliate(box.id);
    assert.ok(affiliate, `no affiliate CTA for ${box.id}`);
    assert.match(affiliate.url, /^https?:\/\//);
    assert.equal(typeof affiliate.label, "string");
    assert.equal(typeof affiliate.vendor, "string");
  }
  assert.equal(data.getAffiliate("does-not-exist"), null);
});

test("state.js round-trips calculator state through the URL helpers", async () => {
  const state = await import(new URL("state.js", jsDir));
  const input = { boxPrice: 3000, apr: 9.9, maintenance: true, subscriptions: ["codex"] };
  const parsed = state.parseState(state.serializeState(input));
  assert.equal(parsed.boxPrice, 3000);
  assert.equal(parsed.apr, 9.9);
  assert.equal(parsed.maintenance, true);
  assert.deepEqual(parsed.subscriptions, ["codex"]);

  const hashed = state.readShareParams({ hash: "#boxPrice=4200&subs=codex" });
  assert.equal(hashed, "boxPrice=4200&subs=codex");
  const parsedHash = state.parseState(hashed);
  assert.equal(parsedHash.boxPrice, 4200);
  assert.deepEqual(parsedHash.subscriptions, ["codex"]);

  const searchFallback = state.readShareParams({ hash: "#calculator", search: "?term=24" });
  assert.equal(searchFallback, "term=24");

  assert.equal(
    state.buildShareUrl({ origin: "https://payback.example", pathname: "/index.html" }, "boxPrice=4200"),
    "https://payback.example/index.html#boxPrice=4200"
  );
});

test("analytics.js exports the tracking helpers the UI depends on", async () => {
  const analytics = await import(new URL("analytics.js", jsDir));
  assert.equal(typeof analytics.createAnalytics, "function");
  assert.equal(typeof analytics.track, "function");
  assert.equal(typeof analytics.doNotTrack, "function");
  assert.equal(analytics.EVENTS.pageview, "pageview");
  assert.match(analytics.EVENTS.outboundClick, /Outbound Link/);
});

test("analytics.js emits aggregate events and honors Do Not Track", async () => {
  const analyticsModule = await import(new URL("analytics.js", jsDir));
  const calls = [];
  const win = {
    location: { href: "https://payback.example/index.html", pathname: "/index.html" },
    navigator: {},
    plausible: (...args) => calls.push(args),
  };

  const analytics = analyticsModule.createAnalytics(win);
  analytics.trackPageview();
  analytics.trackInteraction();
  analytics.trackInteraction(); // once-per-load
  analytics.trackShare();
  analytics.trackOutbound("https://example.com/out", true);

  assert.equal(calls.length, 4);
  assert.deepEqual(calls[0], [analyticsModule.EVENTS.pageview]);
  assert.deepEqual(calls[1], [analyticsModule.EVENTS.calculatorInteract]);
  assert.deepEqual(calls[2], [analyticsModule.EVENTS.scenarioShare]);
  assert.deepEqual(calls[3], [analyticsModule.EVENTS.outboundClick, {
    props: {
      url: "https://example.com/out",
      affiliate: true,
    },
  }]);

  const dntCalls = [];
  const dntWin = {
    location: { href: "https://payback.example/index.html", pathname: "/index.html" },
    navigator: { doNotTrack: "1" },
    plausible: (...args) => dntCalls.push(args),
  };
  analyticsModule.createAnalytics(dntWin).trackPageview();
  assert.equal(dntCalls.length, 0);
});

test("state.js validation and formatting behave", async () => {
  const state = await import(new URL("state.js", jsDir));
  assert.equal(state.validateNumber("5", { min: 0, max: 10 }).valid, true);
  assert.equal(state.validateNumber("-1", { min: 0 }).valid, false);
  assert.equal(state.validateNumber("", {}).valid, false);
  assert.equal(state.formatCurrency(3000), "$3,000");
  assert.equal(state.formatBreakEven(null), "Not reached");
  assert.equal(state.formatBreakEven(12), "Month 12");
});
