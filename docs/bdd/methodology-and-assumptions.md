# Feature: Methodology and Assumptions

```gherkin
Scenario: Methodology section explains the math
  Given the visitor scrolls to the methodology section
  When they read it
  Then the page explains how break-even is calculated
  And the page defines the major assumptions used in the model

Scenario: Assumptions are visible by default
  Given the calculator page loads
  When the visitor views the summary
  Then the current assumptions are visible or easy to expand

Scenario: User can see what is excluded
  Given the methodology section
  When the visitor reads it
  Then the page states which costs are excluded by default
  And the page states when those costs can be toggled on

Scenario: Hybrid local workflows can model cloud spillover with custom spend
  Given a visitor uses a hybrid local workflow such as LM Studio Bionic
  When they read the methodology and calculator help
  Then the page explains that hosted cloud-token spillover is entered through custom monthly spend
  And it does not describe LM Studio Bionic as a cancelable flat subscription

Scenario: Methodology matches displayed outputs
  Given a break-even result is shown
  When the visitor compares the result to the methodology
  Then the result is consistent with the documented formula
```

## Model clarifications

These pin down the deterministic formulas `computeResult` implements so outputs
stay consistent with the methodology copy.

- **Monthly subscription cost** is the sum of the monthly price of every
  selected plan. With no plan selected it is `0`.
- **`monthlyPrice` is the comparison value for every tier, regardless of billing
  cadence.** Annually billed tiers store their effective monthly cost
  (annual price ÷ 12) as `monthlyPrice`, so the cumulative comparison stays
  month-by-month even when a plan is actually paid yearly up front. The real
  cadence is documented per tier in `billingCadence` and shown in the comparison
  and pricing sections, but it never changes the math — a $200/yr Pro annual plan
  compares at `$17/mo`, not as a lump sum.
- **Monthly loan payment** amortizes the financed principal
  `max(0, boxPrice − downPayment)` over `term` months at `apr/100/12` per month.
  When the APR is `0` the payment is a flat `principal / term`; when nothing is
  financed the payment is `0`.
- **Electricity (monthly)** = `(powerDraw ÷ 1000) × hoursPerDay × 30.4 × rate`.
- **Optional maintenance** adds `3%` of the box price per year, spread evenly
  across the months (off by default).
- **Optional sales tax** adds `8%` of the box price as a one-time upfront cost
  (off by default).
- **Optional resale value** credits `25%` of the box price against ownership
  cost, realized once at the end of the horizon (off by default).
- **Cumulative ownership cost** at month _m_ =
  `downPayment + taxUpfront + payment × min(m, term)
   + (electricity + maintenance) × m`, less the resale credit at the final month.
- **Cumulative subscription cost** at month _m_ = `monthlySubscription × m`.
- **Break-even month** is the first month within the 60-month horizon where
  cumulative subscription cost reaches cumulative ownership cost. If that never
  happens within the horizon, the result reports that break-even is not reached
  rather than showing a month.
- **Monthly net savings** compares monthly subscription spend against the
  recurring monthly cost of ownership (loan payment + electricity + maintenance);
  a negative value means owning the box costs more each month.
- **Practical model-fit guidance** on the featured hardware cards is a conservative
  heuristic derived from the published memory or VRAM spec and the repo's wide
  throughput ranges. It is intentionally not a benchmark promise because model
  fit changes with quantization, context length, batching, and runtime settings.
- When a vendor publishes an official workload ceiling for a featured card, the
  card shows that claim separately from the site's heuristic so the vendor's own
  limit and the repo's conservative guidance cannot be confused. For DGX Spark,
  that means NVIDIA's 200B-parameter inference, 70B-parameter fine-tuning, and
  405B two-system ceiling are shown as vendor claims, not as the site's
  practical coding heuristic.
