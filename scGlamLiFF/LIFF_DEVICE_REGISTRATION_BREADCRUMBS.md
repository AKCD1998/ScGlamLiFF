# LIFF Device Registration Breadcrumbs

## Purpose
- Capture the full debugging journey for the LIFF smartphone branch-device registration flow.
- Preserve the reasoning behind each change and each tradeoff so future work can start from facts instead of guesswork.
- Act as the first reference to read when LIFF startup guard or device registration breaks again.

## Repos And Roles
- Frontend LIFF repo:
  - `C:\Users\scgro\Desktop\Webapp training project\scGlamLiFFF\scGlamLiFF`
- Backend source of truth:
  - `C:\Users\scgro\Desktop\Webapp training project\scGlamLiff-reception`

Rules we followed during this work:
- `scGlamLiff-reception` is the backend behavioral source of truth.
- Frontend must align to backend contract, not invent new contract assumptions.
- Keep changes tight to LIFF startup guard and branch-device registration.

## Current Intended Architecture
1. LIFF frontend initializes LINE LIFF.
2. Frontend calls `GET /api/branch-device-registrations/me` with LIFF token headers.
3. Backend verifies LIFF identity and resolves `line_user_id`.
4. Backend looks up `branch_device_registrations`.
5. Frontend branches:
   - `active` -> continue into app
   - `not_registered` -> show registration screen
   - `inactive` -> block
   - token/config/server failure -> show explicit error state
6. For registration, frontend calls `POST /api/branch-device-registrations`.

Important distinction:
- LIFF identity proves which LINE user is using the smartphone.
- Staff auth is separate and is about who is allowed to register that device.
- Branch binding is stored in `branch_device_registrations`, not in LIFF profile and not in frontend local state.

## What We Found, In Order

### 1. Frontend Was Talking To The Wrong Backend Host
Observed symptom:
- LIFF app showed generic fetch failure.

Root cause:
- GitHub Pages production build used:
  - `VITE_API_BASE_URL=https://scglamliff.onrender.com`
- Verified backend route actually lived at:
  - `https://scglamliff-reception.onrender.com`

Why it mattered:
- The LIFF app was sending device-check requests to the wrong Render service.
- Wrong host can look like `Failed to fetch`, 404, or route mismatch.

What we changed:
- Updated `.github/workflows/deploy.yml` so GitHub Pages build now injects:
  - `VITE_API_BASE_URL=https://scglamliff-reception.onrender.com`

## 2. Stale Frontend Bundle Was Still Calling A Dead Legacy Endpoint
Observed symptom:
- LIFF screen showed:
  - `Failed to verify LINE session (404): {"ok":false,"error":"Not found"}`

Root cause:
- Production LIFF bundle still contained legacy frontend auth bootstrap calling:
  - `POST /api/liff/session`
- Canonical backend does not expose that route.

Why it mattered:
- The app failed before the new branch-device guard even ran.

What we changed:
- Removed dependency on `/api/liff/session`.
- Switched frontend LIFF bootstrap to rely on LIFF local session/token state.
- Confirmed that later screenshots no longer showed this 404.

Practical lesson:
- When a screenshot still shows an error string that no longer exists in the repo, suspect stale GitHub Pages or LINE WebView cache first.

## 3. Device Check Reached Backend But Backend Returned 500
Observed symptom:
- LIFF screen moved from 404 to:
  - `ตรวจสอบอุปกรณ์ไม่สำเร็จ`
  - `Server error`

Backend log evidence:
- LIFF verification succeeded.
- Backend resolved a masked LINE user id.
- Failure happened before registration lookup completed.

Original misleading trace shape:
- `liffVerification = success`
- `verificationReason = bad_request`
- `finalStatus = 500`

Actual root cause found in backend:
- The first DB lookup after LIFF verification was:
  - `SELECT * FROM branch_device_registrations WHERE line_user_id = $1 LIMIT 1`
- Production database did not have `public.branch_device_registrations` yet.

Additional backend bug:
- Unexpected DB failures were mislabeled as `bad_request` instead of a server-side error.

What was done:
- Backend error/trace mapping was fixed so post-verification failures no longer corrupt LIFF verification state.
- Production migration was run:
  - `npm run migrate:branch-device-registrations`

Verification used:
```sql
SELECT to_regclass('public.branch_device_registrations') AS branch_device_registrations_table;
```

Important result:
- Before migration: table missing
- After migration: table exists

## 4. There Were No Registration Rows Yet
Observed fact after migration:
- `branch_device_registrations` existed
- table row count was `0`

Meaning:
- There was no registration for the test device
- in fact there were no production device registrations at all yet

Expected correct backend response after this point:
- `200`
- `success: true`
- `registered: false`
- `active: null`
- `reason: "not_registered"`

Frontend result:
- LIFF screen correctly moved to the first-time registration UI

