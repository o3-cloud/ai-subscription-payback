# AI Subscription Payback

A static payback calculator comparing AI coding subscriptions against a local
inference box. The whole site is plain HTML, CSS, and ES modules — no build
step and no framework.

## MVP scope and assumptions

The launch scope, commercial model, and non-goals are documented in the
[PRD](./PRD.md) and the dedicated [MVP scope BDD](./docs/bdd/mvp-scope.md).
In short: the site is an affiliate-first static Pages experience centered on
Mac Studio, DGX Spark, and Strix Halo class systems, compared against Codex
and Claude Code subscription spend, with transparent disclosures and no
backend.

## Local development

Open `index.html` directly, or serve the repository root with any static
server, e.g.:

```bash
npx serve .
# or
python3 -m http.server
```

Run the test suite (Node's built-in runner, no dependencies):

```bash
npm test
```

## Deployment

The site is hosted on **GitHub Pages** at:

**https://o3-cloud.github.io/ai-subscription-payback/**

Deployment is automated by the [`Deploy to GitHub Pages`](.github/workflows/deploy.yml)
GitHub Actions workflow. It runs on every push to `main` (and can be triggered
manually from the Actions tab via **Run workflow**), so **merging to `main`
publishes the site**. The workflow:

1. **test** — runs `npm test` and blocks the deploy if anything fails.
2. **build** — checks out the repo and uploads the repository root
   (`index.html` plus `assets/`) as the Pages artifact with
   `actions/upload-pages-artifact`.
3. **deploy** — publishes that artifact to the `github-pages` environment with
   `actions/deploy-pages`.

Because the artifact is the repository root and the site uses relative
(`./assets/...`) paths, it serves correctly from the project subpath. A
`.nojekyll` marker at the root disables GitHub's Jekyll processing so files are
served exactly as committed.

A root `404.html` is published too; GitHub Pages serves it for any unmatched
path, so unknown or stale deep links get a styled, `noindex` fallback that links
back to the calculator. Its asset/link references are base-qualified absolute
paths (`/ai-subscription-payback/...`) so they resolve at any URL depth.

### Repository eligibility

GitHub Pages must be available for the repository before the workflow can
publish. The `configure-pages` step runs with `enablement: true`, so it turns
Pages on (Source = GitHub Actions) automatically on the first successful run —
**no manual Settings → Pages step is required**, and no `gh-pages` branch is
used.

The repository is **public**, which makes it eligible for Pages on any plan, so
each push to `main` (or a manual **Run workflow**) publishes the site with no
further setup.
