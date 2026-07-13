/**
 * Runtime behavior checks for initCalculator.
 *
 * calculator.js takes its document/window by dependency injection and never
 * reaches for browser globals, so we can exercise it for real against a tiny
 * in-memory DOM/window stub — no jsdom, no browser, no new dependencies. The
 * stub implements just the surface calculator.js uses (getElementById,
 * querySelector[All] with the handful of selectors it issues, createElement,
 * attributes, events) so these are true behavioral assertions, not string
 * matching against source.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { computeResult, initCalculator } from "../assets/js/calculator.js";
import {
  subscriptions,
  hardware,
  getAffiliate,
  defaults,
  assumptions,
  pricingLastUpdated,
  siteLastUpdated,
  horizonMonths,
  spendPresets,
} from "../assets/js/data.js";

/* ----------------------------- DOM stub ----------------------------- */

class TextNode {
  constructor(text) {
    this.textContent = String(text);
    this.parentElement = null;
  }
}

class StubNode {
  constructor(tagName) {
    this.tagName = String(tagName).toUpperCase();
    this.childNodes = [];
    this.parentElement = null;
    this.attributes = new Map();
    this.listeners = new Map();
    this.textContent = "";
    this.id = "";
    this.className = "";
    this._innerHTML = "";
  }

  /** Element children only (text nodes excluded), like the real API. */
  get children() {
    return this.childNodes.filter((n) => n instanceof StubNode);
  }

  // The app only ever assigns innerHTML to clear a container; parsing arbitrary
  // HTML is out of scope, so we drop children and retain the raw string.
  set innerHTML(value) {
    for (const child of this.childNodes) child.parentElement = null;
    this.childNodes = [];
    this._innerHTML = String(value);
  }
  get innerHTML() {
    return this._innerHTML;
  }

  appendChild(node) {
    node.parentElement = this;
    this.childNodes.push(node);
    return node;
  }

  remove() {
    const parent = this.parentElement;
    if (!parent) return;
    parent.childNodes = parent.childNodes.filter((n) => n !== this);
    this.parentElement = null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }
  removeAttribute(name) {
    this.attributes.delete(name);
  }

  addEventListener(type, handler) {
    const list = this.listeners.get(type) || [];
    list.push(handler);
    this.listeners.set(type, list);
  }

  /** Test helper: fire listeners; awaits any async handlers. */
  dispatch(type) {
    const list = this.listeners.get(type) || [];
    return Promise.all(list.map((fn) => fn({ type, target: this })));
  }
}

class StubDocument extends StubNode {
  constructor() {
    super("#document");
  }
  createElement(tag) {
    return new StubNode(tag);
  }
  createTextNode(text) {
    return new TextNode(text);
  }
  getElementById(id) {
    return collectElements(this).find((el) => el.id === id) || null;
  }
  querySelector(selector) {
    return querySelectorAll(this, selector)[0] || null;
  }
  querySelectorAll(selector) {
    return querySelectorAll(this, selector);
  }
}

function collectElements(root) {
  const out = [];
  for (const child of root.children) {
    out.push(child, ...collectElements(child));
  }
  return out;
}

