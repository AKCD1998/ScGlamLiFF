# ScGlamLiFF

## Build Targets

This repo uses Vite and currently supports two deployment shapes:
- same-origin backend hosting at `https://<backend-origin>/liff/`
- GitHub Pages at `https://akcd1998.github.io/ScGlamLiFF/`

### Production base path behavior
- Local dev stays at `/` so `vite` keeps its normal behavior.
- Production build now defaults to `/liff/`.
- Any deployment that needs a different subpath can override it with `VITE_PUBLIC_BASE_PATH`.

### API base behavior
- Backend-hosted LIFF production builds should leave `VITE_API_BASE_URL` blank so the frontend uses same-origin relative `/api/...` requests.
- `VITE_OCR_API_BASE_URL` should also stay blank in that deployment unless OCR must be routed somewhere else intentionally.
- Local dev can still set `VITE_API_BASE_URL` explicitly in `.env.development.local` or remove it and rely on the Vite `/api` proxy.
- GitHub Pages remains cross-origin on purpose, so its workflow still injects `VITE_API_BASE_URL=https://scglamliff-reception.onrender.com` during build.

Examples:
- backend-origin LIFF hosting: `VITE_PUBLIC_BASE_PATH=/liff/`
- GitHub Pages for this repo: `VITE_PUBLIC_BASE_PATH=/ScGlamLiFF/`

The app uses `HashRouter`, so SPA routes stay after `#` and refreshes only need the server to return the shell for `/liff/` or `/ScGlamLiFF/`.

## Deploy to GitHub Pages (Vite + React)

GitHub Pages only serves static files, so we build the site into `dist/` and deploy that folder.

### One-time setup in GitHub
- Repo Settings -> Pages
- Source: **GitHub Actions**

### Automatic deploys (already wired)
Every push to `main` runs the workflow at `.github/workflows/deploy.yml`, which:
- installs dependencies with `npm ci`
- builds with `npm run build` and `VITE_PUBLIC_BASE_PATH=/ScGlamLiFF/`
- uploads `scGlamLiFF/dist` to GitHub Pages

### Final GitHub Pages URL
https://akcd1998.github.io/ScGlamLiFF/

If your repo name is different, update:
- `VITE_PUBLIC_BASE_PATH` in `.github/workflows/deploy.yml`
- the URL above in this README

## Staged rollout to backend-origin LIFF
Do not remove GitHub Pages during cutover. Keep it as the rollback target until the backend-hosted LIFF has been verified in LINE.

Recommended order:
1. Build this repo for backend-origin hosting with the default production settings:
   - `VITE_PUBLIC_BASE_PATH=/liff/`
   - `VITE_API_BASE_URL=` (blank for same-origin `/api`)
   - `VITE_OCR_API_BASE_URL=` unless you intentionally need a different OCR origin
2. Copy the resulting `scGlamLiFF/dist/` output into `scGlamLiff-reception/backend/public/liff/`.
3. Deploy the backend repo and verify `https://<backend-host>/liff/`.
4. Only after that verification, update the LIFF endpoint in LINE Developers Console from GitHub Pages to `https://<backend-host>/liff/`.
5. Keep the GitHub Pages workflow and URL available until real-device verification is complete.

What can be removed later:
- GitHub Pages deployment workflow, only after the backend-hosted LIFF is stable
- cross-origin API base overrides that exist only for the GitHub Pages deployment
- any temporary backend asset alias kept for `/ScGlamLiFF/*`

## Troubleshooting
- **404 at root** (`https://<user>.github.io/ScGlamLiFF/`): Pages is serving the repo root instead of the build output. Ensure Pages Source is GitHub Actions and the workflow has run successfully.
- **404 on refresh / deep links** (`/my-treatments` etc.): GitHub Pages is static and does not know SPA routes. This is fixed by using `HashRouter` so URLs look like `/#/my-treatments`.
- **Assets missing under `/liff/`**: production builds default to `/liff/`. Check the generated `dist/index.html` and confirm asset URLs start with `/liff/assets/`.
- **Assets missing on GitHub Pages**: the build must run with `VITE_PUBLIC_BASE_PATH=/ScGlamLiFF/` so asset URLs match the repo path exactly.
