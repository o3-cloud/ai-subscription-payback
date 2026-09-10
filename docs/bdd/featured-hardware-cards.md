# Feature: Featured Hardware Cards

```gherkin
Scenario: Featured hardware cards are visible on the home page
  Given the homepage loads
  When the visitor views the hero or featured products section
  Then Mac Studio, DGX Spark, and Strix Halo class cards are visible
  And each card shows a vendor-sourced product photo with descriptive alt text at the top
  And each card includes a current price or price range

Scenario: Mac Studio surfaces Apple's official financing example
  Given the Mac Studio featured card
  When the visitor views the card
  Then it includes Apple's official financing example as contextual copy beneath the price note
  And the example mentions the $208.25/mo for 12 months purchase financing and the lease-from $48.99/mo for 36 months Apple Upgrade example
  And the example links back to the Apple buy/configure page

Scenario: Range-based featured hardware cards expose a trim selector
  Given a featured hardware card whose price is a range
  When the visitor views the card
  Then the card includes a trim drop-down before the preload button
  And the default trim matches the card's documented preload
  And selecting a different trim changes which box price is loaded
  And a range-based card shares one power draw across its trims, while SKU-backed trims each carry their own

Scenario: DGX Spark exposes named retailer trims and a matching summary range
  Given the DGX Spark featured card
  When the visitor opens its configuration drop-down
  Then the selector includes an ASUS Ascent GX10 trim
  And it also includes HP ZGX Nano G1n, Acer Veriton VGN100-UD11, GIGABYTE AI TOP ATOM, and MSI EdgeXpert trims
  And the card summary price range spans the selectable DGX Spark-class trims
  And each named trim keeps the DGX Spark card's source provenance and loads its retailer-sourced price

Scenario: Featured hardware cards include affiliate calls to action
  Given a featured hardware card
  When the visitor views the card
  Then the card includes a clearly labeled affiliate or reseller button
  And the button opens a currently reachable vendor or retailer destination

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

Scenario: Featured hardware cards include practical model-fit guidance
  Given the user is comparing local AI boxes
  When the visitor reads a featured hardware card
  Then the card shows a practical local model-fit line
  And the guidance uses conservative buckets instead of benchmark promises
  And the section note explains that the guidance is a heuristic derived from memory or VRAM plus broad throughput ranges
  And where a vendor publishes an official workload claim, the card shows it as a separate vendor-attributed line distinct from the heuristic
  And for DGX Spark, the official line distinguishes NVIDIA's 200B-parameter inference claim, 70B-parameter fine-tuning claim, and 405B two-system claim from the site's conservative guidance

Scenario: Hardware memory metadata and selected-model fit are explicit
  Given a hardware record and a selected model size and quantization
  When the calculator evaluates model fit
  Then the record exposes numeric advertised capacity and a memory type of unified, allocatable accelerator, or discrete VRAM
  And the result is an advisory fits, conditional, does-not-fit, or unknown status based on a conservative available-memory budget
  And changing quantization or model size changes the advisory result when the memory requirement changes
  And the interface labels the result as an advisory and does not call it a benchmark
  And vendor workload ceilings remain separate from measured throughput and advisory fit results

Scenario: Model-fit rerenders preserve the loaded hardware trim
  Given the visitor has loaded a non-default featured hardware trim into the calculator
  When the visitor changes the advisory model size or quantization
  Then the featured hardware cards rerender with the same trim selected
  And the calculator's loaded price and power draw remain unchanged
  And the same card remains marked active
  And the updated advisory fit is shown for the new model-fit controls

Scenario: URL-preloaded trims survive model-fit rerenders
  Given the visitor opens a share URL containing a non-default featured hardware trim
  When the visitor changes the advisory model size or quantization
  Then the URL-selected trim remains selected
  And its loaded price and power draw remain unchanged
  And the matching card remains marked active

Scenario: Reset restores the default hardware trim
  Given the visitor has loaded a non-default featured hardware trim into the calculator
  When the visitor resets the calculator form
  Then every featured hardware trim selector returns to its documented default
  And no featured hardware card remains marked active
  And the featured hardware status returns to "Choose a system to load its assumptions into the calculator."

Scenario: Featured hardware cards expose a sustained throughput range for guide-value math
  Given a featured hardware card on the homepage
  When the maintainer inspects the data model
  Then the card includes a numeric sustained tokens/second range with low and high bounds
  And the low bound does not exceed the high bound
  And the mini-guide value section can use that range to show the annual token-output estimate

Scenario: Strix Halo cards are backed by named purchasable SKUs
  Given the Strix Halo class card on the homepage
  When the visitor opens the detailed Strix Halo guide
  Then the guide lists concrete Framework Desktop, GMKtec EVO-X2, GMKtec EVO-X3, MINISFORUM MS-S1 MAX 64GB, and MINISFORUM MS-S1 MAX 128GB examples
  And each example includes vendor, memory or storage, source, price, and last-verified date
  And the generic Strix Halo class estimate is described as a range derived from those named SKUs

Scenario: Hardware pricing and power scope are explicit
  Given the comparison table and featured hardware cards
  When the visitor reads a hardware price or power value
  Then the row identifies whether the price is official MSRP, retailer street price, a derived estimate, or component-only
  And the provenance identifies seller, SKU, configuration, region, and verification date
  And power is labeled as whole-system or GPU-only with typical and peak semantics
  And a component-only price is not presented as a turnkey system cost without a build-cost model
  And the default calculator price basis is visible before a hardware preset is chosen
```
