#!/usr/bin/env node
/**
 * Static mini-guide generator (issue #28).
 *
 * The site is deliberately build-step-free, but the comparison guides share a
 * lot of structure and every price/spec they quote must stay in lock-step with
 * the curated data in `assets/js/data.js`. Rather than hand-maintain five
 * near-identical HTML files (and risk their numbers drifting from the calculator
 * they link into), we generate them from the same data + payback math the app
 * uses, then commit the output so the site stays plain static HTML.
 *
 * `buildGuides()` is the single source of truth for the generated markup; the
 * CLI entry point writes it to disk and the guides test asserts the committed
 * files match it exactly, so a stale commit can never ship.
 *
 *   node scripts/build-guides.mjs      # (re)write guides/*.html
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  hardware,
  subscriptions,
  defaults,
  getAffiliate,
  siteLastUpdated,
} from "../assets/js/data.js";
import { computeResult } from "../assets/js/calculator.js";
import {
  serializeState,
  formatCurrency,
  formatRate,
  formatBreakEven,
} from "../assets/js/state.js";

/** Canonical production origin — matches the SEO surface (sitemap, robots, head). */
export const SITE_URL = "https://www.othree.cloud/ai-subscription-payback/";

/**
 * Guide definitions. Each entry names the featured local box and the
 * subscription tiers its sample scenario compares against (both by id into the
 * curated data), plus the hand-written use-case and software-tradeoff copy. All
 * prices, specs, monthly payment, and break-even numbers are derived from the
 * data + payback math at render time, so the guides never quote a stale figure.
 *
 * @typedef {Object} Guide
 * @property {string} slug         URL slug (also the output filename)
 * @property {string} hardwareId   featured box id from `hardware`
 * @property {string[]} subs       subscription ids the scenario compares against
 * @property {string} title        SEO <title>
 * @property {string} description  meta description
 * @property {string} heading      on-page <h1>
 * @property {string[]} useCase    use-case summary paragraphs
 * @property {string} scenarioLede one-line framing for the sample scenario
 * @property {string[]} caveats    caveats / software tradeoffs
 * @property {Partial<Record<"downPayment"|"apr"|"term"|"electricityRate"|"hoursPerDay", number>>} [inputs]
 */

