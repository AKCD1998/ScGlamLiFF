# Dev Mock Setup

## What mock mode does

Mock mode bypasses real LIFF initialization so the frontend can run in a normal desktop browser during local development. When enabled, the app boots with a mock authenticated user and still calls the backend through relative `/api` paths.

## Local workflow

1. Run the backend locally:

   ```powershell
   cd scGlamLiFF/backend
   npm run dev
   ```

2. In another terminal, run the frontend:

   ```powershell
   cd scGlamLiFF
   npm run dev
   ```

3. Open the local Vite URL shown in the terminal.

4. Ensure local env enables mock mode for browser-based development.

## Enable mock mode

Create `scGlamLiFF/.env.development.local` from `scGlamLiFF/.env.development.local.example` and keep:

```env
VITE_USE_MOCK=true
VITE_LIFF_ID=2008955421-uwZ1btvE
VITE_OMISE_PUBLIC_KEY=pkey_test_66g80d1snpcdqltl1z3
```

Leave `VITE_API_BASE_URL` unset for local frontend development. That keeps frontend requests relative, so Vite proxies `/api` to `http://localhost:3002`.

## Production behavior

Production should keep `VITE_USE_MOCK=false`. The production frontend build still gets its env from GitHub Actions in `.github/workflows/deploy.yml`, including the production API base URL.

Production builds must not run with mock mode enabled. The frontend now throws a clear error if `VITE_USE_MOCK=true` is used in a production build.
