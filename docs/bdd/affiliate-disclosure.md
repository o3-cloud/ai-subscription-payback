# Feature: Affiliate Disclosure

```gherkin
Scenario: Affiliate relationship is disclosed
  Given the page contains affiliate links
  When the visitor views the page
  Then a clear affiliate disclosure statement is present

Scenario: Affiliate links are identifiable
  Given an affiliate link
  When the visitor inspects or hovers it
  Then it is marked as an affiliate or outbound link
  And clicking it does not change the calculator results

Scenario: Affiliate clicks do not affect calculations
  Given the calculator has a computed result
  When the visitor clicks a reseller or affiliate link
  Then the current calculation remains visible when the visitor returns
```
