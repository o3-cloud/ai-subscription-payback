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
import { serializeState, formatRate } from "../assets/js/state.js";

const root = new URL("../", import.meta.url);
const read = (rel) => readFileSync(fileURLToPath(new URL(rel, root)), "utf8");
const exists = (rel) => existsSync(fileURLToPath(new URL(rel, root)));

const homepage = read("index.html");
const sitemap = read("sitemap.xml");
const generated = buildGuides();

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const expectedGuideLinks = () =>
  generated.map((guide) => ({
    ...guide,
    href: `${SITE_URL}guides/${guide.slug}.html`,
  }));

test("the comparison-guide generator and committed files stay in sync", () => {
  assert.equal(GUIDES.length, 5, "expected five comparison mini-guides");
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
    assert.match(html, /Caveats &amp; software tradeoffs/i, `${guide.path} includes caveats`);
    assert.ok(html.includes('<p class="results-caveat">'), `${guide.path} includes the results caveat paragraph`);
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
