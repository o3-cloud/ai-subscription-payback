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
  And each tier is distinguishable by its plan name even when it shares a product name

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
  And the featured preload uses the low end of the configurable range

Scenario: Affiliate links are separate from price sources
  Given a featured hardware option with a reseller or affiliate CTA
  When the visitor views the comparison row or pricing list
  Then the source link points to the pricing source
  And the affiliate CTA points to a separate destination
  And changing affiliate metadata does not change the displayed price or source URL

Scenario: Featured products are named clearly
  Given the hardware comparison section
  When the visitor views it
  Then the product names include Mac Studio, DGX Spark, and Strix Halo class systems
  And each product name is paired with a source or vendor label

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
