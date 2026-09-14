# Feature: Privacy and Analytics

```gherkin
Scenario: No account is required
  Given a visitor opens the site
  When they use the calculator
  Then no login or account creation is required

Scenario: Inputs are not stored server-side
  Given the visitor changes calculator inputs
  When the page computes results
  Then calculator inputs are not submitted to the site's application server

Scenario: Calculator inputs stay local while aggregate analytics remain possible
  Given the visitor enters calculator values and the site loads a shared scenario
  When the calculator computes results or the visitor shares the scenario
  Then the calculator values are encoded locally in the URL hash
  And the site may send anonymous aggregate pageview, scenario-share, and outbound-click events to its analytics provider
  And those analytics events do not contain calculator field values or personal data

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
  And outbound links recreated after a calculator model-fit update remain tracked
  And persistent comparison and pricing links emit at most one outbound event after any number of model-fit rerenders or form resets

Scenario: Tracking can be opted out with Do Not Track
  Given the browser Do Not Track signal is enabled
  When the site loads
  Then no analytics events are sent

Scenario: Disclosure is present for tracking
  Given the site uses analytics
  When the visitor views the footer or disclosure area
  Then the analytics approach is described plainly
  And the disclosure distinguishes application-server submission from aggregate analytics
```
