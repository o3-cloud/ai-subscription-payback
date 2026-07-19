# Feature: SEO and Launch Metadata

```gherkin
Scenario: The landing page is discoverable and indexable
  Given the static site is deployed to GitHub Pages
  When a search-engine crawler fetches the landing page
  Then the document declares a descriptive title and meta description
  And it declares a canonical URL
  And a robots meta tag permits indexing and following

Scenario: Crawlers can discover every published URL
  Given a crawler requests robots.txt at the site root
  When it reads the file
  Then the file allows crawling of the site
  And it points to the sitemap.xml URL
  And sitemap.xml lists the canonical landing-page URL

Scenario: Shared links render a complete social card
  Given a visitor shares the site URL on a social platform
  When the platform scrapes the page
  Then Open Graph title, description, url, site_name, and locale are present
  And an og:image with descriptive alt text is provided
  And a Twitter card with its own title, description, and image is provided

Scenario: Google AI and Replit tiers are discoverable in homepage copy and metadata
  Given the landing page and its head metadata
  When a searcher or visitor scans the homepage copy
  Then the subscription helper text names Google AI, Gemini, Jules, Antigravity, and Replit Agent
  And the meta description, keywords, Open Graph description, and Twitter description all mention Google AI and Replit tiers

Scenario: The calculator is described as structured data
  Given the landing page includes JSON-LD structured data
  When a search engine parses it
  Then the app is described as a free WebApplication
  And the on-page methodology questions are exposed as a FAQPage
  And each FAQ answer matches the answer copy shown on the page

Scenario: The custom domain is the single source of truth for SEO origins
  Given the site is served from the custom domain
  And it was previously served from the project GitHub Pages origin
  When a crawler reads any indexable artifact (index.html, robots.txt, sitemap.xml, or a generated guide)
  Then every canonical, sitemap, and social origin uses the custom domain
  And no legacy `*.github.io` origin appears in any of those artifacts
```

## Notes

- The launch social card lives at `assets/img/og-card.png` for broad social
  platform compatibility. The editable SVG source is kept alongside it at
  `assets/img/og-card.svg`.
- The canonical/share URL for the launch surface is the production custom domain:
  `https://www.othree.cloud/ai-subscription-payback/`. This custom domain is the
  single source of truth for every SEO origin; the legacy project GitHub Pages
  origin (`o3-cloud.github.io`) must never appear in an indexable artifact, so
  it cannot compete with the custom domain for canonical or ranking signals.
- FAQ structured-data answers intentionally mirror the visible Methodology & FAQ
  copy, per search-engine rich-result guidelines that on-page and structured
  answers must match.
- `sitemap.xml` `<lastmod>` tracks the site-wide last-updated date
  (`siteLastUpdated` in `assets/js/data.js`).
