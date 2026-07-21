# Feature: Launch Copy Snippets

```gherkin
Scenario: The launch-copy document leads with the official site name
  Given the ready-to-post launch copy in docs/launch-copy.md
  When a maintainer opens the document to grab a snippet
  Then the top-level heading uses the official site name "AI Subscription Payback"
  And no legacy "AI Box" product name appears

Scenario: Snippets reflect the current featured hardware lineup
  Given the shareable social snippets in docs/launch-copy.md
  When a maintainer reads the hardware examples
  Then they name the featured lineup (Mac Studio, DGX Spark, and Strix Halo)
  And they name the ASUS Ascent GX10 DGX Spark example
  And they name the Framework Desktop AI Max 385 Strix Halo example

Scenario: Every shareable snippet includes the canonical URL exactly once
  Given the `##` social snippets meant for sharing (every section except "Posting notes")
  When a maintainer copies a snippet to post it
  Then the snippet includes the canonical production URL `https://www.othree.cloud/ai-subscription-payback/` exactly once
  And it carries no other link, tracking parameters, or the legacy `*.github.io` origin
  And each snippet keeps the transparent, free-calculator tone

Scenario: Posting notes point at the shared social card and canonical link
  Given the "Posting notes" section of docs/launch-copy.md
  When a maintainer prepares a post
  Then the notes reference the social card at `assets/img/og-card.png`
  And they instruct keeping the link pointed at the canonical production URL `https://www.othree.cloud/ai-subscription-payback/` without tracking parameters
```

## Notes

- These behaviors describe `docs/launch-copy.md`, the ready-to-post social copy
  shared at launch. The canonical/share URL is the production custom domain
  `https://www.othree.cloud/ai-subscription-payback/`; the legacy project GitHub
  Pages origin (`o3-cloud.github.io`) must never appear in a snippet.
- The featured hardware lineup mirrors the homepage cards (Mac Studio, DGX Spark
  systems such as the ASUS Ascent GX10, and Strix Halo systems such as the
  Framework Desktop AI Max 385); refresh the copy whenever that lineup changes.
- Every ready-to-post section — including the Hacker News/community and
  Reddit/forum intros — carries the canonical share link exactly once; only the
  "Posting notes" maintainer guidance omits it.
- `test/launch-copy.test.js` guards the heading/site name, the hardware lineup,
  and the exactly-one-canonical-URL rule for each shareable snippet. The overlapping
  "Launch-copy snippets stay aligned…" scenario in
  [SEO and Launch Metadata](./seo-and-metadata.md) covers the same document from
  the search-metadata angle.
