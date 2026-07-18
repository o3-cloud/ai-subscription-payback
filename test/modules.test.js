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
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const jsDir = new URL("../assets/js/", import.meta.url);
const rootDir = new URL("../", import.meta.url);
const read = (rel) => readFileSync(fileURLToPath(new URL(rel, rootDir)), "utf8");
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
    assert.equal(typeof sub.plan, "string");
    assert.equal(typeof sub.monthlyPrice, "number");
    // Every tier documents its billing cadence and what it includes while still
    // carrying a numeric monthlyPrice for the comparison.
    assert.equal(typeof sub.billingCadence, "string", `${sub.id} needs a billing cadence`);
    assert.ok(sub.billingCadence.length > 0, `${sub.id} billing cadence is empty`);
    assert.equal(typeof sub.includedValue, "string", `${sub.id} needs included-value text`);
    assert.ok(sub.includedValue.length > 0, `${sub.id} included-value is empty`);
    assert.equal(typeof sub.sourceLabel, "string");
    assert.match(sub.sourceUrl, /^https?:\/\//, `${sub.id} needs a source URL`);
    assert.ok(
      ["official", "retailer", "estimate"].includes(sub.verification),
      `${sub.id} needs a verification status`
    );
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
    assert.ok(
      ["official", "retailer", "estimate"].includes(box.verification),
      `${box.id} needs a verification status`
    );
    assert.match(box.lastUpdated, ISO_DATE, `${box.id} needs a last-updated date`);
  }
});

test("the site- and pricing-wide dates stay at least as fresh as every entry", async () => {
  // `siteLastUpdated`/`pricingLastUpdated` are what visitors and crawlers read
  // as the freshness of the whole site. Individual entries carry their own
  // `lastUpdated`; when a newer entry lands but these roll-up dates aren't
  // bumped, the site advertises a stale "last updated" older than its content.
  // ISO dates compare correctly as strings, so a lexical max is the newest.
  const { subscriptions, hardware, pricingLastUpdated, siteLastUpdated } =
    await import(new URL("data.js", jsDir));

  const newestEntry = [...subscriptions, ...hardware]
    .map((entry) => entry.lastUpdated)
    .reduce((newest, date) => (date > newest ? date : newest), "0000-00-00");

  assert.ok(
    pricingLastUpdated >= newestEntry,
    `pricingLastUpdated (${pricingLastUpdated}) is older than the newest entry (${newestEntry})`
  );
  assert.ok(
    siteLastUpdated >= newestEntry,
    `siteLastUpdated (${siteLastUpdated}) is older than the newest entry (${newestEntry})`
  );
});

test("subscriptions cover the Codex and Claude Code public tiers", async () => {
  const { subscriptions } = await import(new URL("data.js", jsDir));
  const byId = new Map(subscriptions.map((s) => [s.id, s]));

  // Codex keeps its single individual plan; Claude Code carries the full ladder.
  const expected = {
    codex: 20,
    "claude-code": 20, // Pro monthly
    "claude-pro-annual": 17,
    "claude-max-5x": 100,
    "claude-team-standard-monthly": 25,
    "claude-team-standard-annual": 20,
    "claude-team-premium-monthly": 125,
    "claude-team-premium-annual": 100,
  };
  for (const [id, monthlyPrice] of Object.entries(expected)) {
    assert.ok(byId.has(id), `missing subscription tier: ${id}`);
    assert.equal(byId.get(id).monthlyPrice, monthlyPrice, `${id} monthly price`);
  }

  // Annually billed tiers compare at their effective monthly price and say so.
  for (const id of ["claude-pro-annual", "claude-team-standard-annual", "claude-team-premium-annual"]) {
    assert.match(byId.get(id).billingCadence, /annual/i, `${id} discloses annual billing`);
  }
});

test("default-selected subscriptions total $40/mo", async () => {
  const { subscriptions } = await import(new URL("data.js", jsDir));
  const defaultSelected = subscriptions.filter((s) => s.defaultSelected);
  // Exactly Codex + Claude Code Pro (monthly), the baseline comparison basis.
  assert.deepEqual(
    defaultSelected.map((s) => s.id),
    ["codex", "claude-code"]
  );
  const total = defaultSelected.reduce((sum, s) => sum + s.monthlyPrice, 0);
  assert.equal(total, 40);
});

