# Feature: LLM-Readable Site Context (llms.txt)

```gherkin
Scenario: An AI agent can discover a concise site map at /llms.txt
  Given the static site is deployed to GitHub Pages
  When an AI agent or crawler fetches /llms.txt at the site root
  Then the file follows the llms.txt convention with a top-level "# " H1 title
  And it opens with a "> " blockquote summarizing what the site does
  And every link it lists is an absolute URL under the canonical production origin

Scenario: The file points at the core surfaces of the site
  Given the llms.txt file
  When the agent reads its sections
  Then it links the calculator, the methodology/assumptions, the pricing
    disclosure, the affiliate disclosure, and each published guide
  And the guide links match the guides listed in sitemap.xml

Scenario: The file stays on the canonical origin only
  Given the llms.txt file
  When a crawler reads any link in it
  Then every URL uses the custom production domain
  And no legacy `*.github.io` origin appears anywhere in the file

Scenario: The disclosures stay honest and source-backed
  Given the llms.txt summary and disclosure sections
  When the agent reads them
  Then they state the calculator runs client-side with no backend
  And they state affiliate links never change the calculator's results
  And they state pricing is a manually maintained snapshot to verify with vendors
```

## Notes

- `llms.txt` is a published static file at the repository root, served at
  `https://www.othree.cloud/ai-subscription-payback/llms.txt`. It gives AI agents
  a compact, curated entry point to the site (calculator, methodology,
  disclosures, and guides) instead of scraping the full HTML.
- The opening summary is a maintained snapshot of the current modeled
  subscription families; when new rows land in the calculator data, refresh the
  summary so it names the current coverage, including additions like GitLab,
  Cursor, GitHub Copilot, Google AI, Replit, Qodo, CodeRabbit, Kiro, JetBrains
  AI, Tabnine, Factory, Manus, xAI Grok / SuperGrok, Amazon Q Developer, Zed,
  and Devin / Windsurf.
- Like every SEO artifact, it uses the custom production domain
  `https://www.othree.cloud/ai-subscription-payback/` as the single source of
  truth for origins; the legacy `o3-cloud.github.io` origin must never appear.
  See [SEO and Launch Metadata](./seo-and-metadata.md) and
  [Static Site Delivery](./static-site-delivery.md).
- Guide links must stay in sync with `sitemap.xml`;
  `test/llms-txt.test.js` guards the structure, the on-origin URLs, the required
  surfaces, and the sitemap alignment.
