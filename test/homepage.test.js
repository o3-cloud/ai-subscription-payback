/**
 * Homepage scaffold checks.
 *
 * Fast, dependency-free assertions over index.html. These guard the structural
 * contract the client scripts rely on (mount-point ids) and the document head
 * wiring (stylesheet + ES module entry point), without a DOM or browser.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const html = readFileSync(fileURLToPath(new URL("index.html", root)), "utf8");

/** Collect every value of an attribute into an array (document order). */
const attrValues = (attr) =>
  [...html.matchAll(new RegExp(`\\b${attr}="([^"]+)"`, "g"))].map((m) => m[1]);

const idList = attrValues("id");
const ids = new Set(idList);
const metrics = new Set(attrValues("data-metric"));

test("index.html is a valid HTML document", () => {
  assert.match(html, /^\s*<!DOCTYPE html>/i, "starts with a doctype");
  assert.match(html, /<html[^>]*lang="en"/i, "declares a language");
  assert.match(html, /<\/html>\s*$/i, "closes the html element");
});

test("head wires the stylesheet and ES module entry point", () => {
  assert.match(
    html,
    /<link[^>]+rel="stylesheet"[^>]+href="\.\/assets\/css\/styles\.css"/i,
    "links the stylesheet"
  );
  assert.match(
    html,
    /<script[^>]+type="module"[^>]+src="\.\/assets\/js\/main\.js"/i,
    "loads main.js as an ES module"
  );
});

test("head loads Plausible in manual mode so pageviews stay DNT-gated", () => {
  // analytics.js sends the pageview itself (plausible('pageview')) through its
  // Do-Not-Track check. The default script.js also auto-fires a pageview on
  // load, which would double-count and bypass DNT — so we must use the manual
  // build, whose only pageview is the one our code sends.
  assert.match(
    html,
    /<script[^>]+data-domain="[^"]+"[^>]+src="https:\/\/plausible\.io\/js\/script\.manual\.js"/i,
    "loads plausible script.manual.js"
  );
  assert.doesNotMatch(
    html,
    /src="https:\/\/plausible\.io\/js\/script\.js"/i,
    "does not load the auto-pageview script.js"
  );
});

test("document ids are unique", () => {
  // Duplicate ids make getElementById results ambiguous for the scripts.
  assert.equal(ids.size, idList.length, "an id is used more than once");
});

test("scaffold exposes the ids the scripts mount onto", () => {
  // Ids read/written by calculator.js — a missing one silently breaks the UI.
  const requiredIds = [
    "calculator-form",
    "subscription-options",
    "results-status",
    "comparison-body",
    "pricing-list",
    "pricing-last-updated",
    "site-last-updated",
    "assumptions-list",
    "share-button",
    "featured-hardware",
    "featured-hardware-cards",
    "featured-hardware-status",
  ];
  for (const id of requiredIds) {
    assert.ok(ids.has(id), `missing id="${id}"`);
  }
});

test("no orphaned featured-cards mount ships a dead fallback", () => {
  // Only #featured-hardware-cards is wired up by calculator.js. An earlier
  // #featured / #featured-cards block was never populated, so its fallback text
  // shipped as a permanent placeholder. Guard against it (or a look-alike)
  // coming back.
  assert.ok(!ids.has("featured-cards"), "orphaned id=\"featured-cards\" removed");
  assert.ok(!ids.has("featured"), "orphaned id=\"featured\" section removed");
  assert.doesNotMatch(
    html,
    /Featured hardware cards load from pricing data\./i,
    "dead featured-card fallback text removed"
  );
});

test("primary nav Hardware link targets the wired-up featured section", () => {
  // The nav must point at the section calculator.js actually populates, not the
  // removed orphan anchor.
  assert.match(
    html,
    /<a[^>]+href="#featured-hardware"[^>]*>\s*Hardware\s*<\/a>/i,
    "Hardware nav link targets #featured-hardware"
  );
  assert.doesNotMatch(
    html,
    /href="#featured"/i,
    "no link targets the removed #featured anchor"
  );
});

test("results metrics expose the data-metric hooks", () => {
  for (const metric of ["breakeven", "payment", "savings"]) {
    assert.ok(metrics.has(metric), `missing data-metric="${metric}"`);
  }
});

test("results area includes the capability caveat and privacy note", () => {
  assert.match(
    html,
    /<p class="results-caveat">[\s\S]*Cost comparison only[\s\S]*may not replace hosted[\s\S]*frontier model quality[\s\S]*managed workflows[\s\S]*Not financial advice\.[\s\S]*<\/p>/i,
    "results area states the comparison is cost-only and may not match capability"
  );
  assert.match(
    html,
    /<p class="share-note">[\s\S]*Shared links include your inputs in the URL hash[\s\S]*Don't share sensitive scenarios\.[\s\S]*<\/p>/i,
    "share area explains the privacy implications of shared links"
  );
});

test("results area ships an accessible chart and data table", () => {
  // The chart container is a labeled image region with a data-table equivalent
  // underneath, so the visuals and accessible numbers stay in sync.
  assert.ok(ids.has("cost-chart"), "chart mount point present");
  assert.match(
    html,
    /<div[^>]+id="cost-chart"[^>]+role="img"/i,
    "chart container is an aria-labeled role=img"
  );
  assert.ok(ids.has("cost-table"), "accessible data table present");
  for (const heading of ["Month", "Subscription cost", "Ownership cost"]) {
    assert.match(
      html,
      new RegExp(`<th[^>]*>\\s*${heading}\\s*</th>`, "i"),
      `data table has a "${heading}" column`
    );
  }
});

