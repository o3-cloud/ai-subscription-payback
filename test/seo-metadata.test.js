/**
 * SEO and launch-metadata checks.
 *
 * Fast, dependency-free assertions over the static launch surface: the
 * document head (indexing directives, canonical, social cards, JSON-LD) plus
 * the crawler files (robots.txt, sitemap.xml) and the social-card asset. These
 * guard the metadata search engines and social platforms read at launch,
 * without a DOM or a network.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const read = (rel) => readFileSync(fileURLToPath(new URL(rel, root)), "utf8");
const exists = (rel) => existsSync(fileURLToPath(new URL(rel, root)));

const html = read("index.html");
const SITE_URL = "https://www.othree.cloud/ai-subscription-payback/";

/** Value of the first <meta> matching an attr=value selector, or "". */
const metaContent = (attr, value) =>
  html.match(
    new RegExp(`<meta[^>]+${attr}="${value}"[^>]+content="([^"]*)"`, "i")
  )?.[1] ?? "";

test("head declares indexing directives and a canonical URL", () => {
  assert.match(
    html,
    /<meta[^>]+name="robots"[^>]+content="[^"]*index[^"]*"/i,
    "a robots meta tag permits indexing"
  );
  assert.match(
    html,
    new RegExp(`<link[^>]+rel="canonical"[^>]+href="${SITE_URL}"`, "i"),
    "canonical link points at the site URL"
  );
  assert.ok(metaContent("name", "description").length > 50, "meta description present");
});

test("Open Graph card is complete", () => {
  for (const prop of [
    "og:type",
    "og:site_name",
    "og:locale",
    "og:title",
    "og:description",
    "og:url",
    "og:image",
    "og:image:alt",
  ]) {
    assert.ok(
      metaContent("property", prop).length > 0,
      `missing or empty ${prop}`
    );
  }
  assert.equal(metaContent("property", "og:url"), SITE_URL);
  assert.equal(
    metaContent("property", "og:image"),
    new URL("assets/img/og-card.png", SITE_URL).href,
    "og:image uses the production site URL"
  );
});

test("Twitter card carries its own title, description, and image", () => {
  assert.equal(metaContent("name", "twitter:card"), "summary_large_image");
  for (const name of ["twitter:title", "twitter:description", "twitter:image", "twitter:image:alt"]) {
    assert.ok(metaContent("name", name).length > 0, `missing or empty ${name}`);
  }
  assert.equal(
    metaContent("name", "twitter:image"),
    new URL("assets/img/og-card.png", SITE_URL).href,
    "twitter:image uses the production site URL"
  );
});

test("the social-card asset exists", () => {
  assert.ok(exists("assets/img/og-card.png"), "assets/img/og-card.png is missing");
});

/** Extract and parse the single JSON-LD block in the head. */
const jsonLd = () => {
  const block = html.match(
    /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i
  )?.[1];
  assert.ok(block, "index.html has a JSON-LD script");
  return JSON.parse(block);
};

test("JSON-LD parses and describes the app plus its FAQ", () => {
  const graph = jsonLd()["@graph"];
  assert.ok(Array.isArray(graph), "JSON-LD uses an @graph array");

  const app = graph.find((n) => n["@type"] === "WebApplication");
  assert.ok(app, "graph includes a WebApplication node");
  assert.equal(app.url, SITE_URL);
  assert.equal(app.isAccessibleForFree, true);
  assert.equal(app.offers.price, "0");

  const faq = graph.find((n) => n["@type"] === "FAQPage");
  assert.ok(faq, "graph includes a FAQPage node");
  assert.ok(
    Array.isArray(faq.mainEntity) && faq.mainEntity.length >= 3,
    "FAQPage exposes at least three questions"
  );
  for (const q of faq.mainEntity) {
    assert.equal(q["@type"], "Question");
    assert.ok(q.name.length > 0, "question has a name");
    assert.ok(q.acceptedAnswer.text.length > 0, "question has an answer");
  }
});

test("FAQ structured-data answers match the on-page methodology copy", () => {
  // Rich-result guidelines require the JSON-LD answers to mirror visible text;
  // spot-check a distinctive phrase from each on-page answer.
  // Strip inline tags and collapse whitespace so phrases that wrap across lines
  // or straddle a <strong> in the source still match as running prose.
  const methodology = (
    html.match(/<section[^>]*id="methodology"[^>]*>([\s\S]*?)<\/section>/i)?.[1] ?? ""
  )
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  assert.ok(methodology, "index.html has a #methodology section");

  const faq = jsonLd()["@graph"].find((n) => n["@type"] === "FAQPage");
  const answers = faq.mainEntity.map((q) => q.acceptedAnswer.text).join(" ");

  for (const phrase of [
    "first month where cumulative ownership cost drops below",
    "maintenance/depreciation, hardware resale",
  ]) {
    assert.ok(answers.includes(phrase), `FAQ answer missing phrase: "${phrase}"`);
    assert.match(
      methodology,
      new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
      `on-page methodology missing phrase: "${phrase}"`
    );
  }
});

test("robots.txt allows crawling and points at the sitemap", () => {
  assert.ok(exists("robots.txt"), "robots.txt is missing");
  const robots = read("robots.txt");
  assert.match(robots, /User-agent:\s*\*/i, "declares a wildcard user-agent");
  assert.match(robots, /Allow:\s*\//i, "allows crawling");
  assert.match(
    robots,
    new RegExp(`Sitemap:\\s*${SITE_URL}sitemap\\.xml`, "i"),
    "references the sitemap URL"
  );
});

test("sitemap.xml is well-formed and lists the canonical URL", () => {
  assert.ok(exists("sitemap.xml"), "sitemap.xml is missing");
  const sitemap = read("sitemap.xml");
  assert.match(sitemap, /^<\?xml/, "starts with an XML declaration");
  assert.match(
    sitemap,
    /xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/,
    "uses the sitemap namespace"
  );
  assert.match(
    sitemap,
    new RegExp(`<loc>${SITE_URL}</loc>`),
    "lists the canonical landing-page URL"
  );
  assert.match(sitemap, /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/, "carries an ISO lastmod");
});
