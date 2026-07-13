# Feature: Shareable Scenarios

```gherkin
Scenario: Scenario is encoded in the URL
  Given the visitor has set calculator inputs
  When the visitor copies the page URL
  Then the URL contains the configured scenario state in the hash fragment

Scenario: Shared URL restores the scenario
  Given another visitor opens a shared scenario URL
  When the page loads
  Then the calculator restores the encoded inputs from either a query string or a hash fragment
  And the displayed result matches the shared values

Scenario: Share link is available
  Given a computed result is displayed
  When the visitor views the results area
  Then a shareable link or copy button is visible
  And the share action mirrors the current calculator state in the address bar
```
