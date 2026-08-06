/**
 * Mini-guide coverage checks.
 *
 * The new comparison-guide pages are static HTML files generated from the same
 * curated data and payback math as the main calculator. These tests make sure
 * the committed files stay in lock-step with that generator and keep the
 * high-intent pages discoverable for both humans and crawlers.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { buildGuides, GUIDES, guideModel, SITE_URL } from "../scripts/build-guides.mjs";
import { serializeState, formatRate, formatCurrency } from "../assets/js/state.js";
import { tokenOutputValueAssumptions } from "../assets/js/data.js";

const root = new URL("../", import.meta.url);
const read = (rel) => readFileSync(fileURLToPath(new URL(rel, root)), "utf8");
const exists = (rel) => existsSync(fileURLToPath(new URL(rel, root)));

const homepage = read("index.html");
const sitemap = read("sitemap.xml");
const generated = buildGuides();

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const formatInteger = (value) => new Intl.NumberFormat("en-US").format(value);

const expectedGuideLinks = () =>
  generated.map((guide) => ({
    ...guide,
    href: `${SITE_URL}guides/${guide.slug}.html`,
  }));

test("the comparison-guide generator and committed files stay in sync", () => {
  assert.equal(GUIDES.length, 10, "expected ten comparison mini-guides");
  for (const guide of generated) {
    assert.ok(exists(guide.path), `${guide.path} is missing`);
    const committed = read(guide.path);
    assert.equal(committed, guide.html, `${guide.path} is stale and should be regenerated`);
  }
});

test("the homepage links to the guide hub and each published guide", () => {
  assert.match(homepage, /<section[^>]+id="guides"/i, "homepage has a guides section");
  assert.match(homepage, /<nav[^>]+aria-label="Primary"[\s\S]*href="#guides"/i, "primary nav links to the guide hub");
  for (const { slug, path } of generated) {
    const href = `./guides/${slug}.html`;
    assert.match(homepage, new RegExp(`<a[^>]+href="${escapeRegExp(href)}"`, "i"), `${path} is linked from the homepage`);
  }
});

test("the guides section links back to the main calculator", () => {
  // Isolate the guides section so the assertion can't be satisfied by the
  // header/nav "Calculator" link elsewhere on the page (per mini-guides.md).
  const section = homepage.match(/<section[^>]+id="guides"[\s\S]*?<\/section>/i);
  assert.ok(section, "homepage has a guides section");
  assert.match(
    section[0],
    /<a[^>]+href="#calculator"/i,
    "the guides section includes a CTA back to the main calculator"
  );
});

test("each mini-guide carries the required SEO and content structure", () => {
  for (const guide of generated) {
    const html = read(guide.path);
    const canonical = `${SITE_URL}guides/${guide.slug}.html`;
    const guideDef = GUIDES.find((g) => g.slug === guide.slug);
    assert.ok(guideDef, `missing guide definition for ${guide.slug}`);
    const expectedHash = serializeState(guideModel(guideDef).scenario);
    assert.equal(
      new URLSearchParams(expectedHash).get("customSpend"),
      "",
      `${guide.path} clears customSpend in its calculator CTA hash`
    );
    const expectedHtmlHash = expectedHash.replace(/&/g, "&amp;");

    assert.match(
      html,
      new RegExp(`<link[^>]+rel="canonical"[^>]+href="${escapeRegExp(canonical)}"`, "i"),
      `${guide.path} declares a canonical URL`
    );
    // Social cards must mirror the canonical URL so shared links resolve to the
    // same indexable page; assert both og:url and twitter:url point at it.
    assert.match(
      html,
      new RegExp(`<meta[^>]+property="og:url"[^>]+content="${escapeRegExp(canonical)}"`, "i"),
      `${guide.path} mirrors the canonical URL in og:url`
    );
    assert.match(
      html,
      new RegExp(`<meta[^>]+name="twitter:url"[^>]+content="${escapeRegExp(canonical)}"`, "i"),
      `${guide.path} mirrors the canonical URL in twitter:url`
    );
    assert.match(
      html,
      /AI Subscription Payback/i,
      `${guide.path} uses the official site name`
    );
    assert.doesNotMatch(
      html,
      /AI Box Payback/i,
      `${guide.path} does not use the legacy site name`
    );
    assert.match(
      html,
      new RegExp(`<meta[^>]+name="description"[^>]+content="${escapeRegExp(guideDef.description)}"`, "i"),
      `${guide.path} has a unique description`
    );
    // Guides ship from the guides/ subpath, so — like the homepage — they must
    // declare a favicon or the browser auto-requests a 404 /favicon.ico.
    const icon = html.match(/<link[^>]+rel="icon"[^>]+href="([^"]*)"/i);
    assert.ok(icon, `${guide.path} declares a <link rel="icon">`);
    const iconHref = icon[1];
    assert.ok(
      /^\.\.\/assets\//.test(iconHref),
      `${guide.path} favicon href should point at a bundled asset, got "${iconHref}"`
    );
    assert.ok(
      exists(iconHref.replace(/^\.\.\//, "")),
      `${guide.path} favicon asset ${iconHref} is missing`
    );
    assert.match(html, /<script[^>]+type="application\/ld\+json"[\s\S]*"@type":\s*"TechArticle"/i, `${guide.path} exposes TechArticle JSON-LD`);
    assert.match(html, /"@type":\s*"BreadcrumbList"/i, `${guide.path} exposes breadcrumb JSON-LD`);
    assert.match(html, /Price &amp; spec snapshot/i, `${guide.path} includes the source-backed snapshot`);
    assert.match(html, /Sample payback scenario/i, `${guide.path} includes a sample scenario`);
    const scenarioRate = guideModel(guideDef).scenario.electricityRate;
    assert.match(
      html,
      new RegExp(`${escapeRegExp(formatRate(scenarioRate))}/kWh`),
      `${guide.path} states the scenario electricity rate at cent precision in the prose`
    );
    const valueModel = guideModel(guideDef);
    const lowerAnnualTokens = Math.round(
      valueModel.box.tokensPerSecond.low * tokenOutputValueAssumptions.annualUtilizationSeconds
    );
    const upperAnnualTokens = Math.round(
      valueModel.box.tokensPerSecond.high * tokenOutputValueAssumptions.annualUtilizationSeconds
    );
    const lowerValueExact =
      (lowerAnnualTokens / 1_000_000) *
      tokenOutputValueAssumptions.frontierOutputPriceLowPerMillionTokens;
    const upperValueExact =
      (upperAnnualTokens / 1_000_000) *
      tokenOutputValueAssumptions.frontierOutputPriceHighPerMillionTokens;
    const lowerValue = Math.round(lowerValueExact);
    const upperValue = Math.round(upperValueExact);
    const monthlySubscription = valueModel.monthlySubscription;
    const lowerMonths = lowerValueExact / monthlySubscription;
    const upperMonths = upperValueExact / monthlySubscription;
    const formatMonths = (value) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
    assert.match(
      html,
      /24\/7 yearly token-output value estimate/i,
      `${guide.path} includes the yearly token-output value section`
    );
    assert.match(
      html,
      /360 days\/year/i,
      `${guide.path} spells out the 360-day annualization`
    );
    assert.match(
      html,
      new RegExp(`${escapeRegExp(formatInteger(lowerAnnualTokens))} tokens`),
      `${guide.path} includes the lower annual token output math`
    );
    assert.match(
      html,
      new RegExp(`${escapeRegExp(formatInteger(upperAnnualTokens))} tokens`),
      `${guide.path} includes the upper annual token output math`
    );
    assert.match(
      html,
      new RegExp(`${escapeRegExp(formatCurrency(lowerValue))} at ${escapeRegExp(formatCurrency(tokenOutputValueAssumptions.frontierOutputPriceLowPerMillionTokens))}/M tokens`),
      `${guide.path} converts the lower bound into frontier-output value`
    );
    assert.match(
      html,
      new RegExp(`${escapeRegExp(formatCurrency(upperValue))} at ${escapeRegExp(formatCurrency(tokenOutputValueAssumptions.frontierOutputPriceHighPerMillionTokens))}/M tokens`),
      `${guide.path} converts the upper bound into frontier-output value`
    );
    assert.match(
      html,
      new RegExp(`${escapeRegExp(formatMonths(lowerMonths))} months`),
      `${guide.path} shows the lower equivalent subscription spend in months`
    );
    assert.match(
      html,
      new RegExp(`${escapeRegExp(formatMonths(upperMonths))} months`),
      `${guide.path} shows the upper equivalent subscription spend in months`
    );
    assert.match(
      html,
      /Equivalent subscription spend/i,
      `${guide.path} compares the value band to subscription spend`
    );
    assert.match(
      html,
      /compact frontier helper[\s\S]*class/i,
      `${guide.path} includes the qualitative model-class mapping`
    );
    assert.match(
      html,
      /rate limiting, idle time, queueing, and thermal headroom/i,
      `${guide.path} documents the realized-value caveats`
    );
    assert.match(html, /Caveats &amp; software tradeoffs/i, `${guide.path} includes caveats`);
    assert.ok(html.includes('<p class="results-caveat">'), `${guide.path} includes the results caveat paragraph`);
    if (guide.slug === "dgx-spark-price-payback") {
      assert.match(html, /What models fit locally/i, `${guide.path} includes a dedicated model-fit section`);
      assert.match(html, /Vendor workload ceiling\./i, `${guide.path} labels the official workload claim as vendor-attributed`);
      assert.match(html, /200B parameters/i, `${guide.path} includes NVIDIA's 200B-parameter inference claim`);
      assert.match(html, /70B parameters/i, `${guide.path} includes NVIDIA's 70B-parameter fine-tuning claim`);
      assert.match(html, /405B parameters/i, `${guide.path} includes NVIDIA's 405B two-system claim`);
      assert.match(html, /separate estimate, not the vendor claim above/i, `${guide.path} keeps the heuristic separate from the official claim`);
      assert.match(html, /\$2,999–\$3,999/i, `${guide.path} keeps the base DGX Spark estimate visible`);
      assert.match(html, /Seeed Studio \$3,999 listing/i, `${guide.path} surfaces the current Seeed Studio listing`);
      assert.match(html, /PNY at \$5,199\.99/i, `${guide.path} surfaces the current PNY retailer context`);
    }
    assert.match(html, /Cost estimates only\.[\s\S]*Not\s+financial advice\./i, `${guide.path} states the comparison is cost-only and not financial advice`);
    assert.match(
      html,
      new RegExp(
        `<a[^>]+href="\.\./index\.html#${escapeRegExp(expectedHtmlHash)}"[^>]*>Open this scenario in the calculator<\/a>`,
        "i"
      ),
      `${guide.path} links back to the calculator with a preloaded scenario hash`
    );
  }
});

test("Strix Halo guides expose the named Framework Desktop and GMKtec purchasable examples", () => {
  for (const slug of [
    "claude-code-vs-local-ai-box-cost",
    "codex-vs-local-ai-box-cost",
    "strix-halo-ryzen-ai-max-workstation",
  ]) {
    const html = read(`guides/${slug}.html`);
    assert.match(html, /Concrete Strix Halo SKU examples/i, `${slug} includes the Strix Halo examples section`);
    assert.match(html, /Framework Desktop AI Max 385/i, `${slug} lists Framework Desktop`);
    assert.match(html, /GMKtec EVO-X2 AI Mini PC/i, `${slug} lists EVO-X2`);
    assert.match(html, /GMKtec EVO-X3 AI Mini PC/i, `${slug} lists EVO-X3`);
    assert.match(html, /64 GB RAM \+ 1 TB SSD/i, `${slug} names the EVO-X2 memory/storage config`);
    assert.match(html, /128 GB RAM \+ 2 TB SSD/i, `${slug} names the EVO-X3 memory/storage config`);
  }
});

test("the sitemap lists every published guide URL", () => {
  for (const { href } of expectedGuideLinks()) {
    assert.match(sitemap, new RegExp(`<loc>${escapeRegExp(href)}</loc>`), `${href} is missing from sitemap.xml`);
  }
});