/** @type {Guide[]} */
export const GUIDES = [
  {
    slug: "dgx-spark-price-payback",
    hardwareId: "dgx-spark",
    subs: ["codex", "claude-max-5x"],
    title:
      "NVIDIA DGX Spark Price & Payback vs AI Coding Subscriptions",
    description:
      "What the NVIDIA DGX Spark costs, and how many months of heavy AI coding subscriptions it takes to pay one off. Source-backed price snapshot plus a sample payback scenario.",
    heading: "NVIDIA DGX Spark: price and payback",
    useCase: [
      "The DGX Spark is a GB10 Grace Blackwell desktop with 128 GB of unified memory — enough to hold large open-weight models locally for a heavy AI-coding workflow. This guide answers the money question: at what point does buying one cost less than paying for AI coding subscriptions month after month?",
      "It is aimed at power users and small teams already spending well above the entry tiers — the people for whom owning inference hardware can actually pencil out.",
    ],
    scenarioLede:
      "A heavy user pairing a Codex seat with Claude Code Max 5× — the kind of combined spend that makes local hardware worth pricing out.",
    caveats: [
      "The DGX Spark runs open-weight models on NVIDIA's CUDA / Grace-Blackwell stack — it cannot run the hosted Claude or GPT models behind Codex and Claude Code. You are comparing cost, not identical model quality or agentic-coding capability.",
      "GB10 is a new platform; expect some rough edges in drivers, model support, and tooling versus a mature datacenter GPU.",
      "Subscriptions fold in continuous model upgrades and hosting; a box is a fixed capability you maintain yourself (updates, quantization, cooling, power).",
      "The payback assumes financing at the default APR and term. Buying outright, or a lighter subscription bill, moves the break-even point substantially.",
    ],
  },
  {
    slug: "mac-studio-ai-coding-workstation",
    hardwareId: "mac-studio",
    subs: ["codex", "claude-max-5x"],
    title:
      "Mac Studio as an AI Coding Workstation — Cost Comparison",
    description:
      "Is a Mac Studio a cost-effective local AI coding workstation versus paying for Codex and Claude Code? Source-backed price/spec snapshot and a sample payback scenario.",
    heading: "Mac Studio as a local AI coding workstation",
    useCase: [
      "Apple's Mac Studio pairs a lot of unified memory with a quiet, low-power desktop, which makes it a popular dual-purpose machine: your everyday development workstation and a local host for open-weight coding models. This guide compares owning one against a recurring AI-subscription bill.",
      "It suits developers who want one machine for both jobs and are weighing the up-front cost against months of subscription spend.",
    ],
    scenarioLede:
      "The base Mac Studio config against a Codex seat plus Claude Code Max 5× of heavy usage.",
    caveats: [
      "Local models on a Mac run through Apple-silicon stacks (MLX, llama.cpp/Metal), not CUDA — many CUDA-only libraries and some model builds won't run unmodified, and Metal tooling can lag NVIDIA's.",
      "The Mac Studio cannot run the hosted Claude or GPT models; you would run open-weight models with a different local coding agent, so capability differs from the subscriptions.",
      "Unified memory is the price lever — the biggest models want the high-memory configurations, which push the cost (and the payback horizon) up quickly.",
      "The break-even below assumes financing; buying outright and any change in your subscription mix shift it.",
    ],
  },
  {
    slug: "claude-code-vs-local-ai-box-cost",
    hardwareId: "strix-halo",
    subs: ["claude-max-5x"],
    title:
      "Claude Code vs a Local AI Box — Cost Comparison",
    description:
      "How the cost of a Claude Code Max subscription compares to owning a local AI inference box. Source-backed price snapshot and a sample break-even scenario.",
    heading: "Claude Code vs a local AI box: the cost",
    useCase: [
      "If you are paying for a higher Claude Code tier every month, it is fair to ask whether a local inference box would be cheaper over time. This guide compares a Claude Code Max plan against owning an affordable unified-memory box and shows where the lines cross.",
      "It is written for the heavy Claude Code user deciding whether recurring spend or owned hardware is the better deal on cost alone.",
    ],
    scenarioLede:
      "A Claude Code Max 5× plan against a value-class Strix Halo box.",
    caveats: [
      "This is the crucial caveat: a local box cannot run Claude. Claude's weights are closed, so you would run open-weight models with a different coding agent — the box replaces the spend, not the exact capability.",
      "A Claude Code subscription buys frontier hosted models and continuous upgrades; the value is model quality and agentic coding, not just tokens.",
      "Running open models well takes ongoing effort — model selection, quantization, updates, and prompt/agent tuning to approach a hosted assistant.",
      "The scenario assumes financing and the listed usage; owning outright or a lighter Claude Code tier changes the break-even month.",
    ],
  },
  {
    slug: "codex-vs-local-ai-box-cost",
    hardwareId: "strix-halo",
    subs: ["codex"],
    title:
      "Codex vs a Local AI Box — Cost Comparison",
    description:
      "Does a single $20/mo Codex subscription justify buying a local AI inference box? A source-backed price snapshot and a sample scenario with the honest answer.",
    heading: "Codex vs a local AI box: the cost",
    useCase: [
      "A single Codex plan is one of the cheapest ways to get an AI coding assistant, which makes the payback maths for a local box unusually demanding. This guide compares a Codex seat against owning an affordable inference box — and is honest about when that box does not pay for itself.",
      "It is for the individual Codex user wondering whether owned hardware is really cheaper than $20 a month.",
    ],
    scenarioLede:
      "A single Codex seat against a value-class Strix Halo box.",
    caveats: [
      "At a single $20/mo seat, a financed box's monthly payments dwarf the subscription, so on cost alone the box does not pay off within the horizon — the local case only strengthens at heavier or multi-seat spend.",
      "Codex runs hosted OpenAI models; a local box runs open-weight models with a different agent, so you are trading capability as well as cost.",
      "A box adds up-front cost, power, maintenance, and depreciation that a subscription doesn't — worth counting before switching.",
      "Change the scenario in the calculator: add heavier tiers or more seats and the break-even point can appear where a single Codex seat never reaches it.",
    ],
  },
  {
    slug: "strix-halo-ryzen-ai-max-workstation",
    hardwareId: "strix-halo",
    subs: ["codex", "claude-max-5x"],
    title:
      "Strix Halo / Ryzen AI Max Workstation — Cost Comparison",
    description:
      "How an AMD Strix Halo (Ryzen AI Max+ 395) workstation compares on cost to AI coding subscriptions. Source-backed price snapshot and a sample payback scenario.",
    heading: "AMD Strix Halo (Ryzen AI Max) workstation",
    useCase: [
      "AMD's Strix Halo — the Ryzen AI Max+ 395 in mini-PC and small-desktop form — offers up to 128 GB of unified memory at the lowest price of the featured boxes, which makes it the fastest to pay back against heavy subscription spend. This guide prices that out.",
      "It suits builders chasing the best price per gigabyte of unified memory for local coding models, and weighing it against a recurring subscription bill.",
    ],
    scenarioLede:
      "A value-class Strix Halo box against a Codex seat plus Claude Code Max 5× of heavy usage.",
    caveats: [
      "AMD's local-inference stack (ROCm, and early NPU tooling) is less mature than NVIDIA's CUDA — expect more setup and some models that need tweaks to run well.",
      "Strix Halo is a class of mini-PCs rather than one SKU, so exact price, memory, and cooling vary by vendor; confirm the config before buying.",
      "Like every local box, it runs open-weight models, not the hosted Claude or GPT models behind the subscriptions — the comparison is cost, not identical capability.",
      "The break-even assumes financing and the listed heavy usage; buying outright or a lighter subscription bill moves it.",
    ],
  },
];

