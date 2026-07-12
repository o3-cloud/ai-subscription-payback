# BDD — Behavior Specifications

Gherkin-style scenarios describing observable, first-order behavior of the
static site. These focus on what a user can see and do, not implementation.

---

## Feature: Static Site Delivery

```gherkin
Scenario: Site loads without a backend
  Given the site is deployed to GitHub Pages
  When a visitor opens the site URL
  Then the page renders fully from static assets
  And no server-side API call is required to show the calculator

Scenario: Calculator works offline of any API
  Given the page has finished loading
  When the visitor uses the calculator
  Then all computation happens client-side
  And results appear without a network request

Scenario: Last-updated date is visible
  Given the pricing data has a lastUpdated field
  When the visitor views the pricing section
  Then the last-updated date is displayed
```

---

## Feature: Calculator Inputs

```gherkin
Scenario: Default inputs produce a result on load
  Given the visitor has not changed any input
  When the page loads
  Then default values are populated for subscriptions and hardware
  And a break-even result is shown immediately

Scenario: Select subscriptions to compare
  Given the calculator is visible
  When the visitor selects Codex and Claude Code
  Then both subscriptions are included in the monthly subscription cost

Scenario: Adjust hardware and financing inputs
  Given the calculator is visible
  When the visitor changes box price, down payment, APR, or term
  Then the total cost of ownership recalculates

Scenario: Adjust operating inputs
  Given the calculator is visible
  When the visitor changes electricity rate, power draw, or hours per day
  Then the ongoing running cost recalculates

Scenario: Invalid input is handled
  Given a numeric input field
  When the visitor enters a negative or non-numeric value
  Then the field shows a validation message
  And the result does not display a nonsensical value
```

---

## Feature: Calculator Outputs

```gherkin
Scenario: Break-even month is shown
  Given valid subscription and hardware inputs
  When the calculation runs
  Then the break-even month (payback timeline) is displayed

Scenario: No break-even within horizon
  Given inputs where the local box never becomes cheaper within the horizon
  When the calculation runs
  Then the result clearly states that break-even is not reached
  And does not display a misleading month number

Scenario: Cumulative cost comparison is shown
  Given valid inputs
  When the calculation runs
  Then cumulative subscription cost and cumulative ownership cost are shown over time

Scenario: Chart reflects the numbers
  Given a computed result
  When the chart renders
  Then the crossover point on the chart matches the stated break-even month

Scenario: Results update live
  Given a computed result is displayed
  When the visitor changes any input
  Then the displayed result and chart update to match
```

---

## Feature: Pricing Disclosure

```gherkin
Scenario: Subscription prices and sources are disclosed
  Given the pricing section
  When the visitor views it
  Then each subscription's price, plan, and source is listed
  And the date the price was last updated is shown

Scenario: Prices are described as estimates
  Given the pricing section
  When the visitor reads the disclosure
  Then it states prices are periodically curated and may be out of date
```

---

## Feature: Affiliate Disclosure

```gherkin
Scenario: Affiliate relationship is disclosed
  Given the page contains affiliate links
  When the visitor views the page
  Then a clear affiliate disclosure statement is present

Scenario: Affiliate links are identifiable
  Given an affiliate link
  When the visitor inspects or hovers it
  Then it is marked as an affiliate/outbound link
  And clicking it does not change the calculator results
```

---

## Feature: Responsive Design

```gherkin
Scenario: Mobile layout
  Given a viewport width typical of a phone
  When the visitor opens the site
  Then inputs, results, and chart stack in a readable single-column layout
  And no horizontal scrolling is required

Scenario: Desktop layout
  Given a wide viewport
  When the visitor opens the site
  Then inputs and results are shown side by side

Scenario: Keyboard and assistive access
  Given the calculator
  When the visitor navigates by keyboard
  Then every input is reachable and operable
  And result updates are announced to assistive technology

Scenario: Respects theme and motion preferences
  Given the visitor's OS prefers dark mode or reduced motion
  When the page loads
  Then the site honors color-scheme and reduced-motion preferences
```
