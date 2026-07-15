# Feature: Calculator Outputs

```gherkin
Scenario: Break-even month is shown
  Given valid subscription and hardware inputs
  When the calculation runs
  Then the break-even month is displayed

Scenario: No break-even within horizon
  Given inputs where the selected hardware never becomes cheaper within the horizon
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

Scenario: Comparison basis reflects the active subscription spend
  Given the visitor uses checked subscriptions, a preset spend, or a custom spend
  When the calculation runs
  Then the results identify which monthly subscription budget is being compared
  And the chart summary matches the selected comparison basis

Scenario: Month-by-month table is collapsed by default
  Given a computed result is displayed
  When the visitor views the results area
  Then the full month-by-month cost table is collapsed behind a toggle by default
  And the toggle lets the visitor expand the table to show all months
  And the table remains present as the accessible equivalent of the chart

Scenario: Chart reflects the numbers
  Given a computed result
  When the chart renders
  Then the cumulative subscription and ownership lines are visible
  And the break-even marker appears at the stated break-even month when one exists

Scenario: Featured box comparison is shown
  Given multiple hardware profiles are available
  When the calculation runs
  Then the result identifies the selected box by name
  And the comparison table shows the subscription spend versus that box's cost profile

Scenario: Results update live
  Given a computed result is displayed
  When the visitor changes any input
  Then the displayed result and chart update to match

Scenario: Capability caveat is shown with the results
  Given the visitor views the calculator results area
  When they read the results panel
  Then a visible caveat states the comparison is cost-only
  And it notes local hardware may not replace hosted agents, frontier model quality, or managed workflows
  And it notes the result does not rate capability or coding performance
  And it notes the figures are not financial advice
```