/* ------------------------------- rendering ------------------------------- */

const VERIFICATION_LABELS = {
  official: "Official",
  retailer: "Retailer",
  estimate: "Estimate",
};

const esc = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function externalLinkHtml(href, text, affiliate) {
  const rel = "noopener noreferrer" + (affiliate ? " sponsored" : "");
  const label = affiliate ? `${text} (affiliate)` : text;
  return `<a href="${esc(href)}" target="_blank" rel="${rel}">${esc(label)}</a>`;
}

/** Price provenance markup mirroring the calculator's `appendSourceProvenance`. */
function sourceProvenanceHtml(entry) {
  const label = VERIFICATION_LABELS[entry.verification] || entry.verification;
  let html =
    `<span class="source-status source-status-${entry.verification}" ` +
    `data-verification="${entry.verification}" ` +
    `title="${esc(label)} price · last verified ${esc(entry.lastUpdated)}">${esc(label)}</span> · `;
  if (entry.sourceLabel) {
    html += `<span class="source-label">${esc(entry.sourceLabel)}</span> · `;
  }
  html += externalLinkHtml(entry.sourceUrl, "Source", false);
  if (entry.lastUpdated) {
    html +=
      ` · verified <time class="source-updated" datetime="${esc(entry.lastUpdated)}">` +
      `${esc(entry.lastUpdated)}</time>`;
  }
  return html;
}

function priceRange(low, high) {
  return low === high
    ? formatCurrency(low)
    : `${formatCurrency(low)}–${formatCurrency(high)}`;
}

/** Resolve a guide's featured box, comparison tiers, and calculator scenario. */
export function guideModel(guide) {
  const box = hardware.find((h) => h.id === guide.hardwareId);
  if (!box) throw new Error(`guide ${guide.slug}: unknown hardware ${guide.hardwareId}`);
  const subs = guide.subs.map((id) => {
    const sub = subscriptions.find((s) => s.id === id);
    if (!sub) throw new Error(`guide ${guide.slug}: unknown subscription ${id}`);
    return sub;
  });
  const inputs = guide.inputs || {};
  const scenario = {
    boxPrice: box.defaultBoxPrice ?? box.priceLow,
    downPayment: inputs.downPayment ?? defaults.downPayment,
    apr: inputs.apr ?? defaults.apr,
    term: inputs.term ?? defaults.term,
    electricityRate: inputs.electricityRate ?? defaults.electricityRate,
    powerDraw: box.powerDraw ?? defaults.powerDraw,
    hoursPerDay: inputs.hoursPerDay ?? defaults.hoursPerDay,
    // Explicitly clear the custom monthly spend so the scenario compares against
    // the listed subscription tiers, not a typed figure. This must be an empty
    // string (not omitted): serializeState emits `customSpend=` into the CTA
    // hash, which clears the calculator's default power-user spend when the link
    // is opened. Omitting it would leave that default ($200/mo) in force and make
    // the calculator show a different break-even than the guide states.
    customSpend: "",
    subscriptions: guide.subs,
  };
  const result = computeResult(scenario);
  const monthlySubscription = subs.reduce((sum, s) => sum + s.monthlyPrice, 0);
  return { box, subs, scenario, result, monthlySubscription };
}

