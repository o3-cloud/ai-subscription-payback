/**
 * 404 fallback checks.
 *
 * Fast, dependency-free assertions over 404.html — the page GitHub Pages serves
 * for any unmatched path under the project subpath. These guard that the
 * fallback is a real, styled, indexing-safe page that routes visitors back to
 * the calculator, using root-absolute paths that survive deep-link URLs.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const path = fileURLToPath(new URL("404.html", root));

test("a 404.html fallback exists at the site root", () => {
  assert.ok(existsSync(path), "404.html is missing from the site root");
});

test("404.html is a valid HTML document", () => {
  const html = readFileSync(path, "utf8");
  assert.match(html, /^\s*<!DOCTYPE html>/i, "starts with a doctype");
  assert.match(html, /<html[^>]*lang="en"/i, "declares a language");
  assert.match(html, /<\/html>\s*$/i, "closes the html element");
});

test("404.html tells search engines not to index the fallback", () => {
  const html = readFileSync(path, "utf8");
  assert.match(
    html,
    /<meta[^>]+name="robots"[^>]+content="[^"]*noindex[^"]*"/i,
    "marks the fallback noindex so it never stands in for real content"
  );
});

test("404.html uses the official site name in its title, brand, and footer", () => {
  const html = readFileSync(path, "utf8");
  assert.match(html, /<title[^>]*>[^<]*AI Subscription Payback[^<]*<\/title>/i, "404 title uses the official site name");
  assert.match(html, /<a[^>]+class="brand"[^>]*>AI Subscription Payback<\/a>/i, "404 header brand uses the official site name");
  assert.match(html, /<strong>AI Subscription Payback<\/strong>/i, "404 footer uses the official site name");
});

test("404.html reuses the site stylesheet with a subpath-safe path", () => {
  const html = readFileSync(path, "utf8");
  // GitHub Pages serves this file for deep links at any depth, so a relative
  // (./assets) path would 404. The path must be root-absolute and include the
  // project base.
  assert.match(
    html,
    /<link[^>]+rel="stylesheet"[^>]+href="\/ai-subscription-payback\/assets\/css\/styles\.css"/i,
    "links the shared stylesheet with a base-qualified absolute path"
  );
});

test("404.html declares a favicon so browsers don't auto-request /favicon.ico", () => {
  const html = readFileSync(path, "utf8");
  // A soft 404 without an icon still triggers a browser request for the
  // default /favicon.ico, which then 404s again. Declare the bundled favicon
  // with a base-qualified absolute path so it resolves at any deep-link depth.
  assert.match(
    html,
    /<link[^>]+rel="icon"[^>]+href="\/ai-subscription-payback\/assets\/img\/favicon\.svg"/i,
    "links the bundled favicon so no /favicon.ico request is made"
  );
});

test("404.html routes visitors back to the calculator home", () => {
  const html = readFileSync(path, "utf8");
  assert.match(
    html,
    /<a[^>]+class="button button-primary"[^>]+href="\/ai-subscription-payback\/"/i,
    "offers a primary link back to the site root"
  );
});

test("404.html links use base-qualified absolute paths, not relative ones", () => {
  const html = readFileSync(path, "utf8");
  // Every href/src must be root-absolute (or an in-page anchor) so it resolves
  // the same no matter how deep the missing URL was.
  const refs = [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  const relative = refs.filter(
    (ref) => !ref.startsWith("/") && !ref.startsWith("#")
  );
  assert.deepEqual(
    relative,
    [],
    `found relative references that break for deep links: ${relative.join(", ")}`
  );
});
