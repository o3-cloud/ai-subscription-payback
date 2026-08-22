# Feature: Pricing-Data Health Check

```gherkin
Scenario: The maintainer-facing health check validates pricing, hardware, and affiliate data
  Given the maintainer-facing health check
  When the maintainer runs `npm run health-check`
  Then it collects every subscription source URL, hardware source URL, and affiliate CTA URL
  And it retries GET on bot-protected HEAD responses when needed
  And it treats malformed URLs, dead links, and other hard failures as failures
  And it downgrades a 403 or 429 on a canonical vendor source to a warning
  And it keeps a 403 or 429 on an affiliate or reseller CTA as a hard failure
  And it retries GET when a HEAD probe looks bot-protected so an accessible vendor page can still pass
  And it downgrades canonical vendor timeouts and bot-protected pages to warnings instead of failing the run
  And it flags entries older than the staleness threshold as warnings
  And it exits non-zero only when hard failures are present

Scenario: The health-check report stays concise enough for scheduled runs
  Given the maintainer-facing health check
  When the maintainer reads its report
  Then the output lists URL verdicts, invalid URLs, stale entries, and a summary
  And the report remains short enough to run by hand or on a schedule
```

> Maintenance tooling: the script lives in `scripts/health-check.mjs`, is kept
> offline-testable through injected fetch and clock dependencies, and is run on
> demand via `npm run health-check` plus the scheduled
> `.github/workflows/health-check.yml` GitHub Actions workflow.