function subscriptionRowsHtml(subs) {
  return subs
    .map(
      (sub) =>
        `            <tr>\n` +
        `              <td>${esc(sub.name)}</td>\n` +
        `              <td>${esc(sub.plan)}</td>\n` +
        `              <td>${esc(formatCurrency(sub.monthlyPrice))}/mo</td>\n` +
        `              <td>${sourceProvenanceHtml(sub)}</td>\n` +
        `            </tr>`
    )
    .join("\n");
}

function hardwareExampleRowsHtml(examples) {
  return examples
    .map((example) => {
      const affiliate = getAffiliate(example.id);
      const affiliateCta = affiliate
        ? ` ${externalLinkHtml(affiliate.url, affiliate.label, affiliate.affiliate)}`
        : "";
      return (
        `            <tr>\n` +
        `              <td>${esc(example.name)}</td>\n` +
        `              <td>${esc(affiliate?.vendor || "GMKtec")}</td>\n` +
        `              <td>${esc(example.spec)}</td>\n` +
        `              <td>${esc(priceRange(example.priceLow, example.priceHigh))}</td>\n` +
        `              <td>${sourceProvenanceHtml(example)}${affiliateCta}</td>\n` +
        `            </tr>`
      );
    })
    .join("\n");
}

function hardwareExampleSectionHtml(guide) {
  if (guide.hardwareId !== "strix-halo") return "";
  const examples = hardware.filter((h) => h.exampleOf === guide.hardwareId);
  if (!examples.length) return "";

  return `
    <!-- ===================== PURCHASEABLE EXAMPLES ===================== -->
    <section class="comparison" aria-labelledby="examples-title">
      <h2 id="examples-title">Concrete Strix Halo SKU examples</h2>
      <p class="section-intro">
        The named Framework Desktop and GMKtec systems below bound the class
        estimate above, so the Strix Halo range is backed by specific
        purchasable configurations rather than a generic class guess.
      </p>
      <div class="table-scroll" role="region" aria-labelledby="examples-title" tabindex="0">
        <table class="comparison-table">
          <thead>
            <tr>
              <th scope="col">Option</th>
              <th scope="col">Vendor</th>
              <th scope="col">Memory / storage</th>
              <th scope="col">Price</th>
              <th scope="col">Source</th>
            </tr>
          </thead>
          <tbody>
${hardwareExampleRowsHtml(examples)}
          </tbody>
        </table>
      </div>
    </section>`;
}

function caveatsHtml(caveats) {
  return caveats
    .map((c) => `        <li>${esc(c)}</li>`)
    .join("\n");
}

function useCaseHtml(paragraphs) {
  return paragraphs
    .map((p) => `      <p class="section-intro">${esc(p)}</p>`)
    .join("\n");
}

