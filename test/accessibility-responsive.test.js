/**
 * Accessibility & responsive-support contracts.
 *
 * Dependency-free assertions over index.html and the stylesheet that pin the
 * signals the BDD specs (docs/bdd/accessibility.md, docs/bdd/responsive-design.md)
 * promise: a polite+atomic results region, a keyboard-focusable and labeled
 * comparison table, an advertised color-scheme, and the CSS media rules plus
 * full-width inputs that keep the layout usable across themes, motion
 * preferences, and phone-width viewports. No DOM or browser required.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const html = readFileSync(fileURLToPath(new URL("index.html", root)), "utf8");
const css = readFileSync(
  fileURLToPath(new URL("assets/css/styles.css", root)),
  "utf8"
);

/** Inner HTML of the element that carries the given id, or "" if absent. */
const elementWithId = (id) =>
  html.match(new RegExp(`<[^>]*\\bid="${id}"[^>]*>`, "i"))?.[0] ?? "";

test("results region announces updates politely and atomically", () => {
  // Screen readers must re-read the whole results block on change, not just the
  // one metric that mutated — so aria-live is polite and aria-atomic is true.
  const results = elementWithId("results");
  assert.ok(results, "index.html has an #results element");
  assert.match(results, /role="region"/i, "results is a landmark region");
  assert.match(results, /aria-live="polite"/i, "results announces politely");
  assert.match(results, /aria-atomic="true"/i, "results announces atomically");
});

test("comparison table wrapper is keyboard-focusable and labeled", () => {
  // A horizontally scrollable table must be reachable and operable by keyboard,
  // and expose an accessible name so its purpose is announced.
  const scroll =
    html.match(/<div\b[^>]*class="table-scroll"[^>]*>/i)?.[0] ?? "";
  assert.ok(scroll, "index.html has a .table-scroll wrapper");
  assert.match(scroll, /tabindex="0"/i, "wrapper is keyboard-focusable");
  assert.match(scroll, /role="region"/i, "wrapper is a landmark region");
  assert.match(
    scroll,
    /aria-labelledby="comparison-title"/i,
    "wrapper is labeled by the comparison heading"
  );
  assert.match(
    html,
    /id="comparison-title"/i,
    "the labelling heading exists"
  );
});

test("document advertises support for both color schemes", () => {
  // Both the head hint (for the UA/browser chrome) and the CSS declaration
  // (for native form controls, scrollbars, spinners) opt into light + dark.
  assert.match(
    html,
    /<meta[^>]+name="color-scheme"[^>]+content="light dark"/i,
    "head advertises color-scheme via meta"
  );
  assert.match(
    css,
    /color-scheme:\s*light dark/i,
    "stylesheet declares color-scheme"
  );
});

test("stylesheet honors reduced-motion preferences", () => {
  assert.match(
    css,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)/i,
    "has a prefers-reduced-motion: reduce block"
  );
});

test("stylesheet honors increased-contrast preferences", () => {
  assert.match(
    css,
    /@media\s*\(prefers-contrast:\s*more\)/i,
    "has a prefers-contrast: more block"
  );
});

test("number inputs are full-width for phone-friendly targets", () => {
  // Single-column mobile layout: number fields must fill their container so
  // they stay comfortable tap targets and never overflow.
  const rule =
    css.match(/input\[type="number"\]\s*\{[\s\S]*?\}/i)?.[0] ?? "";
  assert.ok(rule, "stylesheet has an input[type=number] rule");
  assert.match(rule, /width:\s*100%/i, "number inputs are width: 100%");
});
