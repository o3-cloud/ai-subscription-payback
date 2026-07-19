# Feature: Featured Hardware Cards

```gherkin
Scenario: Featured hardware cards are visible on the home page
  Given the homepage loads
  When the visitor views the hero or featured products section
  Then Mac Studio, DGX Spark, and Strix Halo class cards are visible
  And each card shows a vendor-sourced product photo with descriptive alt text at the top
  And each card includes a current price or price range

Scenario: Range-based featured hardware cards expose a trim selector
  Given a featured hardware card whose price is a range
  When the visitor views the card
  Then the card includes a trim drop-down before the preload button
  And the default trim matches the card's documented preload
  And selecting a different trim changes which box price is loaded
  And a range-based card shares one power draw across its trims, while SKU-backed trims each carry their own

Scenario: DGX Spark exposes a named OEM trim
  Given the DGX Spark featured card
  When the visitor opens its configuration drop-down
  Then the selector includes an ASUS Ascent GX10 trim
  And the named trim keeps the DGX Spark card's source provenance and loads its retailer-sourced price

Scenario: Featured hardware cards include affiliate calls to action
  Given a featured hardware card
  When the visitor views the card
  Then the card includes a clearly labeled affiliate or reseller button
  And the button opens the vendor or reseller destination

Scenario: Featured hardware cards can drive the calculator
  Given a featured hardware card and calculator on the same page
  When the visitor selects a featured product
  Then the calculator loads the matching price assumptions
  And it preloads at least the box price and power draw inputs
  And the payoff estimate updates for that product

Scenario: Featured hardware cards show a source label
  Given the user is comparing products
  When the visitor reads a featured card
  Then the card shows the source of the displayed price
  And the source makes clear whether the number is official, retail, or an estimate

Scenario: Strix Halo cards are backed by named purchasable SKUs
  Given the Strix Halo class card on the homepage
  When the visitor opens the detailed Strix Halo guide
  Then the guide lists concrete Framework Desktop, GMKtec EVO-X2, and GMKtec EVO-X3 examples
  And each example includes vendor, memory or storage, source, price, and last-verified date
  And the generic Strix Halo class estimate is described as a range derived from those named SKUs
```
