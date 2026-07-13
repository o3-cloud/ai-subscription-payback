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

Scenario: Aggregate page and interaction analytics are captured without personal data
  Given analytics are enabled
  When the page loads and the visitor changes a calculator input
  Then the site records a pageview and a high-level calculator interaction event
  And no calculator field values are stored in analytics
  And the visitor can still use the calculator normally

Scenario: Share and outbound clicks are tracked as aggregate events
  Given analytics are enabled
  When the visitor copies a shareable scenario link or clicks an outbound source or affiliate link
  Then the site records an aggregate share or outbound click event
  And the calculator results remain unchanged

Scenario: Tracking can be opted out with Do Not Track
  Given the browser Do Not Track signal is enabled
  When the site loads
  Then no analytics events are sent

Scenario: Disclosure is present for tracking
  Given the site uses analytics
  When the visitor views the footer or disclosure area
  Then the analytics approach is described plainly
```
