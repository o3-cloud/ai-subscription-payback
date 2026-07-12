# Feature: Accessibility

```gherkin
Scenario: Inputs are labeled
  Given the calculator is visible
  When the visitor inspects the form
  Then every control has a visible label

Scenario: Result updates are announced
  Given the calculator result has changed
  When the page updates the output
  Then assistive technology receives a polite update announcement

Scenario: Color contrast is sufficient
  Given the site is rendered in light or dark mode
  When the visitor reads the text and chart labels
  Then the contrast remains readable

Scenario: Chart has a text alternative
  Given a chart is displayed
  When the visitor uses a screen reader
  Then an accessible table or text summary is available
```
