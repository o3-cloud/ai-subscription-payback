/**
 * Deployment-configuration checks.
 *
 * Fast, dependency-free assertions over the GitHub Pages deployment surface:
 * the Actions workflow that publishes the site, the `.nojekyll` marker, and the
 * README that documents where and how the site ships. These guard the contract
 * that a push to main lands the repository root on the project Pages URL,
 * without running Actions or parsing YAML with a dependency.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const read = (rel) => readFileSync(fileURLToPath(new URL(rel, root)), "utf8");
const exists = (rel) => existsSync(fileURLToPath(new URL(rel, root)));

// Must match the canonical URL the SEO surface (sitemap, robots, head) uses.
const SITE_URL = "https://o3-cloud.github.io/ai-subscription-payback/";
const WORKFLOW = ".github/workflows/deploy.yml";

test("a GitHub Pages deployment workflow exists", () => {
  assert.ok(exists(WORKFLOW), `${WORKFLOW} is missing`);
});

test("the workflow deploys from main and can be run on demand", () => {
  const yml = read(WORKFLOW);
  assert.match(yml, /^on:/m, "declares triggers");
  assert.match(yml, /branches:\s*\[\s*main\s*\]/, "triggers on the main branch");
  assert.match(yml, /push:/, "triggers on push");
  assert.match(yml, /workflow_dispatch:/, "can be triggered manually");
});

test("the workflow grants the least privilege GitHub Pages needs", () => {
  const yml = read(WORKFLOW);
  assert.match(yml, /pages:\s*write/, "grants pages: write");
  assert.match(yml, /id-token:\s*write/, "grants id-token: write for OIDC");
  assert.match(yml, /contents:\s*read/, "grants contents: read");
});

test("the workflow uses the official Pages actions to publish the site root", () => {
  const yml = read(WORKFLOW);
  assert.match(yml, /actions\/configure-pages@/, "configures Pages");
  assert.match(yml, /actions\/upload-pages-artifact@/, "uploads the Pages artifact");
  assert.match(yml, /actions\/deploy-pages@/, "deploys the Pages artifact");
  // The site lives at the repository root (index.html + assets), so the
  // artifact path is the checkout root.
  assert.match(
    yml,
    /upload-pages-artifact@[^\n]*[\s\S]*?path:\s*\.(?:\s|$)/,
    "uploads the repository root as the artifact"
  );
});

test("the workflow enables Pages itself, needing no manual Settings step", () => {
  const yml = read(WORKFLOW);
  // configure-pages with enablement: true turns Pages on via the API on the
  // first run, so deploys stay hands-off once the repo is eligible for Pages.
  assert.match(
    yml,
    /configure-pages@[^\n]*[\s\S]*?enablement:\s*true/,
    "configure-pages sets enablement: true"
  );
});

test("the workflow publishes to the github-pages environment", () => {
  const yml = read(WORKFLOW);
  assert.match(yml, /name:\s*github-pages/, "targets the github-pages environment");
});

test("the workflow runs the test suite before deploying", () => {
  const yml = read(WORKFLOW);
  assert.match(yml, /npm test/, "runs the test suite in the pipeline");
});

test(".nojekyll disables Jekyll processing so files serve as committed", () => {
  assert.ok(exists(".nojekyll"), ".nojekyll marker is missing from the site root");
});

test("the README documents the Pages deployment location and process", () => {
  assert.ok(exists("README.md"), "README.md is missing");
  const readme = read("README.md");
  assert.ok(readme.includes(SITE_URL), "README states the live site URL");
  assert.match(readme, /GitHub Pages/i, "README names the hosting platform");
  assert.match(readme, /deploy\.yml/, "README links the deployment workflow");
  assert.match(
    readme,
    /merging to `main`[\s\S]*publishes the site/i,
    "README explains that a push to main publishes the site"
  );
});

test("the static-site-delivery BDD documents the Pages deploy path", () => {
  const bdd = read("docs/bdd/static-site-delivery.md");
  assert.match(bdd, /GitHub Pages publishing/i, "describes Pages publishing");
  assert.match(
    bdd,
    /each push to[\s>]*`main` publishes the site/i,
    "states that a push to main publishes the site"
  );
});
