# Feature: Bundle Overlap Caveats

```gherkin
Scenario: Subscription selector rows show bundle-overlap warnings
  Given the visitor is comparing GitHub Copilot Pro, Pro+, or Max with Codex and Claude Code tiers
  When a Copilot tier is selected alongside a bundled agent row
  Then the selector shows a visible bundle-overlap warning on the affected Copilot row
  And the warning explains that GitHub AI Credits can overlap with separate Codex and Claude Code spend
  And the warning points to the relevant official pricing pages

Scenario: Results repeat the overlap warning near the monthly subscription spend
  Given the visitor has selected overlapping bundled plans
  When the calculation runs
  Then the results area shows a visible overlap caveat near the spend basis
  And the caveat names the overlapping plans that should not be double-counted
  And the caveat links the relevant official source pages
  And clearing the overlap hides the caveat
```
