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
  ];
  for (const id of requiredIds) {
    assert.ok(ids.has(id), `missing id="${id}"`);
  }
});

test("results metrics expose the data-metric hooks", () => {
  for (const metric of ["breakeven", "payment", "savings"]) {
    assert.ok(metrics.has(metric), `missing data-metric="${metric}"`);
  }
});

test("primary navigation targets exist as sections", () => {
  for (const id of ["calculator", "comparison", "pricing", "methodology"]) {
    assert.ok(ids.has(id), `missing section id="${id}"`);
  }
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
