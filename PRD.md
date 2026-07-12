# PRD — AI Coding Subscription vs. Local Inference Box Payback

## Problem Statement

Developers and small teams pay recurring monthly fees for AI coding
subscriptions (e.g., Codex, Claude Code). An alternative is to finance a local
AI inference box (a GPU workstation or server) and run open models. It is hard
to know when — if ever — the local hardware pays for itself versus continuing to
pay subscriptions. There is no simple, transparent tool that models the
crossover point given real inputs (subscription cost, hardware price, financing
terms, electricity, utilization).

This site answers one question: **"How long until buying a local AI box is
cheaper than paying for AI coding subscriptions?"**

## Goals

- Provide a fast, free calculator that computes the payback timeline (break-even
  month) of a financed local inference box vs. one or more AI coding
  subscriptions.
- Compare at least Codex and Claude Code side by side, with room to add more.
- Show a clear, honest cost breakdown: subscription spend over time vs. total
  cost of ownership (hardware + financing interest + electricity + maintenance).
- Work as a static site suitable for GitHub Pages (no backend, no server-side
  compute).
- Load quickly, be mobile-friendly, and be accessible (WCAG 2.1 AA target).
- Be transparent about pricing sources and affiliate relationships.

## Non-Goals

- Not a real-time price feed; prices are periodically hand-curated, not live.
- Not a benchmark of model quality or coding performance — cost only.
- No user accounts, login, or saved profiles (v1).
- No server-side storage of user inputs or PII.
- Not tax, accounting, or financial advice.
- Not a procurement tool — we do not sell or configure hardware directly.

## Audience

- Individual developers deciding between a subscription and buying a GPU box.
- Small engineering teams / startups budgeting AI tooling.
- Homelab and self-hosting enthusiasts.
- Technically literate readers comfortable with sliders and basic finance terms
  (APR, term, monthly payment).

## Core User Journey

1. Land on the page from search or a shared link.
2. Read a one-line explanation of what the tool answers.
3. Select which subscriptions they pay for (e.g., Codex, Claude Code) and seat
   counts.
4. Enter or accept default hardware assumptions (box price, down payment, APR,
   financing term, electricity rate, hours/day of use).
5. See an immediate result: break-even month, total subscription cost vs. total
   ownership cost, and a chart of cumulative cost over time.
6. Adjust inputs and watch the result update live.
7. Optionally follow an affiliate/reference link to hardware or a subscription,
   with disclosure shown.
8. Share the configured scenario via URL.

## Information Architecture

- **Home / Calculator** (single-page primary experience)
  - Hero: headline + subhead + primary CTA (scroll to calculator).
  - Calculator: inputs panel + results panel + cost-over-time chart.
  - Comparison table: subscriptions vs. local box assumptions.
  - Pricing disclosure section (sources, last-updated date).
  - Affiliate disclosure section.
  - FAQ / methodology (how break-even is computed).
  - Footer: about, disclaimers, links, last-updated.
- **Methodology** (anchor or separate page): formulas and assumptions.
- **About / Disclosures** (anchor or separate page).

## Data Assumptions

- **Subscriptions**: per-plan monthly price, plan name, seat model, last-updated
  date, source URL. Stored as static data (e.g., JSON/YAML) editable by
  maintainers.
- **Hardware / box**: representative price ranges for a local inference box,
  default down payment, default APR, default financing term (months).
- **Operating costs**: electricity rate ($/kWh, default by region or a single
  editable default), estimated power draw (W) under load, hours/day utilization,
  optional maintenance/depreciation allowance.
- All prices are USD by default (currency handling is an open question).
- Data is manually maintained; each dataset carries a `lastUpdated` field
  surfaced in the UI.

## Monetization

- **Affiliate links** to hardware vendors and/or subscription sign-ups, clearly
  disclosed.
- Optional future: sponsored placements or a "recommended build" section, always
  labeled.
- No paywalls, no ads that harm performance/accessibility in v1.
- Monetization must never alter calculator math or default assumptions in a
  hidden way.

## SEO / Marketing Assumptions

- Target queries: "Codex vs local AI box cost", "Claude Code subscription
  payback", "AI coding subscription vs GPU", "local LLM break-even calculator".
- Single strong landing page with descriptive title, meta description, and
  semantic headings.
- Open Graph / Twitter card metadata for shareable results.
- Fast load and mobile-friendliness as ranking factors (static site helps).
- Shareable, query-parameter-encoded scenarios to earn links and social shares.
- Content: methodology/FAQ text provides indexable, keyword-relevant copy.

## Analytics

- Privacy-respecting, cookieless analytics preferred (e.g., aggregate page views,
  referrers) with no PII.
- Track high-level events: calculator interaction, scenario share, affiliate
  link clicks (as outbound events).
- No storage of individual user input values on a server.
- Respect Do Not Track / provide the ability to opt out where required.

## Accessibility

- Target WCAG 2.1 AA.
- All calculator inputs have visible labels and are keyboard-operable.
- Sufficient color contrast in both light and dark themes.
- Chart has an accessible text/table equivalent of the underlying numbers.
- Results announced to assistive tech when they update (e.g., aria-live).
- Respects `prefers-reduced-motion` and `prefers-color-scheme`.

## Open Questions

- Currency and region support — USD only at launch, or multi-currency?
- How is power draw estimated — single default vs. per-hardware-profile?
- Should depreciation / resale value be modeled in total cost of ownership?
- How often are prices refreshed, and who owns that process?
- Which affiliate programs are available, and what disclosure wording is
  required in each jurisdiction?
- Do we model amortization interest precisely, or a simplified flat estimate?
- Multiple hardware profiles (budget/mid/high) vs. a single editable box?
- Team scaling: how do seats interact with a single shared local box?
