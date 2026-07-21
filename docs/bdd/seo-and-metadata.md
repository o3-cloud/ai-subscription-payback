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
  And the social-card artwork itself shows the canonical production URL in its visible footer text
  And a Twitter card with its own title, description, and image is provided

Scenario: Google AI, Mistral, and Replit tiers are discoverable in homepage copy and metadata
  Given the landing page and its head metadata
  When a searcher or visitor scans the homepage copy
  Then the subscription helper text names Google AI, Gemini, Jules, Antigravity, Replit Agent, and Mistral
  And the meta description, keywords, Open Graph description, Twitter description, and JSON-LD description all mention Google AI, Replit, and Mistral tiers

Scenario: The landing page declares a favicon and avoids a /favicon.ico 404
  Given the static site ships from a project subpath with no favicon at the origin root
  When a browser loads the landing page
  Then the document head declares a <link rel="icon"> pointing at a bundled asset
  And that favicon asset exists in the repository
  So that the browser uses it instead of requesting a 404 /favicon.ico

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

Scenario: Launch-copy snippets stay aligned with the featured hardware and canonical URL
  Given the ready-to-post launch copy in docs/launch-copy.md
  When a maintainer copies a shareable social snippet
  Then the document heading uses the official site name "AI Subscription Payback" and never the legacy "AI Box Payback"
  And it names hardware from the current featured lineup (Mac Studio, DGX Spark systems such as the ASUS Ascent GX10, and Strix Halo systems such as the Framework Desktop AI Max 385)
  And every share link is exactly the canonical production URL `https://www.othree.cloud/ai-subscription-payback/` with no tracking parameters or legacy origin
  And it keeps the transparent, free-calculator tone

Scenario: Posting notes point at the social card and a clean canonical link
  Given the Posting notes section of docs/launch-copy.md
  When a maintainer prepares a post from the launch copy
  Then the notes reference the social card at `assets/img/og-card.png`
  And they instruct keeping the link canonical without tracking parameters
```

## Notes

- The launch social card lives at `assets/img/og-card.png` for broad social
  platform compatibility. The editable SVG source is kept alongside it at
  `assets/img/og-card.svg`, and the SVG footer text shows the canonical
  production URL so the visible artwork reinforces the exact share origin.
- The favicon lives at `assets/img/favicon.svg` and is declared in the
  `index.html` head via `<link rel="icon">`. The site ships from a project
  subpath, so the origin root has no `/favicon.ico`; declaring the icon
  suppresses the browser's default `/favicon.ico` request and its 404 console
  error. `test/seo-metadata.test.js` guards the declaration and the asset.
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
- Launch-copy snippets in `docs/launch-copy.md` must stay aligned with the
  current featured hardware lineup and share only the canonical production URL
  `https://www.othree.cloud/ai-subscription-payback/`, and the document heading
  must use the official site name "AI Subscription Payback" (never the legacy
  "AI Box Payback"); `test/launch-copy.test.js` guards all three.
