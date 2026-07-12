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
