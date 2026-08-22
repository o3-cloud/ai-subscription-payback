/**
 * Health-check workflow checks.
 *
 * The repository's maintainer docs say the pricing-data health check runs on
 * demand and on a schedule. These assertions keep the scheduled GitHub Actions
 * workflow present and wired to the same script the docs describe.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const read = (rel) => readFileSync(fileURLToPath(new URL(rel, root)), "utf8");
const exists = (rel) => existsSync(fileURLToPath(new URL(rel, root)));

const WORKFLOW = ".github/workflows/health-check.yml";

test("a scheduled GitHub Actions health-check workflow exists", () => {
  assert.ok(exists(WORKFLOW), `${WORKFLOW} is missing`);
});

test("the health-check workflow is manually runnable and scheduled", () => {
  const yml = read(WORKFLOW);
  assert.match(yml, /^on:/m, "declares triggers");
  assert.match(yml, /schedule:/, "runs on a schedule");
  assert.match(yml, /cron:\s*'17 3 \* \* \*'/, "uses the expected daily cron schedule");
  assert.match(yml, /workflow_dispatch:/, "can be triggered manually");
});

test("the health-check workflow runs the maintainer script", () => {
  const yml = read(WORKFLOW);
  assert.match(yml, /actions\/checkout@v4/, "checks out the repository");
  assert.match(yml, /actions\/setup-node@v4/, "sets up Node.js");
  assert.match(yml, /node-version:\s*'22'/, "pins a current Node.js major version");
  assert.match(yml, /npm run health-check/, "runs the health-check script");
});
