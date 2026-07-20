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
  And it includes a sample payback scenario with break-even metrics
  And the sample scenario prose states the scenario's electricity rate (cent precision)
  And it includes the main caveats and software tradeoffs
  And it includes a CTA that returns to the calculator with the scenario preloaded in the URL hash
  And the CTA explicitly clears custom spend so the calculator uses the guide's tier selection

Scenario: The guides are indexed and discoverable by crawlers
  Given a crawler fetches the sitemap
  When it reads the URL list
  Then sitemap.xml includes every published mini-guide URL
  And each guide page declares canonical, Open Graph, and Twitter metadata for its own URL
```
