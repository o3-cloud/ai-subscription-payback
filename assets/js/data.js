/**
 * Static, maintainer-editable data for the payback calculator.
 *
 * This is intentionally plain data (no fetch, no backend) so the site works as
 * a static GitHub Pages app and even from the file:// protocol.
 *
 * The data model is split into two concerns so they can be maintained
 * independently:
 *
 *  1. PRICING DATA — `subscriptions` and `hardware`. Each entry carries a
 *     price (or price range), a human `priceNote`, a `sourceUrl` for the quote,
 *     a `verification` status (official / retailer / estimate), and its own
 *     `lastUpdated` (last-verified) date. Pricing entries never carry affiliate
 *     links.
 *  2. AFFILIATE METADATA — `affiliates`, keyed by the pricing entry's `id`.
 *     Reseller / affiliate URLs, vendor names, and disclosure labels live here,
 *     kept deliberately separate from pricing so a monetization change can never
 *     silently edit a price or source. Look them up with `getAffiliate(id)`.
 *
 * Prices are hand-curated estimates and may be out of date — see the pricing
 * disclosure section on the page.
 */

/**
 * @typedef {Object} Subscription
 * @property {string} id
 * @property {string} name
 * @property {string} plan
 * @property {number} monthlyPrice - the value the calculator compares against. For
 *   annually billed tiers this is the effective monthly cost (annual price ÷ 12),
 *   so the comparison stays month-by-month regardless of billing cadence.
 * @property {string} billingCadence - how the tier is billed (monthly, annual up
 *   front, per seat, …) in plain language
 * @property {string} includedValue - what a seat/plan at this tier includes
 * @property {string} sourceUrl - where the price was quoted from
 * @property {string} sourceLabel - short provenance for the number (official vendor pricing, …)
 * @property {("official"|"retailer"|"estimate")} verification - how the number is
 *   substantiated: an "official" vendor price, a "retailer" / street price, or a
 *   class "estimate". Surfaced as a status badge next to the last-verified date.
 * @property {string} lastUpdated - ISO date (YYYY-MM-DD) this entry was last verified
 * @property {boolean} [defaultSelected]
 */

/**
 * @typedef {Object} Hardware
 * @property {string} id
 * @property {string} name
 * @property {string} spec
 * @property {number} priceLow
 * @property {number} priceHigh
 * @property {string} priceNote - context for the range (config, estimate, etc.)
 * @property {string} sourceUrl - where the price was quoted from
 * @property {string} sourceLabel - short provenance for the number (official vendor pricing, retail street price, class estimate, …)
 * @property {("official"|"retailer"|"estimate")} verification - how the number is
 *   substantiated: an "official" vendor price, a "retailer" / street price, or a
 *   class "estimate". Surfaced as a status badge next to the last-verified date.
 * @property {string} lastUpdated - ISO date (YYYY-MM-DD) this entry was last verified
 * @property {number} [defaultBoxPrice] - price used when this box seeds the form
 * @property {number} [powerDraw] - representative power draw under load (W)
 * @property {HardwareImage} [image] - product photo shown on the featured card
 */

/**
 * @typedef {Object} HardwareImage
 * @property {string} src - path to a local, vendor-sourced product photo under
 *   assets/img/ (a committed raster image, not an SVG illustration)
 * @property {string} alt - descriptive alt text for the product photo
 */

/**
 * @typedef {Object} Affiliate
 * @property {string} vendor - who the outbound link points at
 * @property {string} url - affiliate / reseller destination
 * @property {string} label - call-to-action text
 * @property {boolean} affiliate - true when `url` is a commissioned link
 */

/** ISO date (YYYY-MM-DD) the pricing data as a whole was last curated. */
export const pricingLastUpdated = "2026-07-17";

/** ISO date (YYYY-MM-DD) the site content was last updated. */
export const siteLastUpdated = "2026-07-17";

/* ----------------------------- pricing data ----------------------------- */

