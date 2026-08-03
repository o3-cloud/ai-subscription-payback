# Feature: Kiro Coding-Agent Tiers

```gherkin
Scenario: The Kiro tiers are listed as a coding-agent plan family
  Given the comparison and pricing sections
  When the visitor views them
  Then the Kiro tiers are listed alongside the other coding-agent plans
  And they are described as Kiro's AI IDE/CLI/Web/Mobile product family
  And the Free tier compares at $0/mo, Pro at $20/mo, Pro+ at $40/mo, Pro Max at $100/mo, and Power at $200/mo
  And they point at the official Kiro pricing page

Scenario: The Kiro tiers disclose their credit and overage caveat
  Given the Kiro Free, Pro, Pro+, Pro Max, and Power tiers
  When the visitor views their billing cadence and included-value text
  Then the paid tiers say Kiro credits are included
  And the copy notes that add-on / pay-per-use overage is listed at $0.04/credit
  And it avoids implying unlimited usage from the flat monthly price

Scenario: The Kiro tiers are optional and unchecked by default
  Given the subscriptions-to-compare list
  When the calculator loads with its default selection
  Then the Kiro Free, Pro, Pro+, Pro Max, and Power tiers are present but unchecked
  And checking one adds its monthly price to the comparison without changing the defaults on reload

Scenario: Kiro is searchable and categorized as an AI IDE/editor tier
  Given the calculator is visible
  When the visitor searches for "Kiro"
  Then the Kiro rows remain visible
  And the AI IDE/editor category includes Kiro
  And filtering never deselects any plans

Scenario: Kiro is discoverable in homepage copy and metadata
  Given the landing page and its head metadata
  When a searcher or visitor scans the homepage copy
  Then the subscription helper text names Kiro as an AI IDE/CLI/Web/Mobile coding-agent family
  And the meta description, keywords, Open Graph description, Twitter description, and JSON-LD description all mention Kiro
```
