# Feature: Pricing Disclosure

```gherkin
Scenario: Subscription prices and sources are disclosed
  Given the pricing section
  When the visitor views it
  Then each subscription's price, plan, source label, and source link are listed
  And each subscription row shows whether the source is official, a retailer, or an estimate
  And each subscription row shows when the source was last verified
  And each entry shows when the price was last curated

Scenario: Supported subscription tiers are listed
  Given the comparison and pricing sections
  When the visitor views them
  Then the Codex individual plan is listed
  And the Claude Code tiers are listed: Pro monthly, Pro annual, Max 5×, Team standard seat (monthly and annual), and Team premium seat (monthly and annual)
  And the GitHub Copilot tiers are listed: Free, Pro, Pro+, and Max
  And the Cursor tiers are listed: Individual, Pro+, Ultra, Teams, and Teams Premium
  And the Zed tiers are listed: Personal, Pro, and Business
  And the Google AI tiers are listed: Plus, Pro, and Ultra
  And the Amazon Q Developer tiers are listed: Free and Pro
  And the Devin tiers are listed: Free, Pro, Max, and Teams (base + 1 seat)
  And the Replit tiers are listed: Starter (Free), Core (monthly and annual), and Pro (monthly and annual)
  And the Mistral tiers are listed: Free, Pro, Team, and Education
  And each tier is distinguishable by its plan name even when it shares a product name

Scenario: Devin Teams pricing preserves the base-fee plus seat math
  Given the Devin Teams tier
  When the visitor views the pricing copy
  Then it states the team plan is billed as an $80/mo base fee plus $40/mo per full dev seat
  And it clarifies that the $120/mo shown is the real cost of the base plus one seat
  And the pricing disclosure paragraph spells out this base-fee plus seat math in visible copy

Scenario: Editor-assistant tiers are optional and unchecked by default
  Given the subscriptions-to-compare list
  When the calculator loads with its default selection
  Then only the Codex and Claude Code Pro (monthly) tiers are checked
  And the GitHub Copilot, Cursor, Zed, Google AI, Amazon Q Developer, Devin, Replit, and Mistral tiers are present but unchecked
  And checking one adds its monthly price to the comparison without changing the defaults on reload

Scenario: Google AI tiers describe their coding-agent benefit
  Given the Google AI Plus, Pro, and Ultra tiers
  When the visitor views their included-value text
  Then each is described as a broad Google AI subscription
  And the Pro and Ultra tiers note the included coding-agent access to Jules and Google Antigravity
  And all three are optional and unchecked in the default selection

Scenario: Amazon Q Developer tiers disclose their quota caveat
  Given the Amazon Q Developer Free and Pro tiers
  When the visitor views their included-value text
  Then each notes that agentic requests and Java code transformation (lines of code) are quota-limited
  And the Free tier is priced at $0/mo and the Pro tier at $19/mo per user
  And both point at the official AWS Q Developer pricing page
  And both are optional and unchecked in the default selection

Scenario: Replit tiers disclose their Agent-credit and tax caveats
  Given the Replit Starter, Core, and Pro tiers
  When the visitor views their included-value text
  Then the Starter tier is priced at $0/mo with free daily Replit Agent credits
  And the Core tier is priced at $25/mo (or $20/mo effective billed annually) and includes $25/mo of Replit Agent credits
  And the Pro tier is priced at $100/mo (or $95/mo effective billed annually) and includes $100/mo of Replit Agent credits
  And the paid tiers note that usage beyond the included credits is billed separately and that taxes may vary by location
  And all point at the official Replit pricing page
  And all are optional and unchecked in the default selection

Scenario: Mistral tiers disclose their Vibe coding access and tax / fair-usage caveats
  Given the Mistral Free, Pro, Team, and Education tiers
  When the visitor views their included-value text
  Then the Free tier is priced at $0/mo with limited access to Vibe coding sessions
  And the Pro tier is priced at $14.99/mo excluding taxes with full access to Vibe for long-running tasks plus all-day coding
  And the Team tier is priced at $24.99/user/mo excluding taxes for a shared team workspace
  And the Education tier is priced at $5.99/mo excluding taxes for students
  And the paid tiers note that the price excludes taxes and that use is subject to fair-usage limits
  And all point at the official Mistral pricing page
  And all are optional and unchecked in the default selection

Scenario: Usage-based tiers disclose their included-credit caveat
  Given a usage-based tier such as GitHub Copilot Pro or Zed Pro
  When the visitor views its included-value text
  Then the included monthly credits are stated (GitHub AI Credits or Zed token credits)
  And it is noted that usage beyond the included credits is billed separately

Scenario: Billing cadence and included value are shown
  Given a subscription tier in the comparison or pricing section
  When the visitor views it
  Then the monthly comparison price is shown as the headline number
  And the tier's billing cadence is shown (monthly, annual up front, or per seat)
  And a short description of what the tier includes is shown

Scenario: Annually billed tiers compare at their effective monthly price
  Given an annually billed tier such as Claude Code Pro annual
  When the calculator compares subscription spend
  Then the tier contributes its effective monthly price (annual price ÷ 12) to the comparison
  And the annual billing cadence is disclosed as context but does not change the math

Scenario: Pricing section shows pricing freshness
  Given the pricing section
  When the visitor views it
  Then a "Pricing last updated" timestamp reflecting when the pricing data was last curated is shown
  And it is rendered as a <time> element whose datetime attribute holds the machine-readable ISO date
  And this pricing-freshness date is distinct from the site-wide last-updated disclosure shown in the footer

Scenario: Hardware prices and sources are disclosed
  Given the hardware comparison section
  When the visitor views it
  Then each featured hardware option shows a visible price or price range
  And the source of the hardware price is listed
  And the source status shows whether the number is official, retailer, or estimate
  And the source status includes the last verified date

Scenario: Mac Studio pricing uses the official buy-page range
  Given the hardware comparison section
  When the visitor views the Mac Studio card
  Then the displayed price range comes from Apple's buy/configuration page
  And the source link points to the direct buy page for Mac Studio
  And the card offers a trim selector for alternative configurations
  And the featured preload uses the low end of the configurable range

Scenario: Strix Halo pricing uses a current official AMD product page
  Given the hardware comparison section
  When the visitor views the AMD Strix Halo card
  Then the source link points to a current official AMD Ryzen AI Max+ product page
  And the source link does not point to the retired AMD URL that returns 404
  And the featured guide mirrors the same source link in its price snapshot
  And the Strix Halo examples section includes a Framework Desktop option alongside the GMKtec systems
  And the Framework Desktop source link points to the canonical live Framework configuration page rather than the redirecting landing URL

Scenario: Affiliate links are separate from price sources
  Given a featured hardware option with a reseller or affiliate CTA
  When the visitor views the comparison row or pricing list
  Then the source link points to the pricing source
  And the affiliate CTA points to a separate destination
  And changing affiliate metadata does not change the displayed price or source URL

Scenario: Featured products are named clearly
  Given the hardware comparison section
  When the visitor views it
  Then the product names include Mac Studio, DGX Spark, ASUS Ascent GX10, and Strix Halo class systems
  And each product name is paired with a source or vendor label

Scenario: High-end reference workstation classes are listed without becoming featured cards
  Given the hardware comparison and pricing sections
  When the visitor looks for an RTX PRO 6000 Blackwell workstation class
  Then the pricing data includes the RTX PRO 6000 Blackwell workstation as a retailer-derived reference class
  And it shows the 96 GB GDDR7 ECC VRAM spec with a build-required workstation caveat
  And the reference class does not appear among the featured hardware cards

Scenario: Prices are described as estimates
  Given the pricing section
  When the visitor reads the disclosure
  Then it states prices are periodically curated and may be out of date

Scenario: Price source links open externally
  Given a source link in the pricing section
  When the visitor clicks it
  Then the link opens the referenced source
  And the calculator state remains unchanged
```
