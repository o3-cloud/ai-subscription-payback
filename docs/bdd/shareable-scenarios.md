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

Scenario: An empty subscription selection round-trips
  Given the visitor has deselected every subscription plan
  And cleared the custom spend field
  When the visitor copies the page URL
  Then the shared URL keeps an explicit empty subscription selection
  And the shared URL keeps an explicit blank custom spend
  And reloading the URL leaves no subscription plans selected
  And the calculator compares against $0/mo from the selected subscriptions

Scenario: Share link is available
  Given a computed result is displayed
  When the visitor views the results area
  Then a shareable link or copy button is visible
  And the share action mirrors the current calculator state in the address bar

Scenario: Share controls sit near the results summary
  Given a computed result is displayed
  When the visitor views the results area
  Then the copy/share call to action appears above the long month-by-month cost table
  And it sits directly beneath the results summary so it is discoverable without scrolling past the table
  And the share action still mirrors the current calculator state exactly as before

Scenario: Privacy note accompanies the share button
  Given the visitor views the share button in the results area
  When they read the copy next to it
  Then a visible note explains the shared link includes inputs in the URL hash
  And it reassures that nothing is sent to a server
  And it warns against sharing sensitive scenarios

Scenario: Invalid edits do not replace the last valid shareable scenario
  Given the address bar already reflects a valid calculator state
  When the visitor enters an invalid numeric value
  Then the results indicate the input needs attention
  And the address bar keeps the last valid shareable scenario until the form is valid again
  And sharing copies the last valid scenario instead of serializing the invalid input
```
