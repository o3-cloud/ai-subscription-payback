# Feature: Responsive Design

```gherkin
Scenario: Mobile layout
  Given a viewport width typical of a phone
  When the visitor opens the site
  Then inputs, results, and chart stack in a readable single-column layout
  And no horizontal scrolling is required

Scenario: Long subscription list stays usable on mobile
  Given the subscriptions-to-compare list with the full set of Codex, Claude Code, Copilot, Cursor, and Zed tiers
  When the visitor views it on a phone-width viewport
  Then the list is capped to a scrollable region so the compute button and other inputs stay reachable
  And each checkbox keeps a full tap target even when its plan label wraps to a second line
  And the comparison table scrolls horizontally within its own container rather than overflowing the page

Scenario: Desktop layout
  Given a wide viewport
  When the visitor opens the site
  Then inputs and results are shown side by side

Scenario: Tablet layout
  Given a medium-width viewport
  When the visitor opens the site
  Then the layout remains readable without clipped controls
  And the chart remains legible

Scenario: Keyboard and assistive access
  Given the calculator
  When the visitor navigates by keyboard
  Then every input is reachable and operable
  And result updates are announced to assistive technology

Scenario: Respects theme and motion preferences
  Given the visitor's OS prefers dark mode or reduced motion
  When the page loads
  Then the site honors color-scheme and reduced-motion preferences
```
