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

Scenario: Methodology matches displayed outputs
  Given a break-even result is shown
  When the visitor compares the result to the methodology
  Then the result is consistent with the documented formula
```
