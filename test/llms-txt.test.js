/**
 * llms.txt checks.
 *
 * The root `llms.txt` gives AI agents a compact, curated entry point to the
 * site. These assertions guard its structure (the llms.txt convention: an H1
 * title and a leading blockquote summary), that it links the core surfaces
 * (calculator, methodology, disclosures, guides), that every URL stays on the
 * canonical production origin with no legacy `*.github.io` leak, and that its
 * guide links stay in sync with sitemap.xml. Failure-mode cases (missing file,
 * off-origin link, dropped surface) all trip a specific assertion.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const read = (rel) => readFileSync(fileURLToPath(new URL(rel, root)), "utf8");
const exists = (rel) => existsSync(fileURLToPath(new URL(rel, root)));

const SITE_URL = "https://www.othree.cloud/ai-subscription-payback/";
const LEGACY_ORIGIN = "o3-cloud.github.io";

test("a root llms.txt is published alongside the site", () => {
  assert.ok(exists("llms.txt"), "llms.txt is missing from the site root");
});

test("llms.txt follows the convention: H1 title then a blockquote summary", () => {
  const txt = read("llms.txt");
  const lines = txt.split("\n");
  assert.match(lines[0], /^# \S/, "starts with an H1 project title");
  assert.match(lines[0], /AI Subscription Payback/, "the H1 names the site");
  assert.ok(
    lines.some((line) => line.startsWith("> ")),
    "includes a blockquote summary line"
  );
  const summary = lines.find((line) => line.startsWith("> "));
  assert.match(summary, /calculator/i, "the summary describes the calculator");
  assert.match(summary, /Cursor/i, "the summary names Cursor alongside the other modeled subscription families");
  assert.match(summary, /GitHub Copilot/i, "the summary names GitHub Copilot alongside the other modeled subscription families");
  assert.match(summary, /GitLab Premium/i, "the summary names GitLab Premium alongside the other modeled subscription families");
  assert.match(summary, /Qodo/i, "the summary names Qodo alongside the other modeled subscription families");
  assert.match(summary, /CodeRabbit/i, "the summary names CodeRabbit alongside the other modeled subscription families");
  assert.match(summary, /Warp/i, "the summary names Warp alongside the other modeled subscription families");
  assert.match(summary, /Supermaven/i, "the summary names Supermaven alongside the other modeled subscription families");
  assert.match(summary, /Kiro/i, "the summary names Kiro alongside the other modeled subscription families");
  assert.match(summary, /JetBrains AI/i, "the summary names JetBrains AI alongside the other modeled subscription families");
  assert.match(summary, /Tabnine/i, "the summary names Tabnine alongside the other modeled subscription families");
  assert.match(summary, /Factory/i, "the summary names Factory alongside the other modeled subscription families");
  assert.match(summary, /Manus/i, "the summary names Manus alongside the other modeled subscription families");
  assert.match(summary, /v0/i, "the summary names v0 alongside the other modeled subscription families");
  assert.match(summary, /Grok|SuperGrok/i, "the summary names xAI Grok alongside the other modeled subscription families");
  assert.match(summary, /Amazon Q Developer/i, "the summary names Amazon Q Developer alongside the other modeled subscription families");
  assert.match(summary, /Zed/i, "the summary names Zed alongside the other modeled subscription families");
  assert.match(summary, /Devin|Windsurf/i, "the summary names Devin/Windsurf alongside the other modeled subscription families");
});

test("llms.txt links the calculator, methodology, and both disclosures", () => {
  const txt = read("llms.txt");
  assert.ok(txt.includes(`${SITE_URL}#calculator`), "links the calculator");
  assert.ok(txt.includes(`${SITE_URL}#methodology`), "links the methodology/assumptions");
  assert.ok(txt.includes(`${SITE_URL}#pricing`), "links the pricing disclosure");
  assert.ok(txt.includes(`${SITE_URL}#affiliate`), "links the affiliate disclosure");
});

test("llms.txt links every published guide, matching sitemap.xml", () => {
  const txt = read("llms.txt");
  const guides = [...read("sitemap.xml").matchAll(/guides\/[a-z0-9-]+\.html/g)].map(
    (m) => m[0]
  );
  assert.ok(guides.length >= 14, "sitemap lists the published guides");
  for (const guide of guides) {
    assert.ok(
      txt.includes(`${SITE_URL}${guide}`),
      `llms.txt is missing a guide link for ${guide}`
    );
  }
});

test("every llms.txt link stays on the canonical production origin", () => {
  const txt = read("llms.txt");
  const urls = [...txt.matchAll(/https?:\/\/[^\s)]+/g)].map((m) => m[0]);
  assert.ok(urls.length > 0, "llms.txt contains links");
  for (const url of urls) {
    assert.ok(
      url.startsWith(SITE_URL.replace(/\/$/, "")),
      `off-origin URL in llms.txt: ${url}`
    );
  }
});

test("llms.txt never references the legacy github.io origin", () => {
  assert.ok(
    !read("llms.txt").includes(LEGACY_ORIGIN),
    "llms.txt must not reference the legacy github.io origin"
  );
});

test("llms.txt keeps its disclosures honest and source-backed", () => {
  const txt = read("llms.txt");
  assert.match(
    txt,
    /client-side|no backend/i,
    "states computation is client-side"
  );
  assert.match(
    txt,
    /never (change|affect)[^.]*result/i,
    "states affiliate links never change the results"
  );
  assert.match(
    txt,
    /snapshot|last updated|verify/i,
    "states pricing is a snapshot to verify with vendors"
  );
});

test("the llms.txt BDD spec exists and is indexed", () => {
  assert.ok(exists("docs/bdd/llms-txt.md"), "llms.txt BDD spec is missing");
  assert.ok(read("BDD.md").includes("docs/bdd/llms-txt.md"), "root index lists it");
  assert.ok(read("docs/bdd/README.md").includes("./llms-txt.md"), "dir index lists it");
});
