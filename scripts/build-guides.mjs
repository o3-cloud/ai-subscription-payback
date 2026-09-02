#!/usr/bin/env node
/**
 * Static mini-guide generator (issue #28).
 *
 * The site is deliberately build-step-free, but the comparison guides share a
 * lot of structure and every price/spec they quote must stay in lock-step with
 * the curated data in `assets/js/data.js`. Rather than hand-maintain many
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
  tokenOutputValueAssumptions,
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
  {
    slug: "kiro-vs-local-ai-box-cost",
    hardwareId: "strix-halo",
    subs: ["kiro-pro-max", "kiro-power"],
    title: "Kiro vs a Local AI Box — Cost Comparison",
    description:
      "How Kiro's higher-usage paid plans compare to owning a local AI inference box. Source-backed price snapshot and a sample break-even scenario.",
    heading: "Kiro vs a local AI box: the cost",
    useCase: [
      "Kiro is an AI coding IDE/CLI/Web/Mobile product with a credit-based ladder, so the moment you move beyond lighter usage it becomes fair to ask whether local hardware would cost less over time. This guide compares the higher paid Kiro tiers against an owned local box and shows where the math crosses.",
      "It is aimed at Kiro-heavy users who care about recurring credit spend, add-on overage, and whether a local machine can win on cost alone.",
    ],
    scenarioLede:
      "A Kiro Pro Max plus Power bundle against a value-class Strix Halo box.",
    caveats: [
      "Kiro's paid tiers are credit-based and overage is billed separately at the published per-credit rate, so the real monthly bill can be higher than the list price alone.",
      "A local box cannot run Kiro's hosted service; you'd be running open-weight models with a different agent stack, so you are comparing spend, not identical capability.",
      "The box's payback only makes sense if you are already in the Kiro-heavy usage band — a lighter plan or a free-tier user does not pencil out the same way.",
      "Financing assumptions and your actual credit consumption both move the break-even month materially.",
    ],
  },
  {
    slug: "supermaven-vs-local-ai-box-cost",
    hardwareId: "strix-halo",
    subs: ["supermaven-pro", "supermaven-team"],
    title: "Supermaven vs a Local AI Box — Cost Comparison",
    description:
      "How Supermaven's paid plans compare to owning a local AI inference box. Source-backed price snapshot and a sample break-even scenario.",
    heading: "Supermaven vs a local AI box: the cost",
    useCase: [
      "Supermaven's paid ladder is still relatively inexpensive, which makes the local-hardware payback question much tougher than with the pricier agent products. This guide compares the paid Supermaven tiers against owning a local inference box and is honest about when the box does not pay off.",
      "It is written for developers who care about the 1M token context window, the included Chat credits, and whether a local setup is cheaper than a lightweight subscription.",
    ],
    scenarioLede:
      "A Supermaven Pro plus Team bundle against a value-class Strix Halo box.",
    caveats: [
      "Supermaven's paid tiers bundle the 1M token context window plus Chat credits, and Team adds central user management and billing on top of the individual Pro plan.",
      "A local box cannot run Supermaven's hosted service; you would use open-weight models and a different coding agent, so the comparison is cost-first rather than capability-first.",
      "Because the paid plans are comparatively cheap, the hardware only starts to make sense once your spend scales beyond the basic single-user tier.",
      "Changing the number of seats or swapping in a more expensive local box shifts the payback month quickly.",
    ],
  },
  {
    slug: "factory-vs-local-ai-box-cost",
    hardwareId: "strix-halo",
    subs: ["factory-plus", "factory-max"],
    title: "Factory vs a Local AI Box — Cost Comparison",
    description:
      "How Factory's paid Droid plans compare to owning a local AI inference box. Source-backed price snapshot and a sample break-even scenario.",
    heading: "Factory vs a local AI box: the cost",
    useCase: [
      "Factory's Droid plans move from everyday Desktop/CLI/SDK usage to higher-usage remote-computer workflows very quickly, so the spend can climb fast for power users. This guide compares the pricier Factory plans against buying local hardware and prices out the crossover.",
      "It is aimed at users who are already leaning on Factory's background agents and Droid Computers and want to know whether the subscription stack or an owned box is the cheaper long-term path.",
    ],
    scenarioLede:
      "A Factory Plus plus Max bundle against a value-class Strix Halo box.",
    caveats: [
      "Factory Plus adds about 5× the Pro usage and Droid Computers, while Max adds about 10× the Pro usage plus early access to new features, so the ladder is designed for heavier spend.",
      "A local box cannot run Factory's hosted agent service; you're comparing the dollar cost of a different local workflow against Factory's cloud-backed Droid stack.",
      "The bundle scenario is intentionally heavy: if your actual usage is closer to Pro, the box is less likely to win on cost alone.",
      "As with every local-box comparison, model choice, quantization, and financing assumptions change the month where the lines cross.",
    ],
  },
  {
    slug: "manus-vs-local-ai-box-cost",
    hardwareId: "strix-halo",
    subs: ["manus-customizable", "manus-extended"],
    title: "Manus vs a Local AI Box — Cost Comparison",
    description:
      "How Manus's higher paid plans compare to owning a local AI inference box. Source-backed price snapshot and a sample break-even scenario.",
    heading: "Manus vs a local AI box: the cost",
    useCase: [
      "Manus is a general-purpose autonomous agent for building apps, research, and automations, so its higher tiers are best thought of as ongoing production spend rather than an occasional utility bill. This guide compares the heavier Manus plans against a local box and shows when ownership starts to look cheaper.",
      "It is for people who are pushing Manus beyond light experimentation and want to compare credit-heavy automation costs against a one-time hardware purchase.",
    ],
    scenarioLede:
      "A Manus Customizable plus Extended bundle against a value-class Strix Halo box.",
    caveats: [
      "Manus's paid tiers are credit-based and the higher plans mainly buy you more included credits plus more concurrent agent tasks, so the effective monthly spend can move around with usage.",
      "A local box cannot run Manus itself; you would be running open-weight models with a different agent stack, so the comparison is about spend, not feature parity.",
      "The heavier the automation workload, the more plausible the hardware payback becomes — but a light Manus user usually stays ahead on subscription cost.",
      "The calculator's financing and electricity assumptions remain the deciding factors for the exact break-even month.",
    ],
  },
  {
    slug: "v0-vercel-vs-local-ai-box-cost",
    hardwareId: "strix-halo",
    subs: ["v0-plus", "v0-business"],
    title: "v0 by Vercel vs a Local AI Box — Cost Comparison",
    description:
      "How v0 by Vercel's paid app-building tiers compare to owning a local AI inference box. Source-backed price snapshot and a sample break-even scenario.",
    heading: "v0 by Vercel vs a local AI box: the cost",
    useCase: [
      "v0 is an app-building and UI-generation agent with credit-based paid tiers, centralized billing, and deployment hooks into Vercel, so it sits squarely in the same recurring-spend bucket as the coding assistants. This guide compares the paid v0 plans against owning a local box and asks when the hardware wins on cost.",
      "It is written for builders who are already paying for v0 Plus or Business and want to know whether recurring app-generation spend is still cheaper than buying local inference hardware.",
    ],
    scenarioLede:
      "A v0 Plus plus Business bundle against a value-class Strix Halo box.",
    caveats: [
      "v0's paid plans buy credits, model access, deployment helpers, and team features; the list price is only part of the cost if you are actively building with it.",
      "A local box cannot replace v0's hosted product features, so the comparison is cost-first rather than a claim of identical app-generation capability.",
      "The bundle scenario is intentionally heavy; a lighter single-seat plan is much harder for local hardware to beat on cost alone.",
      "Changing the number of seats or the amount of credit consumption will move the payback month quickly.",
    ],
  },
  {
    slug: "cursor-vs-local-ai-box-cost",
    hardwareId: "strix-halo",
    subs: ["cursor-pro-plus", "cursor-ultra"],
    title: "Cursor vs a Local AI Box — Cost Comparison",
    description:
      "How Cursor's paid editor-assistant tiers compare to owning a local AI inference box. Source-backed price snapshot and a sample break-even scenario.",
    heading: "Cursor vs a local AI box: the cost",
    useCase: [
      "Cursor is the AI IDE/editor family where the decision is usually driven by Individual, Pro+, Ultra, or team spend rather than a one-off tool purchase. This guide compares the higher Cursor tiers against owned local hardware and shows when the recurring bill starts to rival the box.",
      "It is for developers and teams already leaning on Cursor's Agent limits, Grok limits, frontier-model access, MCPs, skills/hooks, Cloud Agents, and Bugbot billing who want to know whether the higher tiers justify buying local inference hardware instead.",
    ],
    scenarioLede:
      "A Cursor Pro+ seat plus the Ultra tier against a value-class Strix Halo box.",
    caveats: [
      "Cursor is an editor-first hosted product with frontier-model access, agent tooling, and usage-based billing beyond the included allowances, so the list price is only part of the real spend.",
      "A local box cannot replace Cursor's hosted editor experience or agent orchestration; you would be using a different local stack for open-weight models, not the same product.",
      "The cheaper Individual plan is a very different payback story from the heavier Pro+ / Ultra ladder, so the sample scenario intentionally focuses on the high-usage end.",
      "Seat count, billing cadence, and how hard you push the agents all move the break-even month.",
    ],
  },
  {
    slug: "github-copilot-vs-local-ai-box-cost",
    hardwareId: "strix-halo",
    subs: ["copilot-pro-plus", "copilot-max"],
    title: "GitHub Copilot vs a Local AI Box — Cost Comparison",
    description:
      "How GitHub Copilot's Pro+ and Max tiers compare to owning a local AI inference box. Source-backed price snapshot and a sample break-even scenario.",
    heading: "GitHub Copilot vs a local AI box: the cost",
    useCase: [
      "GitHub Copilot now spans free, Pro, Pro+, and Max tiers, plus GitHub AI Credits that can spill into premium-model usage. This guide compares the higher paid Copilot tiers against local hardware and asks whether the hosted coding-assistant bill still beats ownership.",
      "It is written for developers already paying for Pro+ or thinking about Max who want to know when a local box can compete on cost.",
    ],
    scenarioLede:
      "A Copilot Pro+ subscription plus the Max tier against a value-class Strix Halo box.",
    caveats: [
      "Copilot's paid plans include premium-model access and GitHub AI Credits, and usage beyond those credits is metered, so the sticker price understates heavy usage.",
      "A local box cannot run Copilot itself; you would be comparing the spend to a different local model stack, not the same hosted assistant.",
      "The Pro plan is much cheaper than Max, so the sample scenario intentionally focuses on the heavier tiers where hardware payback is more plausible.",
      "If your usage is mostly lighter completions, the local box is much harder to justify on dollars alone.",
    ],
  },
  {
    slug: "google-ai-jules-antigravity-vs-local-ai-box-cost",
    hardwareId: "strix-halo",
    subs: ["google-ai-pro", "google-ai-ultra"],
    title: "Google AI Pro and Google AI Ultra vs a Local AI Box — Cost Comparison",
    description:
      "How Google AI Pro and Google AI Ultra compare to owning a local AI inference box. Source-backed price snapshot and a sample break-even scenario.",
    heading: "Google AI Pro and Google AI Ultra vs a local AI box: the cost",
    useCase: [
      "Google AI is the broad Gemini subscription layer, and the Plus, Pro, and Ultra tiers are the current paid plans that surface the Gemini Omni Flash / Daily Brief / Nano Banana bundle on Plus and the Jules / Google Antigravity / Google Home Premium / YouTube Premium Lite bundle on Pro alongside the newer Gemini 3.1 Pro / 3.6 Flash wording. This guide compares those higher Google AI plans against a local AI box and shows where the recurring subscription cost catches up.",
      "It is aimed at people using Google AI for both everyday Gemini-app limits and the current Pro/Ultra workflow who want to know whether the higher-tier spend is better replaced by local inference hardware instead of the hosted bundle perks.",
    ],
    scenarioLede:
      "A Google AI Pro subscription plus the Google AI Ultra tier against a value-class Strix Halo box.",
    caveats: [
      "Google AI is a hosted service with broad Gemini-app limits plus current Pro/Ultra benefits on the relevant tiers, so the list price is really buying access and managed capacity rather than just tokens.",
      "A local box cannot reproduce Google's hosted Gemini, Jules, Antigravity, Home Premium, or YouTube Premium Lite bundle; it only substitutes a local model workflow for the spending side of the equation.",
      "The cheaper Plus tier does not include the same Pro/Ultra coding-agent benefits, so the sample focuses on Pro and Ultra where the payback question is more relevant.",
      "As always, the exact break-even month shifts with seat count, billing cadence, and how heavily you use the agents.",
    ],
  },
  {
    slug: "replit-agent-vs-local-ai-box-cost",
    hardwareId: "strix-halo",
    subs: ["replit-core-monthly", "replit-pro-monthly"],
    title: "Replit Agent vs a Local AI Box — Cost Comparison",
    description:
      "How Replit Core and Pro compare to owning a local AI inference box. Source-backed price snapshot and a sample break-even scenario.",
    heading: "Replit Agent vs a local AI box: the cost",
    useCase: [
      "Replit's Core and Pro plans bundle Replit Agent credits, collaborators, and parallel agents, so the real bill is driven by how much agentic building you do. This guide compares the monthly Core and Pro tiers against local hardware and shows when the hosted spend starts to rival ownership.",
      "It is written for builders who treat Replit Agent as part of their everyday app workflow and want to know whether heavier usage justifies a local box instead.",
    ],
    scenarioLede:
      "A Replit Core subscription plus Pro against a value-class Strix Halo box.",
    caveats: [
      "Replit credits, collaborators, and concurrent agents all shape the real monthly cost, so the top-line plan price is only the beginning.",
      "A local box cannot replace Replit Agent's hosted environment and deployment workflow; it only gives you a different local model stack to spend against.",
      "The annual plans lower the effective monthly rate, but the monthly Core and Pro tiers are the clearest way to see the payback crossover.",
      "If your usage stays near the free or lower-credit levels, the hardware case gets much weaker very quickly.",
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
  if (entry.sourceNote) {
    html += ` · <span class="source-note">${esc(entry.sourceNote)}</span>`;
  }
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

const YEAR_SECONDS = tokenOutputValueAssumptions.annualUtilizationSeconds;
const FRONTIER_PRICE_LOW =
  tokenOutputValueAssumptions.frontierOutputPriceLowPerMillionTokens;
const FRONTIER_PRICE_HIGH =
  tokenOutputValueAssumptions.frontierOutputPriceHighPerMillionTokens;
const numberFormatter = new Intl.NumberFormat("en-US");
const decimalFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

function formatInteger(value) {
  return numberFormatter.format(Math.round(value));
}

function formatDecimal(value) {
  return decimalFormatter.format(value);
}

function annualTokenOutput(tokensPerSecond) {
  return Math.round(tokensPerSecond * YEAR_SECONDS);
}

function frontierOutputValue(tokens, pricePerMillion) {
  return (tokens / 1_000_000) * pricePerMillion;
}

function subscriptionMonthsEquivalent(value, monthlySubscription) {
  return monthlySubscription > 0 ? value / monthlySubscription : null;
}

function valueComparisonRowsHtml(box, monthlySubscription) {
  if (!box.tokensPerSecond) return "";
  const lowerTokens = annualTokenOutput(box.tokensPerSecond.low);
  const upperTokens = annualTokenOutput(box.tokensPerSecond.high);
  const lowerValue = frontierOutputValue(lowerTokens, FRONTIER_PRICE_LOW);
  const upperValue = frontierOutputValue(upperTokens, FRONTIER_PRICE_HIGH);
  const lowerMonths = subscriptionMonthsEquivalent(lowerValue, monthlySubscription);
  const upperMonths = subscriptionMonthsEquivalent(upperValue, monthlySubscription);

  return `
            <tr>
              <td>Lower bound</td>
              <td>${formatInteger(box.tokensPerSecond.low)} tok/s</td>
              <td>${formatInteger(lowerTokens)} tokens</td>
              <td>${formatCurrency(lowerValue)} at ${formatCurrency(FRONTIER_PRICE_LOW)}/M tokens</td>
              <td>${lowerMonths === null ? "—" : `${formatDecimal(lowerMonths)} months`}</td>
            </tr>
            <tr>
              <td>Upper bound</td>
              <td>${formatInteger(box.tokensPerSecond.high)} tok/s</td>
              <td>${formatInteger(upperTokens)} tokens</td>
              <td>${formatCurrency(upperValue)} at ${formatCurrency(FRONTIER_PRICE_HIGH)}/M tokens</td>
              <td>${upperMonths === null ? "—" : `${formatDecimal(upperMonths)} months`}</td>
            </tr>`;
}

function valueComparisonSectionHtml(box, monthlySubscription) {
  if (!box.tokensPerSecond) return "";
  const lowerTokens = annualTokenOutput(box.tokensPerSecond.low);
  const upperTokens = annualTokenOutput(box.tokensPerSecond.high);
  return `
    <!-- ===================== VALUE COMPARISON ===================== -->
    <section class="comparison" aria-labelledby="value-title">
      <h2 id="value-title">24/7 yearly token-output value estimate</h2>
      <p class="section-intro">
        This is a throughput-and-value estimate, not a benchmark or a guarantee.
        The box is assumed to run 24 hours/day for 360 days/year (${formatInteger(
          tokenOutputValueAssumptions.annualUtilizationHours
        )} hours or ${formatInteger(YEAR_SECONDS)} seconds per year). We compare the
        sustained token-output range to a maintained frontier output price band of
        ${formatCurrency(FRONTIER_PRICE_LOW)}–${formatCurrency(FRONTIER_PRICE_HIGH)} per
        million output tokens. That keeps the estimate transparent and easy to
        revise if pricing or sustained throughput assumptions change.
      </p>
      <p class="section-intro">
        Rate limiting, idle time, queueing, and thermal headroom all reduce the
        realized value. Use the lower bound when the box is throttled or running a
        smaller model, and the upper bound only when the stack stays saturated on a
        well-tuned local deployment. The range is meant to bracket practical
        sustained output, not to claim an exact frontier-model equivalent.
      </p>
      <div class="table-scroll" role="region" aria-labelledby="value-title" tabindex="0">
        <table class="comparison-table">
          <thead>
            <tr>
              <th scope="col">Bound</th>
              <th scope="col">Sustained rate</th>
              <th scope="col">Yearly token output</th>
              <th scope="col">Frontier output value</th>
              <th scope="col">Equivalent subscription spend</th>
            </tr>
          </thead>
          <tbody>
${valueComparisonRowsHtml(box, monthlySubscription)}
          </tbody>
        </table>
      </div>
      <p class="disclosure">
        Practical model mapping: the low end is closer to a compact frontier helper
        class, while the high end is closer to a heavier coding-assistant class.
        Because local stacks, quantization choices, and rate limits vary, the site
        intentionally shows a range instead of a single precise number.
      </p>
    </section>`;
}

/**
 * Render the box's model-fit block, keeping the vendor's official workload
 * ceiling (when one exists) visibly separate from the site's conservative
 * heuristic. The official claim is vendor-attributed; the heuristic is framed
 * as this site's advisory estimate so the two are never conflated.
 */
