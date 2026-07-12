# Feature: Responsive Design

```gherkin
Scenario: Mobile layout
  Given a viewport width typical of a phone
  When the visitor opens the site
  Then inputs, results, and chart stack in a readable single-column layout
  And no horizontal scrolling is required

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