function parseCompound(selector) {
  const spec = { tag: null, id: null, classes: [], attrs: [], pseudos: [] };
  const tokens = selector.match(/([#.]?[\w-]+|\[[^\]]+\]|:[\w-]+)/g) || [];
  for (const tok of tokens) {
    if (tok.startsWith("#")) spec.id = tok.slice(1);
    else if (tok.startsWith(".")) spec.classes.push(tok.slice(1));
    else if (tok.startsWith(":")) spec.pseudos.push(tok.slice(1));
    else if (tok.startsWith("[")) {
      const m = /\[([\w-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]*)))?\]/.exec(tok);
      if (m) spec.attrs.push({ name: m[1], value: m[2] ?? m[3] ?? m[4] ?? null });
    } else spec.tag = tok.toLowerCase();
  }
  return spec;
}

function attrValue(el, name) {
  if (el.attributes && el.attributes.has(name)) return el.attributes.get(name);
  const prop = el[name];
  return prop === undefined ? null : String(prop);
}

function matchesCompound(el, spec) {
  if (spec.tag && el.tagName.toLowerCase() !== spec.tag) return false;
  if (spec.id && el.id !== spec.id) return false;
  for (const cls of spec.classes) {
    if (!String(el.className || "").split(/\s+/).includes(cls)) return false;
  }
  for (const { name, value } of spec.attrs) {
    const actual = attrValue(el, name);
    if (value === null ? actual === null : actual !== value) return false;
  }
  for (const pseudo of spec.pseudos) {
    if (pseudo === "checked") {
      if (el.checked !== true) return false;
    } else return false; // unsupported pseudo
  }
  return true;
}

function querySelectorAll(root, selector) {
  const compounds = selector.trim().split(/\s+/).map(parseCompound);
  let matched = collectElements(root).filter((el) =>
    matchesCompound(el, compounds[0])
  );
  for (let i = 1; i < compounds.length; i++) {
    const next = [];
    for (const el of matched) {
      for (const desc of collectElements(el)) {
        if (matchesCompound(desc, compounds[i])) next.push(desc);
      }
    }
    matched = next;
  }
  return matched;
}

/* --------------------------- fixtures --------------------------- */

/** The DOM hooks calculator.js reads/writes; a missing one breaks the UI. */
const REQUIRED_IDS = [
  "calculator-form",
  "subscription-options",
  "spend-preset",
  "custom-spend",
  "spend-basis",
  "results-status",
  "comparison-body",
  "pricing-list",
  "pricing-last-updated",
  "site-last-updated",
  "assumptions-list",
  "share-button",
  "featured-hardware",
  "featured-hardware-cards",
  "featured-hardware-status",
  "cost-table",
];

const NUMERIC_INPUT_IDS = [
  "box-price",
  "down-payment",
  "apr",
  "term",
  "electricity-rate",
  "power-draw",
  "hours-per-day",
  "custom-spend",
];

function buildDocument() {
  const doc = new StubDocument();
  const body = doc.appendChild(doc.createElement("body"));

  const form = doc.createElement("form");
  form.id = "calculator-form";
  body.appendChild(form);

  // Numeric inputs live inside a wrapper so validateForm has a parentElement to
  // append field-error nodes to, mirroring index.html's field markup.
  for (const id of NUMERIC_INPUT_IDS) {
    const wrap = doc.createElement("div");
    const input = doc.createElement("input");
    input.id = id;
    input.type = "number";
    input.value = "";
    wrap.appendChild(input);
    form.appendChild(wrap);
  }
  const preset = doc.createElement("select");
  preset.id = "spend-preset";
  form.appendChild(preset);
  for (const id of ["opt-maintenance", "opt-resale", "opt-taxes"]) {
    const input = doc.createElement("input");
    input.id = id;
    input.type = "checkbox";
    input.checked = false;
    form.appendChild(input);
  }
  const subOptions = doc.createElement("div");
  subOptions.id = "subscription-options";
  form.appendChild(subOptions);

  const status = doc.createElement("p");
  status.id = "results-status";
  body.appendChild(status);
  const basis = doc.createElement("p");
  basis.id = "spend-basis";
  body.appendChild(basis);
  for (const metric of ["breakeven", "payment", "savings"]) {
    const el = doc.createElement("span");
    el.setAttribute("data-metric", metric);
    body.appendChild(el);
  }

  // Chart data table (accessible equivalent of the cost-over-time chart): the
  // series renders into its tbody, so mirror index.html's table > tbody nesting.
  const costTable = doc.createElement("table");
  costTable.id = "cost-table";
  const costBody = doc.createElement("tbody");
  costTable.appendChild(costBody);
  body.appendChild(costTable);

  const comparison = doc.createElement("tbody");
  comparison.id = "comparison-body";
  body.appendChild(comparison);

  const pricingList = doc.createElement("ul");
  pricingList.id = "pricing-list";
  body.appendChild(pricingList);
  for (const id of ["pricing-last-updated", "site-last-updated"]) {
    const time = doc.createElement("time");
    time.id = id;
    body.appendChild(time);
  }

  const assumptionsList = doc.createElement("ul");
  assumptionsList.id = "assumptions-list";
  body.appendChild(assumptionsList);

  const shareButton = doc.createElement("button");
  shareButton.id = "share-button";
  body.appendChild(shareButton);
  const shareStatus = doc.createElement("p");
  shareStatus.id = "share-status";
  body.appendChild(shareStatus);

  const featured = doc.createElement("section");
  featured.id = "featured-hardware";
  body.appendChild(featured);
  const featuredStatus = doc.createElement("p");
  featuredStatus.id = "featured-hardware-status";
  featured.appendChild(featuredStatus);
  const featuredCards = doc.createElement("div");
  featuredCards.id = "featured-hardware-cards";
  featured.appendChild(featuredCards);

  const chart = doc.createElement("div");
  chart.id = "cost-chart";
  const hint = doc.createElement("span");
  hint.className = "chart-hint";
  chart.appendChild(hint);
  body.appendChild(chart);

  return doc;
}

function buildWindow(search = "", options = {}) {
  const clipboardWrites = [];
  const historyUrls = [];
  const plausibleCalls = [];
  return {
    location: {
      search,
      hash: options.hash || "",
      origin: "https://payback.example",
      pathname: "/index.html",
    },
    setTimeout: (fn) => {
      fn();
      return 0;
    },
    navigator: {
      doNotTrack: options.dnt,
      clipboard: {
        writeText: async (text) => {
          clipboardWrites.push(text);
        },
      },
    },
    history: {
      replaceState: (_state, _title, url) => {
        historyUrls.push(url);
      },
    },
    plausible: (...args) => {
      plausibleCalls.push(args);
    },
    _clipboardWrites: clipboardWrites,
    _historyUrls: historyUrls,
    _plausibleCalls: plausibleCalls,
  };
}

function boot(search = "", options = {}) {
  const doc = buildDocument();
  const win = buildWindow(search, options);
  initCalculator(doc, win);
  return { doc, win };
}

/* ----------------------------- tests ----------------------------- */

test("computeResult calculates payback metrics deterministically", () => {
  const input = {
    subscriptions: ["codex", "claude-code"],
    boxPrice: 5000,
    downPayment: 0,
    apr: 12,
    term: 12,
    electricityRate: 0,
    powerDraw: 0,
    hoursPerDay: 0,
    maintenance: false,
    resale: false,
    taxes: false,
  };
  const result = computeResult(input);

  const principal = 5000;
  const monthlyRate = 0.12 / 12;
  const expectedPayment =
    (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -12));

  assert.equal(result.breakEvenMonth, null);
  assert.equal(result.series.length, horizonMonths);
  assert.ok(Math.abs(result.monthlyPayment - expectedPayment) < 0.01);
  assert.ok(Math.abs(result.monthlyNetSavings - (40 - expectedPayment)) < 0.01);
  assert.equal(result.series[0].subscriptionCost, 40);
  assert.ok(result.series[0].ownershipCost > 0);

  const customSpend = computeResult({ ...input, customSpend: 75 });
  assert.equal(customSpend.series[0].subscriptionCost, 75);
  assert.ok(
    Math.abs(customSpend.monthlyNetSavings - (75 - expectedPayment)) < 0.01
  );
});