test("subscriptions cover the Copilot, Cursor, Zed, Google AI, Amazon Q Developer, and Devin editor-assistant tiers", async () => {
  const { subscriptions } = await import(new URL("data.js", jsDir));
  const byId = new Map(subscriptions.map((s) => [s.id, s]));

  // Curated from the official plans pages named in the issue.
  const expected = {
    "copilot-free": { name: "GitHub Copilot", monthlyPrice: 0 },
    "copilot-pro": { name: "GitHub Copilot", monthlyPrice: 10 },
    "copilot-pro-plus": { name: "GitHub Copilot", monthlyPrice: 39 },
    "copilot-max": { name: "GitHub Copilot", monthlyPrice: 100 },
    "cursor-individual": { name: "Cursor", monthlyPrice: 20 },
    "cursor-pro-plus": { name: "Cursor", monthlyPrice: 60 },
    "cursor-ultra": { name: "Cursor", monthlyPrice: 200 },
    "cursor-teams": { name: "Cursor", monthlyPrice: 40 },
    "cursor-teams-premium": { name: "Cursor", monthlyPrice: 120 },
    "zed-personal": { name: "Zed", monthlyPrice: 0 },
    "zed-pro": { name: "Zed", monthlyPrice: 10 },
    "zed-business": { name: "Zed", monthlyPrice: 30 },
    "google-ai-plus": { name: "Google AI", monthlyPrice: 4.99 },
    "google-ai-pro": { name: "Google AI", monthlyPrice: 19.99 },
    "google-ai-ultra": { name: "Google AI", monthlyPrice: 99.99 },
    "amazon-q-developer-free": { name: "Amazon Q Developer", monthlyPrice: 0 },
    "amazon-q-developer-pro": { name: "Amazon Q Developer", monthlyPrice: 19 },
    "devin-free": { name: "Devin", monthlyPrice: 0 },
    "devin-pro": { name: "Devin", monthlyPrice: 20 },
    "devin-max": { name: "Devin", monthlyPrice: 200 },
    "devin-teams": { name: "Devin", monthlyPrice: 120 },
  };
  const sourceUrls = {
    "GitHub Copilot": "https://github.com/features/copilot/plans",
    Cursor: "https://cursor.com/pricing",
    Zed: "https://zed.dev/pricing",
    "Google AI": "https://gemini.google/subscriptions/",
    "Amazon Q Developer": "https://aws.amazon.com/q/developer/pricing/",
    Devin: "https://devin.ai/pricing",
  };
  for (const [id, { name, monthlyPrice }] of Object.entries(expected)) {
    assert.ok(byId.has(id), `missing subscription tier: ${id}`);
    const sub = byId.get(id);
    assert.equal(sub.name, name, `${id} product name`);
    assert.equal(sub.monthlyPrice, monthlyPrice, `${id} monthly price`);
    assert.equal(sub.sourceUrl, sourceUrls[name], `${id} points at the official plans page`);
    assert.equal(sub.verification, "official", `${id} is marked official`);
    // These editor-assistant tiers are optional: none seed the default selection.
    assert.ok(!sub.defaultSelected, `${id} must not be selected by default`);
  }
});

test("Devin Teams pricing preserves the base fee plus seat math", async () => {
  const { subscriptions } = await import(new URL("data.js", jsDir));
  const teams = subscriptions.find((s) => s.id === "devin-teams");
  assert.ok(teams, "missing Devin Teams subscription tier");
  assert.equal(teams.monthlyPrice, 120, "first full-dev seat costs the $80 base plus $40 seat");
  assert.match(teams.billingCadence, /\$80/i, "billing cadence names the $80 team base");
  assert.match(teams.billingCadence, /\$40/i, "billing cadence names the $40 per-seat charge");
  assert.match(teams.includedValue, /base fee/i, "included value explains the base fee");
  assert.match(teams.includedValue, /each additional full dev seat adds \$40/i, "included value preserves the seat math");
});

test("the pricing-disclosure BDD explicitly documents Devin Teams base-fee math", () => {
  const bdd = read("docs/bdd/pricing-disclosure.md");
  assert.match(bdd, /Devin Teams pricing preserves the base-fee plus seat math/i);
  assert.match(bdd, /\$80\/mo base fee plus \$40\/mo per full dev seat/i);
  assert.match(bdd, /\$120\/mo shown is the real cost of the base plus one seat/i);
});

