# Feature: Hardware Watchlist

```gherkin
Scenario: The watchlist tracks DGX Station as a future, unpriced candidate
  Given the hardware watchlist in docs/hardware-watchlist.md
  When a maintainer reviews the entries
  Then the NVIDIA DGX Station is listed as a future hardware candidate
  And its status states that no public price has been verified yet
  And it records the official specs (GB300 Grace Blackwell Ultra Desktop Superchip, 748 GB coherent memory, up to 20 petaFLOPS, up to 1T-parameter models, 1,600 W total system power)
  And it records the supported OS (Ubuntu with NVIDIA AI Developer Tools)
  And it records the Windows positioning for enterprise desks and always-on frontier AI agents
  And it links the official NVIDIA DGX Station source page

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
- The watchlist currently tracks only the NVIDIA DGX Station as a future,
  unpriced local AI system candidate. DGX Spark-class retailer-priced trims are
  modeled directly in `assets/js/data.js` and do not belong on this watchlist.
- `test/hardware-watchlist.test.js` keeps this spec aligned with the note and
  guards the core invariant: a watchlisted product carries no fabricated price
  and never leaks into the priced calculator data.
