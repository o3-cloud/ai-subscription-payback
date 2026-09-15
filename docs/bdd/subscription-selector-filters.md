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

Scenario: Selected plan summary remains visible while browsing
  Given the visitor has selected plans in the checklist
  When the visitor searches or chooses a category
  Then the selected count and monthly total remain visible
  And selected plans hidden by the filter still contribute to the summary

Scenario: Selected only narrows the checklist without changing selections
  Given the visitor has selected one or more plans
  When the visitor enables Selected only
  Then only checked plan rows remain visible
  And the selected count and monthly total are unchanged

Scenario: Clear all removes every selected plan
  Given the visitor has selected plans, including a plan hidden by a filter
  When the visitor activates Clear all
  Then every plan is unchecked
  And the selected count and monthly total are zero
  And the active filters remain unchanged
```