test("computeResult finds break-even and supports optional assumptions", () => {
  const base = {
    subscriptions: ["codex", "claude-code"],
    boxPrice: 100,
    downPayment: 0,
    apr: 0,
    term: 10,
    electricityRate: 0,
    powerDraw: 0,
    hoursPerDay: 0,
    maintenance: false,
    resale: false,
    taxes: false,
  };

  const noExtras = computeResult(base);
  assert.equal(noExtras.breakEvenMonth, 1);
  assert.equal(noExtras.series[0].ownershipCost, 10);
  assert.equal(noExtras.series[0].subscriptionCost, 40);

  const withExtras = computeResult({
    ...base,
    maintenance: true,
    resale: true,
    taxes: true,
  });
  assert.ok(withExtras.series[0].ownershipCost > noExtras.series[0].ownershipCost);
  assert.ok(
    withExtras.series[horizonMonths - 1].ownershipCost < noExtras.series[horizonMonths - 1].ownershipCost
  );
});

test("initCalculator wires up every DOM hook the UI depends on", () => {
  const { doc } = boot();
  for (const id of REQUIRED_IDS) {
    assert.ok(doc.getElementById(id), `missing #${id}`);
  }
  for (const metric of ["breakeven", "payment", "savings"]) {
    assert.ok(
      doc.querySelector(`[data-metric="${metric}"]`),
      `missing [data-metric="${metric}"]`
    );
  }
});

