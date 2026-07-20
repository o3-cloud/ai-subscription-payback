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
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const read = (rel) => readFileSync(fileURLToPath(new URL(rel, root)), "utf8");
const exists = (rel) => existsSync(fileURLToPath(new URL(rel, root)));

const html = read("index.html");
const launchCopy = read("docs/launch-copy.md");
const SITE_URL = "https://www.othree.cloud/ai-subscription-payback/";

// `siteLastUpdated` in the data module is the single source of truth for the
// site-wide last-updated date. The sitemap's <lastmod> and the no-JS footer
// fallback are baked into static files, so they can drift; assert they track
// the canonical value exactly rather than merely being a well-formed date.
const { siteLastUpdated } = await import(
  new URL("../assets/js/data.js", import.meta.url)
);

// The production custom domain is the single source of truth for every
// SEO-relevant origin. The site previously shipped from the project GitHub
// Pages URL (`o3-cloud.github.io`); leaving any `*.github.io` origin in an
// indexable artifact splits canonical signals and lets the legacy origin
// compete in search. Guard every crawler-facing surface against it.
const LEGACY_PAGES_HOST = "github.io";

/** Value of the first <meta> matching an attr=value selector, or "". */
const metaContent = (attr, value) =>
  html.match(
    new RegExp(`<meta[^>]+${attr}="${value}"[^>]+content="([^"]*)"`, "i")
  )?.[1] ?? "";

test("head declares a descriptive title, indexing directives, and a canonical URL", () => {
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? "";
  assert.ok(title.length > 10, "document declares a descriptive <title>");
  assert.match(
    title,
    /AI Subscription Payback/i,
    "document title uses the official site name"
  );
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
  assert.match(
    metaContent("name", "description"),
    /Google AI|Gemini|Jules|Antigravity|Replit/i,
    "meta description names the Google AI and Replit coding-agent tiers"
  );
  assert.equal(
    metaContent("name", "author"),
    "AI Subscription Payback",
    "meta author matches the official site name"
  );
  // Keywords should surface the Google AI and Replit coding-agent tiers now
  // that they are modeled, so searchers with that intent can find the calculator.
  assert.match(
    metaContent("name", "keywords"),
    /Google AI|Gemini|Jules|Antigravity|Devin|Replit/i,
    "keywords name the Google AI, Devin, and Replit coding-agent tiers"
  );
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
  assert.equal(
    metaContent("property", "og:site_name"),
    "AI Subscription Payback",
    "Open Graph site name uses the official site name"
  );
  assert.equal(metaContent("property", "og:url"), SITE_URL);
  assert.match(
    metaContent("property", "og:description"),
    /Google AI|Replit/i,
    "og:description mentions Google AI and Replit tiers"
  );
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
  assert.match(
    metaContent("name", "twitter:image:alt"),
    /AI Subscription Payback/i,
    "twitter:image:alt uses the official site name"
  );
  assert.match(
    metaContent("name", "twitter:description"),
    /Google AI|Replit/i,
    "twitter:description mentions Google AI and Replit tiers"
  );
  assert.equal(
    metaContent("name", "twitter:image"),
    new URL("assets/img/og-card.png", SITE_URL).href,
    "twitter:image uses the production site URL"
  );
});

test("the social-card asset exists", () => {
  assert.ok(exists("assets/img/og-card.png"), "assets/img/og-card.png is missing");
});