/**
 * Public subscription tiers people run AI coding assistants on. Codex keeps its
 * single individual plan; Claude Code carries the full public ladder (Pro, Max,
 * and Team seats) so a visitor can compare their real tier. GitHub Copilot,
 * Cursor, and Zed round out the common IDE/editor assistant plans, and the
 * Google AI tiers (Plus, Pro, Ultra) cover the broad Gemini subscriptions whose
 * Pro/Ultra tiers bundle the Jules and Google Antigravity coding agents, and the
 * Amazon Q Developer tiers (Free, Pro) cover AWS's assistant whose agentic
 * requests and Java code-transformation allowance are quota-limited, and the
 * Devin tiers (Free, Pro, Max, and a Teams plan) cover Cognition's autonomous
 * coding agent — its Teams plan is a `$80/mo team base + $40/mo per full dev
 * seat` formula, so it is modeled as the real cost of the first seat ($120/mo)
 * rather than a misleading single-seat number, with the base-plus-seat formula
 * spelled out in its `billingCadence`/`includedValue`. All of these ship
 * unchecked (no `defaultSelected`) so the default comparison basis stays
 * Codex + Claude Code Pro and only expands when a visitor opts in.
 *
 * `monthlyPrice` is always the month-by-month comparison value — for annually
 * billed tiers it is the effective monthly cost (annual price ÷ 12), which keeps
 * the calculator's cumulative math cadence-agnostic. `billingCadence` and
 * `includedValue` document how the tier is actually billed and what it includes,
 * including usage-based caveats (Copilot AI Credits, Zed token credits).
 *
 * @type {Subscription[]}
 */
