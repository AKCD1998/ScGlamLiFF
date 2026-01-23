# ScGlamLiFF

## Deploy to GitHub Pages (Vite + React)

This repo uses Vite. GitHub Pages only serves static files, so we must build the site into `dist/` and deploy that folder.

### One-time setup in GitHub
- Repo Settings -> Pages
- Source: **GitHub Actions**

### Automatic deploys (already wired)
Every push to `main` runs the workflow at `.github/workflows/deploy.yml`, which:
- installs dependencies with `npm ci`
- builds with `npm run build`
- uploads `scGlamLiFF/dist` to GitHub Pages

### Final GitHub Pages URL
https://akcd1998.github.io/ScGlamLiFF/

If your repo name is different, update:
- `base` in `scGlamLiFF/vite.config.js`
- the URL above in this README

## Troubleshooting
- **404 at root** (`https://<user>.github.io/ScGlamLiFF/`): Pages is serving the repo root instead of the build output. Ensure Pages Source is GitHub Actions and the workflow has run successfully.
- **404 on refresh / deep links** (`/my-treatments` etc.): GitHub Pages is static and does not know SPA routes. This is fixed by using `HashRouter` so URLs look like `/#/my-treatments`.
- **Assets missing (CSS/JS not loading)**: The Vite `base` must match the repo name exactly (case-sensitive). It should be `"/ScGlamLiFF/"` for this repo.