function modelFitSectionHtml(box) {
  if (!box.officialModelFit && !box.modelFit) return "";
  const officialHtml = box.officialModelFit
    ? `
      <p class="section-intro guide-model-fit-official">
        <strong>Vendor workload ceiling.</strong> ${esc(box.officialModelFit)}
      </p>`
    : "";
  const heuristicLead = box.officialModelFit
    ? "This site's conservative heuristic — a separate estimate, not the vendor claim above:"
    : "This site's conservative model-fit heuristic:";
  const heuristicHtml = box.modelFit
    ? `
      <p class="disclosure guide-model-fit-heuristic">
        <strong>${esc(heuristicLead)}</strong> ${esc(box.modelFit)} It combines the
        published memory spec with this site's wide sustained-throughput ranges, so
        it moves with quantization, context length, batching, and runtime settings —
        a heuristic, not a benchmark or a vendor guarantee.
      </p>`
    : "";
  return `
    <!-- ===================== MODEL FIT ===================== -->
    <section class="comparison" aria-labelledby="model-fit-title">
      <h2 id="model-fit-title">What models fit locally</h2>${officialHtml}${heuristicHtml}
    </section>`;
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
        The named Framework Desktop, GMKtec, and MINISFORUM systems below bound the class
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
  <meta name="twitter:url" content="${canonical}" />
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
${modelFitSectionHtml(box)}
${valueComparisonSectionHtml(box, monthlySubscription)}
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
