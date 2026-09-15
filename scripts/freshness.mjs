#!/usr/bin/env node
/** Keep committed freshness surfaces derived from assets/js/data.js. */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { pricingLastUpdated, siteLastUpdated } from "../assets/js/data.js";

export const SITE_URL = "https://www.othree.cloud/ai-subscription-payback/";
export const FRESHNESS = { pricingLastUpdated, siteLastUpdated };

export function syncIndex(html, { pricingDate = pricingLastUpdated, siteDate = siteLastUpdated } = {}) {
  let result = html;
  result = result.replace(/(<time[^>]*id="pricing-last-updated"[^>]*datetime=")[^"]+("[^>]*>)[^<]+(<\/time>)/, `$1${pricingDate}$2${pricingDate}$3`);
  result = result.replace(/(<time[^>]*id="site-last-updated"[^>]*datetime=")[^"]+("[^>]*>)[^<]+(<\/time>)/, `$1${siteDate}$2${siteDate}$3`);
  result = result.replace(/(Pricing last updated: <time datetime=")[^"]+("[^>]*>)[^<]+(<\/time>)/, `$1${pricingDate}$2${pricingDate}$3`);
  result = result.replace(/(Site last updated: <time datetime=")[^"]+("[^>]*>)[^<]+(<\/time>)/, `$1${siteDate}$2${siteDate}$3`);
  return result;
}

export function syncSitemap(xml, siteDate = siteLastUpdated) {
  return xml.replace(/(<lastmod>)[^<]+(<\/lastmod>)/g, `$1${siteDate}$2`);
}

export function checkFreshness({ indexHtml, sitemapXml, expected = FRESHNESS } = {}) {
  const errors = [];
  const pricing = indexHtml?.match(/id="pricing-last-updated"[^>]*datetime="([^"]+)"[^>]*>\s*([^<]+)/);
  const site = indexHtml?.match(/id="site-last-updated"[^>]*datetime="([^"]+)"[^>]*>\s*([^<]+)/);
  const inlineSite = indexHtml?.match(/Site last updated: <time datetime="([^"]+)"[^>]*>\s*([^<]+)/);
  if (!pricing || pricing[1] !== expected.pricingLastUpdated || pricing[2].trim() !== expected.pricingLastUpdated) errors.push("index pricing freshness is out of sync");
  if (!site || site[1] !== expected.siteLastUpdated || site[2].trim() !== expected.siteLastUpdated) errors.push("index site freshness is out of sync");
  if (!inlineSite || inlineSite[1] !== expected.siteLastUpdated || inlineSite[2].trim() !== expected.siteLastUpdated) errors.push("index inline site freshness is out of sync");
  const dates = [...(sitemapXml?.matchAll(/<lastmod>([^<]+)<\/lastmod>/g) ?? [])].map((m) => m[1]);
  if (dates.length === 0 || dates.some((date) => date !== expected.siteLastUpdated)) errors.push("sitemap lastmod dates are out of sync");
  return errors;
}

export function isDirectInvocation(argv1 = process.argv[1], moduleUrl = import.meta.url) {
  return Boolean(argv1) && fileURLToPath(moduleUrl) === argv1;
}

if (isDirectInvocation()) {
  const root = new URL("../", import.meta.url);
  const indexPath = fileURLToPath(new URL("index.html", root));
  const sitemapPath = fileURLToPath(new URL("sitemap.xml", root));
  writeFileSync(indexPath, syncIndex(readFileSync(indexPath, "utf8")));
  writeFileSync(sitemapPath, syncSitemap(readFileSync(sitemapPath, "utf8")));
  process.stdout.write(`Synchronized index.html and sitemap.xml to ${siteLastUpdated}\n`);
}
