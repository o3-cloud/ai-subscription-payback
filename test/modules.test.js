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

test("data.js exposes only the token-value model the guides actually consume", async () => {
  const data = await import(new URL("data.js", jsDir));

  assert.ok(
    Object.hasOwn(data, "tokenOutputValueAssumptions"),
    "the guides' token-value model remains exported"
  );
  assert.ok(
    !Object.hasOwn(data, "continuousUtilization"),
    "dead token-utilization model should not stay exported"
  );
  assert.ok(
    !Object.hasOwn(data, "outputTokenValuePerMillion"),
    "dead token-price model should not stay exported"
  );
});

test("data.js does not export the dead subscription category taxonomy", async () => {
  const data = await import(new URL("data.js", jsDir));

  assert.ok(
    !Object.hasOwn(data, "subscriptionCategories"),
    "calculator.js owns the live subscription category filter labels"
  );
  assert.ok(
    data.subscriptions.every((sub) => !Object.hasOwn(sub, "category")),
    "subscription rows should not carry a stale category field"
  );
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

test("Claude Max 20x is documented as exposed but unmodeled until a durable public price exists", async () => {
  const { subscriptions } = await import(new URL("data.js", jsDir));
  const byId = new Map(subscriptions.map((s) => [s.id, s]));

  assert.equal(byId.has("claude-max-20x"), false, "no priced Claude Max 20x row is modeled yet");

  const data = read("assets/js/data.js");
  assert.match(
    data,
    /Max 20× usage option/i,
    "data.js records that Claude Max 20x is exposed on the public pricing page"
  );
  assert.match(
    data,
    /from \$100\/mo Max 5× scenario/i,
    "data.js records that only the public Max 5x scenario is modeled"
  );
  assert.match(
    data,
    /until a verifiable public price exists/i,
    "data.js explains why Claude Max 20x is excluded"
  );

  const bdd = read("docs/bdd/pricing-disclosure.md");
  assert.match(
    bdd,
    /public Claude pricing page also exposes Max 20×/i,
    "pricing BDD documents the exposed-but-unpriced Max 20x option"
  );
});

test("subscriptions cover the GitLab Premium and Duo Agent Platform credits comparator", async () => {
  const { subscriptions } = await import(new URL("data.js", jsDir));
  const gitlab = subscriptions.find((s) => s.id === "gitlab-premium-duo");

  assert.ok(gitlab, "missing subscription tier: gitlab-premium-duo");
  assert.equal(gitlab.name, "GitLab");
  assert.equal(gitlab.plan, "Premium");
  assert.equal(gitlab.monthlyPrice, 29);
  assert.equal(gitlab.billingCadence, "Billed annually, per user");
  assert.match(gitlab.includedValue, /GitLab Credits\/User\/Month/i);
  assert.match(gitlab.includedValue, /Duo Agent Platform/i);
  assert.equal(gitlab.sourceUrl, "https://about.gitlab.com/pricing/");
  assert.equal(gitlab.sourceLabel, "Official GitLab pricing");
  assert.equal(gitlab.verification, "official");
  assert.equal(gitlab.lastUpdated, "2026-08-16");
  assert.ok(!gitlab.defaultSelected, "GitLab must not seed the default selection");
});

test("Claude Pro and Team included-value copy names the broader Claude bundle", async () => {
  const { subscriptions } = await import(new URL("data.js", jsDir));
  const byId = new Map(subscriptions.map((s) => [s.id, s]));

  assert.match(
    byId.get("claude-code").includedValue,
    /Claude Cowork/i,
    "Claude Code Pro monthly included-value text names Claude Cowork"
  );
  assert.match(
    byId.get("claude-code").includedValue,
    /Claude Design/i,
    "Claude Code Pro monthly included-value text names Claude Design"
  );
  assert.match(
    byId.get("claude-pro-annual").includedValue,
    /Claude Science/i,
    "Claude Code Pro annual included-value text names Claude Science"
  );
  assert.match(
    byId.get("claude-pro-annual").includedValue,
    /Microsoft 365/i,
    "Claude Code Pro annual included-value text names Claude for Microsoft 365"
  );
  assert.match(
    byId.get("claude-max-5x").includedValue,
    /broader Claude bundle/i,
    "Claude Max 5x included-value text keeps the bundle framing"
  );
  assert.match(
    byId.get("claude-team-premium-monthly").includedValue,
    /broader Claude bundle/i,
    "Claude Team premium monthly included-value text names the broader bundle"
  );
});



test("subscriptions cover the Copilot, Cursor, Zed, Google AI, Amazon Q Developer, Devin, JetBrains AI, and Tabnine editor-assistant tiers", async () => {
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
    "google-ai-ultra-20x": { name: "Google AI", monthlyPrice: 199.99 },
    "amazon-q-developer-free": { name: "Amazon Q Developer", monthlyPrice: 0 },
    "amazon-q-developer-pro": { name: "Amazon Q Developer", monthlyPrice: 19 },
    "devin-free": { name: "Devin", monthlyPrice: 0 },
    "devin-pro": { name: "Devin", monthlyPrice: 20 },
    "devin-max": { name: "Devin", monthlyPrice: 200 },
    "devin-teams": { name: "Devin", monthlyPrice: 120 },
    "jetbrains-ai-pro": { name: "JetBrains AI", monthlyPrice: 16.67 },
    "tabnine-code-assistant": { name: "Tabnine", monthlyPrice: 39 },
    "tabnine-agentic": { name: "Tabnine", monthlyPrice: 59 },
  };
  const sourceUrls = {
    "GitHub Copilot": "https://github.com/features/copilot/plans",
    Cursor: "https://cursor.com/pricing",
    Zed: "https://zed.dev/pricing",
    "Google AI": "https://gemini.google/subscriptions/",
    "Amazon Q Developer": "https://aws.amazon.com/q/developer/pricing/",
    Devin: "https://devin.ai/pricing",
    "JetBrains AI": "https://www.jetbrains.com/store/?section=commercial&billing=yearly",
    Tabnine: "https://www.tabnine.com/pricing/",
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

  assert.match(
    byId.get("jetbrains-ai-pro").billingCadence,
    /annual/i,
    "JetBrains AI Pro discloses annual billing"
  );
  assert.match(
    byId.get("jetbrains-ai-pro").includedValue,
    /AI Assistant/i,
    "JetBrains AI Pro included-value text names JetBrains AI Assistant"
  );
  assert.match(
    byId.get("tabnine-agentic").includedValue,
    /Context Engine/i,
    "Tabnine Agentic Platform included-value text names the Context Engine"
  );
});

test("subscriptions cover the Warp Free, Build, Max, and Business tiers", async () => {
  const { subscriptions } = await import(new URL("data.js", jsDir));
  const byId = new Map(subscriptions.map((s) => [s.id, s]));

  const expected = {
    "warp-free": { name: "Warp", monthlyPrice: 0 },
    "warp-build": { name: "Warp", monthlyPrice: 20 },
    "warp-max": { name: "Warp", monthlyPrice: 200 },
    "warp-business": { name: "Warp", monthlyPrice: 50 },
  };
  for (const [id, { name, monthlyPrice }] of Object.entries(expected)) {
    assert.ok(byId.has(id), `missing subscription tier: ${id}`);
    const sub = byId.get(id);
    assert.equal(sub.name, name, `${id} product name`);
    assert.equal(sub.monthlyPrice, monthlyPrice, `${id} monthly price`);
    assert.equal(sub.sourceUrl, "https://www.warp.dev/pricing", `${id} points at the official plans page`);
    assert.equal(sub.verification, "official", `${id} is marked official`);
    assert.ok(!sub.defaultSelected, `${id} must not be selected by default`);
  }

  assert.match(byId.get("warp-free").includedValue, /AI usage is not included/i, "Warp Free excludes AI usage");
  assert.match(byId.get("warp-build").includedValue, /1,500 credits/i, "Warp Build names the monthly credits");
  assert.match(byId.get("warp-build").includedValue, /20 concurrent cloud agents/i, "Warp Build names concurrent cloud agents");
  assert.match(byId.get("warp-max").includedValue, /18,000 credits/i, "Warp Max names the monthly credits");
  assert.match(byId.get("warp-business").includedValue, /25 seats/i, "Warp Business names the seat cap");
  assert.match(byId.get("warp-business").billingCadence, /per seat/i, "Warp Business billing cadence is per seat");
});

test("Factory tiers cover Pro, Plus, and Max for Factory's Droid agents", async () => {
  const { subscriptions } = await import(new URL("data.js", jsDir));
  const byId = new Map(subscriptions.map((s) => [s.id, s]));

  // Curated from the official Factory pricing page: three monthly individual
  // tiers for Factory's Droid software-development agents.
  const expected = {
    "factory-pro": { plan: "Pro", monthlyPrice: 20 },
    "factory-plus": { plan: "Plus", monthlyPrice: 100 },
    "factory-max": { plan: "Max", monthlyPrice: 200 },
  };
  for (const [id, { plan, monthlyPrice }] of Object.entries(expected)) {
    const sub = byId.get(id);
    assert.ok(sub, `missing subscription tier: ${id}`);
    assert.equal(sub.name, "Factory", `${id} product name`);
    assert.equal(sub.plan, plan, `${id} plan name`);
    assert.equal(sub.monthlyPrice, monthlyPrice, `${id} monthly price`);
    assert.equal(sub.verification, "official", `${id} is marked official`);
    assert.equal(sub.sourceUrl, "https://factory.ai/pricing", `${id} points at the official Factory pricing page`);
    // Optional: none seed the default selection.
    assert.ok(!sub.defaultSelected, `${id} must not be selected by default`);
    // Each tier is framed around Factory's Droid software-development agents.
    assert.match(sub.includedValue, /Droid/i, `${id} names the Droid agents`);
  }

  // The Pro tier names its Desktop/CLI/SDK access plus background agents.
  const pro = byId.get("factory-pro").includedValue;
  assert.match(pro, /Desktop, CLI, and SDK/i, "pro names Desktop/CLI/SDK access");
  assert.match(pro, /cloud and local background agents/i, "pro names cloud and local background agents");

  // The Plus tier surfaces the ~5x usage and Droid Computers benefit.
  const plus = byId.get("factory-plus").includedValue;
  assert.match(plus, /5×|5x/i, "plus names roughly 5x the Pro usage");
  assert.match(plus, /Droid Computers/i, "plus names Droid Computers for remote Droids");

  // The Max tier surfaces the ~10x usage, early access, and out-of-scope plans.
  const max = byId.get("factory-max").includedValue;
  assert.match(max, /10×|10x/i, "max names roughly 10x the Pro usage");
  assert.match(max, /early access/i, "max names early access to new features");
  assert.match(max, /Business and Enterprise plans are out of scope/i, "max notes the out-of-scope Business/Enterprise plans");
});

test("the pricing-disclosure BDD documents the Factory Droid-agent tiers", () => {
  const bdd = read("docs/bdd/pricing-disclosure.md");
  assert.match(bdd, /Factory tiers disclose their Droid-agent pricing ladder and out-of-scope plans/i);
  assert.match(bdd, /the Factory tiers are listed: Pro, Plus, and Max/i);
});

test("Cline is intentionally excluded from the priced subscription tiers", async () => {
  const { subscriptions } = await import(new URL("data.js", jsDir));

  // Cline is a free, open-source BYOK coding agent with no fixed subscription
  // price, so it is deliberately omitted from the priced rows rather than
  // listed. There must be no Cline subscription tier.
  const clineRows = subscriptions.filter(
    (s) => /cline/i.test(s.id ?? "") || /cline/i.test(s.name ?? "")
  );
  assert.equal(clineRows.length, 0, "Cline must not appear as a priced subscription tier");

  // The exclusion is documented in the data model so the omission is explicit.
  const data = read("assets/js/data.js");
  assert.match(
    data,
    /Cline is intentionally excluded from the priced tiers/i,
    "data.js documents that Cline is intentionally excluded from the priced tiers"
  );
  assert.match(
    data,
    /bring-your-own-key \(BYOK\)/i,
    "data.js explains Cline is a bring-your-own-key (BYOK) agent"
  );
});

test("the pricing-disclosure BDD documents the Cline exclusion / BYOK note", () => {
  const bdd = read("docs/bdd/pricing-disclosure.md");
  assert.match(bdd, /Cline is disclosed as intentionally excluded from the priced tiers/i);
  assert.match(bdd, /bring-your-own-key \(BYOK\)/i);
  assert.match(bdd, /no priced subscription row is added for Cline/i);
});

test("Devin tiers carry the Windsurf / Devin Desktop alias without duplicating rows", async () => {
  const { subscriptions } = await import(new URL("data.js", jsDir));
  const devinRows = subscriptions.filter((s) => s.name === "Devin");

  // The alias must not spawn extra rows: still exactly the four singular tiers.
  assert.equal(devinRows.length, 4, "Devin still has exactly four tiers");
  const plans = devinRows.map((s) => s.plan);
  assert.deepEqual(
    plans,
    ["Free", "Pro", "Max", "Teams (base + 1 seat)"],
    "Devin plan rows remain singular and distinct"
  );

  for (const sub of devinRows) {
    assert.deepEqual(
      sub.aliases,
      ["Windsurf", "Devin Desktop"],
      `${sub.id} carries the Windsurf / Devin Desktop aliases`
    );
    // The UI folds the aliases into a single parenthetical display name.
    assert.equal(
      `${sub.name} (${sub.aliases.join(" / ")})`,
      "Devin (Windsurf / Devin Desktop)",
      `${sub.id} renders the expected alias label`
    );
  }

  // No other subscription borrows the Devin alias.
  const aliasCarriers = subscriptions.filter(
    (s) => s.aliases && s.aliases.includes("Windsurf")
  );
  assert.equal(aliasCarriers.length, 4, "only the four Devin rows carry the alias");
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

test("the pricing-disclosure BDD explicitly documents Warp's credit caveats", () => {
  const bdd = read("docs/bdd/pricing-disclosure.md");
  assert.match(bdd, /Warp tiers disclose their agentic-terminal pricing ladder and credit caveats/i);
  assert.match(bdd, /\$20 \(1,500 credits\)/i);
  assert.match(bdd, /\$240 \(18,000 credits\)/i);
  assert.match(bdd, /\$50\/user\/mo/i);
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

test("Google AI tiers describe the Gemini Spark / Jules / Antigravity coding-agent benefit", async () => {
  const { subscriptions } = await import(new URL("data.js", jsDir));
  const byId = new Map(subscriptions.map((s) => [s.id, s]));

  // All four tiers are broad Google AI subscriptions marked official.
  for (const id of ["google-ai-plus", "google-ai-pro", "google-ai-ultra", "google-ai-ultra-20x"]) {
    const sub = byId.get(id);
    assert.ok(sub, `missing subscription tier: ${id}`);
    assert.equal(sub.verification, "official", `${id} is marked official`);
    assert.equal(sub.sourceUrl, "https://gemini.google/subscriptions/", `${id} points at the official Gemini subscriptions page`);
    assert.match(sub.includedValue, /Google AI/, `${id} names the broad Google AI subscription`);
    // Optional: none seed the default selection.
    assert.ok(!sub.defaultSelected, `${id} must not be selected by default`);
  }

  // Only Pro and the two Ultra tiers bundle the Gemini Spark / Jules / Google Antigravity coding agents.
  for (const id of ["google-ai-pro", "google-ai-ultra", "google-ai-ultra-20x"]) {
    assert.match(byId.get(id).includedValue, /Jules/, `${id} names Jules`);
    assert.match(byId.get(id).includedValue, /Antigravity/, `${id} names Google Antigravity`);
    assert.match(byId.get(id).includedValue, /Gemini Spark/, `${id} names Gemini Spark`);
  }

  // The Ultra plan family exposes both the $99.99 (5x) and $199.99 (20x) prices.
  assert.equal(byId.get("google-ai-ultra").monthlyPrice, 99.99, "Ultra 5x is $99.99/mo");
  assert.equal(byId.get("google-ai-ultra-20x").monthlyPrice, 199.99, "Ultra 20x is $199.99/mo");
  assert.notEqual(
    byId.get("google-ai-ultra").plan,
    byId.get("google-ai-ultra-20x").plan,
    "the two Ultra tiers have distinct plan labels"
  );
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

test("Replit tiers cover the Starter/Core/Pro ladder with Agent-credit and tax caveats", async () => {
  const { subscriptions } = await import(new URL("data.js", jsDir));
  const byId = new Map(subscriptions.map((s) => [s.id, s]));

  // Curated from the official Replit pricing page named in the issue: a free
  // Starter tier plus monthly/annual Core and Pro tiers.
  const expected = {
    "replit-starter": 0,
    "replit-core-monthly": 25,
    "replit-core-annual": 20,
    "replit-pro-monthly": 100,
    "replit-pro-annual": 95,
  };
  for (const [id, monthlyPrice] of Object.entries(expected)) {
    const sub = byId.get(id);
    assert.ok(sub, `missing subscription tier: ${id}`);
    assert.equal(sub.name, "Replit", `${id} product name`);
    assert.equal(sub.monthlyPrice, monthlyPrice, `${id} monthly price`);
    assert.equal(sub.verification, "official", `${id} is marked official`);
    assert.equal(
      sub.sourceUrl,
      "https://replit.com/pricing",
      `${id} points at the official Replit pricing page`
    );
    // Optional: none seed the default selection.
    assert.ok(!sub.defaultSelected, `${id} must not be selected by default`);
  }

  // The free Starter tier advertises its free daily Agent credits.
  assert.match(byId.get("replit-starter").includedValue, /Replit Agent/i, "starter names Replit Agent");
  assert.match(byId.get("replit-starter").includedValue, /free daily/i, "starter names free daily credits");

  // The paid Core/Pro tiers each disclose the included monthly credit
  // allowance, the metered overage, and the tax caveat from Replit's page.
  const paid = {
    "replit-core-monthly": /\$25\/mo of Replit Agent credits/i,
    "replit-core-annual": /\$25\/mo of Replit Agent credits/i,
    "replit-pro-monthly": /\$100\/mo of Replit Agent credits/i,
    "replit-pro-annual": /\$100\/mo of Replit Agent credits/i,
  };
  for (const [id, creditPattern] of Object.entries(paid)) {
    const value = byId.get(id).includedValue;
    assert.match(value, creditPattern, `${id} states its included Agent credit allowance`);
    assert.match(value, /beyond the included credits is billed separately/i, `${id} discloses metered overage`);
    assert.match(value, /taxes may vary by location/i, `${id} notes the tax caveat`);
  }

  // Annually billed tiers document the effective-monthly framing.
  assert.match(byId.get("replit-core-annual").billingCadence, /annually/i, "core annual billed annually");
  assert.match(byId.get("replit-pro-annual").billingCadence, /annually/i, "pro annual billed annually");
});

test("the pricing-disclosure BDD documents the Replit Agent-credit and tax caveats", () => {
  const bdd = read("docs/bdd/pricing-disclosure.md");
  assert.match(bdd, /Replit tiers disclose their Agent-credit and tax caveats/i);
  assert.match(bdd, /Replit tiers are listed: Starter \(Free\), Core \(monthly and annual\), and Pro \(monthly and annual\)/i);
});

test("Mistral tiers cover the Free/Pro/Team/Education ladder with Vibe and tax caveats", async () => {
  const { subscriptions } = await import(new URL("data.js", jsDir));
  const byId = new Map(subscriptions.map((s) => [s.id, s]));

  // Curated from the official Mistral pricing page named in the issue and
  // verified 2026-07-26: a free tier plus Pro, Team, and Education plans.
  const expected = {
    "mistral-free": 0,
    "mistral-pro": 14.99,
    "mistral-team": 24.99,
    "mistral-education": 5.99,
  };
  for (const [id, monthlyPrice] of Object.entries(expected)) {
    const sub = byId.get(id);
    assert.ok(sub, `missing subscription tier: ${id}`);
    assert.equal(sub.name, "Mistral", `${id} product name`);
    assert.equal(sub.monthlyPrice, monthlyPrice, `${id} monthly price`);
    assert.equal(sub.verification, "official", `${id} is marked official`);
    assert.equal(
      sub.sourceUrl,
      "https://mistral.ai/pricing/",
      `${id} points at the official Mistral pricing page`
    );
    // Optional: none seed the default selection.
    assert.ok(!sub.defaultSelected, `${id} must not be selected by default`);
  }

  // The Free tier advertises its (limited) Vibe coding access.
  assert.match(byId.get("mistral-free").includedValue, /Vibe/i, "free names Vibe");
  assert.match(byId.get("mistral-free").includedValue, /fair-usage/i, "free notes fair-usage limits");

  // The Pro tier surfaces the verbatim Vibe / long-running / all-day wording.
  assert.match(
    byId.get("mistral-pro").includedValue,
    /full access to Vibe for long-running tasks plus all-day coding/i,
    "pro states the Vibe long-running / all-day coding copy"
  );

  // The paid tiers each disclose the tax exclusion and fair-usage caveat.
  for (const id of ["mistral-pro", "mistral-team", "mistral-education"]) {
    const value = byId.get(id).includedValue;
    assert.match(value, /excludes taxes/i, `${id} notes the price excludes taxes`);
    assert.match(value, /fair-usage/i, `${id} notes the fair-usage caveat`);
  }

  // The Team tier is billed per user, excluding taxes.
  assert.match(byId.get("mistral-team").billingCadence, /per user/i, "team billed per user");
  for (const id of ["mistral-pro", "mistral-team", "mistral-education"]) {
    assert.match(byId.get(id).billingCadence, /excluding taxes/i, `${id} cadence notes taxes are excluded`);
  }
});

test("the pricing-disclosure BDD documents the Mistral Vibe and tax caveats", () => {
  const bdd = read("docs/bdd/pricing-disclosure.md");
  assert.match(bdd, /Mistral tiers disclose their Vibe coding access and tax \/ fair-usage caveats/i);
  assert.match(bdd, /the Mistral tiers are listed: Free, Pro, Team, and Education/i);
  assert.match(bdd, /full access to Vibe for long-running tasks plus all-day coding/i);
});

test("Bolt tiers cover the Free/Pro/Teams ladder with app-building token limits", async () => {
  const { subscriptions } = await import(new URL("data.js", jsDir));
  const byId = new Map(subscriptions.map((s) => [s.id, s]));

  // Curated from the official Bolt pricing page named in the issue and verified
  // 2026-07-26: a free tier plus Pro and Teams plans (Enterprise is custom and
  // out of scope).
  const expected = {
    "bolt-free": 0,
    "bolt-pro": 25,
    "bolt-teams": 30,
  };
  for (const [id, monthlyPrice] of Object.entries(expected)) {
    const sub = byId.get(id);
    assert.ok(sub, `missing subscription tier: ${id}`);
    assert.equal(sub.name, "Bolt", `${id} product name`);
    assert.equal(sub.monthlyPrice, monthlyPrice, `${id} monthly price`);
    assert.equal(sub.verification, "official", `${id} is marked official`);
    assert.equal(sub.sourceLabel, "Official Bolt pricing", `${id} source label`);
    assert.equal(sub.lastUpdated, "2026-07-26", `${id} last verified date`);
    assert.equal(
      sub.sourceUrl,
      "https://bolt.new/pricing",
      `${id} points at the official Bolt pricing page`
    );
    // Optional: none seed the default selection.
    assert.ok(!sub.defaultSelected, `${id} must not be selected by default`);
  }

  // The Free tier advertises its daily and monthly token caps.
  assert.match(byId.get("bolt-free").includedValue, /300K tokens daily/i, "free names the 300K daily cap");
  assert.match(byId.get("bolt-free").includedValue, /1M tokens per month/i, "free names the 1M monthly cap");

  // The Pro tier surfaces the 10M/month allowance, no daily limit, and premium
  // app-building features.
  const pro = byId.get("bolt-pro").includedValue;
  assert.match(pro, /10M tokens per month/i, "pro names the 10M monthly allowance");
  assert.match(pro, /no daily token limit/i, "pro notes there is no daily limit");
  assert.match(pro, /custom domains?/i, "pro names custom domains");
  assert.match(pro, /SEO/i, "pro names SEO controls");
  assert.match(pro, /no Bolt branding/i, "pro names the no-branding feature");
  assert.match(byId.get("bolt-pro").billingCadence, /billed monthly/i, "pro billed monthly");

  // The Teams tier is billed per member with a shared workspace and per-member
  // token allotment, and notes Enterprise is out of scope.
  const teams = byId.get("bolt-teams").includedValue;
  assert.match(teams, /team workspace/i, "teams names the shared workspace");
  assert.match(teams, /per-member monthly token allotment/i, "teams names the per-member token allotment");
  assert.match(teams, /Enterprise plan is custom-priced and out of scope/i, "teams notes Enterprise is out of scope");
  assert.match(byId.get("bolt-teams").billingCadence, /per member/i, "teams billed per member");

  // Each is framed as an app-building plan, not a pure IDE assistant.
  for (const id of ["bolt-free", "bolt-pro", "bolt-teams"]) {
    assert.match(byId.get(id).includedValue, /app-building/i, `${id} framed as app-building`);
  }
});

test("the pricing-disclosure BDD documents the Bolt app-building token limits", () => {
  const bdd = read("docs/bdd/pricing-disclosure.md");
  assert.match(bdd, /Bolt tiers disclose their app-building token limits/i);
  assert.match(bdd, /the Bolt tiers are listed: Free, Pro, and Teams/i);
});

test("Lovable tiers cover the Free/Pro/Business ladder with credit-limit caveats", async () => {
  const { subscriptions } = await import(new URL("data.js", jsDir));
  const byId = new Map(subscriptions.map((s) => [s.id, s]));

  // Curated from the official Lovable pricing page named in the issue and
  // verified 2026-07-27: a free tier plus Pro and Business plans (Enterprise is
  // custom/volume-priced and out of scope).
  const expected = {
    "lovable-free": 0,
    "lovable-pro": 25,
    "lovable-business": 50,
  };
  for (const [id, monthlyPrice] of Object.entries(expected)) {
    const sub = byId.get(id);
    assert.ok(sub, `missing subscription tier: ${id}`);
    assert.equal(sub.name, "Lovable", `${id} product name`);
    assert.equal(sub.monthlyPrice, monthlyPrice, `${id} monthly price`);
    assert.equal(sub.verification, "official", `${id} is marked official`);
    assert.equal(sub.sourceLabel, "Official Lovable pricing", `${id} source label`);
    assert.equal(sub.lastUpdated, "2026-07-27", `${id} last verified date`);
    assert.equal(
      sub.sourceUrl,
      "https://lovable.dev/pricing",
      `${id} points at the official Lovable pricing page`
    );
    // Optional: none seed the default selection.
    assert.ok(!sub.defaultSelected, `${id} must not be selected by default`);
  }

  // The Free tier builds on a limited allowance of free monthly credits.
  assert.match(byId.get("lovable-free").includedValue, /free monthly credits/i, "free names the free monthly credits");

  // The Pro tier surfaces the 100-credit allowance, rollovers, top-ups, and
  // premium app-building features.
  const pro = byId.get("lovable-pro").includedValue;
  assert.match(pro, /100 monthly credits/i, "pro names the 100 monthly credits");
  assert.match(pro, /rollovers?/i, "pro names credit rollovers");
  assert.match(pro, /top-ups?/i, "pro names on-demand top-ups");
  assert.match(pro, /custom domains?/i, "pro names custom domains");
  assert.match(pro, /no Lovable badge/i, "pro names the no-branding feature");

  // The Business tier keeps the 100-credit base and adds team features, and
  // notes Enterprise is out of scope.
  const business = byId.get("lovable-business").includedValue;
  assert.match(business, /100 monthly credits/i, "business names the 100 monthly credits");
  assert.match(business, /team workspace/i, "business names the shared workspace");
  assert.match(business, /SSO/i, "business names the SSO/security center");
  assert.match(
    business,
    /Enterprise plan is custom\/volume-priced and out of scope/i,
    "business notes Enterprise is out of scope"
  );

  // The paid tiers make the credit ceiling explicit so nothing implies unlimited use.
  for (const id of ["lovable-pro", "lovable-business"]) {
    assert.match(
      byId.get(id).includedValue,
      /beyond the included credits requires paid top-ups/i,
      `${id} states top-ups are needed beyond the credits`
    );
  }

  // Each is framed as an app-building plan, not a pure IDE assistant.
  for (const id of ["lovable-free", "lovable-pro", "lovable-business"]) {
    assert.match(byId.get(id).includedValue, /app-building/i, `${id} framed as app-building`);
  }
});

test("the pricing-disclosure BDD documents the Lovable credit-limit caveats", () => {
  const bdd = read("docs/bdd/pricing-disclosure.md");
  assert.match(bdd, /Lovable tiers disclose their credit-limit caveats/i);
  assert.match(bdd, /the Lovable tiers are listed: Free, Pro, and Business/i);
});

test("v0 tiers cover Free, Plus, and Business for v0 by Vercel's app-building UI generator", async () => {
  const { subscriptions } = await import(new URL("data.js", jsDir));
  const byId = new Map(subscriptions.map((s) => [s.id, s]));

  const expected = {
    "v0-free": 0,
    "v0-plus": 30,
    "v0-business": 100,
  };
  for (const [id, monthlyPrice] of Object.entries(expected)) {
    const sub = byId.get(id);
    assert.ok(sub, `missing subscription tier: ${id}`);
    assert.equal(sub.name, "v0", `${id} product name`);
    assert.equal(sub.monthlyPrice, monthlyPrice, `${id} monthly price`);
    assert.equal(sub.verification, "official", `${id} is marked official`);
    assert.equal(sub.sourceUrl, "https://v0.app/pricing", `${id} points at the official v0 pricing page`);
    assert.ok(!sub.defaultSelected, `${id} must not be selected by default`);
    assert.match(sub.includedValue, /app-building/i, `${id} is framed as app-building`);
    assert.match(sub.includedValue, /UI-generation/i, `${id} names the UI-generation use case`);
  }

  assert.match(byId.get("v0-free").includedValue, /7 messages per day/i, "v0 Free discloses the daily message cap");
  assert.match(byId.get("v0-plus").includedValue, /\$2 of free daily login credits/i, "v0 Plus discloses daily login credits");
  assert.match(byId.get("v0-business").includedValue, /training opt-out by default/i, "v0 Business discloses training opt-out");
});

test("the pricing-disclosure BDD documents the v0 credits and daily-login caveats", () => {
  const bdd = read("docs/bdd/pricing-disclosure.md");
  assert.match(bdd, /v0 tiers disclose their credits, daily-login, and training-opt-out caveats/i);
  assert.match(bdd, /the v0 tiers are listed: Free, Plus, and Business/i);
});

test("the pricing-disclosure BDD documents JetBrains AI Pro and Tabnine annual pricing", () => {
  const bdd = read("docs/bdd/pricing-disclosure.md");
  assert.match(bdd, /JetBrains AI Pro tier is listed at about \$16\.67\/mo effective/i);
  assert.match(bdd, /Tabnine tiers are listed: Code Assistant Platform and Agentic Platform/i);
});

test("Amp tiers cover Megawatt and Gigawatt with included-agent-usage and pay-as-you-go caveats", async () => {
  const { subscriptions } = await import(new URL("data.js", jsDir));
  const byId = new Map(subscriptions.map((s) => [s.id, s]));

  // Curated from the official Amp pricing page named in the issue.
  const expected = {
    "amp-megawatt": 20,
    "amp-gigawatt": 200,
  };
  for (const [id, monthlyPrice] of Object.entries(expected)) {
    const sub = byId.get(id);
    assert.ok(sub, `missing subscription tier: ${id}`);
    assert.equal(sub.name, "Amp", `${id} product name`);
    assert.equal(sub.monthlyPrice, monthlyPrice, `${id} monthly price`);
    assert.equal(sub.verification, "official", `${id} is marked official`);
    assert.equal(sub.sourceUrl, "https://ampcode.com/pricing", `${id} points at the official Amp pricing page`);
    assert.ok(!sub.defaultSelected, `${id} must not be selected by default`);
    assert.match(sub.billingCadence, /usage-based/i, `${id} billing cadence notes usage-based overage`);
    assert.match(sub.includedValue, /agent usage/i, `${id} included value names agent usage`);
    assert.match(sub.includedValue, /pay-as-you-go/i, `${id} included value names pay-as-you-go overage`);
    assert.match(sub.includedValue, /Enterprise\/BYOK/i, `${id} included value names the Enterprise/BYOK options`);
  }
});

test("TRAE tiers cover Lite, Pro, Pro+, and Ultra with monthly-billed and trial caveats", async () => {
  const { subscriptions } = await import(new URL("data.js", jsDir));
  const byId = new Map(subscriptions.map((s) => [s.id, s]));

  // Curated from the official TRAE pricing page named in the issue.
  const expected = {
    "trae-lite": 3,
    "trae-pro": 10,
    "trae-pro-plus": 30,
    "trae-ultra": 100,
  };
  for (const [id, monthlyPrice] of Object.entries(expected)) {
    const sub = byId.get(id);
    assert.ok(sub, `missing subscription tier: ${id}`);
    assert.equal(sub.name, "TRAE", `${id} product name`);
    assert.equal(sub.monthlyPrice, monthlyPrice, `${id} monthly price`);
    assert.equal(sub.verification, "official", `${id} is marked official`);
    assert.equal(sub.sourceUrl, "https://www.trae.ai/pricing", `${id} points at the official TRAE pricing page`);
    assert.ok(!sub.defaultSelected, `${id} must not be selected by default`);
    assert.match(sub.billingCadence, /monthly-billed view/i, `${id} billing cadence notes the monthly-billed view`);
    assert.match(sub.includedValue, /basic usage|bonus usage|autocomplete|queue priority|concurrent cloud tasks/i, `${id} included value names the usage features`);
  }
  assert.match(byId.get("trae-pro").billingCadence, /7-day trial/i, "trae-pro billing cadence names the 7-day trial caveat");
  assert.match(byId.get("trae-pro").includedValue, /7-day trial/i, "trae-pro included value names the 7-day trial caveat");
});

test("Supermaven tiers are listed with their 1M-token context window and chat-credit caveats", async () => {
  const { subscriptions } = await import(new URL("data.js", jsDir));
  const byId = new Map(subscriptions.map((s) => [s.id, s]));

  for (const [id, plan, monthlyPrice] of [
    ["supermaven-free-tier", "Free Tier", 0],
    ["supermaven-pro", "Pro", 10],
    ["supermaven-team", "Team", 10],
  ]) {
    const sub = byId.get(id);
    assert.ok(sub, `missing subscription tier: ${id}`);
    assert.equal(sub.name, "Supermaven", `${id} product name`);
    assert.equal(sub.plan, plan, `${id} plan name`);
    assert.equal(sub.monthlyPrice, monthlyPrice, `${id} monthly price`);
    assert.equal(sub.verification, "official", `${id} is marked official`);
    assert.equal(sub.sourceUrl, "https://supermaven.com/pricing", `${id} points at the official Supermaven pricing page`);
    assert.ok(!sub.defaultSelected, `${id} must not be selected by default`);
    assert.match(sub.includedValue, /1M token context window/i, `${id} included value names the 1M token context window`);
  }
  assert.match(byId.get("supermaven-pro").includedValue, /\$5\/month in Supermaven Chat credits/i, "supermaven-pro included value names the chat credits");
  assert.match(byId.get("supermaven-team").includedValue, /centralized user management and billing/i, "supermaven-team included value names the management caveat");
});

test("Augment Code Business tier is listed with its pooled-usage / top-up / Enterprise caveat", async () => {
  const { subscriptions } = await import(new URL("data.js", jsDir));
  const byId = new Map(subscriptions.map((s) => [s.id, s]));

  // Curated from the official Augment Code pricing page named in the issue: the
  // Business team plan (Enterprise is custom and out of scope).
  const sub = byId.get("augment-code-business");
  assert.ok(sub, "missing subscription tier: augment-code-business");
  assert.equal(sub.name, "Augment Code", "augment-code-business product name");
  assert.equal(sub.plan, "Business", "augment-code-business plan name");
  assert.equal(sub.monthlyPrice, 100, "augment-code-business monthly price");
  assert.equal(sub.verification, "official", "augment-code-business is marked official");
  assert.equal(
    sub.sourceUrl,
    "https://www.augmentcode.com/pricing",
    "augment-code-business points at the official Augment Code pricing page"
  );
  // Optional: it must not seed the default selection.
  assert.ok(!sub.defaultSelected, "augment-code-business must not be selected by default");

  // The flat-fee / seat framing lives in the billing cadence.
  assert.match(sub.billingCadence, /\$100\/month flat/i, "cadence names the $100/month flat fee");
  assert.match(sub.billingCadence, /up to 50 seats/i, "cadence names the up-to-50-seats allowance");
  assert.match(sub.billingCadence, /\$100\/month of pooled usage/i, "cadence names the $100/month pooled usage");

  // The included-value copy explains the pooled usage, top-up, and Enterprise caveat.
  assert.match(sub.includedValue, /pooled usage/i, "included value names the pooled usage");
  assert.match(sub.includedValue, /top-ups?/i, "included value names metered top-ups");
  assert.match(
    sub.includedValue,
    /custom-priced Enterprise plan/i,
    "included value notes the custom-priced Enterprise plan"
  );
  assert.match(sub.includedValue, /out of scope/i, "included value notes Enterprise is out of scope");
});

test("the pricing-disclosure BDD documents the Augment Code Business pooled-usage caveat", () => {
  const bdd = read("docs/bdd/pricing-disclosure.md");
  assert.match(bdd, /The Augment Code Business tier discloses its pooled-usage caveat/i);
  assert.match(bdd, /the Augment Code tier is listed: Business/i);
  assert.match(bdd, /flat \$100\/mo covering up to 50 seats and \$100\/mo of pooled usage/i);
});

test("Qodo Pro Team tiers are listed with pooled-credit and no-annual-commitment caveats", async () => {
  const { subscriptions } = await import(new URL("data.js", jsDir));
  const byId = new Map(subscriptions.map((s) => [s.id, s]));

  const expected = {
    "qodo-pro-team-2500": 30,
    "qodo-pro-team-5000": 60,
    "qodo-pro-team-20000": 240,
  };
  const plans = {
    "qodo-pro-team-2500": "Pro Team (2,500 credits)",
    "qodo-pro-team-5000": "Pro Team (5,000 credits)",
    "qodo-pro-team-20000": "Pro Team (20,000 credits)",
  };
  for (const [id, monthlyPrice] of Object.entries(expected)) {
    const sub = byId.get(id);
    assert.ok(sub, `missing subscription tier: ${id}`);
    assert.equal(sub.name, "Qodo", `${id} product name`);
    assert.equal(sub.plan, plans[id], `${id} plan name`);
    assert.equal(sub.monthlyPrice, monthlyPrice, `${id} monthly price`);
    assert.equal(sub.verification, "official", `${id} is marked official`);
    assert.equal(sub.sourceUrl, "https://www.qodo.ai/pricing/", `${id} points at the official Qodo pricing page`);
    assert.ok(!sub.defaultSelected, `${id} must not be selected by default`);
    assert.match(sub.billingCadence, /no annual commitment/i, `${id} billing cadence notes no annual commitment`);
    assert.match(sub.includedValue, /0\.012\/credit/i, `${id} included value names the per-credit rate`);
    assert.match(sub.includedValue, /credits expire each monthly cycle/i, `${id} included value names the monthly expiration caveat`);
    assert.match(sub.includedValue, /no rate limits/i, `${id} included value names the no-rate-limits caveat`);
    assert.match(sub.includedValue, /spending cap/i, `${id} included value names the spending-cap caveat`);
  }
});

test("the pricing-disclosure BDD documents the Qodo Pro Team credit-pack caveat", () => {
  const bdd = read("docs/bdd/pricing-disclosure.md");
  assert.match(bdd, /The Qodo Pro Team tiers disclose their credit-metered caveat/i);
  assert.match(bdd, /Pro Team 2,500-credit pack is priced at \$30\/mo/i);
  assert.match(bdd, /credits expire each monthly cycle/i);
  assert.match(bdd, /no annual commitment/i);
});

test("the pricing-disclosure BDD documents the RTX PRO 6000 Blackwell reference class", () => {
  const bdd = read("docs/bdd/pricing-disclosure.md");
  assert.match(bdd, /High-end reference workstation classes are listed without becoming featured cards/i);
  assert.match(bdd, /RTX PRO 6000 Blackwell workstation class/i);
  assert.match(bdd, /96 GB GDDR7 ECC VRAM/i);
  assert.match(bdd, /does not appear among the featured hardware cards/i);
});

test("hardware features the Mac Studio, DGX Spark, Strix Halo, and Framework Desktop classes", async () => {
  const { hardware } = await import(new URL("data.js", jsDir));
  const names = hardware.map((h) => h.name).join(" | ");
  for (const product of ["Mac Studio", "DGX Spark", "Strix Halo", "Framework Desktop"]) {
    assert.match(names, new RegExp(product), `missing ${product}`);
  }
});

test("featured hardware cards carry conservative model-fit guidance", async () => {
  const { featuredHardware } = await import(new URL("data.js", jsDir));

  const expectedBuckets = [
    /small coding models/i,
    /30B-class quantized/i,
    /70B-class quantized/i,
    /fine-tune-capable/i,
    /large-memory experimental/i,
  ];

  for (const box of featuredHardware) {
    assert.equal(typeof box.modelFit, "string", `${box.id} needs model-fit guidance`);
    assert.ok(box.modelFit.length > 0, `${box.id} model-fit guidance is empty`);
    assert.match(
      box.modelFit,
      new RegExp(expectedBuckets.map((r) => r.source).join("|"), "i"),
      `${box.id} should use conservative bucket language`
    );
  }
});

test("DGX Spark carries a separate official workload claim alongside the heuristic", async () => {
  const { featuredHardware } = await import(new URL("data.js", jsDir));
  const dgx = featuredHardware.find((box) => box.id === "dgx-spark");

  assert.ok(dgx, "missing dgx-spark featured hardware entry");
  assert.equal(typeof dgx.officialModelFit, "string", "dgx-spark needs an official workload claim");
  assert.match(dgx.officialModelFit, /NVIDIA's official workload claim/i);
  assert.match(dgx.officialModelFit, /200B parameters/i);
  assert.match(dgx.officialModelFit, /70B parameters/i);
  assert.match(dgx.officialModelFit, /405B parameters/i);
  assert.match(dgx.officialModelFit, /not a benchmark/i);
  assert.match(dgx.modelFit, /30B-class quantized models/i);
  assert.match(dgx.modelFit, /70B-class quantized/i);
  assert.notEqual(dgx.officialModelFit, dgx.modelFit, "official claim stays separate from heuristic guidance");
});

test("featured hardware cards carry a numeric tokens/sec throughput range", async () => {
  const { featuredHardware } = await import(new URL("data.js", jsDir));

  for (const box of featuredHardware) {
    assert.ok(box.tokensPerSecond, `${box.id} needs a tokensPerSecond range`);
    assert.equal(
      typeof box.tokensPerSecond,
      "object",
      `${box.id} tokensPerSecond should be an object`
    );
    const { low, high } = box.tokensPerSecond;
    assert.equal(typeof low, "number", `${box.id} tokensPerSecond.low must be numeric`);
    assert.equal(typeof high, "number", `${box.id} tokensPerSecond.high must be numeric`);
    assert.ok(Number.isFinite(low), `${box.id} tokensPerSecond.low must be finite`);
    assert.ok(Number.isFinite(high), `${box.id} tokensPerSecond.high must be finite`);
    assert.ok(
      low <= high,
      `${box.id} tokensPerSecond.low should not exceed tokensPerSecond.high`
    );
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

test("Mac Studio carries an official vendor financing example", async () => {
  const { hardware } = await import(new URL("data.js", jsDir));
  const macStudio = hardware.find((h) => h.id === "mac-studio");
  assert.ok(macStudio, "missing mac-studio hardware entry");

  assert.ok(macStudio.financingExample, "Mac Studio should expose a financing example");
  assert.match(
    macStudio.financingExample.summary,
    /\$208\.25\/mo for 12 months/i,
    "Mac Studio financing example should cite the purchase payment"
  );
  assert.match(
    macStudio.financingExample.summary,
    /\$48\.99\/mo for 36 months/i,
    "Mac Studio financing example should cite the lease example"
  );
  assert.equal(
    macStudio.financingExample.sourceUrl,
    macStudio.sourceUrl,
    "Mac Studio financing example should point at the same Apple buy page"
  );
});

test("featured hardware cards use real product-photo assets instead of SVG illustrations", async () => {
  const { featuredHardware } = await import(new URL("data.js", jsDir));

  for (const box of featuredHardware) {
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

test("featured hardware trims seed the documented default preload", async () => {
  const { hardware, featuredHardware, hardwareTrims, defaultHardwareTrim } = await import(
    new URL("data.js", jsDir)
  );

  // Only the top-level class cards are featured; named SKUs are trims, not cards.
  const featuredIds = featuredHardware.map((box) => box.id);
  assert.deepEqual(featuredIds, ["mac-studio", "dgx-spark", "strix-halo"]);
  assert.ok(
    featuredHardware.every((box) => !box.exampleOf),
    "featured cards never include example SKUs"
  );

  for (const box of featuredHardware) {
    const trims = hardwareTrims(box);
    assert.ok(trims.length >= 1, `${box.id} exposes at least one trim`);

    // The default trim honors each card's documented preload: Mac Studio and
    // Strix Halo default to their low-end config, while DGX Spark now preloads
    // the Seeed Studio listing that matches the base-platform estimate.
    const def = defaultHardwareTrim(box);
    assert.equal(
      def.boxPrice,
      box.defaultBoxPrice ?? box.priceLow,
      `${box.id} default trim matches its documented preload`
    );

    // A range-based card shares one power draw across trims; the range reflects
    // configuration/street-price spread, not a distinct power figure.
    if (!hardware.some((entry) => entry.exampleOf === box.id) && box.priceLow !== box.priceHigh) {
      const draws = new Set(trims.map((trim) => trim.powerDraw));
      assert.equal(draws.size, 1, `${box.id} range trims share one power draw`);
      const prices = trims.map((trim) => trim.boxPrice);
      assert.deepEqual(
        prices,
        [box.priceLow, box.priceHigh],
        `${box.id} range trims change which box price is loaded`
      );
    }
  }

  // DGX Spark's default preload now pins the Seeed Studio listing at the base
  // platform estimate, not the old high-end-only assumption.
  const dgx = featuredHardware.find((box) => box.id === "dgx-spark");
  assert.equal(defaultHardwareTrim(dgx).id, "seeed-dgx-spark", "DGX Spark defaults to the Seeed Studio listing");
  assert.equal(defaultHardwareTrim(dgx).boxPrice, 3999, "DGX Spark defaults to the $3,999 listing");
  assert.equal(dgx.priceHigh, 6030, "DGX Spark card summary spans the highest listed retailer trim");
  assert.deepEqual(
    hardwareTrims(dgx).map((trim) => trim.id),
    [
      "seeed-dgx-spark",
      "asus-ascent-gx10",
      "pny-dgx-spark",
      "hp-zgx-nano-g1n-2tb",
      "hp-zgx-nano-g1n-4tb",
      "acer-veriton-vgn100-ud11",
      "gigabyte-ai-top-atom",
      "msi-edgexpert",
    ],
    "DGX Spark trims surface the current named retailer offers"
  );

  // Strix Halo's trims are its named purchasable SKUs, defaulting to Framework.
  const strix = featuredHardware.find((box) => box.id === "strix-halo");
  const strixTrims = hardwareTrims(strix);
  assert.deepEqual(
    strixTrims.map((trim) => trim.id),
    [
      "framework-desktop-ai-max-385-32gb",
      "gmktec-evo-x2",
      "gmktec-evo-x3",
      "minisforum-ms-s1-max-64gb",
      "minisforum-ms-s1-max-mini-pc",
    ],
    "Strix Halo trims are its named SKUs"
  );
  assert.equal(defaultHardwareTrim(strix).id, "framework-desktop-ai-max-385-32gb");
});

test("DGX Spark retailer trims are modeled as named DGX Spark-class listings", async () => {
  const { hardware } = await import(new URL("data.js", jsDir));
  const byId = new Map(hardware.map((h) => [h.id, h]));

  const expected = [
    {
      id: "seeed-dgx-spark",
      name: "Seeed Studio NVIDIA DGX Spark",
      price: 3999,
      sourceUrl: "https://www.seeedstudio.com/NVIDIA-DGX-Spark-p-6611.html",
      sourceLabel: "Seeed Studio listing",
      spec: "GB10 Grace Blackwell desktop, 128 GB unified memory",
    },
    {
      id: "asus-ascent-gx10",
      name: "ASUS Ascent GX10",
      price: 3970.99,
      priceHigh: 4999.99,
      sourceUrl: "https://www.newegg.com/asus-ascent-gx10-mini-pc/p/N82E16859110044",
      sourceLabel: "Newegg street price",
      spec: "NVIDIA GB10 / DGX Spark-class system, 128 GB LPDDR5x unified memory, 1 TB SSD",
    },
    {
      id: "pny-dgx-spark",
      name: "PNY NVIDIA DGX Spark",
      price: 5199.99,
      sourceUrl:
        "https://www.newegg.com/pny-technologies-inc-dgx-personal-ai-computer-20-core-arm-10-cortex-x925-10-cortex-a725-arm-nvdgxspark-pb/p/N82E16856987001",
      sourceLabel: "Newegg street price",
      spec: "NVIDIA GB10 Grace Blackwell, 128 GB LPDDR5x, 4 TB NVMe",
    },
    {
      id: "hp-zgx-nano-g1n-2tb",
      name: "HP ZGX Nano G1n AI Station",
      price: 5399.63,
      sourceUrl: "https://www.newegg.com/p/pl?d=HP+ZGX+Nano",
      sourceLabel: "Newegg street price",
      spec: "NVIDIA GB10 Grace Blackwell Superchip, 128 GB coherent unified memory, 2 TB SSD",
    },
    {
      id: "hp-zgx-nano-g1n-4tb",
      name: "HP ZGX Nano G1n AI Station",
      price: 6030,
      sourceUrl: "https://www.newegg.com/p/pl?d=HP+ZGX+Nano",
      sourceLabel: "Newegg street price",
      spec: "NVIDIA GB10 Grace Blackwell Superchip, 128 GB coherent unified memory, 4 TB SSD",
    },
    {
      id: "acer-veriton-vgn100-ud11",
      name: "Acer Veriton VGN100-UD11",
      price: 5199,
      sourceUrl: "https://www.newegg.com/p/pl?d=Acer+Veriton+VGN100-UD11",
      sourceLabel: "Newegg street price",
      spec: "NVIDIA GB10 Grace Blackwell Superchip, 128 GB unified memory, 4 TB SSD",
    },
    {
      id: "gigabyte-ai-top-atom",
      name: "GIGABYTE AI TOP ATOM",
      price: 4999.99,
      priceHigh: 5999.99,
      sourceUrl: "https://www.newegg.com/p/pl?d=GIGABYTE+AI+TOP+ATOM",
      sourceLabel: "Newegg street price",
      spec: "NVIDIA GB10 Grace Blackwell Superchip, 128 GB unified memory, 4 TB SSD",
    },
    {
      id: "msi-edgexpert",
      name: "MSI EdgeXpert",
      price: 5339.99,
      priceHigh: 6136.99,
      sourceUrl: "https://www.newegg.com/p/pl?d=MSI+EdgeXpert",
      sourceLabel: "Newegg street price",
      spec: "NVIDIA GB10 Grace Blackwell Superchip, 128 GB unified memory",
    },
  ];

  for (const { id, name, price, priceHigh, sourceUrl, sourceLabel, spec } of expected) {
    const box = byId.get(id);
    assert.ok(box, `missing ${id} hardware entry`);
    assert.equal(box.name, name, `${id} uses the expected product name`);
    assert.equal(box.priceLow, price, `${id} priceLow`);
    assert.equal(box.defaultBoxPrice, price, `${id} defaultBoxPrice`);
    assert.equal(box.sourceUrl, sourceUrl, `${id} source URL`);
    assert.equal(box.sourceLabel, sourceLabel, `${id} source label`);
    assert.equal(box.verification, "retailer", `${id} is a retailer listing`);
    assert.equal(box.exampleOf, "dgx-spark", `${id} stays a DGX Spark trim`);
    assert.equal(box.spec, spec, `${id} spec`);
    assert.equal(box.powerDraw, 240, `${id} power draw stays on the DGX Spark class`);
    if (typeof priceHigh === "number") {
      assert.equal(box.priceHigh, priceHigh, `${id} priceHigh`);
      assert.ok(box.priceHigh > box.priceLow, `${id} records a retailer price band`);
    } else {
      assert.equal(box.priceHigh, price, `${id} priceHigh`);
    }
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
    /GMKtec EVO-X2, GMKtec EVO-X3, and MINISFORUM MS-S1 MAX 64GB \/ 128GB/i,
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

test("DGX Spark CTA is NVIDIA's official Marketplace Buy Now path, not an affiliate link", async () => {
  const { getAffiliate } = await import(new URL("data.js", jsDir));
  const cta = getAffiliate("dgx-spark");
  assert.ok(cta, "missing dgx-spark CTA");

  // Issue #51: DGX Spark points at NVIDIA's official Marketplace Buy Now page,
  // so the CTA is a direct official purchase path rather than a commissioned
  // reseller link. Pins the destination so a stale retailer link cannot recur.
  assert.equal(cta.url, "https://marketplace.nvidia.com/en-us/enterprise/personal-ai-supercomputers/dgx-spark/");
  assert.equal(cta.vendor, "NVIDIA");
  assert.equal(cta.label, "Buy on NVIDIA Marketplace");
  assert.equal(cta.affiliate, false, "official Marketplace path is non-affiliate");
  assert.ok(
    !cta.url.includes("newegg.com"),
    "no longer routes DGX Spark through the Newegg retailer search"
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
      "https://frame.work/products/desktop-diy-amd-aimax300/configuration/new",
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
    [
      "minisforum-ms-s1-max-64gb",
      2599,
      "64GB RAM + 2TB SSD",
      "https://store.minisforum.com/products/minisforum-ms-s1-max-64gb",
      "https://store.minisforum.com/products/minisforum-ms-s1-max-64gb",
      "MINISFORUM",
      "MINISFORUM MS-S1 MAX 64GB Local AI Pilot Edition",
    ],
    [
      "minisforum-ms-s1-max-mini-pc",
      3719,
      "128GB RAM + 2TB SSD",
      "https://store.minisforum.com/products/minisforum-ms-s1-max-mini-pc",
      "https://store.minisforum.com/products/minisforum-ms-s1-max-mini-pc",
      "MINISFORUM",
      "MINISFORUM MS-S1 MAX 128GB Max AI Compute Edition",
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
    assert.match(box.sourceUrl, /^https:\/\/(frame\.work|www\.gmktec\.com|store\.minisforum\.com)\//, `${id} points at the official product page`);
    // Pins the live product URLs so stale source links cannot recur silently.
    assert.equal(box.sourceUrl, sourceUrl, `${id} points at the current live product page`);
    assert.equal(getAffiliate(id)?.vendor, vendor, `${id} has ${vendor} affiliate metadata`);
    assert.equal(getAffiliate(id)?.url, affiliateUrl, `${id} affiliate CTA points at the expected destination`);
    assert.equal(box.exampleOf, "strix-halo", `${id} is tagged as a Strix Halo example`);
    if (id.startsWith("framework-")) {
      // The source URL is a configuration page, so the label must match rather than
      // claim a generic "product page"; pins the wording so the mismatch cannot recur.
      assert.equal(
        box.sourceLabel,
        "Official Framework configuration page",
        `${id} labels its source as the configuration page it links to`
      );
    }
  }
});

test("Framework Desktop uses the official non-affiliate CTA", async () => {
  const { getAffiliate } = await import(new URL("data.js", jsDir));
  assert.equal(
    getAffiliate("framework-desktop-ai-max-385-32gb")?.affiliate,
    false,
    "Framework Desktop uses the official non-affiliate CTA"
  );
});

test("RTX PRO 6000 Blackwell is modeled as a reference-only high-end workstation class", async () => {
  const { hardware, featuredHardware, getAffiliate } = await import(
    new URL("data.js", jsDir)
  );
  const box = hardware.find((h) => h.id === "rtx-pro-6000-blackwell");
  assert.ok(box, "missing rtx-pro-6000-blackwell hardware entry");

  // A reference class: listed in the full comparison/pricing data for high-end
  // context, but never promoted to a featured card and never seeding the form.
  assert.equal(box.referenceOnly, true, "flagged as a reference-only class");
  assert.ok(
    !featuredHardware.some((entry) => entry.id === box.id),
    "reference-only class stays out of the featured cards"
  );

  // Retailer-derived range from in-stock listings, with the build-required
  // workstation/component caveat and 96 GB VRAM spec made explicit.
  assert.equal(box.verification, "retailer");
  assert.equal(box.priceLow, 18199);
  assert.equal(box.priceHigh, 23999);
  assert.match(box.spec, /96 GB/i, "names the 96 GB VRAM");
  assert.match(box.priceNote, /build-required|workstation/i, "flags the build caveat");
  assert.match(box.priceNote, /power draw/i, "makes the power assumption explicit");
  assert.equal(box.sourceUrl, "https://www.newegg.com/p/pl?d=RTX+PRO+6000+Blackwell");
  assert.match(box.lastUpdated, /^\d{4}-\d{2}-\d{2}$/);

  // Its comparison-table CTA still resolves through the affiliate map.
  const cta = getAffiliate(box.id);
  assert.ok(cta, "missing RTX PRO 6000 affiliate CTA");
  assert.equal(cta.vendor, "NVIDIA");
  assert.equal(cta.url, "https://www.nvidia.com/en-us/products/workstations/");
});

test("Codex points at a specific OpenAI pricing page and is marked official", async () => {
  const { subscriptions } = await import(new URL("data.js", jsDir));
  const codex = subscriptions.find((s) => s.id === "codex");
  assert.ok(codex, "missing codex subscription entry");
  assert.equal(codex.sourceUrl, "https://chatgpt.com/pricing/");
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

  // getAffiliate resolves a CTA for every featured box.
  for (const box of data.featuredHardware) {
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

  const irrelevantHash = state.readShareParams({
    hash: "#section=pricing",
    search: "?boxPrice=4200&subs=codex",
  });
  assert.equal(
    irrelevantHash,
    "boxPrice=4200&subs=codex",
    "a non-share fragment with `=` must not shadow a valid query-string share link"
  );

  const blankHash = state.readShareParams({
    hash: "#boxPrice=",
    search: "?boxPrice=4200&subs=codex",
  });
  assert.equal(
    blankHash,
    "boxPrice=4200&subs=codex",
    "a blank known-key fragment must not shadow a valid query-string share link"
  );

  const invalidNumericHash = state.readShareParams({
    hash: "#boxPrice=abc",
    search: "?boxPrice=4200&subs=codex",
  });
  assert.equal(
    invalidNumericHash,
    "boxPrice=4200&subs=codex",
    "an invalid numeric hash fragment must not shadow a valid query-string share link"
  );

  const blankCustomSpendHash = state.readShareParams({
    hash: "#customSpend=",
    search: "?customSpend=75",
  });
  assert.equal(
    blankCustomSpendHash,
    "customSpend=",
    "an explicit blank custom-spend hash fragment should still take precedence"
  );

  // A valid hash scenario takes precedence over any query string present on the
  // same URL, so the canonical hash-based share link always wins.
  const hashOverQuery = state.readShareParams({
    hash: "#boxPrice=4200",
    search: "?boxPrice=1000",
  });
  assert.equal(hashOverQuery, "boxPrice=4200");
  assert.equal(state.parseState(hashOverQuery).boxPrice, 4200);

  const hashPrecedence = state.readShareParams({
    hash: "#boxPrice=4200&subs=codex",
    search: "?boxPrice=3000&subs=claude-code",
  });
  assert.equal(hashPrecedence, "boxPrice=4200&subs=codex");
  const parsedHashPrecedence = state.parseState(hashPrecedence);
  assert.equal(parsedHashPrecedence.boxPrice, 4200);
  assert.deepEqual(parsedHashPrecedence.subscriptions, ["codex"]);

  const trimmedSubs = state.parseState("subs=codex,%20claude-code,%20", {
    subscriptions: [],
  });
  assert.deepEqual(
    trimmedSubs.subscriptions,
    ["codex", "claude-code"],
    "trims incidental whitespace around comma-separated subscription ids"
  );

  // buildShareUrl strips a trailing index file from the path, but leaves the
  // rest of the pathname logic unchanged.
  assert.equal(
    state.buildShareUrl({ origin: "https://payback.example", pathname: "/index.html" }, "boxPrice=4200"),
    "https://payback.example/#boxPrice=4200"
  );
  assert.equal(
    state.buildShareUrl(
      { origin: "https://payback.example", pathname: "/ai-subscription-payback/index.html" },
      "boxPrice=4200"
    ),
    "https://payback.example/ai-subscription-payback/#boxPrice=4200",
    "strips a trailing /index.html from a project-path pathname"
  );
  assert.equal(
    state.buildShareUrl(
      { origin: "https://payback.example", pathname: "/ai-subscription-payback/index.htm" },
      "boxPrice=4200"
    ),
    "https://payback.example/ai-subscription-payback/#boxPrice=4200",
    "strips a trailing /index.htm as well"
  );
  // Query/hash canonicalization is otherwise unchanged: a directory pathname is
  // left intact, and "index" that is not the trailing filename is preserved.
  assert.equal(
    state.buildShareUrl({ origin: "https://payback.example", pathname: "/ai-subscription-payback/" }, "boxPrice=4200"),
    "https://payback.example/ai-subscription-payback/#boxPrice=4200",
    "leaves an already-canonical directory URL unchanged"
  );
  assert.equal(
    state.buildShareUrl(
      { origin: "https://payback.example", pathname: "/index.html-guide/thing.html" },
      "boxPrice=4200"
    ),
    "https://payback.example/index.html-guide/thing.html#boxPrice=4200",
    "only strips index.html when it is the trailing filename"
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
  assert.equal(state.formatCurrency(0.17), "$0");
  assert.equal(state.formatRate(0.17), "$0.17");
  assert.equal(state.formatRate(1), "$1.00");
  assert.equal(state.formatRate(NaN), "—");
  assert.equal(state.formatBreakEven(null), "Not reached");
  assert.equal(state.formatBreakEven(12), "Month 12");
});
