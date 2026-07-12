# Feature: Calculator Outputs

The results area is scaffolded and usable, but the core payback math is not yet
implemented. `computeResult` is a documented stub (see `assets/js/calculator.js`)
that returns no numbers, so the UI renders a clear placeholder / "coming soon"
state rather than misleading figures. The scenarios below are split into the
behavior that ships today and the behavior planned for the calculator-logic
milestone.

## Current behavior (shipped scaffold)

```gherkin
Scenario: Results region renders with metric placeholders
  Given the calculator page loads
  When the results region is shown
  Then the break-even month, monthly loan payment, and monthly net savings
    labels are present
  And each metric value shows a placeholder because the math is not yet
    implemented

Scenario: Valid inputs show a coming-soon status
  Given all inputs are valid
  When the results update
  Then the status reads "Inputs look valid. Full payback calculation is coming soon."
  And the break-even metric shows "Not reached"
  And the monthly loan payment and monthly net savings each show a dash ("—")

Scenario: Invalid inputs suppress results
  Given at least one input is invalid or empty
  When the results update
  Then the status reads "Some inputs need attention — fix the highlighted fields to see results."
  And every metric value shows a dash ("—")

Scenario: Results update live as inputs change
  Given the results are displayed
  When the visitor changes any input
  Then the inputs are re-validated
  And the status message updates to match the current validity

Scenario: Chart area shows an accessible placeholder
  Given the calculator page loads
  When the chart figure is shown
  Then a labeled chart placeholder invites the visitor to wait for calculation logic
  And an accompanying data table (Month / Subscription cost / Ownership cost)
    shows a placeholder row until numbers are available
```

## Planned behavior (calculator-logic milestone, not yet implemented)

These scenarios describe the full payback math the scaffold is built to support.
They are the target for the calculator-logic milestone and do **not** pass today.

```gherkin
Scenario: Break-even month is shown
  Given valid subscription and hardware inputs
  When the calculation runs
  Then the break-even month is displayed

Scenario: No break-even within horizon
  Given inputs where the local box never becomes cheaper within the horizon
  When the calculation runs
  Then the result clearly states that break-even is not reached
  And does not display a misleading month number

Scenario: Cumulative cost comparison is shown
  Given valid inputs
  When the calculation runs
  Then cumulative subscription cost and cumulative ownership cost are shown over time

Scenario: Monthly payment is shown
  Given a financed hardware scenario
  When the calculation runs
  Then the monthly loan payment is displayed
  And the payment reflects the selected APR and term

Scenario: Net savings or overage is shown
  Given subscription and hardware inputs
  When the calculation runs
  Then the site shows whether the hardware option is cheaper each month
  And the result includes monthly net savings or extra cost

Scenario: Chart reflects the numbers
  Given a computed result
  When the chart renders
  Then the crossover point on the chart matches the stated break-even month

Scenario: Results update live
  Given a computed result is displayed
  When the visitor changes any input
  Then the displayed result and chart update to match
```
