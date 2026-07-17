# Feature: Affiliate Disclosure

```gherkin
Scenario: Affiliate relationship is disclosed
  Given the page contains affiliate links
  When the visitor views the page
  Then a clear affiliate disclosure statement is present

Scenario: Affiliate disclosure is prominent near the top of the page
  Given the visitor lands on the homepage
  When the page loads
  Then a prominent affiliate disclosure appears near the hero, above the featured hardware
  And it states that affiliate relationships do not affect the calculator's math or results
  And a detailed affiliate disclosure section remains lower on the page

Scenario: Affiliate links are identifiable
  Given an affiliate link
  When the visitor inspects or hovers it
  Then it is marked as an affiliate or outbound link
  And clicking it does not change the calculator results

Scenario: Affiliate clicks do not affect calculations
  Given the calculator has a computed result
  When the visitor clicks a reseller or affiliate link
  Then the current calculation remains visible when the visitor returns

Scenario: Product cards contain affiliate calls to action
  Given a featured hardware card for Mac Studio, DGX Spark, or Strix Halo
  When the visitor views the card
  Then the card includes a primary affiliate or reseller call to action
  And the call to action is visually distinct from the calculator controls
```