/** Render one guide to a complete, standalone HTML document. */
export function renderGuide(guide) {
  const { box, subs, scenario, result, monthlySubscription } = guideModel(guide);
  const canonical = `${SITE_URL}guides/${guide.slug}.html`;
  // Escaped for use in HTML href attributes: serializeState joins params with
  // "&", which must render as "&amp;" in static markup (the browser decodes it
  // back to "&" when following the link).
  const ctaHref = esc(`../index.html#${serializeState(scenario)}`);
  const affiliate = getAffiliate(box.id);
  const affiliateCta = affiliate
    ? ` ${externalLinkHtml(affiliate.url, affiliate.label, affiliate.affiliate)}`
    : "";

  const breakEvenText =
    result.breakEvenMonth === null
      ? "does not break even within the 60-month horizon"
      : `breaks even in ${formatBreakEven(result.breakEvenMonth).toLowerCase()}`;
  const breakEvenMetric =
    result.breakEvenMonth === null
      ? "Not within 60 months"
      : formatBreakEven(result.breakEvenMonth);
  const savings = result.monthlyNetSavings;
  const savingsMetric = savings === null ? "—" : `${formatCurrency(savings)}/mo`;

  const subCount = subs.length;
  const subNames = subs.map((s) => `${s.name} ${s.plan}`).join(" + ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(guide.title)}</title>
  <meta name="description" content="${esc(guide.description)}" />
  <meta name="color-scheme" content="light dark" />
  <meta name="theme-color" content="#1f5fd6" media="(prefers-color-scheme: light)" />
  <meta name="theme-color" content="#14171c" media="(prefers-color-scheme: dark)" />
  <meta name="author" content="AI Subscription Payback" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="${canonical}" />
  <link rel="sitemap" type="application/xml" href="../sitemap.xml" />
  <!-- Declared icon so browsers use it instead of requesting a 404 /favicon.ico -->
  <link rel="icon" type="image/svg+xml" href="../assets/img/favicon.svg" />

  <!-- Open Graph / social sharing -->
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="AI Subscription Payback" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:title" content="${esc(guide.title)}" />
  <meta property="og:description" content="${esc(guide.description)}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="${SITE_URL}assets/img/og-card.png" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="AI Subscription Payback social card showing the calculator headline and featured hardware boxes." />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(guide.title)}" />
  <meta name="twitter:description" content="${esc(guide.description)}" />
  <meta name="twitter:image" content="${SITE_URL}assets/img/og-card.png" />
  <meta name="twitter:image:alt" content="AI Subscription Payback — calculate when a local AI inference box beats your AI coding subscriptions." />

  <!-- Structured data: the guide as a tech article with a breadcrumb back to the app. -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        "headline": ${JSON.stringify(guide.title)},
        "description": ${JSON.stringify(guide.description)},
        "url": ${JSON.stringify(canonical)},
        "isPartOf": {
          "@type": "WebApplication",
          "name": "AI Subscription Payback",
          "url": ${JSON.stringify(SITE_URL)}
        },
        "dateModified": ${JSON.stringify(siteLastUpdated)},
        "isAccessibleForFree": true
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "AI Subscription Payback calculator",
            "item": ${JSON.stringify(SITE_URL)}
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": ${JSON.stringify(guide.heading)},
            "item": ${JSON.stringify(canonical)}
          }
        ]
      }
    ]
  }
  </script>

  <link rel="stylesheet" href="../assets/css/styles.css" />
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>

  <header class="site-header">
    <div class="wrap header-inner">
      <a class="brand" href="../">AI Subscription Payback</a>
      <nav class="site-nav" aria-label="Primary">
        <a href="../">Calculator</a>
        <a href="../#guides">Guides</a>
      </nav>
    </div>
  </header>

  <main class="wrap" id="main">
    <nav class="footer-meta" aria-label="Breadcrumb">
      <a href="../">Calculator</a> · <span>Guides</span> · <span>${esc(guide.heading)}</span>
    </nav>

    <!-- ===================== USE CASE ===================== -->
    <section class="hero" aria-labelledby="guide-title">
      <h1 id="guide-title">${esc(guide.heading)}</h1>
${useCaseHtml(guide.useCase)}
      <p class="hero-cta">
        <a class="button button-primary" href="${ctaHref}">Open this scenario in the calculator</a>
      </p>
    </section>

    <!-- ===================== PRICE / SPEC SNAPSHOT ===================== -->
    <section class="comparison" aria-labelledby="snapshot-title">
      <h2 id="snapshot-title">Price &amp; spec snapshot</h2>
      <p class="section-intro">
        Curated from the same source-backed data as the calculator. Prices are
        periodically hand-verified estimates, not live quotes — confirm current
        pricing with the source before buying.
      </p>
      <div class="table-scroll" role="region" aria-labelledby="snapshot-title" tabindex="0">
        <table class="comparison-table">
          <thead>
            <tr>
              <th scope="col">Option</th>
              <th scope="col">Plan / spec</th>
              <th scope="col">Price</th>
              <th scope="col">Source</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${esc(box.name)}</td>
              <td>${esc(box.spec)}</td>
              <td>${esc(priceRange(box.priceLow, box.priceHigh))}</td>
              <td>${sourceProvenanceHtml(box)}${affiliateCta}</td>
            </tr>
