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

test("launch copy reflects the current featured hardware lineup", () => {
  assert.match(launchCopy, /Mac Studio/i, "keeps Mac Studio in the launch copy");
  assert.match(launchCopy, /DGX Spark/i, "keeps DGX Spark in the launch copy");
  assert.match(launchCopy, /Strix Halo/i, "keeps Strix Halo in the launch copy");
  assert.match(
    launchCopy,
    /Framework Desktop AI Max 385/i,
    "mentions the named Framework Desktop Strix Halo example"
  );
});
