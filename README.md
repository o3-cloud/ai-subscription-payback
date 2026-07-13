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

### Repository eligibility (current blocker)

GitHub Pages must be available for the repository before the workflow can
publish. The `configure-pages` step runs with `enablement: true`, so it turns
Pages on (Source = GitHub Actions) automatically on the first successful run —
**no manual Settings → Pages step is required**, and no `gh-pages` branch is
used.

That auto-enable only works when the repository is *eligible* for Pages. This
repo is currently **private under an organization on the free plan**, and
GitHub does not offer Pages for private repositories on that plan. The API
returns *"Your current plan does not support GitHub Pages for this
repository"*, so the `build` job fails at `configure-pages`. This is an
account-level setting, not something a file in the repo can change.

To unblock publishing, do **one** of the following in GitHub (no code change
needed):

- Make the repository **public** (**Settings → General → Change visibility**), or
- Upgrade the organization to a plan that includes **Pages for private repos**
  (GitHub Team or Enterprise).

Once either is done, the next push to `main` (or a manual **Run workflow**)
publishes the site with no further setup.