test("share controls sit above the long month-by-month table", () => {
  // Issue #26: the copy/share CTA must be discoverable near the results summary
  // rather than buried below the long table, so it appears first in the source.
  const shareIdx = html.indexOf('id="share-button"');
  const tableIdx = html.indexOf('id="cost-table"');
  assert.ok(shareIdx !== -1, "share button is present");
  assert.ok(tableIdx !== -1, "cost table is present");
  assert.ok(
    shareIdx < tableIdx,
    "share controls appear before the month-by-month cost table"
  );

  // The results caveat separates the summary metrics from the share CTA, so the
  // CTA reads as attached to the results, not the table.
  const caveatIdx = html.indexOf('class="results-caveat"');
  assert.ok(caveatIdx !== -1 && caveatIdx < shareIdx, "share CTA follows the results caveat");
});

test("the share button is a visible primary call to action", () => {
  const shareButton =
    html.match(/<button[^>]*id="share-button"[^>]*>/i)?.[0] ?? "";
  assert.ok(shareButton, "share button is present");
  assert.match(
    shareButton,
    /class="[^"]*\bbutton-primary\b[^"]*"/i,
    "share button is styled as a primary CTA"
  );
});

test("the long cost table is collapsed behind a toggle by default", () => {
  // The month-by-month table ships inside a <details> that is closed by default
  // (no `open` attribute) and toggled open on demand, while remaining in the DOM
  // as the accessible equivalent of the chart.
  const details =
    html.match(/<details[^>]*id="cost-table-details"[^>]*>/i)?.[0] ?? "";
  assert.ok(details, "cost table is wrapped in a <details> element");
  assert.doesNotMatch(details, /\bopen\b/i, "the table is collapsed by default");
  assert.match(
    html,
    /<details[^>]*id="cost-table-details"[^>]*>\s*<summary[^>]*>[\s\S]*?<\/summary>/i,
    "the details exposes a summary toggle to show all months"
  );
  // The table itself still lives inside the details, so it is reachable via the
  // toggle rather than dropped from the page.
  const detailsBlock =
    html.match(/<details[^>]*id="cost-table-details"[^>]*>([\s\S]*?)<\/details>/i)?.[1] ?? "";
  assert.match(detailsBlock, /id="cost-table"/i, "the cost table is inside the collapsible details");
});

test("primary navigation targets exist as sections", () => {
  for (const id of ["calculator", "comparison", "pricing", "methodology"]) {
    assert.ok(ids.has(id), `missing section id="${id}"`);
  }
});

test("subscription helper copy names the Google AI and Devin coding-agent tiers", () => {
  // The checklist covers Google AI (Gemini / Jules / Antigravity) alongside the
  // other plans, so the helper text and pricing copy must surface them too.
  const help = html.match(/<p class="field-help">([\s\S]*?)<\/p>/i)?.[1] ?? "";
  assert.ok(help, "index.html has a subscription field-help paragraph");
  assert.match(help, /Google AI/i, "helper copy names Google AI");
  assert.match(help, /Gemini/i, "helper copy names Gemini");
  assert.match(help, /Jules/i, "helper copy names Jules");
  assert.match(help, /Antigravity/i, "helper copy names Antigravity");
  assert.match(help, /Amazon Q Developer/i, "helper copy names Amazon Q Developer");
  assert.match(help, /Devin/i, "helper copy names Devin");

  const pricing =
    html.match(/<section[^>]*id="pricing"[^>]*>([\s\S]*?)<\/section>/i)?.[1] ?? "";
  assert.match(
    pricing,
    /Google AI Pro and Ultra[\s\S]*?Jules[\s\S]*?Antigravity/i,
    "pricing copy explains Google AI Pro/Ultra bundle Jules and Antigravity"
  );
  assert.match(pricing, /Devin/i, "pricing disclosure mentions Devin tiers");
});

/** Inner HTML of the first <tag>...</tag> block, or "" if absent. */
const blockOf = (tag) =>
  html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] ?? "";

test("footer carries the site-wide last-updated disclosure", () => {
  // The site-wide freshness stamp lives in the footer as a machine-readable
  // <time>, kept separate from the pricing section's own freshness stamp.
  const footer = blockOf("footer");
  assert.ok(footer, "index.html has a <footer>");
  assert.match(footer, /Site last updated:/i, "footer labels the disclosure");
  assert.match(
    footer,
    /<time[^>]+id="site-last-updated"[^>]+datetime="[^"]*"/i,
    "footer stamp is a <time> with a datetime attribute"
  );
  // The pricing-freshness stamp must not leak into the footer.
  assert.doesNotMatch(
    footer,
    /id="pricing-last-updated"/i,
    "pricing-freshness stamp stays out of the footer"
  );
});

test("pricing section carries its own pricing-freshness disclosure", () => {
  // Distinct from the footer stamp: pricing freshness lives in the pricing
  // section as its own machine-readable <time>.
  const pricingSection =
    html.match(
      /<section[^>]*id="pricing"[^>]*>([\s\S]*?)<\/section>/i
    )?.[1] ?? "";
  assert.ok(pricingSection, "index.html has a #pricing section");
  assert.match(
    pricingSection,
    /Pricing last updated:/i,
    "pricing section labels the disclosure"
  );
  assert.match(
    pricingSection,
    /official, a retailer\/street price, or an estimate/i,
    "pricing disclosure explains the verification status legend"
  );
  assert.match(
    pricingSection,
    /<time[^>]+id="pricing-last-updated"[^>]+datetime="[^"]*"/i,
    "pricing stamp is a <time> with a datetime attribute"
  );
  // The site-wide stamp must not leak into the pricing section.
  assert.doesNotMatch(
    pricingSection,
    /id="site-last-updated"/i,
    "site-wide stamp stays out of the pricing section"
  );
});
