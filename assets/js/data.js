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
 *     Reseller, affiliate, and official purchase URLs live here, kept
 *     deliberately separate from pricing so a monetization change can never
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
 * @property {string[]} [aliases] - other names the product is searched or
 *   marketed under (e.g. Devin's Windsurf / Devin Desktop). Surfaced alongside
 *   the product name in the calculator UI so shared plans stay discoverable
 *   without duplicating rows.
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
 * @property {string} [exampleOf] - id of the parent box this entry is a named SKU of; excluded from `featuredHardware` and surfaced as a trim instead
 * @property {number} [defaultBoxPrice] - price used when this box seeds the form
 * @property {number} [powerDraw] - representative power draw under load (W)
 * @property {TokenThroughput} [tokensPerSecond] - sustained single-stream output
 *   generation throughput (tokens/sec) for a representative local coding model on
 *   this class of box, as a deliberately wide lower/upper estimate. Featured boxes
 *   carry it so the guides can price a full-time (24/7) year of token output; it is
 *   optional, and boxes without it simply omit the token-value view.
 * @property {string} [officialModelFit] - vendor-published workload claim shown
 *   separately from the site's advisory heuristic when an official ceiling exists
 * @property {string} [modelFit] - conservative, human-readable model-fit guidance
 *   for the featured card; advisory only, not a benchmark promise
 * @property {HardwareImage} [image] - product photo shown on the featured card
 * @property {boolean} [referenceOnly] - true for a high-end reference class that
 *   is listed in the full comparison table and pricing list for context but is
 *   not promoted to a featured product card (e.g. a build-required workstation /
 *   component class with no compact-appliance product photo). Kept out of
 *   `featuredHardware`, so it never seeds the calculator or renders a card.
 */

/**
 * @typedef {Object} TokenThroughput
 * @property {number} low - conservative sustained tokens/sec
 * @property {number} high - optimistic sustained tokens/sec
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
export const pricingLastUpdated = "2026-08-01";

/** Site-wide freshness stamp used in the footer. */
export const siteLastUpdated = "2026-08-01";

/**
 * Assumptions used for the 24/7 yearly token-output value comparison.
 *
 * These are maintained, transparent ranges rather than benchmark claims. They
 * intentionally err on the side of being easy to audit in the static site.
 */
export const tokenOutputValueAssumptions = {
  annualUtilizationHours: 24 * 360,
  annualUtilizationDays: 360,
  annualUtilizationSeconds: 24 * 360 * 3600,
  frontierOutputPriceLowPerMillionTokens: 2,
  frontierOutputPriceHighPerMillionTokens: 15,
};

/* ----------------------------- pricing data ----------------------------- */

/**
 * Public subscription tiers people run AI coding assistants on. Codex keeps its
 * single individual plan; Claude Code carries the full public ladder (Pro, Max,
 * and Team seats) so a visitor can compare their real tier. GitHub Copilot,
 * Cursor, and Zed round out the common IDE/editor assistant plans, and the
 * Google AI tiers (Plus, Pro, Ultra 5x, Ultra 20x) cover the broad Gemini
 * subscriptions whose Pro/Ultra tiers bundle the Jules and Google Antigravity
 * coding agents — Ultra ships as a plan family at $99.99/mo (5× AI Pro limits)
 * and $199.99/mo (20× AI Pro limits) — and the
 * Amazon Q Developer tiers (Free, Pro) cover AWS's assistant whose agentic
 * requests and Java code-transformation allowance are quota-limited, and the
 * Devin tiers (Free, Pro, Max, and a Teams plan) cover Cognition's autonomous
 * coding agent — its Teams plan is a `$80/mo team base + $40/mo per full dev
 * seat` formula, so it is modeled as the real cost of the first seat ($120/mo)
 * rather than a misleading single-seat number, with the base-plus-seat formula
 * spelled out in its `billingCadence`/`includedValue`. The Replit tiers (Starter,
 * Core monthly/annual, Pro monthly/annual) cover Replit Agent, the app-building
 * assistant; the paid tiers bundle a monthly Replit Agent credit allowance and
 * note that taxes may vary by location per Replit's pricing page. The Mistral
 * tiers (Free, Pro, Team, Education) cover Mistral's consumer plans, whose Pro
 * copy gives full access to Vibe for long-running tasks plus all-day coding; the
 * paid tiers are quoted excluding taxes and are subject to fair-usage limits per
 * Mistral's pricing page. The Bolt tiers (Free, Pro, Teams) cover Bolt, the
 * app-building agent, and are token-limited: Free is capped at 300K tokens daily
 * and 1M tokens monthly, Pro starts at 10M tokens/month with no daily limit plus
 * custom domain/SEO/no-branding features, and Teams adds a shared team workspace
 * with a per-member monthly token allotment; Bolt's Enterprise plan is custom and
 * out of scope. The Lovable tiers (Free, Pro, Business) cover Lovable, another
 * app-building agent, and are credit-limited: Free builds on a limited allowance
 * of free monthly credits, Pro includes 100 monthly credits with rollovers plus
 * on-demand top-ups, custom domains, and no Lovable badge, and Business keeps the
 * 100-credit monthly base while adding a team workspace, role-based access,
 * internal publishing, and an SSO/security center; Lovable's Enterprise plan is
 * custom/volume-priced and out of scope. The Augment Code tier (Business) covers Augment Code's team plan
 * for its autonomous coding agent: a flat $100/month covering up to 50 seats and
 * $100/month of pooled usage shared across the team, with usage beyond the pool
 * billed as metered top-ups and larger needs moving to the custom-priced
 * Enterprise plan (out of scope here). The Amp tiers (Megawatt, Gigawatt) cover
 * Amp's coding agent and are usage-based: each bundles an equal amount of
 * included agent usage ($20 and $200 respectively) billed monthly, with usage
 * beyond the included amount billed pay-as-you-go and Amp's usage-based and
 * Enterprise/BYOK options out of scope. The TRAE tiers (Lite, Pro, Pro+, Ultra)
 * cover the TRAE AI IDE at its monthly-billed prices ($3, $10, $30, $100); Pro
 * has a 7-day trial noted on the pricing page, and the comparison-table usage
 * allowances (monthly basic/bonus usage, queue priority, autocomplete,
 * concurrent cloud tasks) scale up with the tier. The JetBrains AI tier (AI Pro)
 * covers JetBrains AI Assistant and its coding agent across the JetBrains IDE
 * family, billed annually at $200/user/year (~$16.67/mo effective) with a
 * per-user allowance of AI credits for chat, completion, and agentic actions;
 * the free AI Free tier and higher AI Ultimate/enterprise plans are out of
 * scope. The Tabnine tiers (Code Assistant Platform, Agentic Platform) cover
 * Tabnine's privacy-oriented assistant billed as annual subscriptions at $39 and
 * $59 per user/month — the Agentic Platform adds agentic workflows and the
 * Context Engine on top of the Code Assistant seat — with the free tier and
 * custom-priced Enterprise deployment out of scope. The Warp tiers (Free, Build,
 * Max, Business) cover the Warp agentic terminal and are usage-based: the Free
 * plan ships with no included AI usage, the individual Build ($20/mo) and Max
 * ($200/mo) plans bundle $20 (1,500 credits) and $240 (18,000 credits) of monthly
 * AI usage respectively, and the per-seat Business plan ($50/user/mo, up to 25
 * seats) bundles $20 (1,500 credits) per plan; AI usage beyond the included
 * monthly credits is billed separately on every paid tier, so the plan price is
 * not unlimited AI usage, and Warp's custom-priced Enterprise plan is out of
 * scope. The Factory tiers (Pro, Plus, Max) cover Factory's Droid
 * software-development agents at their monthly individual prices ($20, $100,
 * $200): Pro covers Desktop/CLI/SDK access with cloud and local background
 * agents, Plus adds roughly 5× the Pro usage plus Droid Computers
 * (Factory-managed cloud computers) for remote Droids, and Max adds roughly 10×
 * the Pro usage plus early access to new features; Factory's custom-priced
 * Business and Enterprise plans are out of scope. The Manus tiers (Standard,
 * Customizable, Extended) cover the Manus autonomous general AI agent at its
 * monthly individual prices ($20, $40, $200) and are credit-based: Standard
 * ships a base monthly credit allowance to run agentic tasks (building apps and
 * sites, research, and automations), Customizable adds a larger credit allowance
 * plus more concurrent tasks and customization options, and Extended tops the
 * individual ladder with the highest credit allowance and concurrent-task
 * limits; usage beyond the included credits requires add-on credits, and Manus's
 * higher-tier team/enterprise plans are out of scope. All of these ship unchecked (no `defaultSelected`) so the default
 * comparison basis stays Codex + Claude Code Pro and only expands when a visitor
 * opts in.
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
    sourceUrl: "https://chatgpt.com/pricing/",
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
    plan: "Ultra 5x",
    monthlyPrice: 99.99,
    billingCadence: "Billed monthly",
    includedValue:
      "Starting Google AI Ultra tier at 5× higher usage limits vs. AI Pro, with high Gemini limits across Google apps plus coding-agent access to Jules and Google Antigravity at the Ultra 5x rate limits.",
    sourceUrl: "https://gemini.google/subscriptions/",
    sourceLabel: "Official Google pricing",
    verification: "official",
    lastUpdated: "2026-07-31",
  },
  {
    id: "google-ai-ultra-20x",
    name: "Google AI",
    plan: "Ultra 20x",
    monthlyPrice: 199.99,
    billingCadence: "Billed monthly",
    includedValue:
      "Top Google AI Ultra tier at 20× higher usage limits vs. AI Pro, with the highest Gemini limits across Google apps plus the highest Jules limits and Google Antigravity rate limits of the coding agents.",
    sourceUrl: "https://gemini.google/subscriptions/",
    sourceLabel: "Official Google pricing",
    verification: "official",
    lastUpdated: "2026-07-31",
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
    aliases: ["Windsurf", "Devin Desktop"],
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
    aliases: ["Windsurf", "Devin Desktop"],
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
    aliases: ["Windsurf", "Devin Desktop"],
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
    aliases: ["Windsurf", "Devin Desktop"],
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
  {
    id: "replit-starter",
    name: "Replit",
    plan: "Starter (Free)",
    monthlyPrice: 0,
    billingCadence: "Free tier",
    includedValue:
      "Free plan for one person with free daily Replit Agent credits to build and code; no included monthly credit allowance.",
    sourceUrl: "https://replit.com/pricing",
    sourceLabel: "Official Replit pricing",
    verification: "official",
    lastUpdated: "2026-07-19",
  },
  {
    id: "replit-core-monthly",
    name: "Replit",
    plan: "Core (monthly)",
    monthlyPrice: 25,
    billingCadence: "Billed monthly",
    includedValue:
      "Core plan for one developer: includes $25/mo of Replit Agent credits, up to 5 collaborators, and up to 2 agents in parallel; usage beyond the included credits is billed separately, and taxes may vary by location.",
    sourceUrl: "https://replit.com/pricing",
    sourceLabel: "Official Replit pricing",
    verification: "official",
    lastUpdated: "2026-07-19",
  },
  {
    id: "replit-core-annual",
    name: "Replit",
    plan: "Core (annual)",
    monthlyPrice: 20,
    billingCadence: "Billed annually — $240 up front (~$20/mo effective)",
    includedValue:
      "The Core plan prepaid for a year at a lower effective monthly rate: includes $25/mo of Replit Agent credits, up to 5 collaborators, and up to 2 agents in parallel; usage beyond the included credits is billed separately, and taxes may vary by location.",
    sourceUrl: "https://replit.com/pricing",
    sourceLabel: "Official Replit pricing",
    verification: "official",
    lastUpdated: "2026-07-19",
  },
  {
    id: "replit-pro-monthly",
    name: "Replit",
    plan: "Pro (monthly)",
    monthlyPrice: 100,
    billingCadence: "Billed monthly",
    includedValue:
      "Pro plan for one developer: includes $100/mo of Replit Agent credits, up to 15 collaborators, up to 50 viewers, up to 10 agents in parallel, and access to the most powerful models; usage beyond the included credits is billed separately, and taxes may vary by location.",
    sourceUrl: "https://replit.com/pricing",
    sourceLabel: "Official Replit pricing",
    verification: "official",
    lastUpdated: "2026-07-19",
  },
  {
    id: "replit-pro-annual",
    name: "Replit",
    plan: "Pro (annual)",
    monthlyPrice: 95,
    billingCadence: "Billed annually — $1,140 up front (~$95/mo effective)",
    includedValue:
      "The Pro plan prepaid for a year at a lower effective monthly rate: includes $100/mo of Replit Agent credits, up to 15 collaborators, up to 50 viewers, up to 10 agents in parallel, and access to the most powerful models; usage beyond the included credits is billed separately, and taxes may vary by location.",
    sourceUrl: "https://replit.com/pricing",
    sourceLabel: "Official Replit pricing",
    verification: "official",
    lastUpdated: "2026-07-19",
  },
  {
    id: "mistral-free",
    name: "Mistral",
    plan: "Free",
    monthlyPrice: 0,
    billingCadence: "Free tier",
    includedValue:
      "Free plan for one person with limited access to Vibe coding sessions and Le Chat, subject to fair-usage limits.",
    sourceUrl: "https://mistral.ai/pricing/",
    sourceLabel: "Official Mistral pricing",
    verification: "official",
    lastUpdated: "2026-07-21",
  },
  {
    id: "mistral-pro",
    name: "Mistral",
    plan: "Pro",
    monthlyPrice: 14.99,
    billingCadence: "Billed monthly, excluding taxes",
    includedValue:
      "Individual Pro plan for one developer: full access to Vibe for long-running tasks plus all-day coding across the Vibe CLI, IDE, and remote coding-agent interfaces; the price excludes taxes and heavy use is subject to fair-usage limits.",
    sourceUrl: "https://mistral.ai/pricing/",
    sourceLabel: "Official Mistral pricing",
    verification: "official",
    lastUpdated: "2026-07-21",
  },
  {
    id: "mistral-team",
    name: "Mistral",
    plan: "Team",
    monthlyPrice: 24.99,
    billingCadence: "Billed monthly, per user, excluding taxes",
    includedValue:
      "Per-seat Team workspace adding shared collaboration on top of the Pro Vibe coding features; the per-user price excludes taxes and is subject to fair-usage limits.",
    sourceUrl: "https://mistral.ai/pricing/",
    sourceLabel: "Official Mistral pricing",
    verification: "official",
    lastUpdated: "2026-07-21",
  },
  {
    id: "mistral-education",
    name: "Mistral",
    plan: "Education",
    monthlyPrice: 5.99,
    billingCadence: "Billed monthly, excluding taxes",
    includedValue:
      "Discounted student/education plan with Vibe coding access; the price excludes taxes and is subject to fair-usage limits.",
    sourceUrl: "https://mistral.ai/pricing/",
    sourceLabel: "Official Mistral pricing",
    verification: "official",
    lastUpdated: "2026-07-21",
  },
  {
    id: "bolt-free",
    name: "Bolt",
    plan: "Free",
    monthlyPrice: 0,
    billingCadence: "Free tier",
    includedValue:
      "Free app-building plan for one person: build full-stack apps with the Bolt agent, capped at 300K tokens daily and 1M tokens per month.",
    sourceUrl: "https://bolt.new/pricing",
    sourceLabel: "Official Bolt pricing",
    verification: "official",
    lastUpdated: "2026-07-26",
  },
  {
    id: "bolt-pro",
    name: "Bolt",
    plan: "Pro",
    monthlyPrice: 25,
    billingCadence: "Billed monthly",
    includedValue:
      "Individual Pro app-building plan for one developer: starts at 10M tokens per month with no daily token limit, plus custom domains, SEO controls, and no Bolt branding.",
    sourceUrl: "https://bolt.new/pricing",
    sourceLabel: "Official Bolt pricing",
    verification: "official",
    lastUpdated: "2026-07-26",
  },
  {
    id: "bolt-teams",
    name: "Bolt",
    plan: "Teams",
    monthlyPrice: 30,
    billingCadence: "Billed monthly, per member",
    includedValue:
      "Per-member Teams app-building plan adding a shared team workspace on top of the Pro features, with a per-member monthly token allotment; Bolt's Enterprise plan is custom-priced and out of scope here.",
    sourceUrl: "https://bolt.new/pricing",
    sourceLabel: "Official Bolt pricing",
    verification: "official",
    lastUpdated: "2026-07-26",
  },
  {
    id: "lovable-free",
    name: "Lovable",
    plan: "Free",
    monthlyPrice: 0,
    billingCadence: "Free tier",
    includedValue:
      "Free app-building plan for one person: build apps with the Lovable agent on a limited allowance of free monthly credits, with workspace-private projects, unlimited collaborators, and up to 5 lovable.app domains.",
    sourceUrl: "https://lovable.dev/pricing",
    sourceLabel: "Official Lovable pricing",
    verification: "official",
    lastUpdated: "2026-07-27",
  },
  {
    id: "lovable-pro",
    name: "Lovable",
    plan: "Pro",
    monthlyPrice: 25,
    billingCadence: "Billed monthly",
    includedValue:
      "Individual Pro app-building plan for one developer: 100 monthly credits with credit rollovers and on-demand credit top-ups, plus custom domains, user roles/permissions, and no Lovable badge; building beyond the included credits requires paid top-ups.",
    sourceUrl: "https://lovable.dev/pricing",
    sourceLabel: "Official Lovable pricing",
    verification: "official",
    lastUpdated: "2026-07-27",
  },
  {
    id: "lovable-business",
    name: "Lovable",
    plan: "Business",
    monthlyPrice: 50,
    billingCadence: "Billed monthly",
    includedValue:
      "Business app-building plan for a team: 100 monthly credits plus a team workspace, role-based access, internal publishing, an SSO/security center, and priority support; building beyond the included credits requires paid top-ups, and Lovable's Enterprise plan is custom/volume-priced and out of scope here.",
    sourceUrl: "https://lovable.dev/pricing",
    sourceLabel: "Official Lovable pricing",
    verification: "official",
    lastUpdated: "2026-07-27",
  },
  {
    id: "augment-code-business",
    name: "Augment Code",
    plan: "Business",
    monthlyPrice: 100,
    billingCadence: "Billed monthly — $100/month flat, up to 50 seats, and $100/month of pooled usage",
    includedValue:
      "Business plan for a team using the Augment Code coding agent: a flat $100/month covering up to 50 seats and $100/month of pooled usage shared across the team; usage beyond the pool is billed as metered top-ups, and larger needs move to the custom-priced Enterprise plan, which is out of scope here.",
    sourceUrl: "https://www.augmentcode.com/pricing",
    sourceLabel: "Official Augment Code pricing",
    verification: "official",
    lastUpdated: "2026-07-26",
  },
  {
    id: "amp-megawatt",
    name: "Amp",
    plan: "Megawatt",
    monthlyPrice: 20,
    billingCadence: "Billed monthly — usage-based beyond the included agent usage",
    includedValue:
      "Individual Megawatt plan for one developer using the Amp coding agent: $20/month including $20 of agent usage; usage beyond the included amount is billed pay-as-you-go, and Amp's usage-based and Enterprise/BYOK options are out of scope here.",
    sourceUrl: "https://ampcode.com/pricing",
    sourceLabel: "Official Amp pricing",
    verification: "official",
    lastUpdated: "2026-07-28",
  },
  {
    id: "amp-gigawatt",
    name: "Amp",
    plan: "Gigawatt",
    monthlyPrice: 200,
    billingCadence: "Billed monthly — usage-based beyond the included agent usage",
    includedValue:
      "Top individual Gigawatt plan for heavier Amp coding-agent use: $200/month including $200 of agent usage; usage beyond the included amount is billed pay-as-you-go, and Amp's usage-based and Enterprise/BYOK options are out of scope here.",
    sourceUrl: "https://ampcode.com/pricing",
    sourceLabel: "Official Amp pricing",
    verification: "official",
    lastUpdated: "2026-07-28",
  },
  {
    id: "trae-lite",
    name: "TRAE",
    plan: "Lite",
    monthlyPrice: 3,
    billingCadence: "Billed monthly (monthly-billed view)",
    includedValue:
      "Entry Lite plan for one developer using the TRAE AI IDE: a low monthly basic usage allowance with autocomplete; the heavier tiers raise the monthly usage, queue priority, and concurrent cloud tasks. Prices shown are the monthly-billed view.",
    sourceUrl: "https://www.trae.ai/pricing",
    sourceLabel: "Official TRAE pricing",
    verification: "official",
    lastUpdated: "2026-07-28",
  },
  {
    id: "trae-pro",
    name: "TRAE",
    plan: "Pro",
    monthlyPrice: 10,
    billingCadence: "Billed monthly (monthly-billed view) — 7-day trial on the pricing page",
    includedValue:
      "Individual Pro plan for one developer using the TRAE AI IDE: higher monthly basic and bonus usage than Lite plus autocomplete, offered after a 7-day trial noted on the pricing page. Prices shown are the monthly-billed view.",
    sourceUrl: "https://www.trae.ai/pricing",
    sourceLabel: "Official TRAE pricing",
    verification: "official",
    lastUpdated: "2026-07-28",
  },
  {
    id: "trae-pro-plus",
    name: "TRAE",
    plan: "Pro+",
    monthlyPrice: 30,
    billingCadence: "Billed monthly (monthly-billed view)",
    includedValue:
      "Pro+ plan for heavier TRAE AI IDE use: more monthly basic and bonus usage than Pro with higher queue priority and more concurrent cloud tasks. Prices shown are the monthly-billed view.",
    sourceUrl: "https://www.trae.ai/pricing",
    sourceLabel: "Official TRAE pricing",
    verification: "official",
    lastUpdated: "2026-07-28",
  },
  {
    id: "trae-ultra",
    name: "TRAE",
    plan: "Ultra",
    monthlyPrice: 100,
    billingCadence: "Billed monthly (monthly-billed view)",
    includedValue:
      "Top Ultra plan for power users of the TRAE AI IDE: the highest monthly basic and bonus usage, queue priority, and concurrent cloud tasks of the individual tiers. Prices shown are the monthly-billed view.",
    sourceUrl: "https://www.trae.ai/pricing",
    sourceLabel: "Official TRAE pricing",
    verification: "official",
    lastUpdated: "2026-07-28",
  },
  {
    id: "jetbrains-ai-pro",
    name: "JetBrains AI",
    plan: "AI Pro",
    monthlyPrice: 16.67,
    billingCadence: "Billed annually — $200 per user/year (~$16.67/mo effective)",
    includedValue:
      "AI Pro plan adding JetBrains AI Assistant and the coding agent to JetBrains IDEs for one developer: a per-user allowance of AI credits for chat, completion, and agentic actions across the IDE family, prepaid for a year at a lower effective monthly rate. The free AI Free tier and higher AI Ultimate / enterprise plans are out of scope here.",
    sourceUrl: "https://www.jetbrains.com/store/?section=commercial&billing=yearly",
    sourceLabel: "Official JetBrains store pricing",
    verification: "official",
    lastUpdated: "2026-07-29",
  },
  {
    id: "tabnine-code-assistant",
    name: "Tabnine",
    plan: "Code Assistant Platform",
    monthlyPrice: 39,
    billingCadence: "Billed as an annual subscription, per user ($39/user/month)",
    includedValue:
      "Code Assistant Platform seat for one developer using Tabnine's AI coding assistant: privacy-oriented code completion and chat across editors, billed as an annual subscription at $39 per user/month. The free tier and custom-priced Enterprise deployment are out of scope here.",
    sourceUrl: "https://www.tabnine.com/pricing/",
    sourceLabel: "Official Tabnine pricing",
    verification: "official",
    lastUpdated: "2026-07-29",
  },
  {
    id: "tabnine-agentic",
    name: "Tabnine",
    plan: "Agentic Platform",
    monthlyPrice: 59,
    billingCadence: "Billed as an annual subscription, per user ($59/user/month)",
    includedValue:
      "Agentic Platform seat for one developer: everything in the Code Assistant Platform plus Tabnine's agentic workflows and Context Engine, billed as an annual subscription at $59 per user/month. The free tier and custom-priced Enterprise deployment are out of scope here.",
    sourceUrl: "https://www.tabnine.com/pricing/",
    sourceLabel: "Official Tabnine pricing",
    verification: "official",
    lastUpdated: "2026-07-29",
  },
  {
    id: "warp-free",
    name: "Warp",
    plan: "Free",
    monthlyPrice: 0,
    billingCadence: "Free tier",
    includedValue:
      "Free plan for one developer: core Warp terminal features with support for agentic coding, but AI usage is not included and must be added through a paid plan or usage.",
    sourceUrl: "https://www.warp.dev/pricing",
    sourceLabel: "Official Warp pricing",
    verification: "official",
    lastUpdated: "2026-07-30",
  },
  {
    id: "warp-build",
    name: "Warp",
    plan: "Build",
    monthlyPrice: 20,
    billingCadence: "Billed monthly — from $20/mo, usage-based beyond the included credits",
    includedValue:
      "Individual Build plan for one developer starting at $20/mo: includes $20 (1,500 credits) of monthly AI usage with access to frontier and open-source models, 20 concurrent cloud agents, and 2 vCPU / 4 GiB cloud-agent compute; AI usage beyond the included monthly credits is billed separately, so the plan price is not unlimited AI usage.",
    sourceUrl: "https://www.warp.dev/pricing",
    sourceLabel: "Official Warp pricing",
    verification: "official",
    lastUpdated: "2026-07-30",
  },
  {
    id: "warp-max",
    name: "Warp",
    plan: "Max",
    monthlyPrice: 200,
    billingCadence: "Billed monthly — from $200/mo, usage-based beyond the included credits",
    includedValue:
      "Top individual Max plan for heavier use starting at $200/mo: includes $240 (18,000 credits) of monthly AI usage, 20 concurrent cloud agents, and 4 vCPU / 8 GiB cloud-agent compute; AI usage beyond the included monthly credits is billed separately, so the plan price is not unlimited AI usage.",
    sourceUrl: "https://www.warp.dev/pricing",
    sourceLabel: "Official Warp pricing",
    verification: "official",
    lastUpdated: "2026-07-30",
  },
  {
    id: "warp-business",
    name: "Warp",
    plan: "Business",
    monthlyPrice: 50,
    billingCadence: "Billed monthly, per seat — from $50/user/mo, usage-based beyond the included credits",
    includedValue:
      "Per-seat Business plan for a team starting at $50/user/mo for up to 25 seats: includes $20 (1,500 credits) of monthly AI usage per plan, 80 concurrent cloud agents, and 8 vCPU / 16 GiB cloud-agent compute; AI usage beyond the included monthly credits is billed separately, and Warp's custom-priced Enterprise plan is out of scope here.",
    sourceUrl: "https://www.warp.dev/pricing",
    sourceLabel: "Official Warp pricing",
    verification: "official",
    lastUpdated: "2026-07-30",
  },
  {
    id: "factory-pro",
    name: "Factory",
    plan: "Pro",
    monthlyPrice: 20,
    billingCadence: "Billed monthly",
    includedValue:
      "Individual Pro plan for one developer using the Factory Droid software-development agents: Desktop, CLI, and SDK access with cloud and local background agents, billing/usage statistics, and an agent-readiness dashboard.",
    sourceUrl: "https://factory.ai/pricing",
    sourceLabel: "Official Factory pricing",
    verification: "official",
    lastUpdated: "2026-08-01",
  },
  {
    id: "factory-plus",
    name: "Factory",
    plan: "Plus",
    monthlyPrice: 100,
    billingCadence: "Billed monthly",
    includedValue:
      "Individual Plus plan for heavier use: roughly 5× the usage of Pro, plus Droid Computers (Factory-managed cloud computers) for remote Droids.",
    sourceUrl: "https://factory.ai/pricing",
    sourceLabel: "Official Factory pricing",
    verification: "official",
    lastUpdated: "2026-08-01",
  },
  {
    id: "factory-max",
    name: "Factory",
    plan: "Max",
    monthlyPrice: 200,
    billingCadence: "Billed monthly",
    includedValue:
      "Top individual Max plan for power users using the Factory Droid software-development agents: roughly 10× the usage of Pro plus early access to new features; Factory's custom-priced Business and Enterprise plans are out of scope here.",
    sourceUrl: "https://factory.ai/pricing",
    sourceLabel: "Official Factory pricing",
    verification: "official",
    lastUpdated: "2026-08-01",
  },
  {
    id: "manus-standard",
    name: "Manus",
    plan: "Standard",
    monthlyPrice: 20,
    billingCadence: "Billed monthly — usage-based beyond the included credits",
    includedValue:
      "Individual Standard plan for one person using the Manus autonomous general AI agent: a base monthly credit allowance to run agentic tasks — building apps and sites, research, and automations — with concurrent-task limits; usage beyond the included credits requires add-on credit purchases.",
    sourceUrl: "https://manus.im/pricing",
    sourceLabel: "Official Manus pricing",
    verification: "official",
    lastUpdated: "2026-08-01",
  },
  {
    id: "manus-customizable",
    name: "Manus",
    plan: "Customizable",
    monthlyPrice: 40,
    billingCadence: "Billed monthly — usage-based beyond the included credits",
    includedValue:
      "Individual Customizable plan for heavier use: a larger monthly credit allowance than Standard plus more concurrent Manus tasks and additional customization options for the autonomous agent; usage beyond the included credits requires add-on credit purchases.",
    sourceUrl: "https://manus.im/pricing",
    sourceLabel: "Official Manus pricing",
    verification: "official",
    lastUpdated: "2026-08-01",
  },
  {
    id: "manus-extended",
    name: "Manus",
    plan: "Extended",
    monthlyPrice: 200,
    billingCadence: "Billed monthly — usage-based beyond the included credits",
    includedValue:
      "Top individual Extended plan for power users of the Manus autonomous general AI agent: the highest monthly credit allowance and concurrent-task limits of the individual tiers; usage beyond the included credits requires add-on credits, and Manus's higher-tier team/enterprise plans are out of scope here.",
    sourceUrl: "https://manus.im/pricing",
    sourceLabel: "Official Manus pricing",
    verification: "official",
    lastUpdated: "2026-08-01",
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
    tokensPerSecond: { low: 8, high: 60 },
    modelFit:
      "Practical local model fit: 30B-class quantized models, 70B-class quantized experiments on higher-memory trims, and large-memory experimental workloads on the top end.",
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
      "Estimated street price for the base DGX Spark platform; current named trims include the Seeed Studio $3,999 listing, the ASUS Ascent GX10 GB10 system, and higher 4 TB retailer offers such as PNY at $5,199.99, with availability and bundling varying by reseller.",
    sourceUrl: "https://www.nvidia.com/en-us/products/workstations/dgx-spark/",
    sourceLabel: "Estimated retail / street price",
    verification: "retailer",
    lastUpdated: "2026-07-31",
    defaultBoxPrice: 3999,
    powerDraw: 240,
    tokensPerSecond: { low: 8, high: 50 },
    officialModelFit:
      "NVIDIA's official workload claim: a single DGX Spark is rated for local inference on models up to 200B parameters and fine-tuning models up to 70B parameters. NVIDIA also says two connected DGX Spark systems can handle models up to 405B parameters. These are the vendor's stated ceilings for the platform, not a benchmark of sustained throughput on any given model or quantization.",
    modelFit:
      "Practical local model fit: 30B-class quantized models and 70B-class quantized / fine-tune-capable workflows.",
    image: {
      src: "assets/img/dgx-spark.jpg",
      alt: "NVIDIA product photo of the DGX Spark: a small silver Grace Blackwell desktop unit beside a laptop running its setup.",
    },
  },
  {
    id: "seeed-dgx-spark",
    name: "Seeed Studio NVIDIA DGX Spark",
    spec: "GB10 Grace Blackwell desktop, 128 GB unified memory",
    priceLow: 3999,
    priceHigh: 3999,
    priceNote:
      "Seeed Studio's DGX Spark listing for the base platform price; availability can change and the listing should be treated as a current retailer context rather than a universal MSRP.",
    sourceUrl: "https://www.seeedstudio.com/NVIDIA-DGX-Spark-p-6611.html",
    sourceLabel: "Seeed Studio listing",
    verification: "retailer",
    lastUpdated: "2026-07-31",
    defaultBoxPrice: 3999,
    powerDraw: 240,
    exampleOf: "dgx-spark",
  },
  {
    id: "asus-ascent-gx10",
    name: "ASUS Ascent GX10",
    spec: "NVIDIA GB10 / DGX Spark-class system, 128 GB LPDDR5x unified memory, 1 TB SSD",
    priceLow: 3970.99,
    priceHigh: 4999.99,
    priceNote:
      "Retail street prices observed from Newegg listings for the ASUS DGX Spark / GB10-class system; seller mix and bundles vary.",
    sourceUrl: "https://www.newegg.com/asus-ascent-gx10-mini-pc/p/N82E16859110044",
    sourceLabel: "Newegg street price",
    verification: "retailer",
    lastUpdated: "2026-07-19",
    defaultBoxPrice: 3970.99,
    powerDraw: 240,
    exampleOf: "dgx-spark",
  },
  {
    id: "pny-dgx-spark",
    name: "PNY NVIDIA DGX Spark",
    spec: "NVIDIA GB10 Grace Blackwell, 128 GB LPDDR5x, 4 TB NVMe",
    priceLow: 5199.99,
    priceHigh: 5199.99,
    priceNote:
      "Newegg street price for the 4 TB PNY DGX Spark listing; seller mix and bundles vary, so it is best read as a retailer snapshot rather than a fixed MSRP.",
    sourceUrl:
      "https://www.newegg.com/pny-technologies-inc-dgx-personal-ai-computer-20-core-arm-10-cortex-x925-10-cortex-a725-arm-nvdgxspark-pb/p/N82E16856987001",
    sourceLabel: "Newegg street price",
    verification: "retailer",
    lastUpdated: "2026-07-31",
    defaultBoxPrice: 5199.99,
    powerDraw: 240,
    exampleOf: "dgx-spark",
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
    tokensPerSecond: { low: 5, high: 40 },
    modelFit:
      "Practical local model fit: small coding models and 30B-class quantized workloads; the highest-memory trims can stretch toward 70B-class experiments.",
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
    sourceLabel: "Official Framework configuration page",
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
  {
    id: "rtx-pro-6000-blackwell",
    name: "NVIDIA RTX PRO 6000 Blackwell workstation",
    spec: "Discrete Blackwell GPU workstation, 96 GB GDDR7 ECC VRAM",
    priceLow: 18199,
    priceHigh: 23999,
    priceNote:
      "Retailer-derived range from in-stock Newegg listings for full RTX PRO 6000 Blackwell 96 GB workstations (e.g. ABS AI Workstation configurations observed at ~$18,199 and ~$23,999, varying by CPU/config). This is a build-required workstation / component class — not a compact appliance like DGX Spark — and its ~600 W-class GPU pushes full-system power draw well above the mini-PC boxes, so `powerDraw` records the GPU-class figure while a complete build under load draws more. Listed for high-end context; it is not a featured card and never seeds the calculator.",
    sourceUrl: "https://www.newegg.com/p/pl?d=RTX+PRO+6000+Blackwell",
    sourceLabel: "Newegg street price",
    verification: "retailer",
    lastUpdated: "2026-07-20",
    defaultBoxPrice: 18199,
    powerDraw: 600,
    referenceOnly: true,
  },
];

/**
 * The top-level boxes shown as cards in the "Featured hardware to compare"
 * grid. Named example SKUs (`exampleOf`) are not standalone cards — they are the
 * selectable trim levels of their parent class card (see `hardwareTrims`) —
 * and `referenceOnly` classes (e.g. a build-required RTX PRO 6000 workstation)
 * are listed for context but not promoted to a card. The full `hardware` array
 * still backs the comparison table and pricing list, so every SKU and reference
 * class keeps its own source and affiliate provenance there.
 *
 * @type {Hardware[]}
 */
export const featuredHardware = hardware.filter(
  (box) => !box.exampleOf && !box.referenceOnly
);

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
  if (children.length > 1) {
    return children.map((child) => ({
      id: child.id,
      name: child.name,
      boxPrice: child.defaultBoxPrice ?? child.priceLow,
      powerDraw: child.powerDraw ?? box.powerDraw ?? defaults.powerDraw,
    }));
  }

  if (children.length === 1) {
    const child = children[0];
    const powerDraw = box.powerDraw ?? defaults.powerDraw;

    if (box.priceLow !== box.priceHigh) {
      return [
        { id: `${box.id}-low`, name: "Low-end", boxPrice: box.priceLow, powerDraw },
        {
          id: child.id,
          name: child.name,
          boxPrice: child.defaultBoxPrice ?? child.priceLow,
          powerDraw: child.powerDraw ?? powerDraw,
        },
        { id: `${box.id}-high`, name: "High-end", boxPrice: box.priceHigh, powerDraw },
      ];
    }

    return [
      {
        id: child.id,
        name: child.name,
        boxPrice: child.defaultBoxPrice ?? child.priceLow,
        powerDraw: child.powerDraw ?? powerDraw,
      },
    ];
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
 * URLs point at live vendor/reseller destinations; swap the `url` values if a
 * program's landing page moves or a commissioned link becomes available.
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
    label: "Buy on NVIDIA Marketplace",
    affiliate: false,
  },
  "asus-ascent-gx10": {
    vendor: "Newegg",
    url: "https://www.newegg.com/p/pl?d=ASUS+Ascent+GX10",
    label: "Check ASUS Ascent GX10 pricing",
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
  "rtx-pro-6000-blackwell": {
    vendor: "NVIDIA",
    url: "https://www.nvidia.com/en-us/products/workstations/",
    label: "Browse NVIDIA workstation options",
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