test("initCalculator boots the form from static data and defaults", () => {
  const { doc } = boot();

  // Subscription checkboxes rendered one-per-subscription, defaults preselected.
  const options = doc.querySelectorAll(
    '#subscription-options input[type="checkbox"]'
  );
  assert.equal(options.length, subscriptions.length);
  const checkedValues = doc
    .querySelectorAll('#subscription-options input[type="checkbox"]:checked')
    .map((el) => el.value);
  assert.deepEqual(
    checkedValues,
    subscriptions.filter((s) => s.defaultSelected).map((s) => s.id)
  );
  assert.equal(doc.getElementById("custom-spend").value, "");
  assert.equal(doc.getElementById("spend-preset").value, "");
  assert.equal(
    doc.getElementById("spend-basis").textContent,
    "Comparing against $40/mo from the selected subscriptions."
  );

  // Default numeric inputs hydrated from data.js defaults.
  assert.equal(doc.getElementById("box-price").value, defaults.boxPrice);
  assert.equal(doc.getElementById("apr").value, defaults.apr);

  // Static content sections rendered: one row/item per subscription plus one
  // per featured hardware box (no hardcoded single-box assumption).
  assert.equal(
    doc.getElementById("comparison-body").children.length,
    subscriptions.length + hardware.length
  );
  assert.equal(
    doc.getElementById("pricing-list").children.length,
    subscriptions.length + hardware.length
  );
  assert.equal(
    doc.querySelectorAll("#pricing-list .source-label").length,
    subscriptions.length + hardware.length,
    "pricing list exposes source labels"
  );
  assert.equal(
    doc.querySelectorAll("#pricing-list time.source-updated").length,
    subscriptions.length + hardware.length,
    "pricing list exposes freshness dates"
  );
  assert.equal(
    doc.querySelectorAll("#comparison-body .source-label").length,
    subscriptions.length + hardware.length,
    "comparison table exposes source labels"
  );
  assert.equal(
    doc.querySelectorAll("#featured-hardware-cards .hardware-card").length,
    hardware.length,
    "renders one featured hardware card per box"
  );
  assert.equal(
    doc.querySelectorAll("#featured-hardware-cards .hardware-card-use").length,
    hardware.length,
    "renders one preload button per featured hardware card"
  );
  assert.equal(
    doc.getElementById("assumptions-list").children.length,
    assumptions.length
  );
  assert.equal(
    doc.querySelectorAll("#cost-table tbody tr").length,
    horizonMonths,
    "renders one cumulative-cost row per month"
  );

  // Last-updated timestamps stamped with both text and machine-readable attr.
  const pricingTime = doc.getElementById("pricing-last-updated");
  assert.equal(pricingTime.textContent, pricingLastUpdated);
  assert.equal(pricingTime.getAttribute("datetime"), pricingLastUpdated);
  assert.equal(
    doc.getElementById("site-last-updated").getAttribute("datetime"),
    siteLastUpdated
  );
  assert.match(
    doc.getElementById("results-status").textContent,
    /^Break-even (not reached within \d+ months\.|reached in Month \d+\.)$/
  );
});

