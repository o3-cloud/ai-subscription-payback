/**
 * BDD index sync checks.
 *
 * Two indices describe the same set of behavior specs: the repo-root `BDD.md`
 * (links relative to the root, e.g. `docs/bdd/foo.md`) and `docs/bdd/README.md`
 * (links relative to that directory, e.g. `./foo.md`). They drift easily — a new
 * feature file gets added to one index but not the other, or the titles fall out
 * of order. These assertions keep both indices exhaustive and identical rather
 * than spot-checking a handful of entries, and confirm every listed file (and
 * only those files) actually exists in `docs/bdd/`.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const read = (rel) => readFileSync(fileURLToPath(new URL(rel, root)), "utf8");
const exists = (rel) => existsSync(fileURLToPath(new URL(rel, root)));

const rootIndexPath = "BDD.md";
const dirIndexPath = "docs/bdd/README.md";

// Pull the `- [Title](target)` list entries out of an index, in document order.
const parseEntries = (markdown) => {
  const entries = [];
  for (const line of markdown.split("\n")) {
    const match = line.match(/^-\s*\[([^\]]+)\]\(([^)]+)\)\s*$/);
    if (match) {
      entries.push({ title: match[1].trim(), target: match[2].trim() });
    }
  }
  return entries;
};

// Normalize an index's link target to a path relative to the repo root so the
// two indices (which use different relative bases) can be compared file-to-file.
const rootTargetToFile = (target) => target.replace(/^\.\//, "");
const dirTargetToFile = (target) => `docs/bdd/${target.replace(/^\.\//, "")}`;

const rootEntries = parseEntries(read(rootIndexPath));
const dirEntries = parseEntries(read(dirIndexPath));

const assertLinkStyles = (entries, expectedPrefix, label) => {
  for (const { title, target } of entries) {
    assert.ok(
      target.startsWith(expectedPrefix),
      `${label} entry "${title}" should link with prefix ${expectedPrefix}, got ${target}`
    );
  }
};

test("both BDD indices list at least the full feature set", () => {
  // Guard against a parser/format change silently emptying either list.
  assert.ok(rootEntries.length >= 10, "root index should list the feature files");
  assert.ok(dirEntries.length >= 10, "dir index should list the feature files");
});

test("the two BDD indices list identical titles in the same order", () => {
  const rootTitles = rootEntries.map((entry) => entry.title);
  const dirTitles = dirEntries.map((entry) => entry.title);
  assert.deepEqual(dirTitles, rootTitles, "index titles/order drifted between BDD.md and docs/bdd/README.md");
  assertLinkStyles(rootEntries, "docs/bdd/", "root BDD index");
  assertLinkStyles(dirEntries, "./", "docs/bdd README index");
});

test("the two BDD indices point at the same files", () => {
  const rootFiles = rootEntries.map((entry) => rootTargetToFile(entry.target));
  const dirFiles = dirEntries.map((entry) => dirTargetToFile(entry.target));
  assert.deepEqual(dirFiles, rootFiles, "index link targets drifted between BDD.md and docs/bdd/README.md");
});

test("every linked BDD file exists on disk", () => {
  for (const entry of rootEntries) {
    const file = rootTargetToFile(entry.target);
    assert.ok(exists(file), `BDD.md links a missing file: ${file}`);
  }
});

test("both indices cover every feature file in docs/bdd with no orphans", () => {
  const featureFiles = readdirSync(fileURLToPath(new URL("docs/bdd/", root)))
    .filter((name) => name.endsWith(".md") && name !== "README.md")
    .map((name) => `docs/bdd/${name}`)
    .sort();

  const indexed = rootEntries.map((entry) => rootTargetToFile(entry.target)).sort();

  assert.deepEqual(indexed, featureFiles, "docs/bdd feature files and the BDD index are out of sync");
});
