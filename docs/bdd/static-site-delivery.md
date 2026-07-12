# Feature: Static Site Delivery

Gherkin-style scenarios describing observable behavior for the site as a static GitHub Pages app.

```gherkin
Scenario: Site loads without a backend
  Given the site is deployed to GitHub Pages
  When a visitor opens the site URL
  Then the page renders fully from static assets
  And no server-side API call is required to show the calculator

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

Scenario: Last-updated date is visible
  Given the pricing data has a lastUpdated field
  When the visitor views the pricing section
  Then the last-updated date is displayed
```
