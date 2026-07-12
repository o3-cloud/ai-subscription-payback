# Feature: Pricing Disclosure

```gherkin
Scenario: Subscription prices and sources are disclosed
  Given the pricing section
  When the visitor views it
  Then each subscription's price, plan, and source is listed

Scenario: Pricing section shows pricing freshness
  Given the pricing section
  When the visitor views it
  Then a "Pricing last updated" timestamp reflecting when the pricing data was
    last curated is shown
  And it is rendered as a <time> element whose datetime attribute holds the
    machine-readable ISO date
  And this pricing-freshness date is distinct from the site-wide last-updated
    disclosure shown in the footer

Scenario: Hardware prices and sources are disclosed
  Given the hardware comparison section
  When the visitor views it
  Then each hardware option shows a visible price or price range
  And the source of the hardware price is listed

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
