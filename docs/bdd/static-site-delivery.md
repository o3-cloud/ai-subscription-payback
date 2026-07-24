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

Scenario: Unknown paths land on a friendly 404 fallback
  Given a visitor opens a URL that does not map to a published page
  When GitHub Pages serves the 404 fallback
  Then a styled "Page not found" page renders using the shared site stylesheet
  And it offers a link back to the calculator home
  And it is marked noindex so it never replaces real content in search
  And its asset and link references are base-qualified absolute paths so they
    resolve regardless of how deep the missing URL was
  And it declares the bundled favicon so the browser does not auto-request a
    /favicon.ico that would 404 again

Scenario: Client-rendered sections explain their JavaScript dependency
  Given the featured hardware cards and subscription options are populated by
    JavaScript on load
  When a visitor opens the page without JavaScript available
  Then each mount shows a clear fallback message that names JavaScript and
    explains the section is populated when the page loads
  And the message tells the visitor to enable JavaScript to use the section
  And no generic "load here" placeholder copy is shown

Scenario: Site-wide last-updated disclosure is visible in the footer
  Given the site content has a siteLastUpdated date
  When the visitor views the footer
  Then a "Site last updated" timestamp is displayed
  And it is rendered as a <time> element whose datetime attribute holds the
    machine-readable ISO date
  And it reflects when the site content as a whole was last updated, independent
    of the pricing-freshness date shown in the pricing section
```

> Deployment: GitHub Pages publishing is gated by repository eligibility. The
> workflow enables Pages automatically on the first successful run, and because
> the repository is public it is eligible for Pages on any plan, so each push to
> `main` publishes the site.

> Local development: serve the repository root over HTTP (e.g. `npx serve .` or
> `python3 -m http.server`) rather than opening `index.html` from a `file://`
> URL. The client-rendered sections initialize only when the page is served over
> `http://`; a `file://` load leaves the page in its no-JS fallback state.

> Not-found handling: a root `404.html` is published alongside `index.html`.
> GitHub Pages serves it for any unmatched path, so unknown or stale deep links
> get a styled fallback (base-qualified absolute asset paths, `noindex`) instead
> of a bare server error page.

> The pricing section's own "Pricing last updated" timestamp (pricing freshness)
> is specified in [Pricing Disclosure](./pricing-disclosure.md).