test("preset spend selector fills the custom spend input", async () => {
  const { doc } = boot();
  const select = doc.getElementById("spend-preset");
  const input = doc.getElementById("custom-spend");

  assert.equal(select.children.length, spendPresets.length + 1);
  select.value = String(spendPresets.at(-1).value);
  await select.dispatch("change");

  assert.equal(input.value, String(spendPresets.at(-1).value));
  assert.equal(select.value, String(spendPresets.at(-1).value));
  assert.equal(
    doc.getElementById("spend-basis").textContent,
    "Comparing against your custom $200/mo subscription spend."
  );
});

test("featured hardware renders affiliate CTAs from the separate affiliate metadata", () => {
  const { doc } = boot();
  const links = doc.querySelectorAll("#comparison-body a");
  const hrefs = links.map((a) => a.getAttribute("href"));

  for (const box of hardware) {
    // The price source link is always present and points at the pricing source.
    assert.ok(hrefs.includes(box.sourceUrl), `missing source link for ${box.id}`);

    // The affiliate CTA is looked up from the affiliates map, not the pricing
    // entry, and is marked as an affiliate/sponsored link.
    const affiliate = getAffiliate(box.id);
    assert.ok(affiliate, `expected affiliate metadata for ${box.id}`);
    const cta = links.find((a) => a.getAttribute("href") === affiliate.url);
    assert.ok(cta, `missing affiliate CTA for ${box.id}`);
    assert.match(cta.textContent, /\(affiliate\)/);
    assert.match(cta.getAttribute("rel"), /sponsored/);
  }
});

test("featured hardware preload button loads the calculator scenario", async () => {
  const { doc, win } = boot();
  const loadButton = doc.querySelectorAll("#featured-hardware-cards .hardware-card-use")[0];
  assert.ok(loadButton, "expected a featured hardware preload button");

  await loadButton.dispatch("click");

  const macStudio = hardware[0];
  assert.equal(
    doc.getElementById("box-price").value,
    String(macStudio.defaultBoxPrice ?? macStudio.priceLow)
  );
  assert.equal(doc.getElementById("power-draw").value, String(macStudio.powerDraw));
  assert.match(
    doc.getElementById("featured-hardware-status").textContent,
    /loaded into the calculator/,
    "clicking the preload button announces the selected system"
  );
  assert.ok(
    win._plausibleCalls.some(([name]) => name === "Calculator: Interact"),
    "preloading a hardware card counts as calculator interaction"
  );
  assert.match(
    doc.getElementById("results-status").textContent,
    /Break-even/,
    "the calculator recomputes after loading a hardware preset"
  );
});

test("preloading a hardware card marks it active and clears the others", async () => {
  const { doc } = boot();
  const cards = doc.querySelectorAll("#featured-hardware-cards .hardware-card");
  const buttons = doc.querySelectorAll("#featured-hardware-cards .hardware-card-use");

  await buttons[1].dispatch("click");
  assert.equal(cards[1].getAttribute("data-active"), "true", "clicked card is active");
  assert.equal(cards[0].getAttribute("data-active"), null, "other cards stay inactive");
  assert.equal(cards[2].getAttribute("data-active"), null, "other cards stay inactive");

  await buttons[0].dispatch("click");
  assert.equal(cards[0].getAttribute("data-active"), "true", "newly clicked card is active");
  assert.equal(cards[1].getAttribute("data-active"), null, "prior active card is cleared");
});

test("a hardware preset from the URL renders with its card already active", () => {
  const box = hardware[2];
  const { doc } = boot(
    `?boxPrice=${box.defaultBoxPrice ?? box.priceLow}&powerDraw=${box.powerDraw}`
  );
  const cards = doc.querySelectorAll("#featured-hardware-cards .hardware-card");

  assert.equal(cards[2].getAttribute("data-active"), "true", "matching card is active");
  assert.equal(cards[0].getAttribute("data-active"), null);
  assert.equal(cards[1].getAttribute("data-active"), null);
});

test("default boot leaves every hardware card inactive", () => {
  const { doc } = boot();
  const active = doc.querySelectorAll(
    '#featured-hardware-cards .hardware-card[data-active="true"]'
  );
  assert.equal(active.length, 0, "no card is active until a system is loaded");
});

