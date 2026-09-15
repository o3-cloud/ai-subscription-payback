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
  featuredHardware,
  hardwareTrims,
  defaultHardwareTrim,
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

  insertBefore(node, reference) {
    node.parentElement = this;
    const idx = reference ? this.childNodes.indexOf(reference) : -1;
    if (idx === -1) this.childNodes.push(node);
    else this.childNodes.splice(idx, 0, node);
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

  /** Test helper: fire listeners with the cancelable event surface used by forms. */
  dispatch(type) {
    const list = this.listeners.get(type) || [];
    const event = {
      type,
      target: this,
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
    };
    this.lastEvent = event;
    return Promise.all(list.map((fn) => fn(event)));
  }
}

class StubDocument extends StubNode {
  constructor() {
    super("#document");
  }
  createElement(tag) {
    return new StubNode(tag);
  }
  createElementNS(_ns, tag) {
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
  "subscription-filter",
  "subscription-category",
  "subscription-filter-status",
  "spend-preset",
  "custom-spend",
  "spend-basis",
  "payment-mode",
  "payment-timing",
  "bundle-caveat",
  "comparison-body",
  "pricing-list",
  "pricing-last-updated",
  "site-last-updated",
  "assumptions-list",
  "share-button",
  "featured-hardware",
  "featured-hardware-cards",
  "featured-hardware-status",
  "model-size",
  "model-quantization",
  "cost-chart",
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
  const paymentTiming = doc.createElement("select");
  paymentTiming.id = "payment-timing";
  form.appendChild(paymentTiming);
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

  const filterSearch = doc.createElement("input");
  filterSearch.id = "subscription-filter";
  filterSearch.type = "search";
  filterSearch.value = "";
  form.appendChild(filterSearch);

  const filterCategory = doc.createElement("select");
  filterCategory.id = "subscription-category";
  form.appendChild(filterCategory);

  const filterStatus = doc.createElement("p");
  filterStatus.id = "subscription-filter-status";
  form.appendChild(filterStatus);

  const status = doc.createElement("p");
  status.id = "results-status";
  body.appendChild(status);
  const basis = doc.createElement("p");
  basis.id = "spend-basis";
  body.appendChild(basis);
  const paymentMode = doc.createElement("p");
  paymentMode.id = "payment-mode";
  body.appendChild(paymentMode);
  const bundleCaveat = doc.createElement("p");
  bundleCaveat.id = "bundle-caveat";
  body.appendChild(bundleCaveat);
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

  const modelSize = doc.createElement("input");
  modelSize.id = "model-size";
  modelSize.value = "30";
  body.appendChild(modelSize);
  const modelQuantization = doc.createElement("select");
  modelQuantization.id = "model-quantization";
  modelQuantization.value = "int4";
  body.appendChild(modelQuantization);

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
  const shareCalls = [];
  const plausibleCalls = [];
  const win = {
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
      share:
        options.share === "supported" || options.share === "fails"
          ? async (payload) => {
              shareCalls.push(payload);
              if (options.share === "fails") throw new Error("share dismissed");
            }
          : undefined,
      // options.clipboard: "missing" drops the Clipboard API entirely (plain
      // HTTP / older webviews); "fails" exposes a writeText that rejects
      // (denied permission / unfocused page). Both must fall back to execCommand.
      clipboard:
        options.clipboard === "missing"
          ? undefined
          : {
              writeText: async (text) => {
                if (options.clipboard === "fails") {
                  throw new Error("clipboard write denied");
                }
                clipboardWrites.push(text);
              },
            },
    },
    history: {
      replaceState: (_state, _title, url) => {
        historyUrls.push(url);
        // Mirror real browsers: replaceState updates the visible URL, so keep
        // win.location in step for anything (like the share button) that reads
        // the current address-bar scenario back.
        const hashIdx = url.indexOf("#");
        win.location.hash = hashIdx === -1 ? "" : url.slice(hashIdx);
      },
    },
    plausible: (...args) => {
      plausibleCalls.push(args);
    },
    _clipboardWrites: clipboardWrites,
    _shareCalls: shareCalls,
    _historyUrls: historyUrls,
    _plausibleCalls: plausibleCalls,
  };
  return win;
}

function boot(search = "", options = {}) {
  const doc = buildDocument();
  const win = buildWindow(search, options);
  initCalculator(doc, win);
  return { doc, win };
}

async function importMainWithBrowserGlobals(doc, win, readyState = "complete") {
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  doc.readyState = readyState;
  globalThis.document = doc;
  globalThis.window = win;
  const specifier = new URL(
    `../assets/js/main.js?bootstrap=${Date.now()}-${Math.random()}`,
    import.meta.url
  );
  await import(specifier);
  return () => {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  };
}

/**
 * Wire a document.execCommand("copy") stub mirroring the browser: it copies the
 * current textarea selection, which the fallback stages just before calling it.
 * Records each copied value; set succeed=false to simulate execCommand failing.
 */
