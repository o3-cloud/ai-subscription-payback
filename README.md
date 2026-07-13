# AI Subscription Payback

A static payback calculator comparing AI coding subscriptions against a local
inference box. The whole site is plain HTML, CSS, and ES modules — no build
step and no framework.

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

**https://ozanzal.github.io/ai-subscription-payback/**

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

### One-time repository setup

In the GitHub repository settings, under **Settings → Pages**, set
**Source** to **GitHub Actions**. The workflow handles every publish after
that; no `gh-pages` branch is used.