export const subscriptions = [
  {
    id: "codex",
    name: "Codex",
    plan: "Individual",
    monthlyPrice: 20,
    billingCadence: "Billed monthly",
    includedValue: "Individual Codex plan for a single developer.",
    sourceUrl: "https://openai.com/chatgpt/pricing/",
    sourceLabel: "Official OpenAI pricing",
    verification: "official",
    lastUpdated: "2026-07-01",
    defaultSelected: true,
  },
  {
    id: "claude-code",
    name: "Claude Code",
    plan: "Pro (monthly)",
    monthlyPrice: 20,
    billingCadence: "Billed monthly",
    includedValue: "Individual Pro plan: Claude Code plus web and desktop chat for one person.",
    sourceUrl: "https://claude.com/pricing",
    sourceLabel: "Official Anthropic pricing",
    verification: "official",
    lastUpdated: "2026-07-01",
    defaultSelected: true,
  },
  {
    id: "claude-pro-annual",
    name: "Claude Code",
    plan: "Pro (annual)",
    monthlyPrice: 17,
    billingCadence: "Billed annually — $200 up front (~$17/mo effective)",
    includedValue: "The Pro plan prepaid for a year at a lower effective monthly rate.",
    sourceUrl: "https://claude.com/pricing",
    sourceLabel: "Official Anthropic pricing",
    verification: "official",
    lastUpdated: "2026-07-01",
  },
  {
    id: "claude-max-5x",
    name: "Claude Code",
    plan: "Max 5×",
    monthlyPrice: 100,
    billingCadence: "Billed monthly — from $100/mo",
    includedValue: "Roughly 5× the Pro usage limits for heavier Claude Code sessions.",
    sourceUrl: "https://claude.com/pricing",
    sourceLabel: "Official Anthropic pricing",
    verification: "official",
    lastUpdated: "2026-07-01",
  },
  {
    id: "claude-team-standard-monthly",
    name: "Claude Code",
    plan: "Team — Standard seat (monthly)",
    monthlyPrice: 25,
    billingCadence: "Billed monthly, per seat",
    includedValue: "Per-seat Team plan with collaboration and central billing at standard usage.",
    sourceUrl: "https://claude.com/pricing",
    sourceLabel: "Official Anthropic pricing",
    verification: "official",
    lastUpdated: "2026-07-01",
  },
  {
    id: "claude-team-standard-annual",
    name: "Claude Code",
    plan: "Team — Standard seat (annual)",
    monthlyPrice: 20,
    billingCadence: "Billed annually, per seat (~$20/mo effective)",
    includedValue: "The standard Team seat prepaid annually at a lower effective monthly rate.",
    sourceUrl: "https://claude.com/pricing",
    sourceLabel: "Official Anthropic pricing",
    verification: "official",
    lastUpdated: "2026-07-01",
  },
  {
    id: "claude-team-premium-monthly",
    name: "Claude Code",
    plan: "Team — Premium seat (monthly)",
    monthlyPrice: 125,
    billingCadence: "Billed monthly, per seat",
    includedValue: "Premium Team seat bundling higher Claude Code usage with Team collaboration.",
    sourceUrl: "https://claude.com/pricing",
    sourceLabel: "Official Anthropic pricing",
    verification: "official",
    lastUpdated: "2026-07-01",
  },
  {
    id: "claude-team-premium-annual",
    name: "Claude Code",
    plan: "Team — Premium seat (annual)",
    monthlyPrice: 100,
    billingCadence: "Billed annually, per seat (~$100/mo effective)",
    includedValue: "The premium Team seat prepaid annually at a lower effective monthly rate.",
    sourceUrl: "https://claude.com/pricing",
    sourceLabel: "Official Anthropic pricing",
    verification: "official",
    lastUpdated: "2026-07-01",
  },
  {
    id: "copilot-free",
    name: "GitHub Copilot",
    plan: "Free",
    monthlyPrice: 0,
    billingCadence: "Free tier",
    includedValue:
      "2,000 completions/month plus limited chat on lighter models (Haiku 4.5, GPT-5 mini) for a single developer at no cost.",
    sourceUrl: "https://github.com/features/copilot/plans",
    sourceLabel: "Official GitHub pricing",
    verification: "official",
    lastUpdated: "2026-07-14",
  },
  {
    id: "copilot-pro",
    name: "GitHub Copilot",
    plan: "Pro",
    monthlyPrice: 10,
    billingCadence: "Billed monthly (or $100/yr)",
    includedValue:
      "Unlimited completions plus $15/mo of GitHub AI Credits toward premium models and 3rd-party agents like Claude Code and Codex; agent usage beyond the credits is metered.",
    sourceUrl: "https://github.com/features/copilot/plans",
    sourceLabel: "Official GitHub pricing",
    verification: "official",
    lastUpdated: "2026-07-14",
  },
  {
    id: "copilot-pro-plus",
    name: "GitHub Copilot",
    plan: "Pro+",
    monthlyPrice: 39,
    billingCadence: "Billed monthly (or $390/yr)",
    includedValue:
      "Premium models including Opus, 4×+ the included usage of Pro, and $70/mo of GitHub AI Credits; usage beyond the credits is metered.",
    sourceUrl: "https://github.com/features/copilot/plans",
    sourceLabel: "Official GitHub pricing",
    verification: "official",
    lastUpdated: "2026-07-14",
  },
  {
    id: "copilot-max",
    name: "GitHub Copilot",
    plan: "Max",
    monthlyPrice: 100,
    billingCadence: "Billed monthly",
    includedValue:
      "Top individual tier: priority model access, 2.9×+ the included usage of Pro+, and $200/mo of GitHub AI Credits; usage beyond the credits is metered.",
    sourceUrl: "https://github.com/features/copilot/plans",
    sourceLabel: "Official GitHub pricing",
    verification: "official",
    lastUpdated: "2026-07-14",
  },
  {
    id: "cursor-individual",
    name: "Cursor",
    plan: "Individual",
    monthlyPrice: 20,
    billingCadence: "Billed monthly, per user",
    includedValue:
      "Individual (Pro) plan for one developer: extended agent limits and frontier-model access in the Cursor editor, with usage-based billing beyond the included allowances.",
    sourceUrl: "https://cursor.com/pricing",
    sourceLabel: "Official Cursor pricing",
    verification: "official",
    lastUpdated: "2026-07-14",
  },
  {
    id: "cursor-pro-plus",
    name: "Cursor",
    plan: "Pro+",
    monthlyPrice: 60,
    billingCadence: "Billed monthly, per user",
    includedValue:
      "Individual Pro+ plan for heavier agent use: roughly 3× the Pro agent limits plus frontier-model access, with usage-based billing beyond the included allowances.",
    sourceUrl: "https://cursor.com/pricing",
    sourceLabel: "Official Cursor pricing",
    verification: "official",
    lastUpdated: "2026-07-15",
  },
  {
    id: "cursor-ultra",
    name: "Cursor",
    plan: "Ultra",
    monthlyPrice: 200,
    billingCadence: "Billed monthly, per user",
    includedValue:
      "Individual Ultra plan for power users: roughly 20× the Pro agent limits and priority access to frontier models, with usage-based billing beyond the included allowances.",
    sourceUrl: "https://cursor.com/pricing",
    sourceLabel: "Official Cursor pricing",
    verification: "official",
    lastUpdated: "2026-07-15",
  },
  {
    id: "cursor-teams",
    name: "Cursor",
    plan: "Teams",
    monthlyPrice: 40,
    billingCadence: "Billed monthly, per user",
    includedValue:
      "Everything in Individual plus centralized billing, admin controls, and SSO for a team seat.",
    sourceUrl: "https://cursor.com/pricing",
    sourceLabel: "Official Cursor pricing",
    verification: "official",
    lastUpdated: "2026-07-14",
  },
  {
    id: "cursor-teams-premium",
    name: "Cursor",
    plan: "Teams Premium",
    monthlyPrice: 120,
    billingCadence: "Billed monthly, per user",
    includedValue:
      "Premium team seat with roughly 5× the Standard team agent limits on top of the Teams admin controls and SSO, with usage-based billing beyond the included allowances.",
    sourceUrl: "https://cursor.com/pricing",
    sourceLabel: "Official Cursor pricing",
    verification: "official",
    lastUpdated: "2026-07-15",
  },
  {
    id: "zed-personal",
    name: "Zed",
    plan: "Personal",
    monthlyPrice: 0,
    billingCadence: "Free tier",
    includedValue:
      "2,000 accepted edit predictions per month, plus unlimited use with your own API keys or external agents (Claude Agent, Codex CLI) at no cost.",
    sourceUrl: "https://zed.dev/pricing",
    sourceLabel: "Official Zed pricing",
    verification: "official",
    lastUpdated: "2026-07-16",
  },
  {
    id: "zed-pro",
    name: "Zed",
    plan: "Pro",
    monthlyPrice: 10,
    billingCadence: "Billed monthly — usage-based beyond credits",
    includedValue:
      "Unlimited edit predictions plus $5/mo of included token credits for Zed-hosted models; usage beyond the credits is billed at API list price +10%.",
    sourceUrl: "https://zed.dev/pricing",
    sourceLabel: "Official Zed pricing",
    verification: "official",
    lastUpdated: "2026-07-14",
  },
  {
    id: "zed-business",
    name: "Zed",
    plan: "Business",
    monthlyPrice: 30,
    billingCadence: "Billed monthly, per seat",
    includedValue:
      "Per-seat Business plan adding org-wide model policies, data governance, and unified spend visibility; Zed-hosted model usage is billed at standard rates.",
    sourceUrl: "https://zed.dev/pricing",
    sourceLabel: "Official Zed pricing",
    verification: "official",
    lastUpdated: "2026-07-14",
  },
  {
    id: "google-ai-plus",
    name: "Google AI",
    plan: "Plus",
    monthlyPrice: 4.99,
    billingCadence: "Billed monthly",
    includedValue:
      "Broad Google AI subscription for one person: higher Gemini app limits and expanded AI access across Google apps. Does not include the Jules or Google Antigravity coding-agent benefits.",
    sourceUrl: "https://gemini.google/subscriptions/",
    sourceLabel: "Official Google pricing",
    verification: "official",
    lastUpdated: "2026-07-15",
  },
  {
    id: "google-ai-pro",
    name: "Google AI",
    plan: "Pro",
    monthlyPrice: 19.99,
    billingCadence: "Billed monthly",
    includedValue:
      "Broad Google AI subscription with higher Gemini limits across Google apps, plus coding-agent access to Jules and Google Antigravity for one developer.",
    sourceUrl: "https://gemini.google/subscriptions/",
    sourceLabel: "Official Google pricing",
    verification: "official",
    lastUpdated: "2026-07-15",
  },
  {
    id: "google-ai-ultra",
    name: "Google AI",
    plan: "Ultra",
    monthlyPrice: 99.99,
    billingCadence: "Billed monthly",
    includedValue:
      "Top Google AI subscription with the highest Gemini limits across Google apps, plus the largest coding-agent allowances for Jules and Google Antigravity.",
    sourceUrl: "https://gemini.google/subscriptions/",
    sourceLabel: "Official Google pricing",
    verification: "official",
    lastUpdated: "2026-07-15",
  },
  {
    id: "amazon-q-developer-free",
    name: "Amazon Q Developer",
    plan: "Free",
    monthlyPrice: 0,
    billingCadence: "Free tier",
    includedValue:
      "Free tier for one developer with in-IDE chat and inline suggestions at no cost; agentic requests and Java code transformation (lines of code) are capped by a monthly quota.",
    sourceUrl: "https://aws.amazon.com/q/developer/pricing/",
    sourceLabel: "Official AWS pricing",
    verification: "official",
    lastUpdated: "2026-07-17",
  },
  {
    id: "amazon-q-developer-pro",
    name: "Amazon Q Developer",
    plan: "Pro",
    monthlyPrice: 19,
    billingCadence: "Billed monthly, per user",
    includedValue:
      "Per-user Pro plan raising the monthly limits and adding admin controls; agentic requests and Java code transformation (lines of code) stay quota-limited and are metered beyond the included allowance.",
    sourceUrl: "https://aws.amazon.com/q/developer/pricing/",
    sourceLabel: "Official AWS pricing",
    verification: "official",
    lastUpdated: "2026-07-17",
  },
  {
    id: "devin-free",
    name: "Devin",
    plan: "Free",
    monthlyPrice: 0,
    billingCadence: "Free tier",
    includedValue:
      "Free tier for one developer: a light monthly quota to code with the Devin agent, plus unlimited inline edits and tab completions at no cost.",
    sourceUrl: "https://devin.ai/pricing",
    sourceLabel: "Official Devin pricing",
    verification: "official",
    lastUpdated: "2026-07-17",
  },
  {
    id: "devin-pro",
    name: "Devin",
    plan: "Pro",
    monthlyPrice: 20,
    billingCadence: "Billed monthly",
    includedValue:
      "Individual Pro plan for one developer: increased agent quotas plus access to frontier models from OpenAI, Anthropic (Claude), and Google (Gemini).",
    sourceUrl: "https://devin.ai/pricing",
    sourceLabel: "Official Devin pricing",
    verification: "official",
    lastUpdated: "2026-07-17",
  },
  {
    id: "devin-max",
    name: "Devin",
    plan: "Max",
    monthlyPrice: 200,
    billingCadence: "Billed monthly",
    includedValue:
      "Top individual plan for power users: significantly higher agent quotas than Pro for heavier autonomous coding sessions.",
    sourceUrl: "https://devin.ai/pricing",
    sourceLabel: "Official Devin pricing",
    verification: "official",
    lastUpdated: "2026-07-17",
  },
  {
    id: "devin-teams",
    name: "Devin",
    plan: "Teams (base + 1 seat)",
    monthlyPrice: 120,
    billingCadence: "Billed monthly — $80 team base + $40 per full dev seat ($120 for the first seat)",
    includedValue:
      "Team plan billed as an $80/mo base fee plus $40/mo per full dev seat; the $120/mo shown is the real cost of the base plus one seat, and each additional full dev seat adds $40/mo.",
    sourceUrl: "https://devin.ai/pricing",
    sourceLabel: "Official Devin pricing",
    verification: "official",
    lastUpdated: "2026-07-17",
  },
];

