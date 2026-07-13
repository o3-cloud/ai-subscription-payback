/**
 * Calculator controller — DOM wiring for the scaffold.
 *
 * This sets up the structure future calculator work will build on:
 *  - populates the form with default inputs and subscription options
 *  - renders comparison, pricing, and assumptions content from static data
 *  - wires live-update + validation listeners
 *  - serializes state into a shareable URL
 *
 * The core payback computation is real and deterministic so the UI can render
 * break-even results and the cumulative cost table entirely in the browser.
 */

import {
  subscriptions,
  hardware,
  getAffiliate,
  defaults,
  assumptions,
  pricingLastUpdated,
  siteLastUpdated,
  horizonMonths,
  daysPerMonth,
  optionalCostRates,
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
import { createAnalytics } from "./analytics.js";

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

// Model constants live in data.js so the methodology copy and the math share a
// single source of truth.
const DAYS_PER_MONTH = daysPerMonth;
const MAINTENANCE_RATE_ANNUAL = optionalCostRates.maintenanceAnnualRate;
const RESALE_RATE = optionalCostRates.resaleValueRate;
const SALES_TAX_RATE = optionalCostRates.salesTaxRate;

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function clamp(value, min = 0, max = Number.POSITIVE_INFINITY) {
  return Math.min(max, Math.max(min, value));
}

function selectedSubscriptionMonthlyCost(state) {
  const selected = new Set(Array.isArray(state.subscriptions) ? state.subscriptions : []);
  return subscriptions.reduce(
    (total, sub) => total + (selected.has(sub.id) ? sub.monthlyPrice : 0),
    0
  );
}

function monthlyElectricityCost(state) {
  return (
    (clamp(toNumber(state.powerDraw)) / 1000) *
    clamp(toNumber(state.hoursPerDay), 0, 24) *
    DAYS_PER_MONTH *
    clamp(toNumber(state.electricityRate))
  );
}

function monthlyMaintenanceCost(state) {
  if (!state.maintenance) return 0;
  return clamp(toNumber(state.boxPrice)) * (MAINTENANCE_RATE_ANNUAL / 12);
}

function upfrontSalesTax(state) {
  if (!state.taxes) return 0;
  return clamp(toNumber(state.boxPrice)) * SALES_TAX_RATE;
}

function resaleCredit(state) {
  if (!state.resale) return 0;
  return clamp(toNumber(state.boxPrice)) * RESALE_RATE;
}

function loanPayment(principal, apr, termMonths) {
  const term = Math.max(1, Math.round(termMonths));
  const borrowed = Math.max(0, principal);
  if (borrowed === 0) return 0;

  const monthlyRate = clamp(apr) / 100 / 12;
  if (monthlyRate === 0) {
    return borrowed / term;
  }

  const factor = 1 - Math.pow(1 + monthlyRate, -term);
  if (factor === 0) return borrowed / term;
  return (borrowed * monthlyRate) / factor;
}

function renderSeries(doc, series, breakEvenMonth) {
  const tbody = doc.querySelector("#cost-table tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  if (!series.length) {
    const row = doc.createElement("tr");
    const cell = doc.createElement("td");
    cell.colSpan = 3;
    cell.textContent = "Cost breakdown appears here after calculation.";
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  for (const point of series) {
    const row = doc.createElement("tr");
    if (breakEvenMonth !== null && point.month === breakEvenMonth) {
      row.setAttribute("data-breakeven", "true");
    }

    const monthCell = doc.createElement("td");
    monthCell.textContent = String(point.month);
    const subCell = doc.createElement("td");
    subCell.textContent = formatCurrency(point.subscriptionCost);
    const ownCell = doc.createElement("td");
    ownCell.textContent = formatCurrency(point.ownershipCost);

    row.appendChild(monthCell);
    row.appendChild(subCell);
    row.appendChild(ownCell);
    tbody.appendChild(row);
  }
}

/**
 * Compute the payback comparison from calculator state.
 *
 * The comparison uses cumulative costs over a fixed horizon:
 * - subscription spend grows linearly from the selected plans
 * - ownership cost includes the upfront down payment, financing payment,
 *   operating electricity, optional maintenance, optional sales tax, and an
 *   optional resale credit at the end of the analysis horizon
 *
 * @param {Record<string, number|boolean|string[]>} state
 * @returns {{ breakEvenMonth: number|null, monthlyPayment: number|null, monthlyNetSavings: number|null, series: Array<{month:number, subscriptionCost:number, ownershipCost:number, monthlySubscriptionCost:number, monthlyOwnershipCost:number}> }}
 */
export function computeResult(state) {
  const subscriptionMonthlyCost = selectedSubscriptionMonthlyCost(state);
  const boxPrice = clamp(toNumber(state.boxPrice));
  const downPayment = clamp(toNumber(state.downPayment), 0, boxPrice);
  const principal = Math.max(0, boxPrice - downPayment);
  const term = Math.max(1, Math.round(toNumber(state.term)) || 1);
  const monthlyPayment = loanPayment(principal, toNumber(state.apr), term);
  const recurringMonthlyCost = monthlyPayment + monthlyElectricityCost(state) + monthlyMaintenanceCost(state);
  const monthlyNetSavings = subscriptionMonthlyCost - recurringMonthlyCost;
  const upfrontCost = downPayment + upfrontSalesTax(state);
  const resale = resaleCredit(state);
  const series = [];
  let breakEvenMonth = null;

  for (let month = 1; month <= horizonMonths; month += 1) {
    const loanMonthsPaid = Math.min(month, term);
    const cumulativeSubscriptionCost = subscriptionMonthlyCost * month;
    const cumulativeOwnershipCost =
      upfrontCost +
      monthlyElectricityCost(state) * month +
      monthlyMaintenanceCost(state) * month +
      monthlyPayment * loanMonthsPaid -
      (month === horizonMonths ? resale : 0);

    series.push({
      month,
      subscriptionCost: cumulativeSubscriptionCost,
      ownershipCost: cumulativeOwnershipCost,
      monthlySubscriptionCost: subscriptionMonthlyCost,
      monthlyOwnershipCost: month <= term ? recurringMonthlyCost : recurringMonthlyCost - monthlyPayment,
    });

    if (breakEvenMonth === null && cumulativeOwnershipCost <= cumulativeSubscriptionCost) {
      breakEvenMonth = month;
    }
  }

  return {
    breakEvenMonth,
    monthlyPayment,
    monthlyNetSavings,
    series,
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
    renderSeries(doc, []);
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
      result.monthlyNetSavings === null ? "—" : formatCurrency(result.monthlyNetSavings);
  }
  if (status) {
    status.textContent =
      result.breakEvenMonth === null
        ? `Break-even not reached within ${horizonMonths} months.`
        : `Break-even reached in ${formatBreakEven(result.breakEvenMonth)}.`;
  }

  renderSeries(doc, result.series, result.breakEvenMonth);

  const chartHint = doc.querySelector("#cost-chart .chart-hint");
  if (chartHint) {
    chartHint.textContent =
      result.breakEvenMonth === null
        ? `No break-even within ${horizonMonths} months.`
        : `Break-even reached in ${formatBreakEven(result.breakEvenMonth)}.`;
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

function setInputValue(doc, id, value) {
  const el = doc.getElementById(id);
  if (!el) return;
  el.value = String(value);
}

function renderFeaturedHardware(doc, analytics) {
  const container = doc.getElementById("featured-hardware-cards");
  const status = doc.getElementById("featured-hardware-status");
  if (!container) return;

  container.innerHTML = "";

  for (const box of hardware) {
    const card = doc.createElement("article");
    card.className = "hardware-card";

    const title = doc.createElement("h3");
    title.className = "hardware-card-title";
    title.textContent = box.name;
    card.appendChild(title);

    const spec = doc.createElement("p");
    spec.className = "hardware-card-spec";
    spec.textContent = box.spec;
    card.appendChild(spec);

    const price = doc.createElement("p");
    price.className = "hardware-card-amount";
    price.appendChild(doc.createTextNode("Price: "));
    price.appendChild(doc.createTextNode(priceRange(box.priceLow, box.priceHigh)));
    card.appendChild(price);

    const source = doc.createElement("p");
    source.className = "hardware-card-source";
    source.appendChild(doc.createTextNode(`Source: ${box.sourceLabel} `));
    source.appendChild(externalLink(doc, box.sourceUrl, "View source", false));
    card.appendChild(source);

    const note = doc.createElement("p");
    note.className = "hardware-card-note";
    note.textContent = box.priceNote;
    card.appendChild(note);

    const actions = doc.createElement("div");
    actions.className = "hardware-card-actions";

    const useButton = doc.createElement("button");
    useButton.type = "button";
    useButton.className = "button button-primary hardware-card-use";
    useButton.textContent = "Use this system";
    useButton.addEventListener("click", () => {
      if (analytics) analytics.trackInteraction();
      const boxPrice = box.defaultBoxPrice ?? box.priceLow;
      const powerDraw = box.powerDraw ?? defaults.powerDraw;
      setInputValue(doc, FIELD_IDS.boxPrice, boxPrice);
      setInputValue(doc, FIELD_IDS.powerDraw, powerDraw);
      setInputValue(
        doc,
        FIELD_IDS.downPayment,
        Math.min(
          toNumber(doc.getElementById(FIELD_IDS.downPayment)?.value || defaults.downPayment),
          boxPrice
        )
      );
      if (status) {
        status.textContent = `${box.name} loaded into the calculator.`;
      }
      update(doc);
    });
    actions.appendChild(useButton);

    const affiliate = getAffiliate(box.id);
    if (affiliate) {
      const cta = externalLink(doc, affiliate.url, affiliate.label, affiliate.affiliate);
      cta.className = "button hardware-card-cta";
      actions.appendChild(cta);
    }

    card.appendChild(actions);
    container.appendChild(card);
  }

  if (status && !status.textContent.trim()) {
    status.textContent = "Choose a system to load its assumptions into the calculator.";
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

/**
 * Attach outbound-click tracking to every external link in the comparison and
 * pricing sections. Links funnel through `externalLink`, which marks affiliate
 * links with `rel="... sponsored"`, so we can tag each click as affiliate or
 * not without threading extra state through the render helpers. These sections
 * render once at boot, so a single pass is enough.
 */
function wireOutboundLinks(doc, analytics) {
  const links = [
    ...doc.querySelectorAll("#featured-hardware-cards a"),
    ...doc.querySelectorAll("#comparison-body a"),
    ...doc.querySelectorAll("#pricing-list a"),
  ];
  for (const link of links) {
    const href = link.getAttribute("href");
    if (!href) continue;
    const affiliate = /\bsponsored\b/.test(link.getAttribute("rel") || "");
    link.addEventListener("click", () => analytics.trackOutbound(href, affiliate));
  }
}

function wireShare(doc, win, analytics) {
  const button = doc.getElementById("share-button");
  const status = doc.getElementById("share-status");
  if (!button) return;

  button.addEventListener("click", async () => {
    if (analytics) analytics.trackShare();
    const state = readState(doc);
    const query = serializeState(state);
    const base = win.location.origin + win.location.pathname;
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
  const analytics = createAnalytics(win);
  const initialState = parseState(win.location ? win.location.search : "", defaults);

  renderFeaturedHardware(doc, analytics);
  renderSubscriptionOptions(doc, initialState.subscriptions);
  renderComparison(doc);
  renderPricing(doc);
  renderAssumptions(doc);

  wireOutboundLinks(doc, analytics);
  applyState(doc, { ...defaults, ...initialState });

  const form = doc.getElementById("calculator-form");
  if (form) {
    form.addEventListener("input", () => update(doc));
    form.addEventListener("change", () => {
      analytics.trackInteraction();
      update(doc);
    });
    form.addEventListener("reset", () => {
      // Let the native reset run first, then restore data-driven defaults.
      win.setTimeout(() => {
        renderSubscriptionOptions(doc);
        applyState(doc, defaults);
        update(doc);
      }, 0);
    });
  }

  wireShare(doc, win, analytics);
  analytics.trackPageview();
  update(doc);
}