test("usage-based tiers disclose their included-credit caveat", async () => {
  const { subscriptions } = await import(new URL("data.js", jsDir));
  const byId = new Map(subscriptions.map((s) => [s.id, s]));

  // Copilot AI Credits and Zed token credits are metered beyond the included
  // allowance, so the included-value copy must name both the credit and the
  // fact that overage is billed separately.
  for (const id of ["copilot-pro", "copilot-pro-plus", "copilot-max"]) {
    assert.match(byId.get(id).includedValue, /AI Credits/i, `${id} names GitHub AI Credits`);
  }
  assert.match(byId.get("zed-pro").includedValue, /token credits/i, "zed-pro names token credits");
  for (const id of ["copilot-pro", "copilot-pro-plus", "copilot-max", "zed-pro"]) {
    assert.match(
      byId.get(id).includedValue,
      /beyond the credits|metered/i,
      `${id} discloses metered overage`
    );
  }
});

test("Google AI tiers describe the Jules / Antigravity coding-agent benefit", async () => {
  const { subscriptions } = await import(new URL("data.js", jsDir));
  const byId = new Map(subscriptions.map((s) => [s.id, s]));

  // All three tiers are broad Google AI subscriptions marked official.
  for (const id of ["google-ai-plus", "google-ai-pro", "google-ai-ultra"]) {
    const sub = byId.get(id);
    assert.ok(sub, `missing subscription tier: ${id}`);
    assert.equal(sub.verification, "official", `${id} is marked official`);
    assert.equal(sub.sourceUrl, "https://gemini.google/subscriptions/", `${id} points at the official Gemini subscriptions page`);
    assert.match(sub.includedValue, /Google AI/, `${id} names the broad Google AI subscription`);
    // Optional: none seed the default selection.
    assert.ok(!sub.defaultSelected, `${id} must not be selected by default`);
  }

  // Only Pro and Ultra bundle the Jules / Google Antigravity coding agents.
  for (const id of ["google-ai-pro", "google-ai-ultra"]) {
    assert.match(byId.get(id).includedValue, /Jules/, `${id} names Jules`);
    assert.match(byId.get(id).includedValue, /Antigravity/, `${id} names Google Antigravity`);
  }
});

test("Amazon Q Developer tiers disclose their agentic / Java-transformation quota caveat", async () => {
  const { subscriptions } = await import(new URL("data.js", jsDir));
  const byId = new Map(subscriptions.map((s) => [s.id, s]));

  // Free ($0) and Pro ($19/user) both come from the official AWS pricing page,
  // ship optional (unchecked), and must surface the quota-limited caveat.
  const expected = {
    "amazon-q-developer-free": 0,
    "amazon-q-developer-pro": 19,
  };
  for (const [id, monthlyPrice] of Object.entries(expected)) {
    const sub = byId.get(id);
    assert.ok(sub, `missing subscription tier: ${id}`);
    assert.equal(sub.name, "Amazon Q Developer", `${id} product name`);
    assert.equal(sub.monthlyPrice, monthlyPrice, `${id} monthly price`);
    assert.equal(sub.verification, "official", `${id} is marked official`);
    assert.equal(
      sub.sourceUrl,
      "https://aws.amazon.com/q/developer/pricing/",
      `${id} points at the official AWS Q Developer pricing page`
    );
    assert.ok(!sub.defaultSelected, `${id} must not be selected by default`);
    // The billing/limits caveat: agentic requests and Java code-transformation
    // lines of code are quota-limited.
    assert.match(sub.includedValue, /agentic requests/i, `${id} names agentic requests`);
    assert.match(sub.includedValue, /Java code transformation/i, `${id} names Java code transformation`);
    assert.match(sub.includedValue, /quota/i, `${id} discloses the quota limit`);
  }
});

test("hardware features the Mac Studio, DGX Spark, Strix Halo, and Framework Desktop classes", async () => {
  const { hardware } = await import(new URL("data.js", jsDir));
  const names = hardware.map((h) => h.name).join(" | ");
  for (const product of ["Mac Studio", "DGX Spark", "Strix Halo", "Framework Desktop"]) {
    assert.match(names, new RegExp(product), `missing ${product}`);
  }
});

