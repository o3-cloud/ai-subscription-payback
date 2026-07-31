# Feature: Hardware Watchlist

```gherkin
Scenario: The watchlist tracks DGX Station as a future, unpriced candidate
  Given the hardware watchlist in docs/hardware-watchlist.md
  When a maintainer reviews the entries
  Then the NVIDIA DGX Station is listed as a future hardware candidate
  And its status states that no public price has been verified yet
  And it records the official specs (GB300 Grace Blackwell Ultra Desktop Superchip, 748 GB coherent memory, up to 20 petaFLOPS, up to 1T-parameter models)
  And it links the official NVIDIA DGX Station source page

Scenario: The watchlist tracks the HP ZGX Nano AI Station as a future, unpriced DGX Spark OEM candidate
  Given the hardware watchlist in docs/hardware-watchlist.md
  When a maintainer reviews the entries
  Then the HP ZGX Nano AI Station is listed as a future hardware candidate
  And its status states that no public price has been verified yet
  And its graduation blocker is that no public price is verified yet
  And it records the official HP ZGX Nano AI Station specs (NVIDIA GB10 Grace Blackwell Superchip, 128 GB coherent unified memory, up to 1 petaFLOP / 1,000 TOPS FP4 compute, local inference up to 200B parameters, and 4 TB NVMe storage)
  And it links the official HP ZGX Nano AI Station page and NVIDIA's DGX Spark platform page

Scenario: The watchlist keeps unstable DGX Spark-class marketplace context out of the calculator
  Given the hardware watchlist in docs/hardware-watchlist.md
  When a maintainer reviews the entries
  Then MSI EdgeXpert and GIGABYTE AI TOP Atom are listed as DGX Spark-class watch / research context only
  And their status says they were observed in marketplace comparison listings but not from a stable, in-stock retailer page
  And their observed context records the unstable marketplace comparison prices without treating them as MSRP
  And their graduation blocker is source stability and availability, not a missing price
  And the note says no calculator preset, featured card, or priced referenceOnly row should be added until a stable retailer listing is verified

Scenario: A watchlisted product never seeds the calculator without a sourced price
  Given a product on the hardware watchlist
  When the calculator hardware data in assets/js/data.js is built
  Then the watchlisted product does not appear as a hardware entry
  And no fabricated price is written for it in the watchlist or the data
  And the entry graduates only when a real, sourced price is added

Scenario: The watchlist note and this spec stay in sync
  Given docs/hardware-watchlist.md and this behavior spec
  When either document is edited
  Then both name the same watched product and its graduation blocker
  And test/hardware-watchlist.test.js fails if the note and spec drift
```

## Notes

- This behavior describes `docs/hardware-watchlist.md`, the maintainer-facing
  note tracking hardware that is market-relevant but not yet a calculator preset.
  A candidate stays on the watchlist until a public price or retailer listing
  exists; only a real, sourced price graduates it into `assets/js/data.js`.
- **NVIDIA DGX Station** is the first watched entry (see issue #59): a deskside
  GB300 Grace Blackwell Ultra system positioned above the DGX Spark. Its official
  page exposes specs and order/partner positioning, but no public price has been
  verified yet, so it must not become a calculator preset or a priced
  `referenceOnly` row until a sourced price exists.
- **HP ZGX Nano AI Station** is a watched entry (see issue #65): HP's OEM take on
  NVIDIA's DGX Spark (GB10 Grace Blackwell) deskside system. HP's official page
  and NVIDIA's DGX Spark platform page cover the shared specs, but no public
  price has been verified yet, so it stays on the watchlist — no calculator
  preset, featured card, or priced `referenceOnly` row until a sourced price
  exists.
- `test/hardware-watchlist.test.js` keeps this spec aligned with the note and
  guards the core invariant: a watchlisted product carries no fabricated price
  and never leaks into the priced calculator data.