## 5. Branch Identifier Was Ambiguous At First
We had to decide what value should be used for branch 003:
- `staff003`
- `branch-003`
- `003`
- something else

What we verified:
- `staff003` is a staff username, not a branch id
- backend docs treat write-path `branch_id` as opaque text
- DB evidence for `staff003`-linked appointment creation activity consistently pointed to:
  - `branch-003`
- plain `003` existed in some admin/backdate records but was not the canonical branch value for `staff003`

Conclusion:
- For the test smartphone and this branch, use:
  - `branch-003`

Why this matters:
- Registration should bind smartphone LIFF identity to a branch id, not to a staff username.

## 6. Multiple Phones Per Branch Are Allowed, But Not Multiple Rows Per Same LINE Identity
What the current backend model means:
- One `line_user_id` maps to one registration row
- One `branch_id` can have many registration rows

Therefore:
- many smartphones can belong to the same branch
- but each smartphone must effectively have its own verified LINE identity
- if two physical phones share the same LINE account, backend will treat them as one identity and one registration row

This is a known product constraint of the current design.

## 7. Registration Was Then Blocked By Missing Staff Auth Cookie
Observed symptom on registration screen:
- `ยังไม่ได้เข้าสู่ระบบพนักงาน ไม่สามารถลงทะเบียนอุปกรณ์ได้`

Why the confusion happened:
- Staff login on desktop or another browser session does not help the LIFF WebView on iPhone.
- Registration POST originally required staff cookie auth in the same LIFF session.

What we changed in frontend:
- Added a small username/password staff login form directly inside the LIFF device registration panel.
- Frontend now calls:
  - `POST /api/auth/login`
  - `GET /api/auth/me`
- Both use `credentials: 'include'`

Goal of this step:
- first try to obtain the staff auth cookie inside the same LINE WebView session
- if that still fails, keep the entered staff credentials available for registration fallback

## 8. Login Form Worked, But Cookie Still Did Not Persist In LINE WebView
Observed symptom after the LIFF staff-login UI was added:
- UI showed:
  - `เข้าสู่ระบบแล้ว แต่ LIFF session นี้ยังไม่พบ cookie พนักงาน`

What that means:
- `POST /api/auth/login` likely succeeded
- but the next `GET /api/auth/me` still did not see `req.cookies.token`
- therefore the cookie was not available to subsequent requests from the same LIFF WebView

Most likely cause:
- Cross-site cookie behavior between:
  - frontend origin: `https://akcd1998.github.io`
  - backend origin: `https://scglamliff-reception.onrender.com`
  - runtime container: LINE iPhone WebView

Why this matters:
- Browser-side code was correct:
  - login fetch used `credentials: 'include'`
  - registration fetch used `credentials: 'include'`
- backend-side cookie config was also aligned for cross-site:
  - `SameSite=None`
  - `Secure=true`
- but LINE WebView/WebKit cross-site cookie persistence still proved unreliable in practice

This was the key architecture fork.

## Architecture Fork We Reached

### More Stable Long-Term Path
- Stop depending on cross-site cookies between GitHub Pages and Render for LIFF device registration.
- Options:
  - move frontend/backend to a same-site deployment model
  - use a shared custom domain
  - redesign registration auth to avoid cookie dependency for this route

Why we did not fully pursue the infrastructure-heavy path now:
- time pressure
- no budget/time to rework deployment/domain architecture immediately

### Pragmatic Path Chosen For Now
- Keep normal cookie-based auth for the rest of the app unchanged.
- For `POST /api/branch-device-registrations` only, use a route-scoped fallback staff verification path that does not depend on staff cookie persistence in LINE WebView.
- Current shape:
  - keep cookie auth working when available
  - if cookie missing, accept explicit `staff_username` + `staff_password` for this endpoint only
  - verify those credentials server-side using the same staff-user rules
  - do not create a global auth bypass

Why this is acceptable for now:
- it keeps the change tightly scoped
- it does not regress normal auth for the rest of the app
- it solves the real production blocker faster than a domain/cookie architecture rewrite

Why this is not the ideal final state:
- route-specific credential fallback is less elegant than same-site session auth
- a unified domain/session story would be cleaner and usually more stable

## What Was Implemented In Frontend
- LIFF startup guard with explicit states
- real backend `/me` device lookup
- debug logging and debug panel for LIFF/device guard
- registration UI
- mini staff-login form in LIFF device registration panel
- staff session check through `/api/auth/me`
- clear UI states:
  - `logging_in`
  - `login_failed`
  - `login_success`
  - `missing_staff_auth`

Important note:
- This frontend work is still useful even if backend registration auth changes again later.
- It proved exactly where the flow failed and narrowed the blocker to cross-site cookie persistence.

