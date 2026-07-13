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
 *     and its own `lastUpdated` date. Pricing entries never carry affiliate
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
 * @property {string} lastUpdated - ISO date (YYYY-MM-DD) this entry was curated
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
 * @property {string} lastUpdated - ISO date (YYYY-MM-DD) this entry was curated
 * @property {number} [defaultBoxPrice] - price used when this box seeds the form
 * @property {number} [powerDraw] - representative power draw under load (W)
 */

/**
 * @typedef {Object} Affiliate
 * @property {string} vendor - who the outbound link points at
 * @property {string} url - affiliate / reseller destination
 * @property {string} label - call-to-action text
 * @property {boolean} affiliate - true when `url` is a commissioned link
 */

/** ISO date (YYYY-MM-DD) the pricing data as a whole was last curated. */
export const pricingLastUpdated = "2026-07-01";

/** ISO date (YYYY-MM-DD) the site content was last updated. */
export const siteLastUpdated = "2026-07-12";

/* ----------------------------- pricing data ----------------------------- */

/**
 * Public subscription tiers people run AI coding assistants on. Codex keeps its
 * single individual plan; Claude Code carries the full public ladder (Pro, Max,
 * and Team seats) so a visitor can compare their real tier.
 *
 * `monthlyPrice` is always the month-by-month comparison value — for annually
 * billed tiers it is the effective monthly cost (annual price ÷ 12), which keeps
 * the calculator's cumulative math cadence-agnostic. `billingCadence` and
 * `includedValue` document how the tier is actually billed and what it includes.
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
    sourceUrl: "https://openai.com/",
    sourceLabel: "Official OpenAI pricing",
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
    lastUpdated: "2026-07-01",
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
    priceLow: 3999,
    priceHigh: 8999,
    priceNote:
      "Range spans M-series Max to Ultra configurations; unified memory drives most of the price.",
    sourceUrl: "https://www.apple.com/mac-studio/",
    sourceLabel: "Official Apple pricing",
    lastUpdated: "2026-07-01",
    defaultBoxPrice: 3999,
    powerDraw: 270,
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
    lastUpdated: "2026-07-01",
    defaultBoxPrice: 3999,
    powerDraw: 240,
  },
  {
    id: "strix-halo",
    name: "AMD Strix Halo workstation",
    spec: "Ryzen AI Max+ 395 mini-PC, up to 128 GB unified memory",
    priceLow: 1599,
    priceHigh: 2499,
    priceNote:
      "Class estimate across Ryzen AI Max+ 395 mini-PCs and small-form-factor desktops; not a single SKU.",
    sourceUrl:
      "https://www.amd.com/en/products/processors/laptop/ryzen/ai-max.html",
    sourceLabel: "Class estimate (multiple SKUs)",
    lastUpdated: "2026-07-01",
    defaultBoxPrice: 1999,
    powerDraw: 140,
  },
];

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
    url: "https://www.apple.com/shop/buy-mac/mac-studio",
    label: "Shop Mac Studio",
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
    url: "https://www.amd.com/en/where-to-buy/ryzen-ai-max.html",
    label: "Find a Strix Halo system",
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
  // Empty by default: with no custom spend the calculator totals the checked
  // subscriptions. A provided value overrides that total (see calculator.js).
  customSpend: "",
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
