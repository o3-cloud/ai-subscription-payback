/**
 * MVP scope and commercial-model documentation checks.
 *
 * These assertions keep the repository's scope docs aligned: the README links
 * to the launch boundary, the PRD points to the BDD source of truth, and the
 * BDD index exposes the new scope file.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const read = (rel) => readFileSync(fileURLToPath(new URL(rel, root)), "utf8");
const exists = (rel) => existsSync(fileURLToPath(new URL(rel, root)));

const scopePath = "docs/bdd/mvp-scope.md";

const REQUIRED_PHRASES = [
  "MVP Scope and Commercial Model",
  "Mac Studio",
  "DGX Spark",
  "Strix Halo",
  "Codex",
  "Claude Code",
  "static GitHub Pages experience",
  "affiliate or reseller links",
  "affiliate relationships are clearly disclosed",
  "must not change calculator math",
  "no backend",
  "it does not require user accounts or saved profiles",
  "it does not provide tax, accounting, or financial advice",
  "it does not include a procurement or checkout flow",
];

test("the MVP scope BDD file exists and captures the launch boundary", () => {
  assert.ok(exists(scopePath), `${scopePath} is missing`);
  const doc = read(scopePath);
  for (const phrase of REQUIRED_PHRASES) {
    assert.match(doc, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `missing phrase: ${phrase}`);
  }
});

test("the repo docs point to the MVP scope source of truth", () => {
  const prd = read("PRD.md");
  const readme = read("README.md");
  const rootIndex = read("BDD.md");
  const bddIndex = read("docs/bdd/README.md");

  assert.match(prd, /MVP scope/i, "PRD calls out the MVP scope");
  assert.match(prd, /docs\/bdd\/mvp-scope\.md/i, "PRD links the MVP scope BDD");
  assert.match(readme, /MVP scope and assumptions/i, "README introduces the launch scope");
  assert.match(readme, /docs\/bdd\/mvp-scope\.md/i, "README links the scope BDD");
  assert.match(
    readme,
    /Google AI|Gemini|Jules|Antigravity|Devin|Replit/i,
    "README summary names the current subscription lineup"
  );
  assert.match(rootIndex, /MVP Scope and Commercial Model/i, "root BDD index links the scope file");
  assert.match(rootIndex, /Featured Hardware Cards/i, "root BDD index links featured hardware cards");
  assert.match(rootIndex, /\[Comparison Mini-Guides\]\(docs\/bdd\/mini-guides\.md\)/i, "root BDD index links the comparison mini-guides");
  assert.match(bddIndex, /MVP Scope and Commercial Model/i, "bdd index links the scope file");
  assert.match(bddIndex, /Featured Hardware Cards/i, "bdd index links featured hardware cards");
  assert.match(
    prd,
    /Google AI|Gemini|Jules|Antigravity|Devin|Replit/i,
    "PRD problem statement names the current subscription lineup"
  );
});