test("Mac Studio matches Apple's official buy-page structured data", async () => {
  const { hardware } = await import(new URL("data.js", jsDir));
  const macStudio = hardware.find((h) => h.id === "mac-studio");
  assert.ok(macStudio, "missing mac-studio hardware entry");

  // Configurable low/high from the buy page's AggregateOffer (M4 Max → M3 Ultra).
  assert.equal(macStudio.priceLow, 2499);
  assert.equal(macStudio.priceHigh, 14299);
  // Source is the buy/configuration page, not the marketing page.
  assert.equal(
    macStudio.sourceUrl,
    "https://www.apple.com/shop/buy-mac/mac-studio"
  );
  assert.equal(macStudio.verification, "official");
  // The featured preload defaults to the low end of the configurable range.
  assert.equal(macStudio.defaultBoxPrice, macStudio.priceLow);
});

test("featured hardware cards use real product-photo assets instead of SVG illustrations", async () => {
  const { hardware } = await import(new URL("data.js", jsDir));

  for (const box of hardware.filter((entry) => !entry.exampleOf)) {
    assert.ok(box.image, `${box.id} needs a featured-card image`);
    assert.match(
      box.image.src,
      /\.(?:jpe?g|png)$/i,
      `${box.id} image should be a photo asset`
    );
    assert.doesNotMatch(box.image.src, /\.svg$/i, `${box.id} image must not be an SVG`);
    assert.match(box.image.alt, /product photo/i, `${box.id} alt text should name the photo`);
  }
});

