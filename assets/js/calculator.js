/**
 * Calculator controller — DOM wiring for the scaffold.
 *
 * This sets up the structure future calculator work will build on:
 *  - populates the form with default inputs and subscription options
 *  - renders comparison, pricing, and assumptions content from static data
 *  - wires live-update + validation listeners
 *  - serializes state into a shareable URL
 *
 * The core payback math (`computeResult`) is deliberately a documented stub;
 * see GitHub issue for the calculator-logic milestone. The plumbing around it
 * (inputs, live updates, results region, chart table) is complete and usable.
 */

import {
  subscriptions,
  hardware,
  getAffiliate,
  defaults,
  assumptions,
  pricingLastUpdated,
  siteLastUpdated,
} from "./data.js";
import {
  NUMERIC_FIELDS,
  BOOLEAN_FIELDS,
  validateNumber,
  serializeState,
  parseState,
  formatCurrency,
  formatBreakEven,
} from "./state.js";

/** Map of state keys to their input element ids. */
const FIELD_IDS = {
  boxPrice: "box-price",
  downPayment: "down-payment",
  apr: "apr",
  term: "term",
  electricityRate: "electricity-rate",
  powerDraw: "power-draw",
  hoursPerDay: "hours-per-day",
  maintenance: "opt-maintenance",
  resale: "opt-resale",
  taxes: "opt-taxes",
};

/**
 * Placeholder for the payback computation. Returns nulls so the UI renders a
 * clear "coming soon" state instead of misleading numbers. Future work fills
 * this in using the documented methodology.
 *
 * @param {Record<string, number|boolean|string[]>} _state
 * @returns {{ breakEvenMonth: number|null, monthlyPayment: number|null, monthlyNetSavings: number|null, series: Array<{month:number, subscriptionCost:number, ownershipCost:number}> }}
 */
export function computeResult(_state) {
  return {
    breakEvenMonth: null,
    monthlyPayment: null,
    monthlyNetSavings: null,
    series: [],
  };
}

function readState(doc) {
  const state = { subscriptions: [] };

  for (const [key, id] of Object.entries(FIELD_IDS)) {
    const el = doc.getElementById(id);
    if (!el) continue;
    if (el.type === "checkbox") {
      state[key] = el.checked;
    } else {
      state[key] = el.value === "" ? "" : Number(el.value);
    }
  }

  doc
    .querySelectorAll('#subscription-options input[type="checkbox"]:checked')
    .forEach((el) => state.subscriptions.push(el.value));

  return state;
}

function validateForm(doc) {
  let allValid = true;
  for (const [key, bounds] of Object.entries(NUMERIC_FIELDS)) {
    const el = doc.getElementById(FIELD_IDS[key]);
    if (!el) continue;
    const { valid, message } = validateNumber(el.value, bounds);
    el.setAttribute("aria-invalid", valid ? "false" : "true");

    const errorId = `${el.id}-error`;
    let errorEl = doc.getElementById(errorId);
    if (!valid) {
      if (!errorEl) {
        errorEl = doc.createElement("p");
        errorEl.id = errorId;
        errorEl.className = "field-error";
        el.setAttribute("aria-describedby", errorId);
        el.parentElement.appendChild(errorEl);
      }
      errorEl.textContent = message;
      allValid = false;
    } else if (errorEl) {
      errorEl.remove();
      el.removeAttribute("aria-describedby");
    }
  }
  return allValid;
}

