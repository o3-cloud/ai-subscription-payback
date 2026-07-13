# PRD — Affiliate Payback Calculator for Local AI Inference Boxes

> **MVP scope:** the launch boundary, shipped assumptions, and commercial model
> are specified as behavior in
> [MVP Scope and Commercial Model](docs/bdd/mvp-scope.md). The Goals, Non-Goals,
> and Monetization sections below are the source those scenarios track.

## Problem Statement

Developers and small teams often pay recurring monthly fees for AI coding
subscriptions such as Codex and Claude Code. This project will be an affiliate
marketing static site that promotes local AI inference boxes — especially
Mac Studio, NVIDIA DGX Spark, and AMD Strix Halo class systems — and helps
visitors estimate how long it would take to pay off one of those boxes if they
canceled their AI subscriptions and financed the hardware instead.

The site answers two related questions:

1. **Which local AI box should I buy?**
2. **How long until the box pays for itself compared with my current AI
   subscriptions?**

The site must be transparent about pricing assumptions, affiliate relationships,
and the fact that all savings numbers are estimates.

## Goals

- Promote selected local AI inference boxes with clearly disclosed affiliate or
  reseller links.
- Provide a fast, free calculator that compares subscription spend against the
  monthly cost of financing a hardware purchase.
- Compare at minimum Codex and Claude Code against Mac Studio, DGX Spark, and
  Strix Halo-class systems, with room to add more boxes or subscriptions.
- Show a clear cost breakdown: subscription spend over time vs. total hardware
  ownership cost, including financing and optional operating costs.
- Work as a static site suitable for GitHub Pages with no backend.
- Load quickly, be mobile-friendly, and be accessible (WCAG 2.1 AA target).
- Be transparent about pricing sources, affiliate links, and methodology.

## Non-Goals

- Not a real-time price feed; prices are periodically curated, not live.
- Not a benchmark of model quality or coding performance — this is a cost and
  purchase-decision tool.
- No user accounts, login, or saved profiles in v1.
- No server-side storage of user inputs or PII.
- Not tax, accounting, or financial advice.
- Not a procurement service or checkout flow — users are sent to vendors and
  resellers via affiliate links.

## Audience

- Individual developers deciding whether to keep paying for AI subscriptions or
  buy a local box.
- Small engineering teams budgeting AI tooling and hardware.
- Homelab and self-hosting enthusiasts interested in local inference.
- Readers who want a simple ROI / payback estimate before buying hardware.

## Core User Journey

1. Land on the page from search, social, or a shared link.
2. See a clear value proposition: local AI box recommendations plus a payoff
   calculator.
3. Compare featured hardware cards for Mac Studio, DGX Spark, and Strix Halo.
4. Follow affiliate or reseller links if a product looks attractive.
5. Enter or accept default assumptions for box price, down payment, APR,
   financing term, electricity rate, and subscription spend.
6. See an immediate result: monthly payment, total ownership cost, and estimated
   break-even month versus their subscription spend.
7. Adjust inputs and watch the result update live.
8. Share the configured scenario via URL.

## Information Architecture

- **Home / Calculator** (single-page primary experience)
  - Hero: headline + subhead + primary CTA (shop boxes / scroll to calculator).
  - Featured hardware cards: Mac Studio, DGX Spark, Strix Halo.
  - Calculator: inputs panel + results panel + cost-over-time chart.
  - Comparison table: subscriptions vs. hardware profiles.
  - Pricing disclosure section (sources, last-updated date).
  - Affiliate disclosure section.
  - FAQ / methodology (how break-even is computed).
  - Footer: about, disclaimers, links, last-updated.
- **Methodology** (anchor or separate page): formulas and assumptions.
- **About / Disclosures** (anchor or separate page).

## Data Assumptions

- **Subscriptions**: per-plan monthly price, plan name, seat model,
  last-updated date, source URL. Stored as static data editable by maintainers.
- **Hardware / box**: representative price or price range, vendor/source URL,
  default down payment, default APR, and default financing term.
- **Operating costs**: electricity rate ($/kWh), estimated power draw (W),
  hours/day utilization, and optional maintenance/depreciation allowance.
- **Affiliate metadata**: affiliate URL, vendor name, disclosure label, and
  canonical product name.
- All prices are USD by default.
- Data is manually maintained; each dataset carries a `lastUpdated` field shown
  in the UI.

## Monetization

- **Primary monetization is affiliate marketing** for the featured hardware
  boxes and, where appropriate, related vendor/reseller links.
- **Affiliate links** must be clearly disclosed.
- Optional future: sponsored placements or a "recommended build" section, always
  labeled.
- No paywalls or ads that harm performance/accessibility in v1.
- Monetization must never alter calculator math or default assumptions in a
  hidden way.

## SEO / Marketing Assumptions

- Target queries: "Mac Studio AI build", "DGX Spark price", "Strix Halo AI
  workstation", "Codex vs local AI box cost", "Claude Code subscription
  payback", and "AI coding subscription vs GPU".
- Single strong landing page with descriptive title, meta description, semantic
  headings, and prominent product cards.
- Open Graph / Twitter card metadata for shareable results.
- Fast load and mobile-friendliness as ranking factors.
- Shareable, hash-encoded scenarios to earn links and social shares.
- Content: methodology, FAQ, and product comparison copy should be indexable.

## Analytics

- Privacy-respecting, cookieless analytics preferred.
- Track high-level events: calculator interaction, product-card click, scenario
  share, and affiliate link clicks.
- No storage of individual user input values on a server.
- Respect Do Not Track / provide the ability to opt out where required.

## Accessibility

- Target WCAG 2.1 AA.
- All calculator inputs and product-card controls have visible labels and are
  keyboard-operable.
- Sufficient color contrast in both light and dark themes.
- Chart has an accessible text/table equivalent of the underlying numbers.
- Results announced to assistive tech when they update.
- Respects `prefers-reduced-motion` and `prefers-color-scheme`.

## Open Questions

- Currency and region support — USD only at launch, or multi-currency?
- Which affiliate programs are available for each featured box?
- How often are prices refreshed, and who owns that process?
- Should depreciation / resale value be modeled in total cost of ownership?
- Do we model amortization interest precisely, or a simplified flat estimate?
- Should the site emphasize one featured box per vendor or multiple profiles per
  vendor?