/**
 * Featured local-inference boxes. Ranges span the entry-level and high-memory
 * configurations most relevant to local AI coding workloads; exact numbers vary
 * by config and retailer, so each carries a `priceNote`.
 *
 * @type {Hardware[]}
 */
export const hardware = [
  {
    id: "mac-studio",
    name: "Mac Studio",
    spec: "Apple silicon, up to 512 GB unified memory",
    priceLow: 2499,
    priceHigh: 14299,
    priceNote:
      "Configurable range from the base M4 Max to a fully specced M3 Ultra; unified memory drives most of the price.",
    sourceUrl: "https://www.apple.com/shop/buy-mac/mac-studio",
    sourceLabel: "Official Apple configurable pricing",
    verification: "official",
    lastUpdated: "2026-07-14",
    defaultBoxPrice: 2499,
    powerDraw: 270,
    image: {
      src: "assets/img/mac-studio.jpg",
      alt: "Apple product photo of the Mac Studio: a compact square aluminum desktop computer.",
    },
  },
  {
    id: "dgx-spark",
    name: "NVIDIA DGX Spark",
    spec: "GB10 Grace Blackwell desktop, 128 GB unified memory",
    priceLow: 2999,
    priceHigh: 3999,
    priceNote:
      "Estimated street price for the desktop unit; availability and bundling vary by reseller.",
    sourceUrl: "https://www.nvidia.com/en-us/products/workstations/dgx-spark/",
    sourceLabel: "Estimated retail / street price",
    verification: "retailer",
    lastUpdated: "2026-07-01",
    defaultBoxPrice: 3999,
    powerDraw: 240,
    image: {
      src: "assets/img/dgx-spark.jpg",
      alt: "NVIDIA product photo of the DGX Spark: a small silver Grace Blackwell desktop unit beside a laptop running its setup.",
    },
  },
  {
    id: "strix-halo",
    name: "AMD Strix Halo workstation",
    spec: "Ryzen AI Max 300-series mini-PC, up to 128 GB unified memory",
    priceLow: 1099,
    priceHigh: 3799.99,
    priceNote:
      "Representative range derived from the named Framework Desktop 32 GB configuration plus the GMKtec EVO-X2 and EVO-X3 configurations below; the class spans lower- and higher-memory configs, so confirm the exact spec before buying.",
    sourceUrl:
      "https://www.amd.com/en/products/processors/laptop/ryzen/ai-300-series/amd-ryzen-ai-max-plus-395.html",
    sourceLabel: "Derived range from named SKUs",
    verification: "estimate",
    lastUpdated: "2026-07-17",
    defaultBoxPrice: 1099,
    powerDraw: 140,
    image: {
      src: "assets/img/strix-halo.jpg",
      alt: "AMD product photo of the Ryzen AI Max Series processor that powers Strix Halo mini-PCs and workstations.",
    },
  },
  {
    id: "framework-desktop-ai-max-385-32gb",
    name: "Framework Desktop AI Max 385",
    spec: "Ryzen AI Max 385, 32 GB RAM",
    priceLow: 1099,
    priceHigh: 1099,
    priceNote:
      "Framework Desktop base AI Max 385 configuration; pricing comes from the official product page, and storage / operating system details may vary by DIY or bundle choice.",
    sourceUrl: "https://frame.work/products/desktop-diy-amd-aimax300/configuration/new",
    sourceLabel: "Official Framework product page",
    verification: "official",
    lastUpdated: "2026-07-17",
    defaultBoxPrice: 1099,
    powerDraw: 140,
    exampleOf: "strix-halo",
  },
  {
    id: "gmktec-evo-x2",
    name: "GMKtec EVO-X2 AI Mini PC",
    spec: "Ryzen AI Max+ 395, 64 GB RAM + 1 TB SSD",
    priceLow: 1999.99,
    priceHigh: 1999.99,
    priceNote:
      "Named Ryzen AI Max+ 395 SKU at the lower-memory end of the Strix Halo class; exact GMKtec list price for the 64 GB / 1 TB configuration.",
    sourceUrl:
      "https://www.gmktec.com/products/amd-ryzen%E2%84%A2-ai-max-395-evo-x2-ai-mini-pc",
    sourceLabel: "Official GMKtec product page",
    verification: "official",
    lastUpdated: "2026-07-16",
    defaultBoxPrice: 1999.99,
    powerDraw: 140,
    exampleOf: "strix-halo",
  },
  {
    id: "gmktec-evo-x3",
    name: "GMKtec EVO-X3 AI Mini PC",
    spec: "Ryzen AI Max+ 395, 128 GB RAM + 2 TB SSD",
    priceLow: 3799.99,
    priceHigh: 3799.99,
    priceNote:
      "Named Ryzen AI Max+ 395 SKU at the top of the Strix Halo class; exact GMKtec list price for the 128 GB / 2 TB configuration.",
    sourceUrl:
      "https://www.gmktec.com/products/gmktec-evo-x3-ai-mini-pc-amd-ryzen-ai-max-395",
    sourceLabel: "Official GMKtec product page",
    verification: "official",
    lastUpdated: "2026-07-16",
    defaultBoxPrice: 3799.99,
    powerDraw: 140,
    exampleOf: "strix-halo",
  },
];

