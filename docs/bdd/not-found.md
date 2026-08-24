# Feature: Not Found Fallback

```gherkin
Scenario: Unknown paths land on a friendly 404 fallback
  Given a visitor opens a URL that does not map to a published page
  When GitHub Pages serves the 404 fallback
  Then a styled "Page not found" page renders using the shared site stylesheet
  And it offers a link back to the calculator home
  And it is marked noindex so it never replaces real content in search
  And its asset and link references are base-qualified absolute paths so they
    resolve regardless of how deep the missing URL was
  And it declares the bundled favicon so the browser does not auto-request a
    /favicon.ico that would 404 again
```

## Notes

- The root `404.html` file is published alongside `index.html` and is the page
  GitHub Pages serves for any unmatched path under the project subpath.
- The fallback uses base-qualified absolute asset paths so it works for deep
  links, and it is marked `noindex` so search engines never treat the fallback
  as real content.
- The `404.html` regression test checks the shared stylesheet, favicon, root
  navigation, and absolute-path contract directly.
