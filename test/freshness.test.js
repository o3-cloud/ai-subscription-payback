import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { pricingLastUpdated, siteLastUpdated } from "../assets/js/data.js";
import { checkFreshness, syncIndex, syncSitemap } from "../scripts/freshness.mjs";
import { verifyDeployedFreshness } from "../scripts/check-deployed-freshness.mjs";

const root = new URL("../", import.meta.url);
const read = (file) => readFileSync(fileURLToPath(new URL(file, root)), "utf8");

 test("committed homepage and sitemap freshness match the data source", () => {
  assert.deepEqual(checkFreshness({
    indexHtml: read("index.html"),
    sitemapXml: read("sitemap.xml"),
    expected: { pricingLastUpdated, siteLastUpdated },
  }), []);
});

test("freshness sync updates both homepage timestamp forms and sitemap dates", () => {
  const index = syncIndex(read("index.html"), { pricingDate: "2026-01-02", siteDate: "2026-01-03" });
  assert.match(index, /id="pricing-last-updated"[^>]*datetime="2026-01-02"/);
  assert.match(index, /id="site-last-updated"[^>]*datetime="2026-01-03"/);
  assert.match(index, /Pricing last updated: <time datetime="2026-01-02">2026-01-02<\/time>/);
  assert.match(index, /Site last updated: <time datetime="2026-01-03">2026-01-03<\/time>/);
  assert.match(syncSitemap(read("sitemap.xml"), "2026-01-03"), /<lastmod>2026-01-03<\/lastmod>/);
  assert.doesNotMatch(syncSitemap(read("sitemap.xml"), "2026-01-03"), /<lastmod>2026-09-14<\/lastmod>/);
});

test("deployed verification fetches both surfaces and rejects mismatches", async () => {
  const pages = {
    "https://example.test/": read("index.html"),
    "https://example.test/sitemap.xml": read("sitemap.xml"),
  };
  const fetchImpl = async (url) => ({ ok: true, status: 200, text: async () => pages[url] });
  const result = await verifyDeployedFreshness({ fetchImpl, siteUrl: "https://example.test/" });
  assert.equal(result.siteLastUpdated, siteLastUpdated);
  await assert.rejects(
    verifyDeployedFreshness({
      fetchImpl: async (url) => ({ ok: true, status: 200, text: async () => url.endsWith("sitemap.xml") ? "<lastmod>1999-01-01</lastmod>" : pages[url] }),
      siteUrl: "https://example.test/",
    }),
    /out of sync/
  );
});

test("deployed verification times out stalled fetches", async () => {
  await assert.rejects(
    verifyDeployedFreshness({
      fetchImpl: (_url, { signal }) => new Promise((_, reject) => {
        signal.addEventListener("abort", () => reject(new Error("request aborted")), { once: true });
      }),
      siteUrl: "https://example.test/",
      timeoutMs: 5,
    }),
    /aborted|abort/i
  );
});