function renderResults(doc, state, valid) {
  const status = doc.getElementById("results-status");
  const breakevenEl = doc.querySelector('[data-metric="breakeven"]');
  const paymentEl = doc.querySelector('[data-metric="payment"]');
  const savingsEl = doc.querySelector('[data-metric="savings"]');

  if (!valid) {
    if (status) {
      status.textContent =
        "Some inputs need attention — fix the highlighted fields to see results.";
    }
    if (breakevenEl) breakevenEl.textContent = "—";
    if (paymentEl) paymentEl.textContent = "—";
    if (savingsEl) savingsEl.textContent = "—";
    return;
  }

  const result = computeResult(state);

  if (breakevenEl) breakevenEl.textContent = formatBreakEven(result.breakEvenMonth);
  if (paymentEl) {
    paymentEl.textContent =
      result.monthlyPayment === null ? "—" : formatCurrency(result.monthlyPayment);
  }
  if (savingsEl) {
    savingsEl.textContent =
      result.monthlyNetSavings === null
        ? "—"
        : formatCurrency(result.monthlyNetSavings);
  }
  if (status) {
    status.textContent =
      result.breakEvenMonth === null
        ? "Inputs look valid. Full payback calculation is coming soon."
        : "";
  }
}

function update(doc) {
  const valid = validateForm(doc);
  const state = readState(doc);
  renderResults(doc, state, valid);
  return state;
}

/* ---------------- one-time rendering from static data ---------------- */

function renderSubscriptionOptions(doc, preselected) {
  const container = doc.getElementById("subscription-options");
  if (!container) return;
  container.innerHTML = "";
  for (const sub of subscriptions) {
    const label = doc.createElement("label");
    label.className = "checkbox";
    const input = doc.createElement("input");
    input.type = "checkbox";
    input.value = sub.id;
    input.name = "subscriptions";
    input.checked = preselected
      ? preselected.includes(sub.id)
      : Boolean(sub.defaultSelected);
    label.appendChild(input);
    label.appendChild(
      doc.createTextNode(` ${sub.name} — ${formatCurrency(sub.monthlyPrice)}/mo`)
    );
    container.appendChild(label);
  }
}

function externalLink(doc, href, text, affiliate) {
  const a = doc.createElement("a");
  a.setAttribute("href", href);
  a.textContent = affiliate ? `${text} (affiliate)` : text;
  a.setAttribute("target", "_blank");
  a.setAttribute("rel", "noopener noreferrer" + (affiliate ? " sponsored" : ""));
  return a;
}

/**
 * Append the reseller / affiliate call to action for a pricing entry, pulling
 * it from the separate affiliate metadata rather than the pricing entry itself.
 * No-op when the entry has no affiliate record.
 */
function appendAffiliateLink(doc, parent, id) {
  const affiliate = getAffiliate(id);
  if (!affiliate) return;
  parent.appendChild(doc.createTextNode(" "));
  parent.appendChild(
    externalLink(doc, affiliate.url, affiliate.label, affiliate.affiliate)
  );
}

/** Render a currency range, collapsing to a single value when low === high. */
function priceRange(low, high) {
  return low === high
    ? formatCurrency(low)
    : `${formatCurrency(low)}–${formatCurrency(high)}`;
}

function renderComparison(doc) {
  const body = doc.getElementById("comparison-body");
  if (!body) return;
  body.innerHTML = "";

  for (const sub of subscriptions) {
    const row = doc.createElement("tr");
    row.innerHTML =
      `<td>${sub.name}</td><td>${sub.plan}</td>` +
      `<td>${formatCurrency(sub.monthlyPrice)}/mo</td>`;
    const sourceCell = doc.createElement("td");
    sourceCell.appendChild(externalLink(doc, sub.sourceUrl, "Source", false));
    appendAffiliateLink(doc, sourceCell, sub.id);
    row.appendChild(sourceCell);
    body.appendChild(row);
  }

  for (const box of hardware) {
    const row = doc.createElement("tr");
    row.innerHTML =
      `<td>${box.name}</td><td>${box.spec}</td>` +
      `<td>${priceRange(box.priceLow, box.priceHigh)}</td>`;
    const sourceCell = doc.createElement("td");
    sourceCell.appendChild(externalLink(doc, box.sourceUrl, "Source", false));
    appendAffiliateLink(doc, sourceCell, box.id);
    row.appendChild(sourceCell);
    body.appendChild(row);
  }
}

