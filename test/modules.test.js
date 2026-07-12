/**
 * ES module scaffold checks.
 *
 * Confirms every client script exists and parses as an ES module, and that the
 * DOM-free modules (data.js, state.js) export the shape the rest of the app
 * imports. Syntax is verified with `node --check` so DOM-dependent modules
 * (calculator.js, main.js) can be validated without a browser or executing
 * their top-level browser globals.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const jsDir = new URL("../assets/js/", import.meta.url);
const modules = ["main.js", "calculator.js", "state.js", "data.js"];

for (const name of modules) {
  test(`${name} exists and is syntactically valid`, () => {
    const path = fileURLToPath(new URL(name, jsDir));
    assert.ok(existsSync(path), `${name} is missing`);
    // `type: module` in package.json makes --check parse this as ESM without
    // running it; throws (non-zero exit) on a syntax error.
    execFileSync(process.execPath, ["--check", path], { stdio: "pipe" });
  });
}

test("data.js exports the datasets the UI renders", async () => {
  const data = await import(new URL("data.js", jsDir));
  assert.ok(Array.isArray(data.subscriptions) && data.subscriptions.length > 0);
  for (const sub of data.subscriptions) {
    assert.equal(typeof sub.id, "string");
    assert.equal(typeof sub.name, "string");
    assert.equal(typeof sub.monthlyPrice, "number");
  }
  assert.equal(typeof data.hardware, "object");
  assert.equal(typeof data.defaults, "object");
  assert.ok(Array.isArray(data.assumptions));
  assert.match(data.pricingLastUpdated, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(data.siteLastUpdated, /^\d{4}-\d{2}-\d{2}$/);
});

test("state.js round-trips calculator state through the URL helpers", async () => {
  const state = await import(new URL("state.js", jsDir));
  const input = { boxPrice: 3000, apr: 9.9, maintenance: true, subscriptions: ["codex"] };
  const parsed = state.parseState(state.serializeState(input));
  assert.equal(parsed.boxPrice, 3000);
  assert.equal(parsed.apr, 9.9);
  assert.equal(parsed.maintenance, true);
  assert.deepEqual(parsed.subscriptions, ["codex"]);
});

test("state.js validation and formatting behave", async () => {
  const state = await import(new URL("state.js", jsDir));
  assert.equal(state.validateNumber("5", { min: 0, max: 10 }).valid, true);
  assert.equal(state.validateNumber("-1", { min: 0 }).valid, false);
  assert.equal(state.validateNumber("", {}).valid, false);
  assert.equal(state.formatCurrency(3000), "$3,000");
  assert.equal(state.formatBreakEven(null), "Not reached");
  assert.equal(state.formatBreakEven(12), "Month 12");
});