test("the launch-copy Posting notes point at the social card and a clean canonical link", () => {
  // The Posting notes tell maintainers which social card to attach and to keep
  // the shared link canonical; guard both so the guidance cannot drift from the
  // bundled asset and the no-tracking-parameters rule the tests enforce.
  const notes =
    launchCopy.split(/^## /m).find((block) => /^Posting notes\b/.test(block)) ?? "";
  assert.ok(notes, "docs/launch-copy.md has a Posting notes section");
  assert.match(
    notes,
    /assets\/img\/og-card\.png/,
    "Posting notes reference the social card at assets/img/og-card.png"
  );
  assert.match(
    notes,
    /canonical[^]*tracking parameters/i,
    "Posting notes instruct keeping the link canonical without tracking parameters"
  );
});

test("the social-card and favicon SVG sources use the official site name", () => {
  const og = read("assets/img/og-card.svg");
  const icon = read("assets/img/favicon.svg");
  assert.match(og, /AI Subscription Payback/i, "og-card.svg uses the official site name");
  assert.doesNotMatch(og, /AI Box Payback/i, "og-card.svg does not use the legacy name");
  assert.match(icon, /AI Subscription Payback/i, "favicon.svg uses the official site name");
  assert.doesNotMatch(icon, /AI Box Payback/i, "favicon.svg does not use the legacy name");
});

test("the head declares a favicon so browsers never fall back to a 404 /favicon.ico", () => {
  // Chrome auto-requests /favicon.ico at the origin root unless the document
  // declares an icon; the site ships from a project subpath, so the root has no
  // favicon. Declaring rel="icon" here suppresses that request and its 404.
  const icon = html.match(
    /<link[^>]+rel="icon"[^>]+href="([^"]*)"/i
  );
  assert.ok(icon, "index.html declares a <link rel=\"icon\">");
  const href = icon[1];
  assert.ok(
    /^\.\/assets\//.test(href),
    `favicon href should point at a bundled asset, got "${href}"`
  );
  assert.ok(
    exists(href.replace(/^\.\//, "")),
    `favicon asset ${href} is missing`
  );
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
  assert.match(app.description, /Google AI|Replit/i, "WebApplication description mentions Google AI and Replit");

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
  const lastmods = [...sitemap.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)].map(
    (m) => m[1]
  );
  assert.ok(lastmods.length > 0, "carries at least one lastmod");
  for (const value of lastmods) {
    assert.equal(
      value,
      siteLastUpdated,
      `sitemap <lastmod> (${value}) must match siteLastUpdated (${siteLastUpdated})`
    );
  }
});

test("the no-JS footer fallback tracks siteLastUpdated exactly", () => {
  // Client-side JS rewrites #site-last-updated, but crawlers and no-JS visitors
  // see the baked-in fallback; it must equal the canonical date, not just any
  // ISO date, or the static surface silently drifts from the data module.
  const fallback = html.match(
    /<time[^>]+id="site-last-updated"[^>]*>([\s\S]*?)<\/time>/i
  );
  assert.ok(fallback, "index.html has a #site-last-updated time element");
  const datetime = fallback[0].match(/datetime="([^"]*)"/i)?.[1];
  assert.equal(
    datetime,
    siteLastUpdated,
    `footer datetime (${datetime}) must match siteLastUpdated (${siteLastUpdated})`
  );
  assert.equal(
    fallback[1].trim(),
    siteLastUpdated,
    `footer text (${fallback[1].trim()}) must match siteLastUpdated (${siteLastUpdated})`
  );
});

test("the custom domain is the sole SEO origin — no legacy GitHub Pages URL leaks", () => {
  // Every artifact a crawler or social scraper reads. If any of these carries
  // the old project Pages origin, the custom domain is no longer the single
  // source of truth for canonical/sitemap/social signals.
  const guides = readdirSync(fileURLToPath(new URL("guides/", root)))
    .filter((name) => name.endsWith(".html"))
    .map((name) => `guides/${name}`);
  const artifacts = ["index.html", "robots.txt", "sitemap.xml", ...guides];
  assert.ok(guides.length > 0, "expected at least one generated guide to check");

  for (const rel of artifacts) {
    const contents = read(rel);
    assert.ok(
      !contents.includes(LEGACY_PAGES_HOST),
      `${rel} references the legacy GitHub Pages origin (${LEGACY_PAGES_HOST}); ` +
        `use the custom domain ${SITE_URL} instead`
    );
    // And the canonical origin, where present, must be the custom domain.
    if (contents.includes("ai-subscription-payback/")) {
      assert.ok(
        contents.includes(SITE_URL),
        `${rel} should express its site origin as ${SITE_URL}`
      );
    }
  }
});
