/**
 * Launch-copy documentation checks.
 *
 * Keeps the social-post snippets aligned with the current hardware lineup so we
 * do not advertise an outdated hardware set after adding named Strix Halo
 * examples.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const read = (rel) => readFileSync(fileURLToPath(new URL(rel, root)), "utf8");

const launchCopy = read("docs/launch-copy.md");
const launchCopyBdd = read("docs/bdd/launch-copy.md");

const CANONICAL_URL = "https://www.othree.cloud/ai-subscription-payback/";

// Split the doc into its `##` sections so each shareable social snippet can be
// checked on its own. Snippets that carry a share link are the social posts we
// hand to platforms; the exact-URL assertion also fences out tracking
// parameters and the legacy `*.github.io` origin.
const shareSnippets = launchCopy
  .split(/^## /m)
  .slice(1)
  .map((block) => {
    const newline = block.indexOf("\n");
    return { heading: block.slice(0, newline).trim(), body: block.slice(newline + 1) };
  })
  .filter((section) => /https?:\/\//.test(section.body));

test("launch copy heading uses the official site name", () => {
  const heading = launchCopy.split(/\r?\n/)[0];
  assert.match(
    heading,
    /^#\s+AI Subscription Payback\b/,
    "launch-copy heading must lead with the official site name 'AI Subscription Payback'"
  );
  assert.doesNotMatch(
    launchCopy,
    /AI Box Payback/i,
    "launch copy must not use the legacy 'AI Box Payback' name"
  );
});

test("launch copy reflects the current featured hardware lineup", () => {
  assert.match(launchCopy, /Mac Studio/i, "keeps Mac Studio in the launch copy");
  assert.match(launchCopy, /DGX Spark/i, "keeps DGX Spark in the launch copy");
  assert.match(launchCopy, /Strix Halo/i, "keeps Strix Halo in the launch copy");
  assert.match(
    launchCopy,
    /ASUS Ascent GX10/i,
    "mentions the named ASUS Ascent GX10 DGX Spark example"
  );
  assert.match(
    launchCopy,
    /Framework Desktop AI Max 385/i,
    "mentions the named Framework Desktop Strix Halo example"
  );
});

test("each shareable social snippet uses the canonical URL and keeps the free tone", () => {
  assert.ok(
    shareSnippets.length > 0,
    "expected at least one social snippet carrying a share link"
  );
  for (const { heading, body } of shareSnippets) {
    const urls = body.match(/https?:\/\/\S+/g) ?? [];
    for (const url of urls) {
      assert.equal(
        url,
        CANONICAL_URL,
        `${heading} snippet must link to ${CANONICAL_URL} exactly`
      );
    }
    assert.match(
      body,
      /free/i,
      `${heading} snippet keeps the free-calculator tone`
    );
  }
});

// The dedicated BDD (docs/bdd/launch-copy.md) is the behavior spec for the copy
// above; keep the two aligned so the spec cannot drift from what it documents.
test("the launch-copy BDD stays aligned with the launch copy", () => {
  assert.match(
    launchCopyBdd,
    /^# Feature: Launch Copy Snippets$/m,
    "launch-copy BDD must declare the Launch Copy Snippets feature"
  );
  assert.ok(
    launchCopyBdd.includes(CANONICAL_URL),
    "launch-copy BDD must document the canonical share URL"
  );
  assert.doesNotMatch(
    launchCopyBdd,
    /AI Box Payback/i,
    "launch-copy BDD must not reference the legacy 'AI Box Payback' name"
  );
  for (const hardware of ["Mac Studio", "DGX Spark", "Strix Halo", "ASUS Ascent GX10", "Framework Desktop AI Max 385"]) {
    assert.ok(
      launchCopyBdd.includes(hardware),
      `launch-copy BDD must name the featured hardware "${hardware}"`
    );
  }
});