/**
 * The top-level boxes shown as cards in the "Featured hardware to compare"
 * grid. Named example SKUs (`exampleOf`) are not standalone cards — they are the
 * selectable trim levels of their parent class card (see `hardwareTrims`). The
 * full `hardware` array still backs the comparison table and pricing list, so
 * every SKU keeps its own source and affiliate provenance there.
 *
 * @type {Hardware[]}
 */
export const featuredHardware = hardware.filter((box) => !box.exampleOf);

/**
 * @typedef {Object} HardwareTrim
 * @property {string} id - a stable id (a named SKU's id, or `${box.id}-low|-high`)
 * @property {string} name - short trim name for the option label and status copy
 * @property {number} boxPrice - the price loaded into the calculator for this trim
 * @property {number} powerDraw - the power draw loaded for this trim
 */

/**
 * The selectable trim levels for a featured box, used to build the per-card
 * configuration drop-down:
 *
 *  - If the box has named example SKUs (`exampleOf === box.id`), each SKU is a
 *    trim carrying its own price and power draw.
 *  - Otherwise, if the box's price is a range, it yields a low-end and a
 *    high-end trim from the range endpoints (power draw is shared — the range
 *    reflects configuration/street-price spread, not a distinct power figure).
 *  - A single-price box with no SKUs yields exactly one trim (itself), so the
 *    card renders no drop-down and keeps its existing single-button behavior.
 *
 * @param {Hardware} box
 * @returns {HardwareTrim[]}
 */
