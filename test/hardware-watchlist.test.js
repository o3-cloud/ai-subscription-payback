/**
 * Hardware watchlist checks.
 *
 * Tracks future-but-unpriced local AI systems in maintainer-facing docs without
 * letting them leak into the priced calculator data.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const read = (rel) => readFileSync(fileURLToPath(new URL(rel, root)), "utf8");

const prd = read("PRD.md");
const watchlist = read("docs/hardware-watchlist.md");
const watchlistBdd = read("docs/bdd/hardware-watchlist.md");

// Specs the BDD scenario promises the note records verbatim, so the note and
// the spec can't silently drop them and drift apart. `1T[- ]param` matches both
// the note's "1T parameters" and the BDD's "1T-parameter models".
const dgxStationSpecs = [
  /GB300 Grace Blackwell Ultra Desktop Superchip/i,
  /748 GB/i,
  /20 petaFLOPS/i,
  /1T[- ]param/i,
];

// The official DGX Station source page the BDD promises the note links.
const dgxStationSource =
  /https?:\/\/www\.nvidia\.com\/en-us\/products\/workstations\/dgx-station\//i;

const dgxSparkGraduatedIds = [
  "hp-zgx-nano-g1n-2tb",
  "hp-zgx-nano-g1n-4tb",
  "acer-veriton-vgn100-ud11",
  "gigabyte-ai-top-atom",
  "msi-edgexpert",
];

test("the PRD now limits the hardware watchlist to DGX Station", () => {
  assert.match(prd, /## Hardware Watchlist/i, "PRD has a hardware watchlist section");
  assert.match(prd, /NVIDIA DGX Station/i, "PRD names DGX Station");
  assert.match(prd, /future local AI system candidate/i, "PRD frames DGX Station as future hardware");
  assert.match(prd, /do not add a calculator preset/i, "PRD forbids a preset without a sourced price");
  assert.match(prd, /priced `referenceOnly` row/i, "PRD forbids a priced referenceOnly row before pricing exists");
  assert.doesNotMatch(prd, /HP ZGX Nano AI Station/i, "PRD no longer treats HP ZGX Nano as a watchlist item");
});

test("the hardware watchlist note and BDD both describe the same no-price blocker", () => {
  assert.match(watchlist, /NVIDIA DGX Station/i, "watchlist names DGX Station");
  assert.match(watchlist, /no public price has been verified yet/i, "watchlist states the pricing blocker");
  assert.match(watchlist, /do not add a calculator preset/i, "watchlist forbids a preset without pricing");
  assert.match(watchlist, /referenceOnly/i, "watchlist notes the future referenceOnly path");

  assert.match(watchlistBdd, /future, unpriced candidate/i, "BDD names the watchlisted state");
  assert.match(watchlistBdd, /no public price has been verified yet/i, "BDD states the pricing blocker");
  assert.match(watchlistBdd, /no fabricated price/i, "BDD forbids fabricating pricing");
  assert.match(watchlistBdd, /same watched product/i, "BDD expects the same product in note and spec");
});

test("the watchlist note records the official DGX Station specs and source the BDD promises", () => {
  for (const spec of dgxStationSpecs) {
    assert.match(watchlist, spec, `watchlist note should record the official spec ${spec}`);
    assert.match(watchlistBdd, spec, `BDD should list the same official spec ${spec}`);
  }
  assert.match(watchlist, dgxStationSource, "watchlist note links the official DGX Station source page");
});

test("DGX Spark retailer-priced trims have graduated into the priced calculator data", async () => {
  const { hardware, featuredHardware } = await import(new URL("../assets/js/data.js", import.meta.url));

  for (const id of dgxSparkGraduatedIds) {
    assert.equal(
      hardware.some((box) => box.id === id),
      true,
      `${id} should now be a priced hardware row`
    );
    assert.equal(
      featuredHardware.some((box) => box.id === id),
      false,
      `${id} should stay as a DGX Spark trim, not a featured card`
    );
    assert.doesNotMatch(
      watchlist,
      new RegExp(id.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"), "i"),
      `${id} should no longer appear in the watchlist note`
    );
    assert.doesNotMatch(
      watchlistBdd,
      new RegExp(id.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"), "i"),
      `${id} should no longer appear in the watchlist BDD`
    );
  }
});
