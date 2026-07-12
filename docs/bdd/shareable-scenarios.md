# Feature: Shareable Scenarios

```gherkin
Scenario: Scenario is encoded in the URL
  Given the visitor has set calculator inputs
  When the visitor copies the page URL
  Then the URL contains the configured scenario state

Scenario: Shared URL restores the scenario
  Given another visitor opens a shared scenario URL
  When the page loads
  Then the calculator restores the encoded inputs
  And the displayed result matches the shared values

Scenario: Share link is available
  Given a computed result is displayed
  When the visitor views the results area
  Then a shareable link or copy button is visible
```
