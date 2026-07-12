/**
 * Static, maintainer-editable data for the payback calculator.
 *
 * This is intentionally plain data (no fetch, no backend) so the site works as
 * a static GitHub Pages app and even from the file:// protocol. Each dataset
 * carries a `lastUpdated` date that is surfaced in the UI.
 *
 * Prices are hand-curated estimates and may be out of date — see the pricing
 * disclosure section on the page.
 */

/** @typedef {{ id: string, name: string, plan: string, monthlyPrice: number, sourceUrl: string, affiliate?: boolean }} Subscription */

/** ISO date (YYYY-MM-DD) the pricing data was last curated. */
export const pricingLastUpdated = "2026-07-01";

/** ISO date (YYYY-MM-DD) the site content was last updated. */
export const siteLastUpdated = "2026-07-12";

/** @type {Subscription[]} */
export const subscriptions = [
  {
    id: "codex",
    name: "Codex",
    plan: "Individual (monthly)",
    monthlyPrice: 20,
    sourceUrl: "https://openai.com/",
    defaultSelected: true,
  },
  {
    id: "claude-code",
    name: "Claude Code",
    plan: "Pro (monthly)",
    monthlyPrice: 20,
    sourceUrl: "https://claude.com/product/claude-code",
    defaultSelected: true,
  },
];

/**
 * Representative local inference box. A single editable profile for the
 * scaffold; multiple hardware profiles are an open question in the PRD.
 */
export const hardware = {
  id: "reference-box",
  name: "Reference inference box",
  spec: "Single-GPU workstation, 24 GB VRAM class",
  priceLow: 2500,
  priceHigh: 4000,
  sourceUrl: "https://example.com/hardware-pricing",
  affiliate: true,
};

/** Default calculator inputs used to populate the form on load. */
export const defaults = {
  boxPrice: 3000,
  downPayment: 500,
  apr: 9.9,
  term: 24,
  electricityRate: 0.17,
  powerDraw: 450,
  hoursPerDay: 8,
  maintenance: false,
  resale: false,
  taxes: false,
};

/** Number of months the model projects when looking for a break-even point. */
export const horizonMonths = 60;

/** Human-readable assumptions surfaced in the methodology section. */
export const assumptions = [
  "Subscriptions are billed monthly at the listed per-seat price.",
  "Hardware is financed: principal is (box price − down payment), repaid over the term at the given APR.",
  "Electricity cost = power draw (kW) × hours per day × 30.4 days × rate per kWh.",
  "Maintenance, resale value, and sales tax are excluded unless toggled on.",
  `Break-even is searched over a ${horizonMonths}-month horizon.`,
];
