# Feature: Featured Hardware Cards

```gherkin
Scenario: Featured hardware cards are visible on the home page
  Given the homepage loads
  When the visitor views the hero or featured products section
  Then Mac Studio, DGX Spark, and Strix Halo class cards are visible
  And each card includes a current price or price range

Scenario: Featured hardware cards include affiliate calls to action
  Given a featured hardware card
  When the visitor views the card
  Then the card includes a clearly labeled affiliate or reseller button
  And the button opens the vendor or reseller destination

Scenario: Featured hardware cards can drive the calculator
  Given a featured hardware card and calculator on the same page
  When the visitor selects a featured product
  Then the calculator loads the matching price assumptions
  And the payoff estimate updates for that product

Scenario: Featured hardware cards show a source label
  Given the user is comparing products
  When the visitor reads a featured card
  Then the card shows the source of the displayed price
  And the source makes clear whether the number is official, retail, or an estimate
```