test("resetting the form clears the active hardware card", async () => {
  const { doc } = boot();
  const cards = doc.querySelectorAll("#featured-hardware-cards .hardware-card");
  await doc.querySelectorAll("#featured-hardware-cards .hardware-card-use")[0].dispatch("click");
  assert.equal(cards[0].getAttribute("data-active"), "true");

  await doc.getElementById("calculator-form").dispatch("reset");
  const active = doc.querySelectorAll(
    '#featured-hardware-cards .hardware-card[data-active="true"]'
  );
  assert.equal(active.length, 0, "reset clears the active highlight");
});

test("initCalculator renders the real results state for valid inputs", () => {
  const { doc } = boot();
  assert.equal(
    doc.getElementById("results-status").textContent,
    "Break-even not reached within 60 months."
  );
  assert.match(doc.querySelector('[data-metric="breakeven"]').textContent, /^(Not reached|Month \d+)$/);
  assert.match(doc.querySelector('[data-metric="payment"]').textContent, /^\$\d/);
  assert.match(doc.querySelector('[data-metric="savings"]').textContent, /^-?\$\d/);
});

test("initCalculator hydrates state from the location query string", () => {
  const { doc } = boot("?boxPrice=4200&subs=codex");

  assert.equal(doc.getElementById("box-price").value, 4200);
  const checked = doc
    .querySelectorAll('#subscription-options input[type="checkbox"]:checked')
    .map((el) => el.value);
  assert.deepEqual(checked, ["codex"]);
});

test("initCalculator hydrates state from a hash-based share link", () => {
  const { doc } = boot("", { hash: "#boxPrice=4200&subs=codex" });

  assert.equal(doc.getElementById("box-price").value, 4200);
  const checked = doc
    .querySelectorAll('#subscription-options input[type="checkbox"]:checked')
    .map((el) => el.value);
  assert.deepEqual(checked, ["codex"]);
});

test("a live edit re-validates and updates the results status", async () => {
  const { doc } = boot();
  const apr = doc.getElementById("apr");
  const chartHint = doc.querySelector("#cost-chart .chart-hint");

  // The valid default state leaves a "no break-even" summary in the chart hint.
  assert.equal(chartHint.textContent, "No break-even within 60 months.");

  // Invalid: clear a required numeric field, then fire the input listener.
  apr.value = "";
  await doc.getElementById("calculator-form").dispatch("input");

  assert.equal(
    doc.getElementById("results-status").textContent,
    "Some inputs need attention — fix the highlighted fields to see results."
  );
  assert.equal(apr.getAttribute("aria-invalid"), "true");
  assert.ok(doc.getElementById("apr-error"), "renders an inline field error");
  assert.equal(doc.querySelector('[data-metric="breakeven"]').textContent, "—");
  // The stale "no break-even" summary must not survive an invalid input.
  assert.ok(
    !/break-even/i.test(chartHint.textContent),
    "clears stale break-even summary from the chart hint on invalid input"
  );
  assert.equal(
    chartHint.textContent,
    "Fix the highlighted fields to see the chart."
  );

  // Fixing the value clears the error and restores the valid status.
  apr.value = "5";
  await doc.getElementById("calculator-form").dispatch("input");

  assert.equal(apr.getAttribute("aria-invalid"), "false");
  assert.equal(doc.getElementById("apr-error"), null, "removes the field error");
  assert.equal(
    doc.getElementById("results-status").textContent,
    "Break-even not reached within 60 months."
  );
  // Recovery restores the break-even summary in the chart hint.
  assert.equal(chartHint.textContent, "No break-even within 60 months.");
});

test("custom spend validates like the other numeric inputs", async () => {
  const { doc } = boot();
  const customSpend = doc.getElementById("custom-spend");

  customSpend.value = "-1";
  await doc.getElementById("calculator-form").dispatch("input");

  assert.equal(
    doc.getElementById("results-status").textContent,
    "Some inputs need attention — fix the highlighted fields to see results."
  );
  assert.equal(customSpend.getAttribute("aria-invalid"), "true");
  assert.ok(doc.getElementById("custom-spend-error"), "renders an inline field error");

  customSpend.value = "";
  await doc.getElementById("calculator-form").dispatch("input");

  assert.equal(customSpend.getAttribute("aria-invalid"), "false");
  assert.equal(doc.getElementById("custom-spend-error"), null);
  assert.equal(
    doc.getElementById("spend-basis").textContent,
    "Comparing against $40/mo from the selected subscriptions."
  );
});