function renderPricing(doc) {
  const list = doc.getElementById("pricing-list");
  if (list) {
    list.innerHTML = "";
    for (const sub of subscriptions) {
      const li = doc.createElement("li");
      li.textContent = `${sub.name} — ${sub.plan}: ${formatCurrency(sub.monthlyPrice)}/mo. `;
      li.appendChild(externalLink(doc, sub.sourceUrl, "Source", false));
      appendAffiliateLink(doc, li, sub.id);
      list.appendChild(li);
    }
    for (const box of hardware) {
      const li = doc.createElement("li");
      li.textContent = `${box.name} (${box.spec}): ${priceRange(
        box.priceLow,
        box.priceHigh
      )}. ${box.priceNote} `;
      li.appendChild(externalLink(doc, box.sourceUrl, "Source", false));
      appendAffiliateLink(doc, li, box.id);
      list.appendChild(li);
    }
  }

  const pricingTime = doc.getElementById("pricing-last-updated");
  if (pricingTime) {
    pricingTime.setAttribute("datetime", pricingLastUpdated);
    pricingTime.textContent = pricingLastUpdated;
  }
  const siteTime = doc.getElementById("site-last-updated");
  if (siteTime) {
    siteTime.setAttribute("datetime", siteLastUpdated);
    siteTime.textContent = siteLastUpdated;
  }
}

function renderAssumptions(doc) {
  const list = doc.getElementById("assumptions-list");
  if (!list) return;
  list.innerHTML = "";
  for (const item of assumptions) {
    const li = doc.createElement("li");
    li.textContent = item;
    list.appendChild(li);
  }
}

function applyState(doc, state) {
  for (const [key, id] of Object.entries(FIELD_IDS)) {
    const el = doc.getElementById(id);
    if (!el) continue;
    if (el.type === "checkbox") {
      if (BOOLEAN_FIELDS.includes(key)) el.checked = Boolean(state[key]);
    } else if (state[key] !== undefined && state[key] !== "") {
      el.value = state[key];
    }
  }
}

function wireShare(doc, win) {
  const button = doc.getElementById("share-button");
  const status = doc.getElementById("share-status");
  if (!button) return;

  button.addEventListener("click", async () => {
    const state = readState(doc);
    const query = serializeState(state);
    const base =
      win.location.origin + win.location.pathname;
    const url = query ? `${base}?${query}` : base;

    try {
      if (win.navigator && win.navigator.clipboard) {
        await win.navigator.clipboard.writeText(url);
        if (status) status.textContent = "Link copied to clipboard.";
      } else {
        throw new Error("clipboard unavailable");
      }
    } catch {
      if (status) status.textContent = "Copy failed — copy from the address bar.";
    }
    // Reflect the scenario in the address bar without reloading.
    if (win.history && win.history.replaceState) {
      win.history.replaceState(null, "", url);
    }
  });
}

/**
 * Initialize the calculator scaffold against a document/window.
 * @param {Document} doc
 * @param {Window} win
 */
export function initCalculator(doc, win) {
  const initialState = parseState(win.location ? win.location.search : "", defaults);

  renderSubscriptionOptions(doc, initialState.subscriptions);
  renderComparison(doc);
  renderPricing(doc);
  renderAssumptions(doc);

  applyState(doc, { ...defaults, ...initialState });

  const form = doc.getElementById("calculator-form");
  if (form) {
    form.addEventListener("input", () => update(doc));
    form.addEventListener("change", () => update(doc));
    form.addEventListener("reset", () => {
      // Let the native reset run first, then restore data-driven defaults.
      win.setTimeout(() => {
        renderSubscriptionOptions(doc);
        applyState(doc, defaults);
        update(doc);
      }, 0);
    });
  }

  wireShare(doc, win);
  update(doc);
}
