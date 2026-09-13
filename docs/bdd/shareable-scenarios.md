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

Scenario: The initial render preserves the clean landing URL
  Given the visitor opens a valid calculator scenario in the query string or hash fragment
  When the page loads
  Then the address bar is not rewritten on first render
  And the visible calculator state remains unchanged
  And the Share button can still generate the canonical hash-based share URL on demand

Scenario: The first Share canonicalizes a legacy query-string link
  Given the visitor opens an older "?"-style calculator scenario link
  When the page loads
  Then the address bar is not rewritten during initial hydration
  When the visitor immediately clicks Share
  Then the copied URL contains the hydrated scenario in the hash fragment
  And the copied URL has no query string
  And the address bar matches the copied canonical hash-based URL

Scenario: An empty subscription selection round-trips
  Given the visitor has deselected every subscription plan
  And cleared the custom spend field
  When the visitor copies the page URL
  Then the shared URL keeps an explicit empty subscription selection
  And the shared URL keeps an explicit blank custom spend
  And reloading the URL leaves no subscription plans selected
  And the results basis says "Using selected subscriptions: $0/mo."

Scenario: A shared query-string URL keeps an explicit blank custom spend
  Given a visitor opens an older "?"-style link such as "?subs=&customSpend="
  When the page loads
  Then the blank custom spend survives the query-string round trip
  And no subscription plans are selected
  And the results basis says "Using selected subscriptions: $0/mo."

Scenario: Share link is available
  Given a computed result is displayed
  When the visitor views the results area
  Then a shareable link or copy button is visible
  And the share action mirrors the current calculator state in the address bar
  And the share action prefers the native Web Share API when available
  And native sharing includes the selected subscriptions, hardware price, monthly savings, and payback status in a concise summary
  And the share action uses the browser clipboard when native sharing is unavailable or rejected and falls back to a legacy copy path before showing failure text

Scenario: Native sharing preserves the canonical scenario URL
  Given a computed result is displayed in a browser that supports the Web Share API
  When the visitor clicks Share
  Then the native share payload contains the canonical hash-based scenario URL
  And the native share payload URL matches the address bar
  And the native share payload includes a concise summary of the current result

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

Scenario: A present-or-whitespace numeric param falls back to its default
  Given a shared URL carries a numeric param with no value or only whitespace, such as "boxPrice=" or "boxPrice=%20"
  When the page loads
  Then the empty or whitespace-only numeric param is treated as absent
  And the calculator keeps the provided default instead of reading it as 0

Scenario: Invalid edits do not replace the last valid shareable scenario
  Given the address bar already reflects a valid calculator state
  When the visitor enters an invalid numeric value
  Then the results indicate the input needs attention
  And the address bar keeps the last valid shareable scenario until the form is valid again
  And sharing copies the last valid scenario instead of serializing the invalid input

Scenario: A valid hash scenario wins over a query string
  Given a shared URL carries a valid hash scenario such as "#boxPrice=4200"
  And the same URL also carries a query string such as "?boxPrice=1000"
  When the page loads
  Then the calculator restores the scenario from the hash fragment
  And the query string is ignored

Scenario: An in-page anchor does not disturb the share link
  Given the address bar reflects a valid calculator state
  When the visitor clicks an in-page fragment link such as "#calculator"
  And then clicks the Share button
  Then the copied URL still includes the current calculator state
  And the address bar is restored to that share URL instead of the bare anchor

Scenario: A non-share fragment does not shadow a valid query-string link
  Given the address bar already contains a valid query-string share URL
  When the visitor clicks a non-calculator fragment such as "#section=pricing"
  Then the calculator still restores the query-string share state
  And the fragment does not override the scenario because it carries no known calculator parameters

Scenario: A malformed share fragment falls back to the query string
  Given the address bar already contains a valid query-string share URL
  When the visitor clicks a malformed calculator fragment such as "#boxPrice=", "#boxPrice=abc", or "#customSpend=-1"
  Then the calculator ignores the malformed hash fragment
  And it restores the scenario from the query string instead

Scenario: A mixed valid-and-invalid share fragment is rejected as a whole
  Given the address bar contains a hash with one valid field and one malformed known field, such as "#boxPrice=4200&apr=abc" or "#boxPrice=4200&customSpend=-1"
  And the same URL may contain a valid query-string scenario
  When the page loads
  Then the malformed hash does not partially hydrate the calculator
  And a valid query-string scenario wins over the entire malformed hash
  And when there is no valid query fallback, the calculator uses defaults instead

Scenario: Bootstrap and Share preserve fallback state after a malformed fragment
  Given the address bar contains "?boxPrice=4200&subs=codex#boxPrice=abc"
  When the page loads and the visitor immediately clicks Share
  Then the calculator hydrates from the query string
  And the copied hash contains "boxPrice=4200" and "subs=codex"
  And the copied hash does not contain the malformed value

Scenario: Share omits invalid fields from a sanitized scenario
  Given a shared URL contains a mixed valid-and-invalid hash scenario
  When the page loads and the visitor immediately clicks Share
  Then the copied hash contains only valid canonical fields
  And it does not contain malformed, out-of-range, or negative values from the original URL

Scenario: The first Share preserves the full legacy query-string scenario
  Given an older query-string link contains numeric, boolean, payment-timing, model-fit, and subscription fields
  When the page loads and the visitor immediately clicks Share
  Then the canonical hash preserves every valid configured field

Scenario: Comma-separated subscription ids tolerate incidental whitespace
  Given a shared URL carries a subscription list such as "subs=codex,%20claude-code,%20"
  When the page loads
  Then the calculator restores both subscription selections
  And the restored scenario ignores whitespace around the comma-separated ids
```
