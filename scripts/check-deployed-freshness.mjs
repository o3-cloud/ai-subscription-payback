#!/usr/bin/env node
/** Verify the deployed HTML and sitemap use the repository freshness source. */
import { pricingLastUpdated, siteLastUpdated } from "../assets/js/data.js";
import { checkFreshness } from "./freshness.mjs";

export async function verifyDeployedFreshness({ fetchImpl = globalThis.fetch, siteUrl = "https://www.othree.cloud/ai-subscription-payback/", timeoutMs = 30000 } = {}) {
  const urls = [siteUrl, new URL("sitemap.xml", siteUrl).href];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let responses;
  try {
    responses = await Promise.all(urls.map((url) => fetchImpl(url, { redirect: "follow", signal: controller.signal })));
  } finally {
    clearTimeout(timer);
  }
  for (const [index, response] of responses.entries()) {
    if (!response.ok) throw new Error(`${urls[index]} returned HTTP ${response.status}`);
  }
  const errors = checkFreshness({
    indexHtml: await responses[0].text(),
    sitemapXml: await responses[1].text(),
    expected: { pricingLastUpdated, siteLastUpdated },
  });
  if (errors.length) throw new Error(errors.join("; "));
  return { siteUrl, pricingLastUpdated, siteLastUpdated };
}

if (process.argv[1] && new URL(`file://${process.argv[1]}`).href === import.meta.url) {
  verifyDeployedFreshness().then((result) => {
    process.stdout.write(`Deployed freshness verified: ${result.siteLastUpdated}\n`);
  }).catch((error) => {
    console.error(`Deployed freshness verification failed: ${error.message}`);
    process.exitCode = 1;
  });
}