test("Strix Halo points at a current official AMD product page", async () => {
  const { hardware } = await import(new URL("data.js", jsDir));
  const strixHalo = hardware.find((h) => h.id === "strix-halo");
  assert.ok(strixHalo, "missing strix-halo hardware entry");

  assert.equal(
    strixHalo.sourceUrl,
    "https://www.amd.com/en/products/processors/laptop/ryzen/ai-300-series/amd-ryzen-ai-max-plus-395.html"
  );
  assert.equal(strixHalo.verification, "estimate");
  assert.match(strixHalo.lastUpdated, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(
    strixHalo.priceNote,
    /GMKtec EVO-X2 and EVO-X3/i,
    "class estimate names the purchasable Strix Halo examples it derives from"
  );
  assert.match(
    strixHalo.sourceLabel,
    /derived range from named SKUs/i,
    "class estimate is labeled as a derived range"
  );
  assert.ok(
    !strixHalo.sourceUrl.includes("/en/products/processors/laptop/ryzen/ai-max.html"),
    "must not point at the retired AMD 404 URL"
  );
});

test("Strix Halo examples are modeled as official purchasable SKUs", async () => {
  const { hardware, getAffiliate } = await import(new URL("data.js", jsDir));
  const byId = new Map(hardware.map((h) => [h.id, h]));
  const examples = [
    [
      "framework-desktop-ai-max-385-32gb",
      1099,
      "32 GB RAM",
      "https://frame.work/products/desktop-amd-ai-max-300-series",
      "https://frame.work/desktop",
      "Framework",
      "Framework Desktop AI Max 385",
    ],
    [
      "gmktec-evo-x2",
      1999.99,
      "64 GB RAM + 1 TB SSD",
      "https://www.gmktec.com/products/amd-ryzen%E2%84%A2-ai-max-395-evo-x2-ai-mini-pc",
      "https://www.gmktec.com/collections/all",
      "GMKtec",
      "GMKtec EVO-X2 AI Mini PC",
    ],
    [
      "gmktec-evo-x3",
      3799.99,
      "128 GB RAM + 2 TB SSD",
      "https://www.gmktec.com/products/gmktec-evo-x3-ai-mini-pc-amd-ryzen-ai-max-395",
      "https://www.gmktec.com/collections/all",
      "GMKtec",
      "GMKtec EVO-X3 AI Mini PC",
    ],
  ];

  for (const [id, price, memoryStorage, sourceUrl, affiliateUrl, vendor, name] of examples) {
    const box = byId.get(id);
    assert.ok(box, `missing ${id} hardware entry`);
    assert.equal(box.name, name, `${id} uses the expected product name`);
    assert.equal(box.priceLow, price, `${id} priceLow`);
    assert.equal(box.priceHigh, price, `${id} priceHigh`);
    const expectedSpec = id.startsWith("framework-")
      ? `Ryzen AI Max 385, ${memoryStorage}`
      : `Ryzen AI Max+ 395, ${memoryStorage}`;
    assert.equal(box.spec, expectedSpec, `${id} spec names the memory/storage config`);
    assert.equal(box.verification, "official", `${id} is an official listing`);
    assert.match(box.sourceUrl, /^https:\/\/(frame\.work|www\.gmktec\.com)\//, `${id} points at the official product page`);
    // Pins the live product URLs so the #35 404 regression cannot recur silently.
    assert.equal(box.sourceUrl, sourceUrl, `${id} points at the current live GMKtec product page`);
    assert.equal(getAffiliate(id)?.vendor, vendor, `${id} has ${vendor} affiliate metadata`);
    assert.equal(getAffiliate(id)?.url, affiliateUrl, `${id} affiliate CTA points at the expected destination`);
    assert.equal(box.exampleOf, "strix-halo", `${id} is tagged as a Strix Halo example`);
  }
});

test("Codex points at a specific OpenAI pricing page and is marked official", async () => {
  const { subscriptions } = await import(new URL("data.js", jsDir));
  const codex = subscriptions.find((s) => s.id === "codex");
  assert.ok(codex, "missing codex subscription entry");
  assert.equal(codex.sourceUrl, "https://openai.com/chatgpt/pricing/");
  assert.equal(codex.verification, "official");
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
  const input = {
    boxPrice: 3000,
    apr: 9.9,
    maintenance: true,
    customSpend: 75,
    subscriptions: ["codex"],
  };
  const parsed = state.parseState(state.serializeState(input));
  assert.equal(parsed.boxPrice, 3000);
  assert.equal(parsed.apr, 9.9);
  assert.equal(parsed.maintenance, true);
  assert.equal(parsed.customSpend, 75);
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

  const emptySerialized = state.serializeState({
    ...input,
    subscriptions: [],
  });
  const emptyParams = new URLSearchParams(emptySerialized);
  assert.equal(
    emptyParams.get("subs"),
    "",
    "explicitly serializes an empty subscription selection"
  );

  const emptyParsed = state.parseState(emptySerialized, {
    subscriptions: ["codex", "claude-code"],
  });
  assert.deepEqual(
    emptyParsed.subscriptions,
    [],
    "parses an empty subscription selection back to []"
  );

  const blankSpendSerialized = state.serializeState({
    ...input,
    customSpend: "",
    subscriptions: [],
  });
  const blankSpendParams = new URLSearchParams(blankSpendSerialized);
  assert.equal(
    blankSpendParams.get("customSpend"),
    "",
    "explicitly serializes a blank custom spend"
  );

  const blankSpendParsed = state.parseState(blankSpendSerialized, {
    subscriptions: ["codex"],
    customSpend: 200,
  });
  assert.equal(blankSpendParsed.customSpend, "");

  const blankNumericParsed = state.parseState("boxPrice=", {
    boxPrice: 3000,
  });
  assert.equal(
    blankNumericParsed.boxPrice,
    3000,
    "treats a present-but-empty numeric param as absent, preserving the default"
  );

  const whitespaceNumericParsed = state.parseState("boxPrice=%20&customSpend=%20", {
    boxPrice: 3000,
    customSpend: 200,
  });
  assert.equal(
    whitespaceNumericParsed.boxPrice,
    3000,
    "treats a whitespace-only numeric param as absent, preserving the default"
  );
  assert.equal(
    whitespaceNumericParsed.customSpend,
    "",
    "treats a whitespace-only custom spend as blank rather than 0"
  );
});

test("state.js validates optional custom spend correctly", async () => {
  const state = await import(new URL("state.js", jsDir));
  assert.equal(state.validateCustomSpend("").valid, true);
  assert.equal(state.validateCustomSpend(null).valid, true);
  assert.equal(state.validateCustomSpend("   ").valid, true);
  assert.equal(state.validateCustomSpend(100).valid, true);
  assert.equal(state.validateCustomSpend(-1).valid, false);
  assert.equal(state.validateCustomSpend("abc").valid, false);
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
  assert.equal(state.validateNumber(" 5 ", { min: 0, max: 10 }).valid, true);
  assert.equal(state.validateNumber("-1", { min: 0 }).valid, false);
  assert.equal(state.validateNumber("", {}).valid, false);
  assert.equal(state.validateNumber("   ", {}).valid, false);
  assert.equal(state.validateNumber("   ", {}).message, "Enter a value.");
  assert.equal(state.formatCurrency(3000), "$3,000");
  assert.equal(state.formatBreakEven(null), "Not reached");
  assert.equal(state.formatBreakEven(12), "Month 12");
});
