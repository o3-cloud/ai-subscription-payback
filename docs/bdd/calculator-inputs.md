# Feature: Calculator Inputs

```gherkin
Scenario: Default inputs produce a result on load
  Given the visitor has not changed any input
  When the page loads
  Then default values are populated for subscriptions and hardware profiles
  And a break-even result is shown immediately

Scenario: Select subscriptions to compare
  Given the calculator is visible
  When the visitor selects Codex and Claude Code
  Then both subscriptions are included in the monthly subscription cost

Scenario: Select a featured hardware profile
  Given the calculator is visible
  When the visitor selects Mac Studio, DGX Spark, or Strix Halo
  Then the corresponding hardware assumptions load into the form
  And the selected profile updates the payoff calculation

Scenario: Adjust hardware and financing inputs
  Given the calculator is visible
  When the visitor changes box price, down payment, APR, or term
  Then the total cost of ownership recalculates

Scenario: Adjust operating inputs
  Given the calculator is visible
  When the visitor changes electricity rate, power draw, or hours per day
  Then the ongoing running cost recalculates

Scenario: Toggle optional assumptions
  Given optional operating assumptions are available
  When the visitor enables or disables maintenance, resale value, or taxes
  Then the calculation updates to include or exclude those assumptions

Scenario: Invalid input is handled
  Given a numeric input field
  When the visitor enters a negative or non-numeric value
  Then the field shows a validation message
  And the result does not display a nonsensical value
```
