# AI Subscription Payback — hardware watchlist

Hardware that is market-relevant for the local-inference comparison but is **not**
yet a calculator preset. An entry stays here until a public price or retailer
listing exists; only then can it graduate to the `hardware` data with a sourced
price (see `assets/js/data.js`). Nothing on this watchlist may seed the
calculator, and no price may be fabricated to move an entry off the list.

Each entry records why it is watched, the official specs worth citing, the
source, and the exact blocker (usually "no public price verified yet").

## NVIDIA DGX Station

- **Status:** Future hardware candidate — no public price has been verified yet as of 2026-08-16. Do not add a calculator preset or a `referenceOnly` priced
  row until an actual purchase price is sourced.
- **Why watch it:** NVIDIA positions the DGX Station as a deskside AI
  supercomputer above the DGX Spark, which is relevant for visitors comparing
  subscriptions against serious local agent infrastructure.
- **Official specs:** GB300 Grace Blackwell Ultra Desktop Superchip, 748 GB of
  coherent memory, up to 20 petaFLOPS of AI compute, and support for models up to
  1T parameters.
- **Source:** <https://www.nvidia.com/en-us/products/workstations/dgx-station/>
  (specs and order/partner positioning only; no public price at last check).
- **Graduation blocker:** A verifiable purchase price from NVIDIA Marketplace, an
  OEM, or a retailer listing. When one exists, add a sourced `hardware` entry
  (or a `referenceOnly` row) with `sourceUrl`, `verification`, and `lastUpdated`
  set, and remove the entry from this watchlist.

## Maintaining this list

- Keep this note in sync with its behavior spec,
  [docs/bdd/hardware-watchlist.md](bdd/hardware-watchlist.md); `test/hardware-watchlist.test.js`
  fails if they drift or if a watchlist product leaks into the priced calculator
  data.
- DGX Spark-class retailer-priced trims now live in `assets/js/data.js`; this
  watchlist is reserved for still-unpriced future candidates like DGX Station.
- Never invent a price to move an entry off the watchlist. A candidate graduates
  only when a real, sourced price is added to `assets/js/data.js`.
