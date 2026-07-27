# Feature: Hardware Watchlist

```gherkin
Scenario: The watchlist tracks DGX Station as a future, unpriced candidate
  Given the hardware watchlist in docs/hardware-watchlist.md
  When a maintainer reviews the entries
  Then the NVIDIA DGX Station is listed as a future hardware candidate
  And its status states that no public price has been verified yet
  And it records the official specs (GB300 Grace Blackwell Ultra Desktop Superchip, 748 GB coherent memory, up to 20 petaFLOPS, up to 1T-parameter models)
  And it links the official NVIDIA DGX Station source page

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
- `test/hardware-watchlist.test.js` keeps this spec aligned with the note and
  guards the core invariant: a watchlisted product carries no fabricated price
  and never leaks into the priced calculator data.
