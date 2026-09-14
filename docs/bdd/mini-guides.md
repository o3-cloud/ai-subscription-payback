# Feature: Comparison Mini-Guides

```gherkin
Scenario: The homepage exposes discoverable guide entry points
  Given the visitor opens the homepage
  When they scan the navigation and guide hub
  Then the page includes a Guides section with links to the published mini-guides
  And each link opens an indexable static page for a specific high-intent query
  And the guides section links back to the main calculator

Scenario: Each mini-guide answers a concrete comparison query
  Given a visitor opens one of the published guide pages
  When they read the page from top to bottom
  Then the page includes a short use-case summary
  And it includes a source-backed price/spec snapshot
  And each relevant subscription row shows its source label, verification status, source URL, and last-verified date
  And the Codex guide labels its subscription row as the ChatGPT Plus / Codex bundle, not a standalone Codex subscription
  And it includes a sample payback scenario with break-even metrics
  And the sample scenario prose states the scenario's electricity rate (cent precision)
  And it includes a 24/7 yearly token-output value estimate
  And that estimate names the 24 hours/day for 360 days/year assumption
  And it shows a lower and upper sustained tokens/second bound
  And it converts annual token output into a frontier-output value band
  And it states the equivalent subscription spend in months
  And it calls out rate-limiting, idle-time, and thermal-headroom caveats
  And it includes the main caveats and software tradeoffs
  And it includes a CTA that returns to the calculator with the scenario preloaded in the URL hash
  And the CTA explicitly clears custom spend so the calculator uses the guide's tier selection

Scenario: The guide hub publishes the second-wave comparison pages
  Given the visitor opens the homepage guide hub
  When they read the published comparison links
  Then the page includes indexable guide links for Cursor, GitHub Copilot, Google AI, Google AI Ultra, and Replit Agent
  And each link opens a static comparison page on the canonical origin
  And the guide set stays aligned with sitemap.xml and llms.txt

Scenario: The guide hub publishes the third-wave comparison pages
  Given the visitor opens the homepage guide hub
  When they read the published comparison links
  Then the page includes indexable guide links for xAI Grok, GitLab Duo, Warp Build, Warp Max, and Warp Business
  And each link opens a static comparison page on the canonical origin
  And the guide set stays aligned with sitemap.xml and llms.txt

Scenario: The guides are indexed and discoverable by crawlers
  Given a crawler fetches the sitemap
  When it reads the URL list
  Then sitemap.xml includes every published mini-guide URL
  And each guide page declares canonical, Open Graph, and Twitter metadata for its own URL, including twitter:url

Scenario: Guide pages ship a favicon on the guides/ subpath
  Given a browser loads one of the published guide pages from the guides/ subpath
  When the document head is parsed
  Then the page declares a <link rel="icon"> pointing at the bundled favicon asset
  So the browser uses the shipped icon instead of requesting /favicon.ico

Scenario: Guide pages pin exact SEO titles and source freshness
  Given the guide generator publishes the current guide roster
  When a crawler parses each guide page
  Then the document title, Open Graph title, and Twitter title exactly match that guide's source title
  And the TechArticle JSON-LD dateModified exactly matches the source site freshness date
  So a renamed title or stale generated freshness value cannot pass through generator and snapshot parity alone

Scenario: Committed guides cannot drift from canonical hardware prices
  Given the calculator's hardware data is the source of truth for guide prices and scenario hashes
  When the maintainer runs `npm run check-guides`
  Then every committed guide matches the output of the guide generator
  And a stale guide path and differing line are reported when an artifact drifts
  And the command exits successfully only when all generated guides match
  So a stale hardware price cannot remain in a committed static guide unnoticed

Scenario: Cursor guide prose uses the current plan names
  Given the Cursor pricing data models Hobby, Pro, Pro+, Ultra, and Teams
  When the Cursor comparison guide is generated
  Then its use-case and caveat copy names Hobby and Pro instead of the retired Individual plan
  And the committed Cursor guide contains no reference to the retired Individual plan name

Scenario: The Google AI guide uses current Gemini wording
  Given the Google AI comparison guide is generated
  When a visitor reads its use-case summary
  Then it names the current Gemini 3 Pro and Gemini 3.6 Flash wording
  And it contains no reference to the retired Gemini 3.1 Pro wording
  And the committed guide artifact matches those current-wording requirements
```
