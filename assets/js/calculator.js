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
  spendPresets,
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
  validateCustomSpend,
  serializeState,
  parseState,
  readShareParams,
  buildShareUrl,
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
  customSpend: "custom-spend",
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

/** True when a usable (non-negative, numeric) custom spend has been entered. */
function hasCustomSpend(state) {
  const value = state.customSpend;
  if (value === "" || value === null || value === undefined) return false;
  const num = Number(value);
  return Number.isFinite(num) && num >= 0;
}

/**
 * The monthly subscription spend the comparison runs against: the custom spend
 * when the visitor has entered one, otherwise the sum of the checked plans.
 */
function monthlySubscriptionCost(state) {
  return hasCustomSpend(state)
    ? Number(state.customSpend)
    : selectedSubscriptionMonthlyCost(state);
}

/**
 * The spend preset whose value equals the active custom spend, if any. Used to
 * label the comparison basis as a named preset (including the default one)
 * rather than as a figure the visitor typed. Returns null when the custom spend
 * is blank or does not line up with a preset.
 */
function matchingSpendPreset(state) {
  if (!hasCustomSpend(state)) return null;
  const value = Number(state.customSpend);
  return spendPresets.find((preset) => preset.value === value) || null;
}

/** The short, human name of a preset ("Power user" from "Power user — $200/mo"). */
function spendPresetName(preset) {
  return preset.label.split("—")[0].trim();
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

const SVG_NS = "http://www.w3.org/2000/svg";

// Viewport for the cumulative-cost chart. The SVG scales to its container via a
// viewBox, so these are relative units, not pixels.
const CHART = {
  width: 640,
  height: 280,
  padding: { top: 18, right: 16, bottom: 30, left: 56 },
};

/**
 * Build the cumulative-cost line chart as an inline SVG from the computed
 * series. The chart is decorative (aria-hidden): the enclosing figure carries
 * the role=img label and the `#cost-table` data table is the accessible
 * equivalent, so announcing the SVG too would duplicate the information.
 *
 * @param {Document} doc
 * @param {Array<{month:number, subscriptionCost:number, ownershipCost:number}>} series
 * @param {number|null} breakEvenMonth
 * @returns {object} an SVG element
 */
function buildChartSvg(doc, series, breakEvenMonth) {
  const { width, height, padding } = CHART;
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const minMonth = series[0].month;
  const maxMonth = series[series.length - 1].month;
  const monthSpan = maxMonth - minMonth || 1;
  const values = series.flatMap((p) => [p.subscriptionCost, p.ownershipCost]);
  const maxVal = Math.max(0, ...values);
  const minVal = Math.min(0, ...values);
  const valueSpan = maxVal - minVal || 1;

  const xFor = (month) => padding.left + ((month - minMonth) / monthSpan) * plotW;
  const yFor = (value) => padding.top + (1 - (value - minVal) / valueSpan) * plotH;

  const el = (tag, attrs = {}) => {
    const node = doc.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attrs)) {
      node.setAttribute(name, String(value));
    }
    return node;
  };

  const svg = el("svg", {
    viewBox: `0 0 ${width} ${height}`,
    class: "cost-chart-svg",
    preserveAspectRatio: "xMidYMid meet",
    "data-chart": "cost",
    "aria-hidden": "true",
    focusable: "false",
  });

  // Baseline (value = 0) and left axis for visual grounding.
  const baselineY = yFor(0);
  svg.appendChild(
    el("line", {
      class: "chart-axis",
      x1: padding.left,
      y1: baselineY,
      x2: width - padding.right,
      y2: baselineY,
    })
  );
  svg.appendChild(
    el("line", {
      class: "chart-axis",
      x1: padding.left,
      y1: padding.top,
      x2: padding.left,
      y2: height - padding.bottom,
    })
  );

  const points = (key) =>
    series.map((p) => `${xFor(p.month).toFixed(1)},${yFor(p[key]).toFixed(1)}`).join(" ");

  svg.appendChild(
    el("polyline", {
      "data-series": "subscription",
      class: "chart-line chart-line-subscription",
      fill: "none",
      points: points("subscriptionCost"),
    })
  );
  svg.appendChild(
    el("polyline", {
      "data-series": "ownership",
      class: "chart-line chart-line-ownership",
      fill: "none",
      points: points("ownershipCost"),
    })
  );

  if (breakEvenMonth !== null) {
    const crossing = series.find((p) => p.month === breakEvenMonth) || series[0];
    const bx = xFor(breakEvenMonth);
    const group = el("g", { "data-breakeven-marker": "true" });
    group.appendChild(
      el("line", {
        class: "chart-breakeven-line",
        x1: bx,
        y1: padding.top,
        x2: bx,
        y2: height - padding.bottom,
      })
    );
    group.appendChild(
      el("circle", {
        class: "chart-breakeven-dot",
        cx: bx,
        cy: yFor(crossing.ownershipCost),
        r: 4,
      })
    );
    // Keep the label inside the plot near the crossing, nudging it left once the
    // break-even lands in the right third so it never spills off the viewBox.
    const anchor = bx > padding.left + plotW * 0.66 ? "end" : "start";
    const labelX = anchor === "end" ? bx - 6 : bx + 6;
    const label = el("text", {
      "data-breakeven-label": "true",
      class: "chart-breakeven-label",
      x: labelX,
      y: padding.top + 12,
      "text-anchor": anchor,
    });
    label.textContent = `Break-even: ${formatBreakEven(breakEvenMonth)}`;
    group.appendChild(label);
    svg.appendChild(group);
  }

  return svg;
}

