# Feature: Calculator Inputs

```gherkin
Scenario: Default inputs produce a result on load
  Given the visitor has not changed any input
  When the page loads
  Then default values are populated for subscriptions and hardware profiles
  And the default comparison basis is the $200/mo power-user preset
  And a break-even result is shown immediately

Scenario: Select subscriptions to compare
  Given the calculator is visible
  When the visitor selects Codex and Claude Code
  Then both subscriptions are included in the monthly subscription cost

Scenario: Choose a custom monthly subscription spend
  Given the calculator is visible
  When the visitor selects a preset or types a custom subscription budget
  Then the custom spend field drives the comparison basis
  And the preset selector stays in sync with the typed amount when it matches a preset

Scenario: Invalid custom subscription spend is rejected
  Given the calculator is visible
  When the visitor enters a negative or non-numeric custom spend
  Then the custom spend field shows a validation message
  And the result does not display a nonsensical value

Scenario: A shared link that matches a featured profile loads it active
  Given a shared link whose hardware price and power draw match a featured profile
  When the page loads from that link
  Then that featured hardware card is marked as active on initial render

Scenario: Select a featured hardware profile
  Given the calculator is visible
  When the visitor chooses a trim from a range-based featured card and clicks "Use this system"
  Then the corresponding hardware assumptions load into the form
  And the loaded price and power draw match the chosen trim
  And the selected profile updates the payoff calculation
  And the selected hardware card is visibly marked as active
  And any previously active hardware card is no longer marked active

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
  And the chart summary does not keep any stale break-even text
  And the chart region shows a validation-specific hint instead

Scenario: Whitespace-only input is treated as empty
  Given a calculator input field
  When the visitor enters only whitespace
  Then the value is treated as absent rather than read as 0
  And a required numeric field shows the "enter a value" validation message
  And a whitespace-only custom spend falls back to the selected subscriptions

Scenario: Fixing an invalid input restores the result
  Given a numeric input field showing a validation message
  When the visitor corrects the value so all inputs are valid
  Then the field validation message clears
  And the chart summary and result are recomputed from the corrected inputs

Scenario: Reset restores the default scenario
  Given the visitor has changed inputs, optional toggles, or the selected subscriptions
  When the visitor clicks "Reset to defaults"
  Then every calculator input returns to its default value
  And the default subscriptions are re-selected
  And the result recomputes from the defaults
  And the shareable link reflects the default scenario
  And no featured hardware card is marked active
```