## Current Frontend Registration Rule
- `GET /api/branch-device-registrations/me` stays unchanged and still uses LIFF verification only.
- `POST /api/branch-device-registrations` now follows:
  - if staff cookie session exists, submit using normal cookie auth path
  - if staff cookie is missing but user entered `staff_username` + `staff_password`, submit anyway and let backend use route-scoped fallback verification
- Do not change:
  - `GET /api/branch-device-registrations/me`
  - normal `/api/auth/login`
  - normal `/api/auth/me`
  - global `requireAuth` behavior for the rest of the app

## First Places To Look Next Time

### 1. Confirm The Frontend Is Talking To The Right Backend
Check:
- `.github/workflows/deploy.yml`
- built `VITE_API_BASE_URL`

Expected production backend:
- `https://scglamliff-reception.onrender.com`

If wrong:
- device check can fail before any useful backend diagnosis is possible

### 2. Confirm The Bundle Is Not Stale
Symptoms of stale bundle:
- old `Failed to verify LINE session (404)` message
- old `/api/liff/session` behavior

First suspicion:
- GitHub Pages deploy not updated
- LINE WebView cached old assets

### 3. Check Frontend Debug Panel / Console
Look for:
- `apiBaseUrl`
- `liffReady`
- `inClient`
- `loggedIn`
- `hasIdToken`
- `hasAccessToken`
- `requestStarted`
- `lastResponseStatus`
- `lastReason`
- staff auth request fields

Log prefix:
- `[LIFFGuardFrontend]`

### 4. Check Backend Render Logs
Filter for:
- `[BranchDeviceGuard]`

Interpretation:
- no `/me` hit -> request never reached backend or wrong frontend build
- `400 missing_token` -> frontend sent no LIFF token
- `401 invalid_token` -> LIFF token invalid or wrong channel/config
- `200 not_registered` -> LIFF works, DB has no row
- `200 inactive` -> registration exists but disabled
- `500 server_error` -> backend DB/config/runtime issue

### 5. Verify Production Schema
```sql
SELECT to_regclass('public.branch_device_registrations') AS branch_device_registrations_table;
```

If `null`:
- run the branch-device migration

### 6. Check Registration Rows
```sql
SELECT COUNT(*)::int AS registration_count
FROM public.branch_device_registrations;
```

If zero:
- not a code bug by itself
- production simply has no registered devices yet

### 7. Check Exact Row For A LINE User
```sql
SELECT
  id,
  line_user_id,
  branch_id,
  status,
  device_label,
  linked_at,
  last_seen_at,
  updated_at
FROM public.branch_device_registrations
WHERE line_user_id = 'FULL_LINE_USER_ID_HERE'
ORDER BY updated_at DESC, created_at DESC
LIMIT 5;
```

### 8. Confirm Canonical Branch Value Before Registering
For branch 003:
- use `branch-003`

Do not use:
- `staff003`
- `003` unless a future backend contract explicitly standardizes that value

## Environment Variables Worth Rechecking First

### Frontend Build-Time
- `VITE_API_BASE_URL`
- `VITE_LIFF_ID`
- `VITE_USE_MOCK=false`

### Backend Runtime
- `DATABASE_URL`
- `JWT_SECRET`
- `NODE_ENV=production`
- `FRONTEND_ORIGIN` or `FRONTEND_ORIGINS`
- `COOKIE_SAMESITE=none`
- `COOKIE_SECURE=true`
- `LINE_CHANNEL_ID` or `LINE_LIFF_CHANNEL_ID`

## Known Tradeoffs And Why We Accepted Them
- We used GitHub Pages frontend + Render backend because it was already the live shape and faster to move with.
- This introduced cross-site cookie complexity in LINE WebView.
- The most stable fix is likely deployment/domain restructuring or a non-cookie registration auth contract.
- We did not do the full infrastructure cleanup now because it would take more time and likely more budget than this pass allowed.
- Instead, we chose to isolate the problem, prove it with logs and UI states, and prepare a narrow backend fallback for the one route that is blocked by this architecture.

## Current Ground Truth Summary
- Device check through LIFF works.
- Backend LIFF verification works.
- `branch_device_registrations` table now exists.
- There were initially zero registration rows.
- Canonical branch value for the test device branch is `branch-003`.
- Frontend registration screen works and can collect staff credentials.
- Cross-site staff cookie persistence in LINE WebView is still unreliable.
- Backend route-scoped fallback staff verification for registration POST exists.
- Frontend registration screen should submit with explicit staff credentials when cookie is missing.

## If Future Changes Happen
If deployment, domain, or auth architecture changes later, revisit these assumptions first:
- whether frontend and backend are still cross-site
- whether LIFF still runs inside LINE WebView with the same cookie behavior
- whether registration still needs separate staff authorization
- whether `branch_id` contract is still `branch-003`
- whether one LINE identity should still map to one device registration row

If any of those change, start here and re-check the sections above in this order:
1. frontend build target
2. LIFF runtime state
3. backend `/me` response
4. production schema
5. registration auth path