export function hardwareTrims(box) {
  const children = hardware.filter((entry) => entry.exampleOf === box.id);
  if (children.length > 0) {
    return children.map((child) => ({
      id: child.id,
      name: child.name,
      boxPrice: child.defaultBoxPrice ?? child.priceLow,
      powerDraw: child.powerDraw ?? box.powerDraw ?? defaults.powerDraw,
    }));
  }

  const powerDraw = box.powerDraw ?? defaults.powerDraw;
  if (box.priceLow !== box.priceHigh) {
    return [
      { id: `${box.id}-low`, name: "Low-end", boxPrice: box.priceLow, powerDraw },
      { id: `${box.id}-high`, name: "High-end", boxPrice: box.priceHigh, powerDraw },
    ];
  }

  return [
    {
      id: box.id,
      name: box.name,
      boxPrice: box.defaultBoxPrice ?? box.priceLow,
      powerDraw,
    },
  ];
}

/**
 * The trim that seeds a card by default — the one whose price matches the box's
 * `defaultBoxPrice` (falling back to `priceLow`). This preserves each box's
 * existing default preload: Mac Studio and Strix Halo default to their low-end
 * configuration, while DGX Spark keeps its documented high-end default.
 *
 * @param {Hardware} box
 * @returns {HardwareTrim}
 */
