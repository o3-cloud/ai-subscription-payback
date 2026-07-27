# Feature: Lovable App-Builder Tiers

```gherkin
Scenario: The Lovable tiers are listed as app-building plans
  Given the comparison and pricing sections
  When the visitor views them
  Then the Lovable tiers are listed alongside the other app-building plans (Replit, Bolt)
  And each is described as an app-building plan for the Lovable agent
  And the Free tier compares at $0/mo, Pro at $25/mo, and Business at $50/mo
  And all point at the official Lovable pricing page

Scenario: Lovable tiers disclose their credit-limit caveats
  Given the Lovable Free, Pro, and Business tiers
  When the visitor views their included-value text
  Then the Free tier builds on a limited allowance of free monthly credits
  And the Pro tier includes 100 monthly credits with credit rollovers, on-demand top-ups, custom domains, and no Lovable badge
  And the Business tier keeps the 100-credit monthly base while adding a team workspace, role-based access, internal publishing, and an SSO/security center
  And the copy states that building beyond the included credits requires paid top-ups, so it never implies unlimited usage
  And it notes that Lovable's Enterprise plan is custom/volume-priced and out of scope here

Scenario: The Lovable tiers are optional and unchecked by default
  Given the subscriptions-to-compare list
  When the calculator loads with its default selection
  Then the Lovable Free, Pro, and Business tiers are present but unchecked
  And checking one adds its monthly price to the comparison without changing the defaults on reload

Scenario: Lovable is discoverable in homepage copy and metadata
  Given the landing page and its head metadata
  When a searcher or visitor scans the homepage copy
  Then the subscription helper text names the Lovable (app builder) tier
  And the meta description, keywords, Open Graph description, Twitter description, and JSON-LD description all mention Lovable
```