${subscriptionRowsHtml(subs)}
          </tbody>
        </table>
      </div>
      <p class="disclosure">${esc(box.name)}: ${esc(box.priceNote)}</p>
    </section>
${hardwareExampleSectionHtml(guide)}

    <!-- ===================== SAMPLE SCENARIO ===================== -->
    <section class="calculator" aria-labelledby="scenario-title">
      <h2 id="scenario-title">Sample payback scenario</h2>
      <p class="section-intro">
        ${esc(guide.scenarioLede)} Financed at ${esc(String(scenario.apr))}% APR over
        ${esc(String(scenario.term))} months with a ${esc(formatCurrency(scenario.downPayment))}
        down payment, at ${esc(formatRate(scenario.electricityRate))}/kWh and
        ${esc(String(scenario.hoursPerDay))} hours of use per day. Against
        ${esc(formatCurrency(monthlySubscription))}/mo of subscriptions
        (${esc(subNames)}), a ${esc(formatCurrency(scenario.boxPrice))} ${esc(box.name)}
        ${esc(breakEvenText)}.
      </p>
      <dl class="result-metrics">
        <div class="metric">
          <dt>Break-even</dt>
          <dd data-metric="breakeven">${esc(breakEvenMetric)}</dd>
        </div>
        <div class="metric">
          <dt>Monthly loan payment</dt>
          <dd data-metric="payment">${esc(formatCurrency(result.monthlyPayment))}</dd>
        </div>
        <div class="metric">
          <dt>Monthly net savings</dt>
          <dd data-metric="savings">${esc(savingsMetric)}</dd>
        </div>
      </dl>
      <p class="results-caveat">
        Cost estimates only. This compares spend, not model quality or coding
        performance — a local box may not match a subscription's models. Not
        financial advice.
      </p>
      <p class="hero-cta">
        <a class="button button-primary" href="${ctaHref}">Adjust this scenario in the calculator</a>
      </p>
    </section>

    <!-- ===================== CAVEATS / TRADEOFFS ===================== -->
    <section class="methodology" aria-labelledby="caveats-title">
      <h2 id="caveats-title">Caveats &amp; software tradeoffs</h2>
      <ul class="assumptions-list">
${caveatsHtml(guide.caveats)}
      </ul>
    </section>
  </main>

  <!-- ===================== FOOTER ===================== -->
  <footer class="site-footer">
    <div class="wrap footer-inner">
      <p class="footer-about">
        <strong>AI Subscription Payback</strong> is a free, static, open calculator that
        estimates when a local AI inference box becomes cheaper than AI coding
        subscriptions. Cost estimates only — not tax, accounting, or financial
        advice.
      </p>
      <p class="footer-meta">
        <a href="${ctaHref}">Open this scenario in the calculator</a>
        · <a href="../">All guides &amp; calculator</a>
      </p>
    </div>
  </footer>
</body>
</html>
`;
}

/**
 * Build every guide's committed path + markup. The single source of truth for
 * the generated files; the CLI writes it and the test asserts parity.
 * @returns {Array<{ slug: string, path: string, html: string }>}
 */
export function buildGuides() {
  return GUIDES.map((guide) => ({
    slug: guide.slug,
    path: `guides/${guide.slug}.html`,
    html: renderGuide(guide),
  }));
}

/* ------------------------------ CLI entry point ------------------------------ */

const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (invokedDirectly) {
  const root = new URL("../", import.meta.url);
  mkdirSync(fileURLToPath(new URL("guides/", root)), { recursive: true });
  for (const { path, html } of buildGuides()) {
    writeFileSync(fileURLToPath(new URL(path, root)), html);
    console.log(`wrote ${path}`);
  }
}