/**
 * Render (or clear) the cumulative-cost chart inside `#cost-chart`, leaving the
 * textual `.chart-hint` summary in place so the container always keeps its
 * caption. An empty series removes any prior chart.
 */
function renderChart(doc, series, breakEvenMonth) {
  const chart = doc.getElementById("cost-chart");
  if (!chart) return;

  const existing = doc.querySelector("#cost-chart svg[data-chart]");
  if (existing) existing.remove();

  if (!series.length) return;

  const svg = buildChartSvg(doc, series, breakEvenMonth);
  const hint = doc.querySelector("#cost-chart .chart-hint");
  if (hint) {
    chart.insertBefore(svg, hint);
  } else {
    chart.appendChild(svg);
  }
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
 * - subscription spend grows linearly from the custom monthly spend when one is
 *   entered, otherwise from the sum of the selected plans
 * - ownership cost includes the upfront down payment, financing payment,
 *   operating electricity, optional maintenance, optional sales tax, and an
 *   optional resale credit at the end of the analysis horizon
 *
 * @param {Record<string, number|boolean|string[]>} state
 * @returns {{ breakEvenMonth: number|null, monthlyPayment: number|null, monthlyNetSavings: number|null, series: Array<{month:number, subscriptionCost:number, ownershipCost:number, monthlySubscriptionCost:number, monthlyOwnershipCost:number}> }}
 */
export function computeResult(state) {
  const subscriptionMonthlyCost = monthlySubscriptionCost(state);
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

/**
 * Reflect a field's validity in the DOM: toggle aria-invalid and add or remove
 * an inline `<p class="field-error">` describing the problem.
 */
function applyFieldValidity(doc, el, valid, message) {
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
  } else if (errorEl) {
    errorEl.remove();
    el.removeAttribute("aria-describedby");
  }
}

function validateForm(doc) {
  let allValid = true;
  for (const [key, bounds] of Object.entries(NUMERIC_FIELDS)) {
    const el = doc.getElementById(FIELD_IDS[key]);
    if (!el) continue;
    const { valid, message } = validateNumber(el.value, bounds);
    applyFieldValidity(doc, el, valid, message);
    if (!valid) allValid = false;
  }

  // Custom spend is optional: blank falls back to the checked subscriptions, so
  // it validates separately (empty is fine, a provided value must be >= 0).
  const spendEl = doc.getElementById(FIELD_IDS.customSpend);
  if (spendEl) {
    const { valid, message } = validateCustomSpend(spendEl.value);
    applyFieldValidity(doc, spendEl, valid, message);
    if (!valid) allValid = false;
  }
  return allValid;
}

function renderResults(doc, state, valid) {
  const status = doc.getElementById("results-status");
  const breakevenEl = doc.querySelector('[data-metric="breakeven"]');
  const paymentEl = doc.querySelector('[data-metric="payment"]');
  const savingsEl = doc.querySelector('[data-metric="savings"]');

  const chartHint = doc.querySelector("#cost-chart .chart-hint");
  const spendBasis = doc.getElementById("spend-basis");

  if (!valid) {
    if (status) {
      status.textContent =
        "Some inputs need attention — fix the highlighted fields to see results.";
    }
    if (breakevenEl) breakevenEl.textContent = "—";
    if (paymentEl) paymentEl.textContent = "—";
    if (savingsEl) savingsEl.textContent = "—";
    if (spendBasis) spendBasis.textContent = "";
    // Clear any stale summary so an invalid state never leaves a prior
    // "no break-even" (or break-even) message visible in the chart region.
    if (chartHint) {
      chartHint.textContent = "Fix the highlighted fields to see the chart.";
    }
    renderChart(doc, []);
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
  if (spendBasis) {
    const monthly = formatCurrency(monthlySubscriptionCost(state));
    if (hasCustomSpend(state)) {
      // A custom spend that matches a preset (including the default power-user
      // basis) is labelled as the preset, so a default or one-click selection
      // is never mislabelled as a figure the visitor typed themselves.
      const preset = matchingSpendPreset(state);
      spendBasis.textContent = preset
        ? `Comparing against the ${spendPresetName(preset)} preset (${monthly}/mo).`
        : `Comparing against your custom ${monthly}/mo subscription spend.`;
    } else {
      spendBasis.textContent = `Comparing against ${monthly}/mo from the selected subscriptions.`;
    }
  }

  renderChart(doc, result.series, result.breakEvenMonth);
  renderSeries(doc, result.series, result.breakEvenMonth);

  if (chartHint) {
    chartHint.textContent =
      result.breakEvenMonth === null
        ? `No break-even within ${horizonMonths} months.`
        : `Break-even reached in ${formatBreakEven(result.breakEvenMonth)}.`;
  }
}

/**
 * Rewrite the address bar so the shareable link mirrors the current inputs.
 * Uses the hash fragment and replaceState, so it never reloads the page or adds
 * history entries as the visitor edits.
 *
 * Only ever called with a valid form: an invalid non-empty numeric input reads
 * back as NaN, which would serialize into the hash (e.g. `boxPrice=NaN`) and
 * poison the shareable URL. Gating on validity keeps the last valid scenario in
 * the address bar until the inputs are usable again.
 */
function syncShareUrl(doc, win) {
  if (!win || !win.history || !win.history.replaceState) return;
  const url = buildShareUrl(win.location, serializeState(readState(doc)));
  win.history.replaceState(null, "", url);
}

function update(doc, win) {
  const valid = validateForm(doc);
  const state = readState(doc);
  renderResults(doc, state, valid);
  syncSpendPreset(doc);
  // Only mirror a valid scenario into the address bar; an invalid edit must not
  // replace the last valid shareable hash with NaN-poisoned params.
  if (win && valid) syncShareUrl(doc, win);
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
    // Include the plan so tiers that share a product name (the Claude Code
    // ladder) stay distinguishable in the checkbox list.
    label.appendChild(
      doc.createTextNode(
        ` ${sub.name} — ${sub.plan} · ${formatCurrency(sub.monthlyPrice)}/mo`
      )
    );
    container.appendChild(label);
  }
}

/**
 * Populate the common-spend preset selector from data. The leading placeholder
 * option keeps the "custom / from subscriptions" fallback selectable.
 */
function renderSpendPresets(doc) {
  const select = doc.getElementById("spend-preset");
  if (!select) return;
  select.innerHTML = "";

  const placeholder = doc.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Custom / from subscriptions";
  select.appendChild(placeholder);

  for (const preset of spendPresets) {
    const option = doc.createElement("option");
    option.value = String(preset.value);
    option.textContent = preset.label;
    select.appendChild(option);
  }
}

/**
 * Keep the preset selector in step with the custom-spend input: a value that
 * matches a preset selects it, anything else (including a manual entry or a
 * blank) falls back to the placeholder.
 */
function syncSpendPreset(doc) {
  const select = doc.getElementById("spend-preset");
  const input = doc.getElementById(FIELD_IDS.customSpend);
  if (!select || !input) return;
  const match = spendPresets.find((preset) => String(preset.value) === input.value);
  select.value = match ? String(match.value) : "";
}

/**
 * Wire the preset selector so choosing a level fills the custom-spend input and
 * recomputes. The selector itself is never part of the serialized state — it is
 * purely a shortcut for the custom-spend input.
 */
function wireSpendPresets(doc, win) {
  const select = doc.getElementById("spend-preset");
  const input = doc.getElementById(FIELD_IDS.customSpend);
  if (!select || !input) return;
  select.addEventListener("change", () => {
    if (select.value !== "") input.value = select.value;
    update(doc, win);
  });
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
 * Human labels for a pricing entry's verification status. The `verification`
 * value is the machine-readable classification; this maps it to the short chip
 * text shown to the visitor.
 */
const VERIFICATION_LABELS = {
  official: "Official",
  retailer: "Retailer",
  estimate: "Estimate",
};

/**
 * Append a verification status chip for a pricing entry: a small, categorical
 * badge distinguishing an official vendor price from a retailer/street price or
 * a class estimate. The chip carries the last-verified date in its tooltip so
 * the status and its freshness travel together.
 */
function appendVerificationStatus(doc, parent, entry) {
  const status = entry.verification;
  if (!status) return;
  const badge = doc.createElement("span");
  badge.className = `source-status source-status-${status}`;
  badge.setAttribute("data-verification", status);
  const label = VERIFICATION_LABELS[status] || status;
  badge.textContent = label;
  if (entry.lastUpdated) {
    badge.setAttribute("title", `${label} price · last verified ${entry.lastUpdated}`);
  }
  parent.appendChild(badge);
  parent.appendChild(doc.createTextNode(" · "));
}

/** Append a machine-readable last-verified stamp for a pricing entry. */
function appendFreshness(doc, parent, lastUpdated) {
  if (!lastUpdated) return;
  parent.appendChild(doc.createTextNode(" · verified "));
  const time = doc.createElement("time");
  time.className = "source-updated";
  time.setAttribute("datetime", lastUpdated);
  time.textContent = lastUpdated;
  parent.appendChild(time);
}

/**
 * Append the price provenance for a pricing entry: a short source label, an
 * outbound link to the quoted source, and the date the number was last curated.
 *
 * This deliberately renders only pricing provenance — never the affiliate CTA —
 * so the visible "where this price came from" trail can never be conflated with
 * a commissioned link. Callers append the affiliate CTA separately with
 * `appendAffiliateLink`, keeping the two concerns visibly and structurally apart.
 */
function appendSourceProvenance(doc, parent, entry) {
  appendVerificationStatus(doc, parent, entry);
  if (entry.sourceLabel) {
    const label = doc.createElement("span");
    label.className = "source-label";
    label.textContent = entry.sourceLabel;
    parent.appendChild(label);
    parent.appendChild(doc.createTextNode(" · "));
  }
  parent.appendChild(externalLink(doc, entry.sourceUrl, "Source", false));
  appendFreshness(doc, parent, entry.lastUpdated);
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

/**
 * Append a muted secondary detail line to a table/list cell — used for a plan's
 * billing cadence and included-value copy, kept separate from the price so the
 * comparison value (`monthlyPrice`) always reads as the headline number.
 */
function appendPlanDetail(doc, parent, className, text) {
  if (!text) return;
  const span = doc.createElement("span");
  span.className = `plan-detail ${className}`;
  span.textContent = text;
  parent.appendChild(span);
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

    const nameCell = doc.createElement("td");
    nameCell.textContent = sub.name;
    row.appendChild(nameCell);

    // Plan cell carries the tier name plus what a seat at this tier includes.
    const planCell = doc.createElement("td");
    planCell.appendChild(doc.createTextNode(sub.plan));
    appendPlanDetail(doc, planCell, "plan-included", sub.includedValue);
    row.appendChild(planCell);

    // Price cell keeps the monthly comparison value as the headline and shows
    // the real billing cadence (monthly, annual up front, per seat) beneath it.
    const priceCell = doc.createElement("td");
    priceCell.appendChild(
      doc.createTextNode(`${formatCurrency(sub.monthlyPrice)}/mo`)
    );
    appendPlanDetail(doc, priceCell, "plan-cadence", sub.billingCadence);
    row.appendChild(priceCell);

    const sourceCell = doc.createElement("td");
    appendSourceProvenance(doc, sourceCell, sub);
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
    appendSourceProvenance(doc, sourceCell, box);
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

/**
 * Mark the card for `boxId` as the loaded system and clear the highlight from
 * every other card, so the featured grid always shows exactly one active box.
 * Pass `null` to clear all highlights.
 * @param {Array<{ id: string, card: object }>} cards
 * @param {string|null} boxId
 */
function setActiveHardwareCard(cards, boxId) {
  for (const { id, card } of cards) {
    if (id === boxId) {
      card.setAttribute("data-active", "true");
    } else {
      card.removeAttribute("data-active");
    }
  }
}

/**
 * Identify which featured hardware box, if any, the current inputs match. A box
 * is considered "loaded" only when both its price and power draw match, which
 * disambiguates boxes that share a default price.
 * @param {object} doc
 * @returns {string|null} the matching hardware id, or null
 */
function matchLoadedHardware(doc) {
  const boxPrice = toNumber(doc.getElementById(FIELD_IDS.boxPrice)?.value);
  const powerDraw = toNumber(doc.getElementById(FIELD_IDS.powerDraw)?.value);
  const match = hardware.find(
    (box) =>
      (box.defaultBoxPrice ?? box.priceLow) === boxPrice &&
      (box.powerDraw ?? defaults.powerDraw) === powerDraw
  );
  return match ? match.id : null;
}

function renderFeaturedHardware(doc, win, analytics) {
  const container = doc.getElementById("featured-hardware-cards");
  const status = doc.getElementById("featured-hardware-status");
  if (!container) return null;

  container.innerHTML = "";

  const cards = [];

  for (const box of hardware) {
    const card = doc.createElement("article");
    card.className = "hardware-card";
    cards.push({ id: box.id, card });

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
    source.appendChild(doc.createTextNode("Source: "));
    appendSourceProvenance(doc, source, box);
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
      setActiveHardwareCard(cards, box.id);
      update(doc, win);
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

  return cards;
}

function renderPricing(doc) {
  const list = doc.getElementById("pricing-list");
  if (list) {
    list.innerHTML = "";
    for (const sub of subscriptions) {
      const li = doc.createElement("li");
      li.textContent =
        `${sub.name} — ${sub.plan}: ${formatCurrency(sub.monthlyPrice)}/mo ` +
        `(${sub.billingCadence}). ${sub.includedValue} `;
      appendSourceProvenance(doc, li, sub);
      appendAffiliateLink(doc, li, sub.id);
      list.appendChild(li);
    }
    for (const box of hardware) {
      const li = doc.createElement("li");
      li.textContent = `${box.name} (${box.spec}): ${priceRange(
        box.priceLow,
        box.priceHigh
      )}. ${box.priceNote} `;
      appendSourceProvenance(doc, li, box);
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
    } else if (key === "customSpend") {
      // Optional field: an empty default must actively clear a prior entry
      // (e.g. on reset), so unlike the numeric inputs it is not guarded on "".
      el.value =
        state[key] === undefined || state[key] === "" ? "" : state[key];
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
    // Copy the URL that already mirrors the last valid scenario (the address bar
    // is kept in sync by update() on every edit) rather than rebuilding from the
    // live inputs, which may be mid-edit/invalid and would serialize NaN.
    const url = buildShareUrl(win.location, readShareParams(win.location));

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
  });
}

/**
 * Initialize the calculator scaffold against a document/window.
 * @param {Document} doc
 * @param {Window} win
 */
export function initCalculator(doc, win) {
  const analytics = createAnalytics(win);
  const initialState = parseState(
    readShareParams(win.location ? win.location : {}),
    defaults
  );

  const hardwareCards = renderFeaturedHardware(doc, win, analytics) || [];
  renderSubscriptionOptions(doc, initialState.subscriptions);
  renderSpendPresets(doc);
  renderComparison(doc);
  renderPricing(doc);
  renderAssumptions(doc);

  wireOutboundLinks(doc, analytics);
  wireSpendPresets(doc, win);
  applyState(doc, { ...defaults, ...initialState });
  syncSpendPreset(doc);
  // Reflect a preset that arrived via the URL/hash, so a shared link that
  // matches a featured box lands with that card already highlighted.
  setActiveHardwareCard(hardwareCards, matchLoadedHardware(doc));
  update(doc, win);

  const form = doc.getElementById("calculator-form");
  if (form) {
    form.addEventListener("input", () => update(doc, win));
    form.addEventListener("change", () => {
      analytics.trackInteraction();
      update(doc, win);
    });
    form.addEventListener("reset", (event) => {
      // Own the restore outright instead of racing the native reset. The inputs
      // carry no default `value` attributes, so a native reset would blank them
      // and leave correctness depending on a deferred re-apply firing in time.
      // Cancel it and restore the data-driven defaults synchronously so every
      // visible input, the selected subscriptions, the results, and the
      // shareable hash return to defaults in one pass.
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      renderSubscriptionOptions(doc);
      applyState(doc, defaults);
      setActiveHardwareCard(hardwareCards, matchLoadedHardware(doc));
      update(doc, win);
    });
  }

  wireShare(doc, win, analytics);
  analytics.trackPageview();
  update(doc);
}
