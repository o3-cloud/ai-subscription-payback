# Feature: Subscription Selector Filters

```gherkin
Scenario: Search and category filters narrow the checklist without changing totals
  Given the calculator is visible
  When the visitor searches for "Claude"
  Then only matching subscription rows remain visible
  And a polite status line announces the filtered count
  And the selected checkboxes still feed the monthly spend total

Scenario: Category filtering narrows the checklist without affecting selections
  Given the calculator is visible
  When the visitor chooses the App builder category
  Then only app-builder rows remain visible
  And the filter controls do not deselect any plans
  And the computed comparison basis is unchanged

Scenario: Reset clears the filter controls
  Given the visitor has applied a text or category filter
  When the visitor resets the calculator
  Then the search field is blank
  And the category selector returns to All categories
  And the full checklist is visible again
```