test("analytics wiring records pageviews, calculator interaction, share, and outbound clicks", async () => {
  const { doc, win } = boot();

  assert.deepEqual(win._plausibleCalls[0], ["pageview"]);

  const apr = doc.getElementById("apr");
  apr.value = "6.5";
  await doc.getElementById("calculator-form").dispatch("change");
  assert.ok(
    win._plausibleCalls.some(([name]) => name === "Calculator: Interact"),
    "records a calculator interaction"
  );

  const statusBeforeShare = doc.getElementById("results-status").textContent;
  await doc.getElementById("share-button").dispatch("click");
  assert.ok(
    win._plausibleCalls.some(([name]) => name === "Scenario: Share"),
    "records a scenario share"
  );
  assert.equal(
    doc.getElementById("results-status").textContent,
    statusBeforeShare,
    "sharing does not change the calculator state"
  );

  const featuredOutbound = doc
    .querySelectorAll("#featured-hardware-cards a")
    .find((a) => /\bsponsored\b/.test(a.getAttribute("rel") || ""));
  assert.ok(featuredOutbound, "expected a featured hardware affiliate link to click");
  const featuredStatusBeforeClick = doc.getElementById("results-status").textContent;
  await featuredOutbound.dispatch("click");
  assert.ok(
    win._plausibleCalls.some(([name, opts]) =>
      name === "Outbound Link: Click" && opts?.props?.affiliate === true
    ),
    "records affiliate outbound clicks"
  );
  assert.equal(
    doc.getElementById("results-status").textContent,
    featuredStatusBeforeClick,
    "clicking featured hardware outbound links does not change calculator state"
  );

  const outbound = doc
    .querySelectorAll("#comparison-body a")
    .find((a) => /\bsponsored\b/.test(a.getAttribute("rel") || ""));
  assert.ok(outbound, "expected an affiliate link to click");
  const statusBeforeClick = doc.getElementById("results-status").textContent;
  await outbound.dispatch("click");
  assert.ok(
    win._plausibleCalls.some(([name, opts]) =>
      name === "Outbound Link: Click" && opts?.props?.affiliate === true
    ),
    "records affiliate outbound clicks"
  );
  assert.equal(
    doc.getElementById("results-status").textContent,
    statusBeforeClick,
    "clicking outbound links does not change calculator state"
  );
});

test("analytics wiring respects Do Not Track", async () => {
  const { doc, win } = boot("", { dnt: "1" });

  assert.equal(win._plausibleCalls.length, 0, "pageview is suppressed");
  await doc.getElementById("calculator-form").dispatch("change");
  await doc.getElementById("share-button").dispatch("click");
  const featuredOutbound = doc
    .querySelectorAll("#featured-hardware-cards a")
    .find((a) => /\bsponsored\b/.test(a.getAttribute("rel") || ""));
  assert.ok(featuredOutbound, "expected a featured hardware affiliate link to click");
  await featuredOutbound.dispatch("click");
  const outbound = doc
    .querySelectorAll("#comparison-body a")
    .find((a) => /\bsponsored\b/.test(a.getAttribute("rel") || ""));
  assert.ok(outbound, "expected an affiliate link to click");
  await outbound.dispatch("click");
  assert.equal(win._plausibleCalls.length, 0, "all analytics are suppressed");
});

