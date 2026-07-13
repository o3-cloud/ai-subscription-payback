# Feature: MVP Scope and Commercial Model

```gherkin
Scenario: Launch scope is explicit
  Given a maintainer or visitor reviews the MVP scope
  When they read the scope document
  Then it names the launch-boundary hardware classes as Mac Studio, DGX Spark, and Strix Halo
  And it names the baseline subscription comparisons as Codex and Claude Code
  And it states that the site is a static GitHub Pages experience with no backend

Scenario: Commercial model is affiliate-first and transparent
  Given the project commercial model
  When the scope document describes monetization
  Then it says the site uses affiliate or reseller links for the featured hardware
  And it states that affiliate relationships are clearly disclosed
  And it states that monetization must not change calculator math or default assumptions in a hidden way

Scenario: The MVP excludes non-goals that would complicate launch
  Given the non-goals section
  When the maintainer reviews the launch boundary
  Then the site is not a real-time price feed and does not promise live price feeds
  And it does not require user accounts or saved profiles
  And it does not provide tax, accounting, or financial advice
  And it does not include a procurement or checkout flow

Scenario: Transparency requirements are captured in the PRD and linked from the repo
  Given the repository documentation
  When a maintainer looks for the product scope
  Then the PRD points to this BDD file as the source of truth for MVP scope
  And the Goals, Non-Goals, and Monetization sections stay aligned with the scope scenarios
```

> The PRD keeps the detailed product intent, but this file makes the MVP launch
> boundary executable as behavior so future edits can be checked against it.
