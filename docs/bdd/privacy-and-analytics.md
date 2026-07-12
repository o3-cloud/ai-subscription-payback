# Feature: Privacy and Analytics

```gherkin
Scenario: No account is required
  Given a visitor opens the site
  When they use the calculator
  Then no login or account creation is required

Scenario: Inputs are not stored server-side
  Given the visitor changes calculator inputs
  When the page computes results
  Then the site does not require sending personal input data to a backend

Scenario: Analytics are privacy respecting
  Given analytics are enabled
  When the site records usage events
  Then only aggregate, non-PII events are captured
  And the visitor can still use the calculator normally

Scenario: Disclosure is present for tracking
  Given the site uses analytics
  When the visitor views the footer or disclosure area
  Then the analytics approach is described plainly
```