test("the share button serializes current state into a shareable URL", async () => {
  const { doc, win } = boot();

  await doc.getElementById("share-button").dispatch("click");

  assert.equal(win._clipboardWrites.length, 1, "copies exactly one URL");
  const url = new URL(win._clipboardWrites[0]);
  assert.equal(url.origin + url.pathname, "https://payback.example/index.html");
  assert.equal(url.search, "", "share URLs no longer rely on query parameters");
  assert.equal(url.hash.startsWith("#"), true);
  const params = new URLSearchParams(url.hash.slice(1));
  assert.equal(params.get("boxPrice"), String(defaults.boxPrice));
  assert.equal(params.get("term"), String(defaults.term));
  assert.equal(
    params.get("subs"),
    subscriptions
      .filter((s) => s.defaultSelected)
      .map((s) => s.id)
      .join(",")
  );

  // The address bar is updated to the same URL, and the user is told it copied.
  assert.equal(win._historyUrls.at(-1), win._clipboardWrites[0]);
  assert.equal(
    doc.getElementById("share-status").textContent,
    "Link copied to clipboard."
  );
});

test("editing inputs keeps the shareable URL in sync", async () => {
  const { doc, win } = boot();
  const boxPrice = doc.getElementById("box-price");
  boxPrice.value = "4200";
  const customSpend = doc.getElementById("custom-spend");
  customSpend.value = "80";

  await doc.getElementById("calculator-form").dispatch("input");

  const latest = new URL(win._historyUrls.at(-1));
  const params = new URLSearchParams(latest.hash.slice(1));
  assert.equal(params.get("boxPrice"), "4200");
  assert.equal(params.get("customSpend"), "80");
});

test("resetting the form restores inputs, subscriptions, results, and hash to defaults", async () => {
  const { doc, win } = boot();

  // The hash the calculator boots with is the default scenario we must return to.
  const defaultHash = new URL(win._historyUrls.at(-1)).hash;
  const defaultStatus = doc.getElementById("results-status").textContent;

  const subscriptionSelection = () =>
    doc
      .querySelectorAll('#subscription-options input[type="checkbox"]:checked')
      .map((el) => el.value);
  const defaultSubs = subscriptions.filter((s) => s.defaultSelected).map((s) => s.id);
  assert.deepEqual(subscriptionSelection(), defaultSubs);

  // Edit a spread of controls: numeric inputs, the custom spend selector, an
  // optional toggle, and the subscription selection.
  doc.getElementById("box-price").value = "9999";
  doc.getElementById("apr").value = "3.3";
  doc.getElementById("term").value = "48";
  doc.getElementById("custom-spend").value = "120";
  doc.getElementById("spend-preset").value = "120";
  doc.getElementById("opt-maintenance").checked = true;
  const claudeCode = doc
    .querySelectorAll('#subscription-options input[type="checkbox"]')
    .find((el) => el.value === "claude-code");
  assert.ok(claudeCode, "expected the Claude Code subscription checkbox");
  claudeCode.checked = false;

  // Push the edits through so the pre-reset hash and results diverge from default.
  await doc.getElementById("calculator-form").dispatch("input");
  assert.notEqual(new URL(win._historyUrls.at(-1)).hash, defaultHash);
  assert.notDeepEqual(subscriptionSelection(), defaultSubs);

  // Reset, awaiting in case the handler defers its restore.
  await doc.getElementById("calculator-form").dispatch("reset");

  // Every visible input is back to its default value.
  assert.equal(doc.getElementById("box-price").value, defaults.boxPrice);
  assert.equal(doc.getElementById("apr").value, defaults.apr);
  assert.equal(doc.getElementById("term").value, defaults.term);
  assert.equal(doc.getElementById("opt-maintenance").checked, defaults.maintenance);
  assert.equal(doc.getElementById("custom-spend").value, "");
  assert.equal(doc.getElementById("spend-preset").value, "");

  // The default subscriptions are re-selected.
  assert.deepEqual(subscriptionSelection(), defaultSubs);

  // Results are recomputed from the defaults.
  assert.equal(doc.getElementById("results-status").textContent, defaultStatus);
  assert.equal(
    doc.getElementById("spend-basis").textContent,
    "Comparing against $40/mo from the selected subscriptions."
  );

  // The shareable hash is back to the default scenario.
  assert.equal(new URL(win._historyUrls.at(-1)).hash, defaultHash);
});
