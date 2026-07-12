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

Scenario: Chart reflects the numbers
  Given a computed result
  When the chart renders
  Then the crossover point on the chart matches the stated break-even month

Scenario: Featured box comparison is shown
  Given multiple hardware profiles are available
  When the calculation runs
  Then the result identifies the selected box by name
  And the comparison table shows the subscription spend versus that box's cost profile

Scenario: Results update live
  Given a computed result is displayed
  When the visitor changes any input
  Then the displayed result and chart update to match
```
