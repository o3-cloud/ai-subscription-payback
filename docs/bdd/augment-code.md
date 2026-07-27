# Feature: Augment Code Business Tier

```gherkin
Scenario: The Augment Code Business tier is listed as a coding-agent plan
  Given the comparison and pricing sections
  When the visitor views them
  Then the Augment Code Business tier is listed alongside the other coding-agent plans
  And it is described as a team plan for the Augment Code coding agent
  And it compares at a $100/mo headline price
  And it points at the official Augment Code pricing page

Scenario: The Augment Code Business tier discloses its pooled-usage caveat
  Given the Augment Code Business tier
  When the visitor views its billing cadence and included-value text
  Then it states the plan is a flat $100/month covering up to 50 seats and $100/month of pooled usage
  And it notes the pooled usage is shared across the team
  And it notes that usage beyond the pool is billed as metered top-ups
  And it notes that Augment Code's Enterprise plan is custom-priced and out of scope here

Scenario: The Augment Code Business tier is optional and unchecked by default
  Given the subscriptions-to-compare list
  When the calculator loads with its default selection
  Then the Augment Code Business tier is present but unchecked
  And checking it adds its $100/mo price to the comparison without changing the defaults on reload

Scenario: Augment Code is discoverable in homepage copy and metadata
  Given the landing page and its head metadata
  When a searcher or visitor scans the homepage copy
  Then the subscription helper text names the Augment Code (Business) tier
  And the meta description, keywords, Open Graph description, Twitter description, and JSON-LD description all mention Augment Code
```
