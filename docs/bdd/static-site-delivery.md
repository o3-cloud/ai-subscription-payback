# Feature: Static Site Delivery

```gherkin
Scenario: Site loads without a backend
  Given the site is deployed to GitHub Pages
  When a visitor opens the site URL
  Then the page renders fully from static assets
  And no server-side API call is required to show the calculator or featured hardware

Scenario: Calculator works without a backend API
  Given the page has finished loading
  When the visitor uses the calculator
  Then all computation happens client-side
  And results appear without a server request

Scenario: Pages remain reachable through direct navigation
  Given a visitor opens any published site URL or deep link
  When the page loads
  Then the requested content renders without requiring a login
  And the site does not depend on a client-only router to display the first view

Scenario: Site-wide last-updated disclosure is visible in the footer
  Given the site content has a siteLastUpdated date
  When the visitor views the footer
  Then a "Site last updated" timestamp is displayed
  And it is rendered as a <time> element whose datetime attribute holds the
    machine-readable ISO date
  And it reflects when the site content as a whole was last updated, independent
    of the pricing-freshness date shown in the pricing section
```

> Current blocker: GitHub Pages publishing for this repository is gated by
> repository eligibility. The workflow is configured to enable Pages
> automatically when the repo is eligible, but a private repository on a free
> organization plan cannot be published until the repo is made public or the
> organization is upgraded.

> The pricing section's own "Pricing last updated" timestamp (pricing freshness)
> is specified in [Pricing Disclosure](./pricing-disclosure.md).
