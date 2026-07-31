# AI Subscription Payback — hardware watchlist

Hardware that is market-relevant for the local-inference comparison but is **not**
yet a calculator preset. An entry stays here until a public price or retailer
listing exists; only then can it graduate to the `hardware` data with a sourced
price (see `assets/js/data.js`). Nothing on this watchlist may seed the
calculator, and no price may be fabricated to move an entry off the list.

Each entry records why it is watched, the official specs worth citing, the
source, and the exact blocker (usually "no public price verified yet").

## NVIDIA DGX Station

- **Status:** Future hardware candidate — no public price has been verified yet
  as of 2026-07-27. Do not add a calculator preset or a `referenceOnly` priced
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

## HP ZGX Nano AI Station

- **Status:** Future hardware candidate — no public price has been verified yet
  as of 2026-07-29. Do not add a calculator preset or a `referenceOnly` priced
  row until an actual purchase price is sourced.
- **Why watch it:** HP builds the ZGX Nano AI Station as its OEM take on NVIDIA's
  DGX Spark (GB10 Grace Blackwell) deskside system, so it is relevant for
  visitors weighing subscriptions against a name-brand DGX Spark-class local
  inference box.
- **Official specs:** NVIDIA GB10 Grace Blackwell Superchip, 128 GB of coherent
  unified LPDDR5x memory, up to 1 petaFLOP (1,000 TOPS) of FP4 AI compute, local
  inference on models up to 200B parameters, and up to 4 TB of NVMe storage.
- **Source:** <https://www.hp.com/us-en/workstations/zgx-nano-ai-station.html> (official HP
  ZGX Nano AI Station page) with NVIDIA's DGX Spark platform page
  <https://www.nvidia.com/en-us/products/workstations/dgx-spark/> for the shared
  GB10 specs (specs and positioning only; no public price at last check).
- **Graduation blocker:** No public price verified yet. A verifiable purchase
  price from HP, an authorized reseller, or a retailer listing is required. When
  one exists, add a sourced `hardware` entry (or a `referenceOnly` row) with
  `sourceUrl`, `verification`, and `lastUpdated` set, and remove the entry from
  this watchlist.

## MSI EdgeXpert and GIGABYTE AI TOP Atom (DGX Spark-class)

- **Status:** Watch / research context only — observed in marketplace comparison
  listings but not from a stable, in-stock retailer page as of 2026-07-31. Do not
  add a calculator preset, featured card, or priced `referenceOnly` row until an
  available, stable retailer listing is verified.
- **Why watch it:** Both are OEM DGX Spark-class (NVIDIA GB10 Grace Blackwell)
  systems that widen the street-price picture around the featured DGX Spark card,
  so they matter for visitors comparing subscriptions against a name-brand local
  inference box.
- **Observed context:** The MSI EdgeXpert AI Mini Desktop (DGX Spark Platform)
  showed a marketplace comparison price around $5,651.71 while the product itself
  was marked currently unavailable; GIGABYTE AI TOP Atom showed a marketplace
  comparison price around $4,999.99. These are unstable marketplace figures, not a
  fixed MSRP or a verified in-stock listing, so no price graduates to the data.
- **Source:** MSI EdgeXpert Amazon product / marketplace page
  <https://www.amazon.com/msi-EdgeXpert-Supercomputer-Blackwell-Architecture/dp/B0FWFLZQSC>
  with NVIDIA's DGX Spark platform page
  <https://www.nvidia.com/en-us/products/workstations/dgx-spark/> for the shared
  GB10 specs (marketplace / comparison context only; availability not stable at
  last check).
- **Graduation blocker:** Source stability / availability, not a missing price. A
  verifiable, in-stock listing from a stable retailer (not a currently-unavailable
  marketplace comparison) is required. When one exists, add a sourced `hardware`
  entry (or a `referenceOnly` row) with `sourceUrl`, `verification`, and
  `lastUpdated` set, and remove the entry from this watchlist.

## Maintaining this list

- Keep this note in sync with its behavior spec,
  [docs/bdd/hardware-watchlist.md](bdd/hardware-watchlist.md); `test/hardware-watchlist.test.js`
  fails if they drift or if a watchlist product leaks into the priced calculator
  data.
- Never invent a price to move an entry off the watchlist. A candidate graduates
  only when a real, sourced price is added to `assets/js/data.js`.
