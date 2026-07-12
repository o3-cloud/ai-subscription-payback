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

import { initCalculator } from "../assets/js/calculator.js";
import {
  subscriptions,
  hardware,
  getAffiliate,
  defaults,
  assumptions,
  pricingLastUpdated,
  siteLastUpdated,
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
  "results-status",
  "comparison-body",
  "pricing-list",
  "pricing-last-updated",
  "site-last-updated",
  "assumptions-list",
  "share-button",
];

const NUMERIC_INPUT_IDS = [
  "box-price",
  "down-payment",
  "apr",
  "term",
  "electricity-rate",
  "power-draw",
  "hours-per-day",
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
  for (const metric of ["breakeven", "payment", "savings"]) {
    const el = doc.createElement("span");
    el.setAttribute("data-metric", metric);
    body.appendChild(el);
  }

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

  return doc;
}

function buildWindow(search = "") {
  const clipboardWrites = [];
  const historyUrls = [];
  return {
    location: {
      search,
      origin: "https://payback.example",
      pathname: "/index.html",
    },
    setTimeout: (fn) => {
      fn();
      return 0;
    },
    navigator: {
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
    _clipboardWrites: clipboardWrites,
    _historyUrls: historyUrls,
  };
}

function boot(search = "") {
  const doc = buildDocument();
  const win = buildWindow(search);
  initCalculator(doc, win);
  return { doc, win };
}

/* ----------------------------- tests ----------------------------- */

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
    doc.getElementById("assumptions-list").children.length,
    assumptions.length
  );

  // Last-updated timestamps stamped with both text and machine-readable attr.
  const pricingTime = doc.getElementById("pricing-last-updated");
  assert.equal(pricingTime.textContent, pricingLastUpdated);
  assert.equal(pricingTime.getAttribute("datetime"), pricingLastUpdated);
  assert.equal(
    doc.getElementById("site-last-updated").getAttribute("datetime"),
    siteLastUpdated
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

test("initCalculator renders the coming-soon results state for valid inputs", () => {
  const { doc } = boot();
  assert.equal(
    doc.getElementById("results-status").textContent,
    "Inputs look valid. Full payback calculation is coming soon."
  );
  // computeResult is a documented stub, so metrics show placeholders.
  assert.equal(doc.querySelector('[data-metric="breakeven"]').textContent, "Not reached");
  assert.equal(doc.querySelector('[data-metric="payment"]').textContent, "—");
  assert.equal(doc.querySelector('[data-metric="savings"]').textContent, "—");
});

test("initCalculator hydrates state from the location query string", () => {
  const { doc } = boot("?boxPrice=4200&subs=codex");

  assert.equal(doc.getElementById("box-price").value, 4200);
  const checked = doc
    .querySelectorAll('#subscription-options input[type="checkbox"]:checked')
    .map((el) => el.value);
  assert.deepEqual(checked, ["codex"]);
});

test("a live edit re-validates and updates the results status", async () => {
  const { doc } = boot();
  const apr = doc.getElementById("apr");

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

  // Fixing the value clears the error and restores the valid status.
  apr.value = "5";
  await doc.getElementById("calculator-form").dispatch("input");

  assert.equal(apr.getAttribute("aria-invalid"), "false");
  assert.equal(doc.getElementById("apr-error"), null, "removes the field error");
  assert.equal(
    doc.getElementById("results-status").textContent,
    "Inputs look valid. Full payback calculation is coming soon."
  );
});

test("the share button serializes current state into a shareable URL", async () => {
  const { doc, win } = boot();

  await doc.getElementById("share-button").dispatch("click");

  assert.equal(win._clipboardWrites.length, 1, "copies exactly one URL");
  const url = new URL(win._clipboardWrites[0]);
  assert.equal(url.origin + url.pathname, "https://payback.example/index.html");
  assert.equal(url.searchParams.get("boxPrice"), String(defaults.boxPrice));
  assert.equal(url.searchParams.get("term"), String(defaults.term));
  assert.equal(
    url.searchParams.get("subs"),
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