export function defaultHardwareTrim(box) {
  const target = box.defaultBoxPrice ?? box.priceLow;
  const trims = hardwareTrims(box);
  return trims.find((trim) => trim.boxPrice === target) ?? trims[0];
}

/* --------------------------- affiliate metadata --------------------------- */

/**
 * Reseller / affiliate destinations, keyed by pricing-entry `id`. Kept separate
 * from pricing data: editing monetization here can never change a displayed
 * price, source, or last-updated date. An entry with no key simply has no
 * affiliate call to action.
 *
 * URLs are placeholders until affiliate programs are finalized (see the PRD
 * open questions); swap the `url` values as programs come online.
 *
 * @type {Record<string, Affiliate>}
 */
export const affiliates = {
  "mac-studio": {
    vendor: "Apple",
    url: "https://www.apple.com/mac-studio/",
    label: "Explore Mac Studio",
    affiliate: true,
  },
  "dgx-spark": {
    vendor: "NVIDIA",
    url: "https://marketplace.nvidia.com/en-us/developer/dgx-spark/",
    label: "Find a DGX Spark reseller",
    affiliate: true,
  },
  "strix-halo": {
    vendor: "AMD",
    url: "https://www.gmktec.com/collections/all",
    label: "Find a Strix Halo system",
    affiliate: true,
  },
  "framework-desktop-ai-max-385-32gb": {
    vendor: "Framework",
    url: "https://frame.work/desktop",
    label: "Explore Framework Desktop",
    affiliate: true,
  },
  "gmktec-evo-x2": {
    vendor: "GMKtec",
    url: "https://www.gmktec.com/collections/all",
    label: "Browse GMKtec listings",
    affiliate: true,
  },
  "gmktec-evo-x3": {
    vendor: "GMKtec",
    url: "https://www.gmktec.com/collections/all",
    label: "Browse GMKtec listings",
    affiliate: true,
  },
};