function installExecCommandCopy(doc, succeed = true) {
  const copies = [];
  doc.execCommand = (command) => {
    if (command !== "copy") return false;
    const textarea = doc.querySelector("textarea");
    if (!textarea || !succeed) return false;
    copies.push(textarea.value);
    return true;
  };
  return copies;
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

test("computeResult treats exact cumulative-cost equality as break-even", () => {
  const result = computeResult({
    subscriptions: [],
    customSpend: 10,
    boxPrice: 110,
    downPayment: 0,
    apr: 0,
    term: 10,
    electricityRate: 0,
    powerDraw: 0,
    hoursPerDay: 0,
    maintenance: false,
    resale: false,
    taxes: false,
  });

  assert.equal(result.series[10].ownershipCost, 110);
  assert.equal(result.series[10].subscriptionCost, 110);
  assert.equal(result.breakEvenMonth, 11);
});

test("computeResult models annual upfront payments and renewals separately from monthly equivalents", () => {
  const input = {
    subscriptions: ["claude-pro-annual"],
    boxPrice: 0,
    downPayment: 0,
    apr: 0,
    term: 12,
    electricityRate: 0,
    powerDraw: 0,
    hoursPerDay: 0,
    maintenance: false,
    resale: false,
    taxes: false,
  };
  const effective = computeResult({ ...input, paymentTiming: "effective-monthly" });
  const cash = computeResult({ ...input, paymentTiming: "actual-cash-flow" });

  assert.equal(effective.paymentTiming, "effective-monthly");
  assert.deepEqual(
    effective.series.slice(0, 2).map((point) => point.subscriptionPayment),
    [17, 17]
  );
  assert.equal(cash.paymentTiming, "actual-cash-flow");
  assert.equal(cash.annualRenewalMonth, 13);
  assert.deepEqual(
    cash.series.slice(0, 13).map((point) => point.subscriptionPayment),
    [200, ...Array(11).fill(0), 200]
  );

  const monthlyQodo = computeResult({ ...input, subscriptions: ["qodo-pro-team-2500"], paymentTiming: "actual-cash-flow" });
  assert.deepEqual(
    monthlyQodo.series.slice(0, 2).map((point) => point.subscriptionPayment),
    [30, 30],
    "monthly plans that mention no annual commitment remain monthly"
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

test("ROG NUC featured card uses its single trim and exposes both price and spec provenance", () => {
  const { doc } = boot();
  const card = Array.from(doc.querySelectorAll("#featured-hardware-cards .hardware-card")).find((entry) =>
    Array.from(entry.children).some((child) =>
      child.className === "hardware-card-title" && child.textContent.includes("RTX 5080 Laptop")
    )
  );
  assert.ok(card, "ROG NUC featured card is rendered");
  const trimSelect = Array.from(card.children).filter((child) => child.className === "field hardware-card-trim");
  assert.equal(trimSelect.length, 0);
  const actions = Array.from(card.children).find((child) => child.className === "hardware-card-actions");
  const useButton = Array.from(actions.children).find((child) => child.className.includes("hardware-card-use"));
  assert.equal(useButton ? 1 : 0, 1);
  const source = Array.from(card.children).find((child) => child.className === "hardware-card-source");
  const sourceLinks = Array.from(source.children).filter((child) => child.tagName === "A");
  assert.ok(sourceLinks.some((link) => link.getAttribute("href").includes("microcenter.com/product/713317")));
  assert.ok(sourceLinks.some((link) => link.getAttribute("href").includes("rog.asus.com/desktops/mini-pc/rog-nuc-16")));
  const cta = Array.from(actions.children).find((child) => child.className.includes("hardware-card-cta"));
  assert.equal(cta.getAttribute("href"), "https://rog.asus.com/desktops/mini-pc/rog-nuc-16/");
  assert.doesNotMatch(cta.getAttribute("rel") || "", /sponsored/);

  useButton.dispatch("click");
  assert.equal(doc.getElementById("box-price").value, "3799.99");
  assert.equal(doc.getElementById("power-draw").value, "330");
  assert.match(doc.getElementById("featured-hardware-status").textContent, /RTX 5080 Laptop workstations loaded/i);

  const rerenderedSource = Array.from(card.children).find((child) => child.className === "hardware-card-source");
  const rerenderedSourceLinks = Array.from(rerenderedSource.children).filter((child) => child.tagName === "A");
  assert.ok(rerenderedSourceLinks.some((link) => link.getAttribute("href").includes("microcenter.com/product/713317")));
  assert.ok(rerenderedSourceLinks.some((link) => link.getAttribute("href").includes("rog.asus.com/desktops/mini-pc/rog-nuc-16")));
  const rerenderedActions = Array.from(card.children).find((child) => child.className === "hardware-card-actions");
  const rerenderedCta = Array.from(rerenderedActions.children).find((child) => child.className.includes("hardware-card-cta"));
  assert.equal(rerenderedCta.getAttribute("href"), "https://rog.asus.com/desktops/mini-pc/rog-nuc-16/");
});

test("initCalculator boots the form from static data and defaults", () => {
  const { doc, win } = boot();

  // A clean page load preserves its landing URL: the initial render must not
  // rewrite the address bar, so boot() records no history.replaceState call.
  assert.equal(
    win._historyUrls.length,
    0,
    "a clean first load does not rewrite the address bar"
  );

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
  assert.equal(doc.getElementById("custom-spend").value, 200);
  assert.equal(doc.getElementById("spend-preset").value, "");
  assert.equal(doc.getElementById("payment-timing").value, "effective-monthly");
  assert.match(doc.getElementById("payment-mode").textContent, /effective monthly/i);
  assert.match(
    doc.getElementById("results-status").textContent,
    /^Break-even month: .+; monthly net savings: .+\.$/,
    "result status concisely announces the key metrics"
  );
  assert.equal(
    doc.getElementById("spend-basis").textContent,
    "Using custom budget: $200/mo (Power user preset); selected plans are reference-only."
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
    doc.querySelectorAll("#pricing-list .source-status").length,
    subscriptions.length + hardware.length,
    "pricing list exposes verification status badges"
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
    doc.querySelectorAll("#comparison-body .source-status").length,
    subscriptions.length + hardware.length,
    "comparison table exposes verification status badges"
  );
  assert.equal(
    doc.querySelectorAll("#featured-hardware-cards .hardware-card").length,
    featuredHardware.length,
    "renders one featured hardware card per box"
  );
  assert.equal(
    doc.querySelectorAll("#featured-hardware-cards .hardware-card-use").length,
    featuredHardware.length,
    "renders one preload button per featured hardware card"
  );
  assert.equal(
    doc.querySelectorAll("#featured-hardware-cards .hardware-card-image").length,
    featuredHardware.length,
    "renders one product image per featured hardware card"
  );
  assert.equal(
    doc.querySelectorAll("#featured-hardware-cards .hardware-card-trim-select").length,
    featuredHardware.filter((box) => hardwareTrims(box).length > 1).length,
    "renders a trim selector for each ranged featured card"
  );
  assert.equal(
    doc.querySelectorAll("#featured-hardware-cards .hardware-card-fit").length,
    featuredHardware.length,
    "renders one practical model-fit line per featured hardware card"
  );
  assert.equal(
    doc.querySelectorAll("#featured-hardware-cards .hardware-card-fit-official").length,
    1,
    "renders one official DGX Spark workload claim separate from the heuristic"
  );
  assert.equal(
    doc.getElementById("assumptions-list").children.length,
    assumptions.length
  );
  assert.ok(
    Array.from(doc.querySelectorAll("#assumptions-list li")).some((li) =>
      li.textContent.includes("LM Studio Bionic") && li.textContent.includes("custom monthly spend")
    ),
    "renders the hybrid local/cloud-spillover assumption"
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
    /^Break-even month: .+; monthly net savings: .+\.$/
  );
});

test("actual cash-flow mode hydrates through the share URL and renders annual commitments", () => {
  const { doc } = boot("?paymentTiming=actual-cash-flow&subs=claude-pro-annual&customSpend=");
  assert.equal(doc.getElementById("payment-timing").value, "actual-cash-flow");
  assert.match(doc.getElementById("payment-mode").textContent, /actual cash flow/i);
  assert.match(doc.getElementById("payment-mode").textContent, /\$200 upfront/i);
  assert.match(doc.getElementById("payment-mode").textContent, /month 13/i);
});


test("bundle overlap caveat stays hidden until a bundled plan overlaps with an existing subscription", () => {
  const { doc } = boot();
  const caveat = doc.getElementById("bundle-caveat");
  const form = doc.getElementById("calculator-form");
  const checkbox = (id) =>
    doc
      .querySelectorAll('#subscription-options input[type="checkbox"]')
      .find((el) => el.value === id);

  assert.ok(caveat.hidden, "no overlap warning should show on the default selection");
  assert.equal(caveat.textContent, "");

  for (const id of ["codex", "claude-code"]) {
    checkbox(id).checked = false;
  }
  checkbox("copilot-pro").checked = true;
  form.dispatch("input");

  assert.ok(caveat.hidden, "Copilot alone is not an overlap risk");

  for (const id of ["codex", "claude-code"]) {
    checkbox(id).checked = true;
  }
  form.dispatch("input");

  assert.equal(caveat.hidden, false, "the warning appears once the bundle overlaps");
  assert.match(
    doc.querySelectorAll("#bundle-caveat .bundle-caveat-intro")[0]?.textContent || "",
    /Bundle overlap warning:.*GitHub Copilot.*Codex.*Claude Code/i
  );
  assert.ok(
    doc
      .querySelectorAll("#bundle-caveat a")
      .map((el) => el.getAttribute("href"))
      .includes("https://github.com/features/copilot/plans"),
    "the warning cites GitHub Copilot plans"
  );
  assert.ok(
    doc
      .querySelectorAll("#bundle-caveat a")
      .map((el) => el.getAttribute("href"))
      .includes("https://chatgpt.com/pricing/"),
    "the warning cites ChatGPT pricing"
  );
  assert.ok(
    doc
      .querySelectorAll("#bundle-caveat a")
      .map((el) => el.getAttribute("href"))
      .includes("https://claude.com/pricing"),
    "the warning cites Claude pricing"
  );
});

test("subscription filters narrow visible rows without changing selections or spend", () => {
  const { doc } = boot();

  const rows = () => Array.from(doc.querySelectorAll("#subscription-options .checkbox"));
  const visibleRows = () => rows().filter((row) => !row.hidden);
  const selectedIds = () =>
    doc
      .querySelectorAll('#subscription-options input[type="checkbox"]:checked')
      .map((el) => el.value);
  const selectedBefore = selectedIds();
  const spendBefore = doc.getElementById("spend-basis").textContent;

  doc.getElementById("subscription-filter").value = "claude";
  doc.getElementById("calculator-form").dispatch("input");

  const searchVisible = rows().filter((row) =>
    (row.getAttribute("data-subscription-search") || "").includes("claude")
  );
  assert.ok(searchVisible.length < rows().length, "text filtering hides some rows");
  assert.ok(
    visibleRows().every((row) =>
      (row.getAttribute("data-subscription-search") || "").includes("claude")
    ),
    "every visible row matches the search text"
  );
  assert.equal(
    doc.getElementById("subscription-filter-status").textContent,
    `Showing ${searchVisible.length} of ${rows().length} plans for “claude”; ${selectedBefore.length} selected.`
  );
  assert.deepEqual(selectedIds(), selectedBefore, "filtering does not change selections");
  assert.equal(doc.getElementById("spend-basis").textContent, spendBefore, "filtering does not change the spend basis");

  doc.getElementById("subscription-filter").value = "";
  doc.getElementById("subscription-category").value = "App builder";
  doc.getElementById("calculator-form").dispatch("input");

  const categoryVisible = rows().filter(
    (row) => row.getAttribute("data-subscription-category") === "App builder"
  );
  assert.ok(categoryVisible.length < rows().length, "category filtering hides other rows");
  assert.ok(
    visibleRows().every(
      (row) => row.getAttribute("data-subscription-category") === "App builder"
    ),
    "every visible row matches the selected category"
  );
  assert.ok(
    categoryVisible.some((row) =>
      (row.getAttribute("data-subscription-search") || "").includes("manus") ||
      (row.getAttribute("data-subscription-search") || "").includes("v0")
    ),
    "Manus and v0 rows are included in the App builder category"
  );
  assert.equal(
    doc.getElementById("subscription-filter-status").textContent,
    `Showing ${categoryVisible.length} of ${rows().length} plans in App builder; ${selectedBefore.length} selected.`
  );
  doc.getElementById("subscription-filter").value = "Kiro";
  doc.getElementById("subscription-category").value = "AI IDE/editor";
  doc.getElementById("calculator-form").dispatch("input");

  const kiroVisible = rows().filter(
    (row) => row.getAttribute("data-subscription-search")?.includes("kiro")
  );
  assert.ok(kiroVisible.length > 0, "Kiro rows remain searchable in the AI IDE/editor category");
  assert.ok(
    visibleRows().every(
      (row) =>
        row.getAttribute("data-subscription-category") === "AI IDE/editor" &&
        (row.getAttribute("data-subscription-search") || "").includes("kiro")
    ),
    "every visible row matches the Kiro search and AI IDE/editor category"
  );
  assert.equal(
    doc.getElementById("subscription-filter-status").textContent,
    `Showing ${kiroVisible.length} of ${rows().length} plans for “Kiro” in AI IDE/editor; ${selectedBefore.length} selected.`
  );
  assert.deepEqual(selectedIds(), selectedBefore, "category filtering also preserves selections");
});


test("comparison table renders billing cadence and included value for every tier", () => {
  const { doc } = boot();

  // One subscription row per tier, each carrying a billing-cadence line and an
  // included-value line alongside the headline monthly price.
  assert.equal(
    doc.querySelectorAll("#comparison-body .plan-cadence").length,
    subscriptions.length,
    "every subscription row shows its billing cadence"
  );
  assert.equal(
    doc.querySelectorAll("#comparison-body .plan-included").length,
    subscriptions.length,
    "every subscription row shows its included value"
  );

  const cadences = doc
    .querySelectorAll("#comparison-body .plan-cadence")
    .map((el) => el.textContent);
  const included = doc
    .querySelectorAll("#comparison-body .plan-included")
    .map((el) => el.textContent);
  for (const sub of subscriptions) {
    assert.ok(cadences.includes(sub.billingCadence), `missing cadence for ${sub.id}`);
    assert.ok(included.includes(sub.includedValue), `missing included value for ${sub.id}`);
  }
});

test("comparison table preserves the documented Google AI and Cursor tier order", () => {
  const { doc } = boot();
  const rows = doc.querySelectorAll("#comparison-body tr").slice(0, subscriptions.length);
  const renderedTiers = rows.map((row) => ({
    name: row.children[0].textContent,
    plan: row.children[1].childNodes[0]?.textContent,
  }));

  assert.deepEqual(
    renderedTiers
      .filter(({ name }) => name === "Google AI" || name === "Google AI Ultra")
      .map(({ name, plan }) => `${name} ${plan}`),
    ["Google AI Free", "Google AI Plus", "Google AI Pro", "Google AI Ultra 5x", "Google AI Ultra 20x"],
    "Google AI rows keep the documented tier order"
  );
  assert.deepEqual(
    renderedTiers.filter(({ name }) => name === "Cursor").map(({ plan }) => plan),
    ["Hobby", "Pro", "Pro+", "Ultra", "Teams"],
    "Cursor rows keep the documented tier order"
  );
});

test("comparison table renders the current ChatGPT pricing ladder", () => {
  const { doc } = boot();
  const rows = doc.querySelectorAll("#pricing-list li");
  const expected = [
    ["ChatGPT", "Plus / Codex bundle", "$20/mo"],
    ["ChatGPT", "Go", "$8/mo"],
    ["ChatGPT", "Pro", "$100/mo"],
    ["ChatGPT", "Pro 20×", "$200/mo"],
  ];
  for (const [name, plan, price] of expected) {
    const row = rows.find((entry) => entry.textContent.includes(`${name} — ${plan}`));
    assert.ok(row, `${plan} pricing row is rendered`);
    assert.ok(row.textContent.includes(price), `${plan} price is rendered`);
  }
  const pro20x = rows.find((entry) => entry.textContent.includes("ChatGPT — Pro 20×"));
  assert.match(pro20x.textContent, /new sign-ups and upgrades are temporarily paused/i);
  assert.match(pro20x.textContent, /existing subscriptions continue renewing/i);
});

test("comparison table renders the Copilot Max source note beside the provenance", () => {
  const { doc } = boot();
  const rows = doc.querySelectorAll("#comparison-body tr");
  const copilotMaxRow = rows[subscriptions.findIndex((sub) => sub.id === "copilot-max")];

  assert.ok(copilotMaxRow, "expected the Copilot Max comparison row");
  const sourceCell = copilotMaxRow.children[3];
  assert.ok(sourceCell, "expected the Copilot Max provenance cell");
  const sourceNote = sourceCell.children.find((el) => el.className === "source-note");
  assert.ok(sourceNote, "expected the Copilot Max source note");
  assert.match(
    sourceNote.textContent,
    /comparison table currently shows .*\$200\/mo of AI Credits/i,
    "Copilot Max source note keeps the comparison-table figure visible"
  );
  assert.match(
    sourceNote.textContent,
    /FAQ answer .* says \$100\/mo/i,
    "Copilot Max source note records the FAQ ambiguity"
  );
});

test("pricing list renders Copilot subscription prices separately from AI Credits", () => {
  const { doc } = boot();
  const rows = doc.querySelectorAll("#pricing-list li");
  const expected = [
    ["Pro", "$10/mo", "$15/mo of GitHub AI Credits"],
    ["Pro+", "$39/mo", "$70/mo of GitHub AI Credits"],
    ["Max", "$100/mo", "$200/mo of GitHub AI Credits"],
  ];
  for (const [plan, price, credits] of expected) {
    const row = rows.find((entry) => entry.textContent.includes(`GitHub Copilot — ${plan}`));
    assert.ok(row, `${plan} pricing row is rendered`);
    assert.ok(row.textContent.includes(price), `${plan} subscription price is rendered`);
    assert.ok(row.textContent.includes(credits), `${plan} AI Credit allowance is rendered separately`);
    assert.match(row.textContent, /Usage beyond the credits is metered/i, `${plan} metered overage is disclosed`);
  }
});

test("comparison table renders hardware labels and specs as literal text", () => {
  const original = {
    name: hardware[0].name,
    spec: hardware[0].spec,
  };
  hardware[0].name = "Rig <Alpha> & Co.";
  hardware[0].spec = "GPU <96 GB> & 1 TB";

  try {
    const { doc } = boot();
    const rows = doc.querySelectorAll("#comparison-body tr");
    const row = rows[subscriptions.length];

    assert.ok(row, "expected the first hardware comparison row");
    assert.equal(
      row.children.length,
      4,
      "hardware comparison rows should render name, spec, price, and provenance cells"
    );
    assert.equal(row.children[0].textContent, hardware[0].name);
    assert.equal(row.children[1].textContent, hardware[0].spec);
    assert.ok(row.children[2], "hardware price cell should be present");
    assert.ok(row.children[3], "hardware provenance cell should be present");
  } finally {
    hardware[0].name = original.name;
    hardware[0].spec = original.spec;
  }
});

test("pricing list discloses billing cadence for every tier", () => {
  const { doc } = boot();
  const items = doc.getElementById("pricing-list").children.slice(0, subscriptions.length);
  for (let i = 0; i < subscriptions.length; i += 1) {
    const sub = subscriptions[i];
    assert.match(
      items[i].textContent,
      new RegExp(sub.billingCadence.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      `pricing list discloses the ${sub.id} billing cadence`
    );
  }
});

test("default selected subscriptions stay preselected under the power-user preset", () => {
  const { doc } = boot();
  // Codex + Claude Code Pro (monthly) are still the preselected subscriptions,
  // but the default spend basis is now the power-user preset.
  const checked = doc
    .querySelectorAll('#subscription-options input[type="checkbox"]:checked')
    .map((el) => el.value);
  assert.deepEqual(checked, ["codex", "claude-code"]);
  assert.equal(
    doc.getElementById("spend-basis").textContent,
    "Using custom budget: $200/mo (Power user preset); selected plans are reference-only."
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
    "Using custom budget: $200/mo (Power user preset); selected plans are reference-only."
  );
});

test("custom spend basis stays synchronized with the calculation instead of selected plans", async () => {
  const { doc } = boot();
  const customSpend = doc.getElementById("custom-spend");

  customSpend.value = "80";
  await doc.getElementById("calculator-form").dispatch("input");

  assert.equal(
    doc.getElementById("spend-basis").textContent,
    "Using custom budget: $80/mo; selected plans are reference-only."
  );
  assert.equal(
    computeResult({ ...defaults, subscriptions: ["codex", "claude-code"], customSpend: 80 }).series[0].subscriptionCost,
    80,
    "the computed subscription series uses the custom budget"
  );
  assert.equal(
    computeResult({ ...defaults, subscriptions: ["codex", "claude-code"], customSpend: "" }).series[0].subscriptionCost,
    40,
    "clearing the custom budget returns computation to selected plans"
  );
});

test("featured hardware renders affiliate CTAs from the separate affiliate metadata", () => {
  const { doc } = boot();
  const links = doc.querySelectorAll("#comparison-body a");
  const hrefs = links.map((a) => a.getAttribute("href"));

  for (const box of hardware) {
    // The price source link is always present and points at the pricing source.
    assert.ok(hrefs.includes(box.sourceUrl), `missing source link for ${box.id}`);

    // The CTA is looked up from the affiliates map, not the pricing entry.
    // Commissioned links carry the (affiliate) label and sponsored rel; some
    // trims intentionally have no dedicated CTA metadata.
    const affiliate = getAffiliate(box.id);
    if (affiliate) {
      const cta = links.find((a) => a.getAttribute("href") === affiliate.url);
      assert.ok(cta, `missing CTA for ${box.id}`);
      if (affiliate.affiliate) {
        assert.match(cta.textContent, /\(affiliate\)/, `${box.id} affiliate CTA is labeled`);
        assert.match(cta.getAttribute("rel"), /sponsored/, `${box.id} affiliate CTA is sponsored`);
      } else {
        assert.doesNotMatch(cta.textContent, /\(affiliate\)/, `${box.id} official CTA is not labeled affiliate`);
        assert.doesNotMatch(cta.getAttribute("rel") || "", /sponsored/, `${box.id} official CTA is not sponsored`);
      }
    }
  }

  // Explicit guard for the mix: DGX Spark is the official Marketplace Buy Now
  // path while at least one other featured card keeps an affiliate/reseller CTA.
  const dgx = getAffiliate("dgx-spark");
  assert.equal(dgx.affiliate, false, "DGX Spark CTA is the official non-affiliate path");
  assert.match(dgx.url, /marketplace\.nvidia\.com/, "DGX Spark CTA points at NVIDIA Marketplace");
  assert.ok(
    hardware.some((box) => box.id !== "dgx-spark" && getAffiliate(box.id)?.affiliate),
    "other hardware keeps affiliate/reseller CTAs"
  );
});

test("DGX Spark featured card summary shows the full retailer trim spread", () => {
  const { doc } = boot();
  const titles = doc.querySelectorAll("#featured-hardware-cards .hardware-card-title");
  const amounts = doc.querySelectorAll("#featured-hardware-cards .hardware-card-amount");
  const dgxIndex = titles.findIndex((title) => title.textContent === "NVIDIA DGX Spark");

  assert.ok(dgxIndex !== -1, "renders the NVIDIA DGX Spark featured card");
  const amount = amounts[dgxIndex];
  assert.ok(amount, "DGX Spark card renders a price amount");
  const amountText = amount.childNodes.map((node) => node.textContent).join("");
  assert.match(amountText, /Price:\s*\$3,971–\$6,030/, "DGX Spark summary price range is current");
  assert.doesNotMatch(amountText, /\$2,999–\$3,999/, "DGX Spark summary no longer shows the stale narrower range");
});

test("each featured hardware card renders a source provenance block", () => {
  // BDD contract: every featured card shows where its price came from and
  // whether that number is official, retail, or an estimate. The card reuses the
  // shared source-label / source-status provenance markup, scoped to its own
  // .hardware-card-source line.
  const { doc } = boot();
  const cards = doc.querySelectorAll("#featured-hardware-cards .hardware-card");
  assert.equal(cards.length, featuredHardware.length, "one card per featured box");

  const labels = doc
    .querySelectorAll("#featured-hardware-cards .hardware-card-source .source-label")
    .map((el) => el.textContent);
  const statuses = doc
    .querySelectorAll("#featured-hardware-cards .hardware-card-source .source-status")
    .map((el) => el.getAttribute("data-verification"));

  assert.equal(labels.length, featuredHardware.length, "each card shows a source label");
  assert.equal(
    statuses.length,
    featuredHardware.length,
    "each card flags whether the price is official, retail, or an estimate"
  );

  for (let i = 0; i < featuredHardware.length; i += 1) {
    const box = featuredHardware[i];
    assert.equal(labels[i], box.sourceLabel, `${box.id} source label`);
    assert.equal(statuses[i], box.verification, `${box.id} verification status`);
  }
});

test("each featured hardware card renders a labeled CTA and keeps provenance first", () => {
  // BDD contract: every card with CTA metadata surfaces a clearly labeled button
  // that stays below the price-provenance line, so a commissioned link is never
  // conflated with the "where this price came from" trail. Affiliate/reseller
  // CTAs carry the (affiliate) label and sponsored rel; official Buy Now paths
  // (DGX Spark's NVIDIA Marketplace link) carry neither.
  const { doc } = boot();
  const cards = doc.querySelectorAll("#featured-hardware-cards .hardware-card");
  const ctas = doc.querySelectorAll("#featured-hardware-cards .hardware-card-cta");
  const withCta = featuredHardware.filter((box) => getAffiliate(box.id));

  assert.equal(cards.length, featuredHardware.length, "one card per featured box");
  assert.equal(ctas.length, withCta.length, "one CTA per card with CTA metadata");

  // The featured set mixes both CTA kinds: DGX Spark is official/non-affiliate
  // while at least one other card keeps an affiliate/reseller link.
  const affiliateFlags = withCta.map((box) => getAffiliate(box.id).affiliate);
  assert.ok(affiliateFlags.includes(true), "at least one featured card keeps an affiliate CTA");
  assert.ok(affiliateFlags.includes(false), "at least one featured card uses an official non-affiliate CTA");
  assert.equal(getAffiliate("dgx-spark").affiliate, false, "DGX Spark is the non-affiliate official CTA");

  for (let i = 0; i < featuredHardware.length; i += 1) {
    const box = featuredHardware[i];
    const affiliate = getAffiliate(box.id);
    if (!affiliate) continue;

    const cta = ctas.find((a) => a.getAttribute("href") === affiliate.url);
    assert.ok(cta, `missing CTA for ${box.id}`);
    assert.ok(
      cta.textContent.includes(affiliate.label),
      `${box.id} CTA uses its documented label`
    );
    if (affiliate.affiliate) {
      assert.match(cta.textContent, /\(affiliate\)/, `${box.id} CTA is clearly labeled affiliate`);
      assert.match(
        cta.getAttribute("rel"),
        /\bsponsored\b/,
        `${box.id} CTA carries the sponsored rel marker`
      );
    } else {
      assert.doesNotMatch(
        cta.textContent,
        /\(affiliate\)/,
        `${box.id} official CTA is not labeled affiliate`
      );
      assert.doesNotMatch(
        cta.getAttribute("rel") || "",
        /\bsponsored\b/,
        `${box.id} official CTA carries no sponsored rel marker`
      );
    }

    // Order guard: the provenance line leads the CTA within the card layout.
    const childClasses = cards[i].children.map((child) => String(child.className || ""));
    const sourceIdx = childClasses.findIndex((c) => /\bhardware-card-source\b/.test(c));
    const actionsIdx = childClasses.findIndex((c) => /\bhardware-card-actions\b/.test(c));
    assert.ok(sourceIdx !== -1, `${box.id} card has a source line`);
    assert.ok(actionsIdx !== -1, `${box.id} card has an actions row`);
    assert.ok(
      sourceIdx < actionsIdx,
      `${box.id} source line must precede the affiliate CTA`
    );
  }
});

test("featured hardware cards render the documented product images", () => {
  const { doc } = boot();
  const cards = doc.querySelectorAll("#featured-hardware-cards .hardware-card");
  const images = doc.querySelectorAll("#featured-hardware-cards .hardware-card-image");

  assert.equal(images.length, featuredHardware.length, "one image per featured card");

  for (let i = 0; i < featuredHardware.length; i += 1) {
    const box = featuredHardware[i];
    const image = images[i];
    assert.ok(image, `expected an image for ${box.id}`);
    assert.equal(image.getAttribute("src"), box.image?.src, `${box.id} image source`);
    assert.equal(image.getAttribute("alt"), box.image?.alt, `${box.id} image alt text`);
    assert.doesNotMatch(image.getAttribute("src") ?? "", /\.svg$/i, `${box.id} image must not regress to SVG`);
  }
});

test("featured hardware product image sits at the top of each card", () => {
  // BDD contract: the product illustration leads the card, above the title and
  // spec content. Guards against the image being reordered below the text, which
  // the src/alt assertions above would not catch.
  const { doc } = boot();
  const cards = doc.querySelectorAll("#featured-hardware-cards .hardware-card");

  assert.equal(cards.length, featuredHardware.length, "one card per featured box");

  for (let i = 0; i < cards.length; i += 1) {
    const box = featuredHardware[i];
    const first = cards[i].children[0];
    assert.ok(first, `expected content in the card for ${box.id}`);
    assert.match(
      first.className,
      /\bhardware-card-image\b/,
      `product image must be the first element in the card for ${box.id}`
    );
  }
});

test("Mac Studio surfaces Apple's financing example on the featured card", () => {
  const { doc } = boot();
  const macCard = doc.querySelectorAll("#featured-hardware-cards .hardware-card")[0];
  assert.ok(macCard, "expected the Mac Studio featured card");

  const financing = doc.querySelectorAll("#featured-hardware-cards .hardware-card-financing")[0];
  assert.ok(financing, "Mac Studio should show an official financing example");
  assert.match(
    financing.textContent,
    /official vendor financing example/i,
    "the financing line should be framed as vendor context"
  );
  assert.match(
    financing.textContent,
    /\$208\.25\/mo for 12 months/i,
    "the financing line should mention the 12-month purchase example"
  );
  assert.match(
    financing.textContent,
    /\$48\.99\/mo for 36 months/i,
    "the financing line should mention the lease example"
  );

  const link = doc.querySelectorAll("#featured-hardware-cards .hardware-card-financing a")[0];
  assert.ok(link, "the financing example should link back to Apple");
  assert.equal(link.getAttribute("href"), "https://www.apple.com/shop/buy-mac/mac-studio");
});

test("MINISFORUM financing example appears in the pricing list", () => {
  const { doc } = boot();
  const minisforumLink = Array.from(doc.querySelectorAll("#pricing-list .hardware-card-financing a")).find(
    (link) => link.getAttribute("href") === "https://store.minisforum.com/products/minisforum-ms-s1-max-mini-pc"
  );

  assert.ok(minisforumLink, "expected a financing note for the MINISFORUM MS-S1 MAX pricing entry");
  const minisforumFinancing = minisforumLink.parentElement;
  assert.ok(minisforumFinancing, "the MINISFORUM financing link should sit inside a financing note");
  assert.match(
    minisforumFinancing.textContent,
    /Official vendor financing example/i,
    "the MINISFORUM pricing-list entry should surface the financing example"
  );
  assert.match(
    minisforumFinancing.textContent,
    /0% APR plan badge/i,
    "the MINISFORUM pricing-list entry should cite the 0% APR plan badge"
  );
  assert.match(
    minisforumFinancing.textContent,
    /starting at \$204\.67\/month/i,
    "the MINISFORUM pricing-list entry should cite the PayPal monthly example"
  );
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

test("featured hardware trim selectors default to the documented preload", () => {
  const { doc } = boot();
  const selects = doc.querySelectorAll("#featured-hardware-cards .hardware-card-trim-select");

  assert.equal(selects.length, featuredHardware.filter((box) => hardwareTrims(box).length > 1).length);

  for (let i = 0; i < featuredHardware.length; i += 1) {
    const box = featuredHardware[i];
    const trims = hardwareTrims(box);
    const defaultTrim = defaultHardwareTrim(box);
    const select = selects[i] || null;

    if (trims.length > 1) {
      assert.ok(select, `expected a trim selector for ${box.id}`);
      assert.equal(select.children.length, trims.length, `${box.id} trim count`);
      assert.equal(select.value, defaultTrim.id, `${box.id} default trim is selected`);
      assert.deepEqual(
        select.children.map((option) => option.value),
        trims.map((trim) => trim.id),
        `${box.id} selector options follow the trim data`
      );
    } else {
      assert.equal(select, null, `${box.id} should not render a selector`);
    }
  }
});

test("choosing a featured trim loads that trim's price and power draw", async () => {
  const { doc, win } = boot();
  const strixHaloIndex = featuredHardware.findIndex((box) => box.id === "strix-halo");
  const strixHalo = featuredHardware[strixHaloIndex];
  const selects = doc.querySelectorAll("#featured-hardware-cards .hardware-card-trim-select");
  const buttons = doc.querySelectorAll("#featured-hardware-cards .hardware-card-use");
  const select = selects[strixHaloIndex];
  const trims = hardwareTrims(strixHalo);
  const chosenTrim = trims.at(-1);

  assert.ok(select, "expected the Strix Halo card to render a trim selector");
  assert.ok(chosenTrim, "expected at least one selectable trim");

  select.value = chosenTrim.id;
  await buttons[strixHaloIndex].dispatch("click");

  assert.equal(doc.getElementById("box-price").value, String(chosenTrim.boxPrice));
  assert.equal(doc.getElementById("power-draw").value, String(chosenTrim.powerDraw));
  assert.match(
    doc.getElementById("featured-hardware-status").textContent,
    new RegExp(chosenTrim.name)
  );
  assert.equal(select.value, chosenTrim.id, "the selector stays synced to the loaded trim");
  assert.ok(
    win._plausibleCalls.some(([name]) => name === "Calculator: Interact"),
    "loading a chosen trim counts as calculator interaction"
  );
});

test("DGX Spark exposes current retailer trims and loads them correctly", async () => {
  const { doc, win } = boot();
  const dgxSparkIndex = featuredHardware.findIndex((box) => box.id === "dgx-spark");
  const dgxSpark = featuredHardware[dgxSparkIndex];
  const trims = hardwareTrims(dgxSpark);
  const defaultTrim = defaultHardwareTrim(dgxSpark);
  const selects = doc.querySelectorAll("#featured-hardware-cards .hardware-card-trim-select");
  const buttons = doc.querySelectorAll("#featured-hardware-cards .hardware-card-use");
  const select = selects[dgxSparkIndex];
  const foundersTrim = trims.find((trim) => trim.id === "nvidia-dgx-spark-founders-edition");
  const seeedTrim = trims.find((trim) => trim.id === "seeed-dgx-spark");
  const asusTrim = trims.find((trim) => trim.id === "asus-ascent-gx10");
  const pnyTrim = trims.find((trim) => trim.id === "pny-dgx-spark");
  const hpTrim = trims.find((trim) => trim.id === "hp-zgx-nano-g1n-2tb");

  assert.ok(foundersTrim, "expected the DGX Spark card to expose the NVIDIA Founders Edition trim");
  assert.ok(seeedTrim, "expected the DGX Spark card to expose the Seeed Studio trim");
  assert.ok(asusTrim, "expected the DGX Spark card to expose the ASUS Ascent GX10 trim");
  assert.ok(pnyTrim, "expected the DGX Spark card to expose the PNY trim");
  assert.ok(hpTrim, "expected the DGX Spark card to expose the HP ZGX Nano trim");
  assert.deepEqual(
    trims.map((trim) => trim.id),
    [
      "nvidia-dgx-spark-founders-edition",
      "seeed-dgx-spark",
      "asus-ascent-gx10",
      "pny-dgx-spark",
      "hp-zgx-nano-g1n-2tb",
      "hp-zgx-nano-g1n-4tb",
      "acer-veriton-vgn100-ud11",
      "gigabyte-ai-top-atom",
      "msi-edgexpert",
    ],
    "DGX Spark should surface the current named retailer trims"
  );
  assert.equal(defaultTrim.id, "nvidia-dgx-spark-founders-edition", "DGX Spark now defaults to NVIDIA's Founders Edition trim");
  assert.ok(select, "expected a DGX Spark trim selector");
  assert.equal(select.children.length, 9, "DGX Spark trim selector lists nine options");

  select.value = hpTrim.id;
  await buttons[dgxSparkIndex].dispatch("click");

  assert.equal(doc.getElementById("box-price").value, String(hpTrim.boxPrice));
  assert.equal(doc.getElementById("power-draw").value, String(hpTrim.powerDraw));
  assert.match(doc.getElementById("featured-hardware-status").textContent, /HP ZGX Nano G1n AI Station/);
  assert.equal(select.value, hpTrim.id, "the selector stays synced to the HP trim");
  assert.ok(
    win._plausibleCalls.some(([name]) => name === "Calculator: Interact"),
    "loading the HP trim counts as calculator interaction"
  );
});

test("DGX Spark shows an official workload claim separate from the advisory model-fit copy", () => {
  const { doc } = boot();
  const cards = doc.querySelectorAll("#featured-hardware-cards .hardware-card");
  const titles = doc.querySelectorAll("#featured-hardware-cards .hardware-card-title");
  const dgxIndex = Array.from(titles).findIndex((title) => title.textContent === "NVIDIA DGX Spark");
  const dgxCard = cards[dgxIndex];

  assert.ok(dgxCard, "expected the DGX Spark hardware card");
  const official = dgxCard.children[6];
  const heuristic = dgxCard.children[7];

  assert.ok(official, "DGX Spark should show a vendor-attributed workload claim");
  assert.ok(heuristic, "DGX Spark should still show the advisory heuristic line");
  assert.match(official.textContent, /200B parameters/i);
  assert.match(official.textContent, /70B parameters/i);
  assert.match(official.textContent, /405B parameters/i);
  assert.match(heuristic.textContent, /Practical local model fit/i);
  assert.notEqual(official.textContent, heuristic.textContent, "the official claim must remain distinct from the heuristic");
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

test("model-fit rerenders preserve the loaded trim and active card", async () => {
  const { doc } = boot();
  const strixIndex = featuredHardware.findIndex((box) => box.id === "strix-halo");
  const strixTrims = hardwareTrims(featuredHardware[strixIndex]);
  const chosenTrim = strixTrims.at(-1);
  const initialSelect = doc.querySelectorAll("#featured-hardware-cards .hardware-card-trim-select")[strixIndex];
  const initialButton = doc.querySelectorAll("#featured-hardware-cards .hardware-card-use")[strixIndex];

  initialSelect.value = chosenTrim.id;
  await initialButton.dispatch("click");
  const expectedPrice = String(chosenTrim.boxPrice);
  const expectedPower = String(chosenTrim.powerDraw);

  const modelSize = doc.getElementById("model-size");
  modelSize.value = "70";
  await modelSize.dispatch("input");

  let liveSelect = doc.querySelectorAll("#featured-hardware-cards .hardware-card-trim-select")[strixIndex];
  let liveCards = doc.querySelectorAll("#featured-hardware-cards .hardware-card");
  assert.equal(liveSelect.value, chosenTrim.id, "model-size rerender keeps the selected trim");
  assert.equal(doc.getElementById("box-price").value, expectedPrice);
  assert.equal(doc.getElementById("power-draw").value, expectedPower);
  assert.equal(liveCards[strixIndex].getAttribute("data-active"), "true");
  const advisoryAfterSize = doc.querySelectorAll("#featured-hardware-cards .hardware-card-fit-advisory")[strixIndex];
  assert.match(advisoryAfterSize.textContent, /70B/);

  const quantization = doc.getElementById("model-quantization");
  quantization.value = "fp16";
  await quantization.dispatch("change");

  liveSelect = doc.querySelectorAll("#featured-hardware-cards .hardware-card-trim-select")[strixIndex];
  liveCards = doc.querySelectorAll("#featured-hardware-cards .hardware-card");
  assert.equal(liveSelect.value, chosenTrim.id, "quantization rerender keeps the selected trim");
  assert.equal(doc.getElementById("box-price").value, expectedPrice);
  assert.equal(doc.getElementById("power-draw").value, expectedPower);
  assert.equal(liveCards[strixIndex].getAttribute("data-active"), "true");
  const advisoryAfterQuantization = doc.querySelectorAll("#featured-hardware-cards .hardware-card-fit-advisory")[strixIndex];
  assert.match(advisoryAfterQuantization.textContent, /fp16/i);
});

test("a hardware preset from the URL renders with its card already active", () => {
  const box = hardware.find((entry) => entry.id === "asus-ascent-gx10");
  const { doc } = boot(
    `?boxPrice=${box.defaultBoxPrice ?? box.priceLow}&powerDraw=${box.powerDraw}`
  );
  const cards = doc.querySelectorAll("#featured-hardware-cards .hardware-card");

  assert.equal(cards[1].getAttribute("data-active"), "true", "matching card is active");
  assert.equal(cards[0].getAttribute("data-active"), null);
  assert.equal(cards[2].getAttribute("data-active"), null);
});

test("a ROG NUC hardware preset from the URL preserves its active card and provenance after rerender", async () => {
  const rogIndex = featuredHardware.findIndex((box) => box.id === "rtx-5080-laptop");
  const { doc } = boot("?boxPrice=3799.99&powerDraw=330");
  let cards = doc.querySelectorAll("#featured-hardware-cards .hardware-card");
  assert.equal(cards[rogIndex].getAttribute("data-active"), "true", "ROG card is active from URL state");

  const assertRogProvenance = () => {
    const card = doc.querySelectorAll("#featured-hardware-cards .hardware-card")[rogIndex];
    const source = Array.from(card.children).find((child) => child.className === "hardware-card-source");
    const links = Array.from(source.children).filter((child) => child.tagName === "A");
    assert.ok(links.some((link) => link.getAttribute("href").includes("microcenter.com/product/713317")));
    assert.ok(links.some((link) => link.getAttribute("href").includes("rog.asus.com/desktops/mini-pc/rog-nuc-16")));
    const actions = Array.from(card.children).find((child) => child.className === "hardware-card-actions");
    const cta = Array.from(actions.children).find((child) => child.className.includes("hardware-card-cta"));
    assert.equal(cta.getAttribute("href"), "https://rog.asus.com/desktops/mini-pc/rog-nuc-16/");
  };

  assertRogProvenance();
  const modelSize = doc.getElementById("model-size");
  modelSize.value = "70";
  await modelSize.dispatch("input");
  cards = doc.querySelectorAll("#featured-hardware-cards .hardware-card");
  assert.equal(cards[rogIndex].getAttribute("data-active"), "true", "rerender keeps the ROG card active");
  assertRogProvenance();
});

test("rerendered ROG NUC CTA keeps outbound analytics wired", async () => {
  const { doc, win } = boot("?boxPrice=3799.99&powerDraw=330");
  const modelSize = doc.getElementById("model-size");
  modelSize.value = "70";
  await modelSize.dispatch("input");

  const rogIndex = featuredHardware.findIndex((box) => box.id === "rtx-5080-laptop");
  const card = doc.querySelectorAll("#featured-hardware-cards .hardware-card")[rogIndex];
  const actions = Array.from(card.children).find((child) => child.className === "hardware-card-actions");
  const cta = Array.from(actions.children).find((child) => child.className.includes("hardware-card-cta"));
  await cta.dispatch("click");

  assert.ok(
    win._plausibleCalls.some(
      ([name, options]) =>
        name === "Outbound Link: Click" &&
        options?.props?.url === "https://rog.asus.com/desktops/mini-pc/rog-nuc-16/" &&
        options?.props?.affiliate === false
    ),
    "the recreated canonical ASUS CTA remains tracked as a non-affiliate link"
  );
});

test("persistent outbound links stay single-wired across rerenders and reset", async () => {
  const { doc, win } = boot();
  const modelSize = doc.getElementById("model-size");
  const quantization = doc.getElementById("model-quantization");
  modelSize.value = "70";
  await modelSize.dispatch("input");
  quantization.value = "fp16";
  await quantization.dispatch("change");
  await doc.getElementById("calculator-form").dispatch("reset");

  const link = doc.querySelector("#comparison-body a");
  assert.ok(link, "comparison link is rendered");
  const href = link.getAttribute("href");
  await link.dispatch("click");

  const outboundCalls = win._plausibleCalls.filter(
    ([name, options]) =>
      name === "Outbound Link: Click" && options?.props?.url === href
  );
  assert.equal(outboundCalls.length, 1, "persistent links emit exactly one outbound event");
});

test("a URL-preloaded non-default trim survives model-fit rerenders", async () => {
  const strixIndex = featuredHardware.findIndex((box) => box.id === "strix-halo");
  const strixTrims = hardwareTrims(featuredHardware[strixIndex]);
  const chosenTrim = strixTrims.at(-1);
  const { doc } = boot(
    `?boxPrice=${chosenTrim.boxPrice}&powerDraw=${chosenTrim.powerDraw}`
  );
  const expectedPrice = String(chosenTrim.boxPrice);
  const expectedPower = String(chosenTrim.powerDraw);

  let select = doc.querySelectorAll("#featured-hardware-cards .hardware-card-trim-select")[strixIndex];
  let cards = doc.querySelectorAll("#featured-hardware-cards .hardware-card");
  assert.equal(select.value, chosenTrim.id, "URL hydration selects the matching non-default trim");
  assert.equal(cards[strixIndex].getAttribute("data-active"), "true");

  const modelSize = doc.getElementById("model-size");
  modelSize.value = "70";
  await modelSize.dispatch("input");

  select = doc.querySelectorAll("#featured-hardware-cards .hardware-card-trim-select")[strixIndex];
  cards = doc.querySelectorAll("#featured-hardware-cards .hardware-card");
  assert.equal(select.value, chosenTrim.id, "model-size rerender keeps the URL-selected trim");
  assert.equal(String(doc.getElementById("box-price").value), expectedPrice);
  assert.equal(String(doc.getElementById("power-draw").value), expectedPower);
  assert.equal(cards[strixIndex].getAttribute("data-active"), "true");

  const quantization = doc.getElementById("model-quantization");
  quantization.value = "fp16";
  await quantization.dispatch("change");

  select = doc.querySelectorAll("#featured-hardware-cards .hardware-card-trim-select")[strixIndex];
  cards = doc.querySelectorAll("#featured-hardware-cards .hardware-card");
  assert.equal(select.value, chosenTrim.id, "quantization rerender keeps the URL-selected trim");
  assert.equal(String(doc.getElementById("box-price").value), expectedPrice);
  assert.equal(String(doc.getElementById("power-draw").value), expectedPower);
  assert.equal(cards[strixIndex].getAttribute("data-active"), "true");
});

test("default boot leaves every hardware card inactive", () => {
  const { doc } = boot();
  const active = doc.querySelectorAll(
    '#featured-hardware-cards .hardware-card[data-active="true"]'
  );
  assert.equal(active.length, 0, "no card is active until a system is loaded");
});

test("resetting the form restores the default hardware trim and clears the active card", async () => {
  const { doc } = boot();
  const cards = doc.querySelectorAll("#featured-hardware-cards .hardware-card");
  const strixIndex = featuredHardware.findIndex((box) => box.id === "strix-halo");
  const strix = featuredHardware[strixIndex];
  const trims = hardwareTrims(strix);
  const chosenTrim = trims.at(-1);
  const trimSelect = doc.querySelectorAll("#featured-hardware-cards .hardware-card-trim-select")[strixIndex];
  trimSelect.value = chosenTrim.id;
  await doc.querySelectorAll("#featured-hardware-cards .hardware-card-use")[strixIndex].dispatch("click");
  assert.equal(cards[strixIndex].getAttribute("data-active"), "true");
  assert.equal(trimSelect.value, chosenTrim.id);

  const modelSize = doc.getElementById("model-size");
  modelSize.value = "70";
  await modelSize.dispatch("input");
  const modelQuantization = doc.getElementById("model-quantization");
  modelQuantization.value = "fp16";
  await modelQuantization.dispatch("change");

  await doc.getElementById("calculator-form").dispatch("reset");
  assert.equal(
    doc.getElementById("calculator-form").lastEvent.defaultPrevented,
    true,
    "reset owns restoration instead of allowing native defaults to race it"
  );
  const active = doc.querySelectorAll(
    '#featured-hardware-cards .hardware-card[data-active="true"]'
  );
  assert.equal(active.length, 0, "reset clears the active highlight");
  const resetSelect = doc.querySelectorAll("#featured-hardware-cards .hardware-card-trim-select")[strixIndex];
  assert.equal(resetSelect.value, trims[0].id, "reset restores the documented default trim");
  assert.equal(
    doc.getElementById("featured-hardware-status").textContent,
    "Choose a system to load its assumptions into the calculator.",
    "reset restores the default featured-hardware prompt"
  );
  assert.equal(doc.getElementById("model-size").value, String(defaults.modelSize));
  assert.equal(doc.getElementById("model-quantization").value, defaults.modelQuantization);
  const advisories = doc.querySelectorAll("#featured-hardware-cards .hardware-card-fit-advisory");
  assert.equal(advisories.length, featuredHardware.length, "reset rerenders every hardware advisory");
  for (const advisory of advisories) {
    assert.match(advisory.textContent, /Advisory fit for 30B int4:/i, "reset rerenders advisory copy from model-fit defaults");
  }
});

test("initCalculator renders the real results state for valid inputs", () => {
  const { doc } = boot();
  assert.equal(
    doc.getElementById("results-status").textContent,
    "Break-even month: Month 8; monthly net savings: $66."
  );
  assert.equal(
    doc.getElementById("spend-basis").textContent,
    "Using custom budget: $200/mo (Power user preset); selected plans are reference-only."
  );
  assert.equal(doc.querySelector('[data-metric="breakeven"]').textContent, "Month 8");
  assert.match(doc.querySelector('[data-metric="payment"]').textContent, /^\$\d/);
  assert.match(doc.querySelector('[data-metric="savings"]').textContent, /^-?\$\d/);
  assert.ok(
    doc.querySelector('#cost-chart svg[data-chart="cost"]'),
    "renders the cumulative-cost SVG chart"
  );
  assert.ok(
    doc.querySelector('#cost-chart [data-breakeven-marker="true"]'),
    "renders a break-even marker for the default payback scenario"
  );
  assert.ok(
    doc.querySelector('#cost-chart [data-breakeven-label="true"]'),
    "labels the default break-even month on the chart"
  );
});

test("the cumulative-cost chart marks break-even when one exists", async () => {
  const { doc } = boot();
  const setValue = (id, value) => {
    const el = doc.getElementById(id);
    el.value = String(value);
    return el;
  };

  setValue("box-price", 100);
  setValue("down-payment", 0);
  setValue("apr", 0);
  setValue("term", 1);
  setValue("electricity-rate", 0);
  setValue("power-draw", 0);
  setValue("hours-per-day", 0);
  await doc.getElementById("calculator-form").dispatch("input");

  assert.ok(
    doc.querySelector('#cost-chart [data-breakeven-marker="true"]'),
    "renders a break-even marker"
  );
  assert.ok(
    doc.querySelector('#cost-chart [data-breakeven-label="true"]'),
    "labels the break-even month on the chart"
  );
  assert.match(
    doc.querySelector('[data-metric="breakeven"]').textContent,
    /^Month \d+$/
  );
});

test("initCalculator hydrates state from the location query string", () => {
  const { doc } = boot("?boxPrice=4200&subs=codex");

  assert.equal(doc.getElementById("box-price").value, 4200);
  const checked = doc
    .querySelectorAll('#subscription-options input[type="checkbox"]:checked')
    .map((el) => el.value);
  assert.deepEqual(checked, ["codex"]);
});

test("opening a query-string share link hydrates state without rewriting the URL", () => {
  // A clean first load preserves its landing URL, even for an older "?"-style
  // link: the scenario hydrates into the form, but the initial render must not
  // canonicalize the address bar — no replaceState fires and the query string is
  // left in place. The Share button (not first render) produces the hash link.
  const { doc, win } = boot("?boxPrice=4200&subs=codex");

  assert.equal(
    win._historyUrls.length,
    0,
    "opening a share link does not rewrite the address bar on first load"
  );

  // The visible calculator state is still hydrated from the query string.
  assert.equal(doc.getElementById("box-price").value, 4200);
  assert.deepEqual(
    doc
      .querySelectorAll('#subscription-options input[type="checkbox"]:checked')
      .map((el) => el.value),
    ["codex"]
  );
});

test("sharing immediately after opening a query-string link canonicalizes the URL", async () => {
  const { doc, win } = boot("?boxPrice=4200&subs=codex");

  assert.equal(win._historyUrls.length, 0, "initial hydration does not rewrite the URL");
  assert.equal(doc.getElementById("box-price").value, 4200);
  assert.deepEqual(
    doc
      .querySelectorAll('#subscription-options input[type="checkbox"]:checked')
      .map((el) => el.value),
    ["codex"]
  );

  await doc.getElementById("share-button").dispatch("click");

  assert.equal(win._clipboardWrites.length, 1, "copies the hydrated scenario once");
  const sharedUrl = new URL(win._clipboardWrites[0]);
  assert.equal(sharedUrl.origin + sharedUrl.pathname, "https://payback.example/");
  assert.equal(sharedUrl.search, "", "the first Share replaces the legacy query string");
  assert.match(sharedUrl.hash, /boxPrice=4200/);
  assert.match(sharedUrl.hash, /subs=codex/);
  assert.equal(win._historyUrls.at(-1), win._clipboardWrites[0]);
  assert.equal(win.location.hash, sharedUrl.hash);
  assert.equal(doc.getElementById("share-status").textContent, "Link copied to clipboard.");
});

test("bootstrap ignores a non-share fragment when hydrating a query-string link", () => {
  const { doc, win } = boot("?boxPrice=4200&subs=codex", { hash: "#section=pricing" });

  assert.equal(doc.getElementById("box-price").value, 4200);
  assert.deepEqual(
    doc
      .querySelectorAll('#subscription-options input[type="checkbox"]:checked')
      .map((el) => el.value),
    ["codex"]
  );
  assert.equal(win._historyUrls.length, 0, "initial hydration does not rewrite the URL");
});

test("bootstrap and immediate Share fall back from a malformed hash to the query string", async () => {
  const { doc, win } = boot("?boxPrice=4200&subs=codex", { hash: "#boxPrice=abc" });

  assert.equal(doc.getElementById("box-price").value, 4200);
  assert.deepEqual(
    doc
      .querySelectorAll('#subscription-options input[type="checkbox"]:checked')
      .map((el) => el.value),
    ["codex"]
  );

  await doc.getElementById("share-button").dispatch("click");

  const sharedUrl = new URL(win._clipboardWrites[0]);
  assert.equal(sharedUrl.search, "");
  assert.equal(new URLSearchParams(sharedUrl.hash.slice(1)).get("boxPrice"), "4200");
  assert.equal(new URLSearchParams(sharedUrl.hash.slice(1)).get("subs"), "codex");
  assert.doesNotMatch(sharedUrl.hash, /abc/);
  assert.equal(win._historyUrls.at(-1), win._clipboardWrites[0]);
  assert.equal(win.location.hash, sharedUrl.hash);
});

test("mixed malformed hashes fall back as a whole and Share emits only valid query state", async () => {
  const { doc, win } = boot("?boxPrice=1000&apr=5&subs=codex", {
    hash: "#boxPrice=4200&apr=abc&customSpend=-1",
  });

  assert.equal(doc.getElementById("box-price").value, 1000);
  assert.equal(doc.getElementById("apr").value, 5);
  assert.deepEqual(
    doc
      .querySelectorAll('#subscription-options input[type="checkbox"]:checked')
      .map((el) => el.value),
    ["codex"]
  );

  await doc.getElementById("share-button").dispatch("click");

  const sharedUrl = new URL(win._clipboardWrites[0]);
  const params = new URLSearchParams(sharedUrl.hash.slice(1));
  assert.equal(params.get("boxPrice"), "1000");
  assert.equal(params.get("apr"), "5");
  assert.equal(params.get("subs"), "codex");
  assert.notEqual(params.get("customSpend"), "-1");
  assert.equal(sharedUrl.search, "");
});

test("hash-only mixed malformed state is rejected instead of partially hydrated", () => {
  const { doc } = boot("", { hash: "#boxPrice=4200&term=999" });

  assert.notEqual(doc.getElementById("box-price").value, 4200);
  assert.notEqual(doc.getElementById("term").value, 999);
});

test("negative custom-spend hashes fall back to a valid query-string scenario", async () => {
  const { doc, win } = boot("?boxPrice=4200&subs=codex", { hash: "#customSpend=-1" });

  assert.equal(doc.getElementById("box-price").value, 4200);
  assert.deepEqual(
    doc
      .querySelectorAll('#subscription-options input[type="checkbox"]:checked')
      .map((el) => el.value),
    ["codex"]
  );

  await doc.getElementById("share-button").dispatch("click");

  const sharedUrl = new URL(win._clipboardWrites[0]);
  const params = new URLSearchParams(sharedUrl.hash.slice(1));
  assert.equal(params.get("boxPrice"), "4200");
  assert.equal(params.get("subs"), "codex");
  assert.notEqual(params.get("customSpend"), "-1");
  assert.equal(sharedUrl.search, "");
});

test("immediate Share preserves all hydrated legacy query-string fields", async () => {
  const query =
    "?boxPrice=4200&downPayment=500&apr=7.5&term=24&electricityRate=0.2&powerDraw=100&hoursPerDay=8" +
    "&customSpend=125&paymentTiming=actual-cash-flow&modelSize=70&modelQuantization=fp16" +
    "&maintenance=1&resale=1&taxes=1&subs=codex";
  const { doc, win } = boot(query);

  await doc.getElementById("share-button").dispatch("click");

  const params = new URLSearchParams(new URL(win._clipboardWrites[0]).hash.slice(1));
  assert.equal(new URL(win._clipboardWrites[0]).search, "");
  assert.equal(win._historyUrls.at(-1), win._clipboardWrites[0]);
  assert.equal(win.location.hash, new URL(win._clipboardWrites[0]).hash);
  for (const [key, value] of [
    ["boxPrice", "4200"],
    ["downPayment", "500"],
    ["apr", "7.5"],
    ["term", "24"],
    ["electricityRate", "0.2"],
    ["powerDraw", "100"],
    ["hoursPerDay", "8"],
    ["customSpend", "125"],
    ["paymentTiming", "actual-cash-flow"],
    ["modelSize", "70"],
    ["modelQuantization", "fp16"],
    ["maintenance", "1"],
    ["resale", "1"],
    ["taxes", "1"],
    ["subs", "codex"],
  ]) {
    assert.equal(params.get(key), value, `${key} survives canonicalization`);
  }
});

test("initCalculator hydrates state from a hash-based share link", () => {
  const { doc } = boot("", { hash: "#boxPrice=4200&modelSize=70&modelQuantization=fp16&subs=codex" });

  assert.equal(doc.getElementById("box-price").value, 4200);
  assert.equal(String(doc.getElementById("model-size").value), "70");
  assert.equal(doc.getElementById("model-quantization").value, "fp16");
  const checked = doc
    .querySelectorAll('#subscription-options input[type="checkbox"]:checked')
    .map((el) => el.value);
  assert.deepEqual(checked, ["codex"]);
});

test("initCalculator ignores a malformed hash fragment in favor of the query string", () => {
  const { doc } = boot("?boxPrice=4200&subs=codex", { hash: "#boxPrice=" });

  assert.equal(doc.getElementById("box-price").value, 4200);
  const checked = doc
    .querySelectorAll('#subscription-options input[type="checkbox"]:checked')
    .map((el) => el.value);
  assert.deepEqual(checked, ["codex"]);
});

test("main.js boots immediately when the DOM is already ready", async () => {
  const doc = buildDocument();
  const win = buildWindow();
  const restore = await importMainWithBrowserGlobals(doc, win, "interactive");

  try {
    assert.equal(
      doc.listeners.get("DOMContentLoaded")?.length || 0,
      0,
      "already-ready documents do not need a DOMContentLoaded listener"
    );
    assert.equal(
      win._historyUrls.length,
      0,
      "booting on a ready document still preserves the clean landing URL"
    );
    assert.equal(
      doc.getElementById("pricing-list").children.length,
      subscriptions.length + hardware.length,
      "the calculator still initializes its rendered content"
    );
  } finally {
    restore();
  }
});

test("main.js defers boot until DOMContentLoaded when the document is loading", async () => {
  const doc = buildDocument();
  const win = buildWindow();
  const restore = await importMainWithBrowserGlobals(doc, win, "loading");

  try {
    assert.equal(
      doc.listeners.get("DOMContentLoaded")?.length || 0,
      1,
      "loading documents register one DOMContentLoaded bootstrap listener"
    );
    assert.equal(
      win._historyUrls.length,
      0,
      "loading documents do not boot until the DOMContentLoaded event fires"
    );
    await doc.dispatch("DOMContentLoaded");
    assert.equal(
      doc.getElementById("pricing-list").children.length,
      subscriptions.length + hardware.length,
      "the bootstrap listener eventually initializes the calculator"
    );
  } finally {
    restore();
  }
});

test("a live edit re-validates and updates the results status", async () => {
  const { doc } = boot();
  const apr = doc.getElementById("apr");
  const chartHint = doc.querySelector("#cost-chart .chart-hint");

  // The valid default state now lands on the power-user preset and shows a
  // break-even summary in the chart hint.
  assert.equal(chartHint.textContent, "Break-even reached in Month 8.");

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
    "Break-even month: Month 7; monthly net savings: $72."
  );
  // Recovery restores the break-even summary in the chart hint.
  assert.equal(chartHint.textContent, "Break-even reached in Month 7.");
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
    "Using selected subscriptions: $40/mo."
  );
});

test("whitespace-only custom spend falls back to the selected subscriptions", async () => {
  const { doc, win } = boot();
  const customSpend = doc.getElementById("custom-spend");
  customSpend.value = "   ";

  await doc.getElementById("calculator-form").dispatch("input");

  assert.equal(customSpend.getAttribute("aria-invalid"), "false");
  assert.equal(doc.getElementById("custom-spend-error"), null);
  assert.equal(
    doc.getElementById("spend-basis").textContent,
    "Using selected subscriptions: $40/mo."
  );
  const params = new URLSearchParams(win._historyUrls.at(-1).split("#")[1]);
  assert.equal(params.get("customSpend"), "");
});

test("whitespace-only required numeric inputs are invalid and never read as zero", async () => {
  const { doc, win } = boot();
  const boxPrice = doc.getElementById("box-price");
  boxPrice.value = "4200";
  await doc.getElementById("calculator-form").dispatch("input");
  const validUrl = win._historyUrls.at(-1);

  boxPrice.value = "   ";
  await doc.getElementById("calculator-form").dispatch("input");

  assert.equal(boxPrice.getAttribute("aria-invalid"), "true");
  assert.equal(doc.getElementById("box-price-error")?.textContent, "Enter a value.");
  assert.equal(
    doc.getElementById("results-status").textContent,
    "Some inputs need attention — fix the highlighted fields to see results."
  );
  assert.equal(win._historyUrls.at(-1), validUrl, "whitespace should not serialize as boxPrice=0");
  assert.ok(!win._historyUrls.at(-1).includes("boxPrice=0"));
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
  assert.equal(url.origin + url.pathname, "https://payback.example/");
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

test("share prefers the native Web Share API with a useful scenario summary", async () => {
  const { doc, win } = boot("", { share: "supported" });

  await doc.getElementById("share-button").dispatch("click");

  assert.equal(win._shareCalls.length, 1, "uses the native share sheet once");
  assert.equal(win._clipboardWrites.length, 0, "native sharing does not copy separately");
  const payload = win._shareCalls[0];
  assert.equal(payload.url, win._historyUrls.at(-1), "shares the canonical address-bar URL");
  assert.equal(payload.title, "AI Subscription Payback");
  assert.match(payload.text, /selected subscriptions:/i);
  assert.match(payload.text, /hardware price:\s*\$/i);
  assert.match(payload.text, /monthly savings:/i);
  assert.match(payload.text, /payback:/i);
  assert.equal(doc.getElementById("share-status").textContent, "Scenario shared.");
});

test("a rejected native share falls back to clipboard copying", async () => {
  const { doc, win } = boot("", { share: "fails" });

  await doc.getElementById("share-button").dispatch("click");

  assert.equal(win._shareCalls.length, 1, "attempts native sharing first");
  assert.equal(win._clipboardWrites.length, 1, "falls back to the Clipboard API");
  assert.equal(win._clipboardWrites[0], win._historyUrls.at(-1));
  assert.equal(doc.getElementById("share-status").textContent, "Link copied to clipboard.");
});

test("share falls back to execCommand when the Clipboard API is missing", async () => {
  const { doc, win } = boot("", { clipboard: "missing" });
  const copies = installExecCommandCopy(doc);

  await doc.getElementById("share-button").dispatch("click");

  assert.equal(win._clipboardWrites.length, 0, "no Clipboard API to write through");
  assert.equal(copies.length, 1, "falls back to a single execCommand copy");
  assert.equal(copies[0], win._historyUrls.at(-1), "copies the current share URL");
  assert.equal(
    doc.querySelector("textarea"),
    null,
    "the temporary textarea is removed after copying"
  );
  assert.equal(
    doc.getElementById("share-status").textContent,
    "Link copied to clipboard.",
    "the fallback copy still reports success"
  );
});

test("share falls back to execCommand when clipboard.writeText rejects", async () => {
  const { doc, win } = boot("", { clipboard: "fails" });
  const copies = installExecCommandCopy(doc);

  await doc.getElementById("share-button").dispatch("click");

  assert.equal(win._clipboardWrites.length, 0, "the rejected write records nothing");
  assert.equal(copies.length, 1, "a rejected Clipboard API write falls back to execCommand");
  assert.equal(copies[0], win._historyUrls.at(-1), "copies the current share URL");
  assert.equal(
    doc.getElementById("share-status").textContent,
    "Link copied to clipboard."
  );
});

test("share only reports failure when every copy path fails", async () => {
  const { doc, win } = boot("", { clipboard: "missing" });
  const copies = installExecCommandCopy(doc, false);

  await doc.getElementById("share-button").dispatch("click");

  assert.equal(win._clipboardWrites.length, 0, "no Clipboard API write happened");
  assert.equal(copies.length, 0, "execCommand reported failure, so nothing was copied");
  assert.equal(
    doc.querySelector("textarea"),
    null,
    "the temporary textarea is cleaned up even on failure"
  );
  // The address bar still holds the share URL, so the fallback message points
  // the user there.
  assert.equal(win.location.hash.startsWith("#"), true, "share URL remains in the address bar");
  assert.equal(
    doc.getElementById("share-status").textContent,
    "Copy failed — copy from the address bar."
  );
});

test("an explicitly empty subscription selection survives share and reload", async () => {
  const { doc, win } = boot();
  const checkboxes = doc.querySelectorAll('#subscription-options input[type="checkbox"]');
  for (const el of checkboxes) {
    el.checked = false;
  }
  doc.getElementById("custom-spend").value = "";

  await doc.getElementById("calculator-form").dispatch("input");

  const shared = new URL(win._historyUrls.at(-1));
  const params = new URLSearchParams(shared.hash.slice(1));
  assert.equal(params.get("subs"), "", "the shared URL keeps an explicit empty selection");
  assert.equal(params.get("customSpend"), "", "the shared URL keeps a blank custom spend");
  assert.equal(
    doc.getElementById("spend-basis").textContent,
    "Using selected subscriptions: $0/mo."
  );

  const reloaded = boot(`?${shared.hash.slice(1)}`);
  const restored = reloaded.doc
    .querySelectorAll('#subscription-options input[type="checkbox"]:checked')
    .map((el) => el.value);
  assert.deepEqual(restored, [], "reloading the shared URL keeps zero subscriptions selected");
  assert.equal(
    reloaded.doc.getElementById("spend-basis").textContent,
    "Using selected subscriptions: $0/mo."
  );
});

test("a shared query-string URL with a blank custom spend falls back to $0/mo", () => {
  // Older "?"-style links round-trip an explicit blank custom spend: the field
  // stays empty instead of reading as 0, and with no subscriptions selected the
  // comparison basis falls back to $0/mo from the selected subscriptions.
  const { doc } = boot("?subs=&customSpend=");

  assert.equal(doc.getElementById("custom-spend").value, "");
  const checked = doc
    .querySelectorAll('#subscription-options input[type="checkbox"]:checked')
    .map((el) => el.value);
  assert.deepEqual(checked, [], "no subscription plans are selected");
  assert.equal(
    doc.getElementById("spend-basis").textContent,
    "Using selected subscriptions: $0/mo."
  );
});

test("a shared query-string URL treats whitespace-only numeric params as absent", () => {
  const { doc } = boot("?boxPrice=%20&customSpend=%20");

  assert.equal(doc.getElementById("box-price").value, defaults.boxPrice);
  assert.equal(doc.getElementById("custom-spend").value, "");
  assert.equal(
    doc.getElementById("spend-basis").textContent,
    "Using selected subscriptions: $40/mo."
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

test("an invalid numeric edit does not replace the last valid shareable hash", async () => {
  const { doc, win } = boot();

  // Establish a fresh valid scenario so the last synced hash is unambiguous.
  doc.getElementById("box-price").value = "4200";
  await doc.getElementById("calculator-form").dispatch("input");
  const lastValidUrl = win._historyUrls.at(-1);
  const syncCountBeforeInvalid = win._historyUrls.length;
  assert.ok(lastValidUrl.includes("boxPrice=4200"));

  // Now type an invalid, non-empty value: readState() turns this into NaN, which
  // must never be serialized into the address bar.
  doc.getElementById("box-price").value = "abc";
  await doc.getElementById("calculator-form").dispatch("input");

  // Results reflect the invalid state, but the shareable hash is untouched.
  assert.equal(
    doc.getElementById("results-status").textContent,
    "Some inputs need attention — fix the highlighted fields to see results."
  );
  assert.equal(
    win._historyUrls.length,
    syncCountBeforeInvalid,
    "an invalid edit writes no new address-bar URL"
  );
  assert.equal(
    win._historyUrls.at(-1),
    lastValidUrl,
    "the last valid hash survives the invalid edit"
  );
  assert.ok(
    !win.location.hash.includes("NaN"),
    "the address bar is never poisoned with NaN"
  );
});

test("sharing while an input is invalid copies the current valid URL", async () => {
  const { doc, win } = boot();

  // Move to a known-good scenario; this is the URL the address bar now holds.
  doc.getElementById("box-price").value = "4200";
  await doc.getElementById("calculator-form").dispatch("input");
  const validUrl = win._historyUrls.at(-1);

  // Break an input. The address bar must stay on the last valid scenario.
  doc.getElementById("box-price").value = "abc";
  await doc.getElementById("calculator-form").dispatch("input");

  await doc.getElementById("share-button").dispatch("click");

  assert.equal(win._clipboardWrites.length, 1, "copies exactly one URL");
  assert.equal(
    win._clipboardWrites[0],
    validUrl,
    "sharing copies the last valid URL, not the mid-edit inputs"
  );
  const copied = new URL(win._clipboardWrites[0]);
  const params = new URLSearchParams(copied.hash.slice(1));
  assert.equal(params.get("boxPrice"), "4200");
  assert.ok(!win._clipboardWrites[0].includes("NaN"), "never copies a NaN-poisoned URL");
  assert.equal(
    doc.getElementById("share-status").textContent,
    "Link copied to clipboard."
  );
});

test("an in-page anchor clobbering the hash does not lose the share scenario", async () => {
  const { doc, win } = boot();

  // Establish a valid, non-default scenario so the current state is unambiguous.
  doc.getElementById("box-price").value = "4200";
  await doc.getElementById("calculator-form").dispatch("input");
  const validUrl = win._historyUrls.at(-1);
  const validParams = new URLSearchParams(new URL(validUrl).hash.slice(1));
  assert.equal(validParams.get("boxPrice"), "4200");
  const expectedSubs = validParams.get("subs");

  // An in-page anchor (e.g. a "#calculator" nav link) clobbers the address-bar
  // hash without firing an input event, so the scenario is no longer in the hash.
  win.location.hash = "#calculator";

  await doc.getElementById("share-button").dispatch("click");

  // The copied URL still carries the current boxPrice/subs, not a bare URL.
  assert.equal(win._clipboardWrites.length, 1, "copies exactly one URL");
  const copied = new URL(win._clipboardWrites[0]);
  assert.equal(copied.hash.startsWith("#"), true, "share URL keeps the scenario hash");
  const copiedParams = new URLSearchParams(copied.hash.slice(1));
  assert.equal(copiedParams.get("boxPrice"), "4200", "share keeps the current box price");
  assert.equal(copiedParams.get("subs"), expectedSubs, "share keeps the current subscriptions");
  assert.ok(!win._clipboardWrites[0].includes("#calculator"), "never copies the anchor hash");

  // The address bar is restored to the share URL, undoing the anchor clobber.
  assert.equal(win._historyUrls.at(-1), win._clipboardWrites[0]);
  assert.equal(win.location.hash, copied.hash, "address bar is restored to the share scenario");
  assert.equal(
    doc.getElementById("share-status").textContent,
    "Link copied to clipboard."
  );
});

test("resetting the form restores inputs, subscriptions, results, and hash to defaults", async () => {
  const { doc, win } = boot();

  // Boot no longer rewrites the address bar, so sync the pristine default form
  // once to capture the default scenario hash we must return to after a reset.
  await doc.getElementById("calculator-form").dispatch("input");
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
  assert.equal(doc.getElementById("custom-spend").value, 200);
  assert.equal(doc.getElementById("spend-preset").value, "");

  // The default subscriptions are re-selected.
  assert.deepEqual(subscriptionSelection(), defaultSubs);
  // Results are recomputed from the defaults.
  assert.equal(doc.getElementById("results-status").textContent, defaultStatus);

  assert.equal(
    doc.getElementById("spend-basis").textContent,
    "Using custom budget: $200/mo (Power user preset); selected plans are reference-only."
  );

  // The shareable hash is back to the default scenario.
  assert.equal(new URL(win._historyUrls.at(-1)).hash, defaultHash);
});