/**
 * Look up the affiliate / reseller call to action for a pricing entry.
 * @param {string} id - a subscription or hardware id
 * @returns {Affiliate|null}
 */
export function getAffiliate(id) {
  return Object.prototype.hasOwnProperty.call(affiliates, id)
    ? affiliates[id]
    : null;
}

/* ------------------------- calculator configuration ------------------------- */

/** Default calculator inputs used to populate the form on load. */
export const defaults = {
  boxPrice: 3000,
  downPayment: 500,
  apr: 9.9,
  term: 24,
  electricityRate: 0.17,
  powerDraw: 450,
  hoursPerDay: 8,
  // Default the comparison basis to the heaviest common-spend preset so a
  // first-time visitor lands on a realistic power-user scenario where the box
  // actually pays for itself, instead of the conservative two-plan ($40/mo)
  // total that never breaks even against a financed box. The custom-spend
  // field starts filled so the hero shows the stronger comparison immediately;
  // clearing it falls back to totalling the checked subscriptions (see
  // calculator.js). Keep this value in step with a `spendPresets` entry so the
  // preset label logic can recognize the default.
  customSpend: 200,
  maintenance: false,
  resale: false,
  taxes: false,
};

/**
 * Common monthly AI-coding spend levels offered as a quick preset selector.
 * Choosing one fills the custom-spend input; it never persists on its own.
 *
 * @type {Array<{ label: string, value: number }>}
 */
export const spendPresets = [
  { label: "Light — $20/mo", value: 20 },
  { label: "Standard — $40/mo", value: 40 },
  { label: "Heavy — $100/mo", value: 100 },
  { label: "Power user — $200/mo", value: 200 },
];

/** Number of months the model projects when looking for a break-even point. */
export const horizonMonths = 60;

/** Days per month used to convert a daily electricity draw into a monthly cost. */
export const daysPerMonth = 30.4;

/**
 * Rates for the optional cost toggles (all off by default). Each is a simple,
 * documented multiplier of the box price so the math stays deterministic and
 * explainable in the methodology section.
 */
export const optionalCostRates = {
  /** Annual maintenance allowance as a fraction of box price, spread monthly. */
  maintenanceAnnualRate: 0.03,
  /** One-time sales tax applied to the box price at purchase. */
  salesTaxRate: 0.08,
  /** Residual resale value as a fraction of box price, credited at horizon end. */
  resaleValueRate: 0.25,
};

/** Human-readable assumptions surfaced in the methodology section. */
export const assumptions = [
  "Subscriptions are compared at their monthly per-seat price. Annually billed tiers use the effective monthly cost (annual price ÷ 12), so the comparison stays month-by-month even when a plan is paid yearly up front.",
  "Hardware is financed: principal is (box price − down payment), repaid over the term at the given APR as a fixed monthly loan payment.",
  `Electricity cost = power draw (kW) × hours per day × ${daysPerMonth} days × rate per kWh.`,
  `Optional maintenance adds ${optionalCostRates.maintenanceAnnualRate * 100}% of the box price per year, spread evenly across the months.`,
  `Optional sales tax adds ${optionalCostRates.salesTaxRate * 100}% of the box price as a one-time upfront cost.`,
  `Optional resale value credits ${optionalCostRates.resaleValueRate * 100}% of the box price against ownership cost at the end of the horizon.`,
  "Maintenance, resale value, and sales tax are excluded unless toggled on.",
  `Break-even is the first month within a ${horizonMonths}-month horizon where cumulative subscription spend catches up to cumulative ownership cost.`,
];
