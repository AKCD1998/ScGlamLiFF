# Receipt Booking Implementation Log

## Timestamp
- `2026-03-17T17:22:56.8328366+07:00`

## Scope
- Refactor the receipt-backed appointment booking flow in `src/components/NewBillRecipientModal.jsx` so the outbound canonical booking request follows the backend contract in `scGlamLiff-reception` as closely as possible.
- Centralize all `branch_id` normalization for canonical booking flows in one helper.
- Remove frontend-only payload assumptions where they conflict with the backend contract.

## Files Inspected
- `C:\Users\scgro\Desktop\Webapp training project\scGlamLiff-reception\backend\API_CONTRACT.md`
- `C:\Users\scgro\Desktop\Webapp training project\scGlamLiff-reception\backend\API_CHANGELOG_NOTES.md`
- `src/components/NewBillRecipientModal.jsx`
- `src/components/NewBillRecipientModal.css`
- `src/pages/BillVerificationPage.jsx`
- `src/services/appointmentsService.js`
- `src/services/receiptOcrService.js`
- `src/utils/apiBase.js`
- `src/config/env.js`

## Files Changed
- `package-lock.json`
- `package.json`
- `src/components/NewBillRecipientModal.jsx`
- `src/components/NewBillRecipientModal.test.jsx`
- `src/pages/BillVerificationPage.jsx`
- `src/pages/BookingFlowPage.jsx`
- `src/services/appointmentDraftService.js`
- `src/services/appointmentsService.js`
- `src/services/appointmentContract.js`
- `src/services/branchCatalog.js`
- `src/services/appointmentContract.test.js`
- `src/services/appointmentsService.test.js`
- `IMPLEMENTATION_LOG_RECEIPT_BOOKING.md`

## Backend Contract Assumptions Followed
- Canonical create endpoint is `POST /api/appointments`.
- Canonical booking option source is `GET /api/appointments/booking-options`.
- Canonical advisory availability sources are `GET /api/appointments/calendar-days` and `GET /api/appointments/queue`.
- Browser requests for canonical booking flows must use cookie auth with `credentials: 'include'`.
- `scheduled_at` with timezone offset is the preferred create input and is sent as `YYYY-MM-DDTHH:MM:00+07:00`.
- `treatment_id` should come from booking options, not free-text inference.
- `package_id` should be sent explicitly when the selected booking option is package-based.
- `receipt_evidence` is optional and only supported on `POST /api/appointments`.
- When `receipt_evidence` is sent, `branch_id` must be sent explicitly and cannot rely on backend default fallback.
- `queue` and `calendar-days` enforce UUID-shaped `branch_id` query params when the client sends them.
- `POST /api/appointments` still accepts non-empty text `branch_id` values, and the docs remain ambiguous about whether branch write inputs are fully migrated to UUIDs.

## Branch Normalization
- Branch normalization now lives only in `src/services/branchCatalog.js` via `normalizeCanonicalBranch(value)`.
- Current expected input:
  - raw branch UI value such as `branch-003`
  - or a UUID-shaped branch value if the frontend later receives canonical UUIDs
- Current normalized outputs:
  - `rawValue`: trimmed original branch value
  - `isUuid`: whether the raw value matches UUID format
  - `createBranchId`: the raw non-empty value, sent as-is to `POST /api/appointments`
  - `availabilityBranchId`: UUID only; empty string for non-UUID branch values
  - `availabilityMode`: `uuid_query`, `omit_non_uuid_query`, or `unset`
- Current contract direction targeted by the frontend:
  - create payloads follow the documented write behavior and send the selected raw branch value as `branch_id`
  - availability requests follow the documented read behavior and only send `branch_id` when the selected value is UUID-shaped
- No fake UUID mapping was introduced.
- Future backend clarification that would simplify this:
  - a single documented canonical branch identifier shape for both create and read endpoints
  - or a canonical branch list endpoint that returns the exact create/read branch IDs to use

## Payload Alignment Changes
### Previous frontend-shaped create payload behavior
```json
{
  "scheduled_at": "2026-03-20T14:00:00+07:00",
  "branch_id": "branch-003",
  "customer_full_name": "Customer Name",
  "phone": "0812345678",
  "staff_name": "โบว์",
  "treatment_id": "treatment-uuid",
  "treatment_item_text": "Smooth 3x 3900",
  "package_id": "package-uuid",
  "receipt_evidence": {
    "receipt_number": "RCP-20260317-0091",
    "receipt_line": "17/03/2026 14:31 BNO:0091",
    "receipt_identifier": "promo-verify-abc123",
    "total_amount_thb": 1299,
    "ocr_status": "verified",
    "ocr_raw_text": "RAW OCR TEXT",
    "ocr_metadata": {
      "engine": "vision-v1"
    },
    "verification_source": "bill_verification_modal",
    "verification_metadata": {
      "flow": "receipt_booking",
      "booking_option_value": "package:package-uuid",
      "booking_option_source": "package"
    }
  }
}
```

### Final backend-aligned outbound payload shape
```json
{
  "scheduled_at": "2026-03-20T14:00:00+07:00",
  "customer_full_name": "Customer Name",
  "phone": "0812345678",
  "treatment_id": "treatment-uuid",
  "branch_id": "branch-003",
  "staff_name": "โบว์",
  "treatment_item_text": "Smooth 3x 3900",
  "package_id": "package-uuid",
  "receipt_evidence": {
    "receipt_image_ref": "s3://promo-receipts/2026/03/17/abc123.jpg",
    "receipt_number": "RCP-20260317-0091",
    "receipt_line": "17/03/2026 14:31 BNO:0091",
    "receipt_identifier": "promo-verify-abc123",
    "total_amount_thb": 1299,
    "ocr_status": "verified",
    "ocr_raw_text": "RAW OCR TEXT",
    "ocr_metadata": {
      "engine": "vision-v1"
    },
    "verification_source": "bill_verification_modal",
    "verification_metadata": {
      "flow": "receipt_booking",
      "booking_option_value": "package:package-uuid",
      "booking_option_source": "package"
    }
  }
}
```

### Field-by-field alignment made
- `scheduled_at`
  - kept
  - normalized in one backend-facing helper with explicit `+07:00`
- `branch_id`
  - kept
  - now normalized only through `normalizeCanonicalBranch()`
  - create sends raw selected branch value as-is
  - availability requests only send UUID-shaped branch values
- `customer_full_name`
  - kept
  - trimmed before send
- `phone`
  - kept
  - normalized to digits only before send
- `staff_name`
  - kept
  - trimmed before send
- `treatment_id`
  - kept
  - sourced only from canonical booking options
- `treatment_item_text`
  - kept only when the selected booking option actually includes backend-provided `treatment_item_text`
  - removed previous fallback that synthesized this value from the option label
- `package_id`
  - kept only when booking options provide it
- `receipt_evidence`
  - kept only when OCR result source is real backend OCR (`source === "api"`)
  - omitted entirely for mock or fallback OCR results
- `receipt_evidence.receipt_image_ref`
  - kept only when OCR returns a real non-placeholder reference
- `receipt_evidence.receipt_number`
  - kept only when non-empty and non-placeholder
- `receipt_evidence.receipt_line`
  - kept only when non-empty and non-placeholder
- `receipt_evidence.receipt_identifier`
  - kept only when non-empty and non-placeholder
- `receipt_evidence.total_amount_thb`
  - kept only when numeric and non-negative
- `receipt_evidence.ocr_status`
  - kept only when non-empty and non-placeholder
- `receipt_evidence.ocr_raw_text`
  - kept only when non-empty and non-placeholder
- `receipt_evidence.ocr_metadata`
  - kept only when it is a non-empty JSON object
- `receipt_evidence.verification_source`
  - set to `bill_verification_modal` only when at least one supported receipt evidence field exists
- `receipt_evidence.verification_metadata`
  - kept only when at least one cleaned metadata field remains

## Code Changes Made
1. Added `src/services/appointmentContract.js`.
2. Added `src/services/branchCatalog.js` to centralize booking branch options and branch normalization.
3. Moved canonical create payload mapping into `buildCanonicalAppointmentCreatePayload(...)`.
4. Moved canonical receipt evidence filtering into `buildCanonicalReceiptEvidence(...)`.
5. Moved queue occupied-time filtering into `collectOccupiedTimesFromQueueRows(...)`.
6. Updated `src/services/appointmentsService.js` so `getCalendarDays(...)` and `getAppointmentsQueue(...)` accept `branchValue` and normalize it internally before building canonical query params.
7. Updated `src/components/NewBillRecipientModal.jsx` to:
   - use the centralized branch normalization helper for availability reads
   - use the centralized canonical payload builder for submit
   - use the centralized branch option catalog instead of inline branch definitions
   - stop synthesizing `treatment_item_text` from the booking option label
8. Updated `src/pages/BookingFlowPage.jsx` to use the same centralized booking branch catalog instead of keeping a second inline branch list.
9. Added contract tests for:
   - branch query-param inclusion/omission rules
   - raw create `branch_id` preservation
   - `treatment_item_text` omission rules
   - `receipt_evidence` omission/filtering rules
   - verification metadata preservation
   - omission of optional empty top-level fields
10. Kept canonical requests on `credentials: 'include'`.

## Remaining Uncertainty
- The backend contract still documents mixed `branch_id` behavior:
  - read endpoints require UUID-shaped `branch_id` when provided
  - create still allows non-empty text and still mentions `branch-003`
- The frontend currently has no canonical branch mapping source from the backend, so it cannot safely convert `branch-003` into a UUID.
- Until the backend exposes one canonical branch identifier shape or a branch lookup endpoint, the adapter must keep this split behavior.

## Verification
- `npm run build` passed after the branch/payload adapter refactor.

## Update 2026-03-22T12:26:05.7588466+07:00

### Bill Verification OCR Diagnostics Refresh
- `src/components/NewBillRecipientModal.jsx` now maps OCR errors into four clearer buckets:
  - missing backend OCR route
  - downstream OCR unavailable
  - network/CORS failure
  - timeout
- `src/services/receiptOcrService.js` now throws an explicit `timeout` reason when the OCR request exceeds the configured limit.
- The Bill Verification modal now renders a visible `UI build ...` stamp so LIFF/mobile screenshots can prove which frontend build is actually on screen.
- `.github/workflows/deploy.yml` now injects build metadata into the production frontend bundle.

### Verification
- `npx vitest run src/services/receiptOcrService.test.js src/components/NewBillRecipientModal.test.jsx`
- `npm run build`

## Update 2026-03-17T17:38:18.2802171+07:00

### Branch drift reduction
- Centralized the hard-coded booking branch list into `src/services/branchCatalog.js`.
- Removed inline branch definitions from:
  - `src/components/NewBillRecipientModal.jsx`
  - `src/pages/BookingFlowPage.jsx`
- Kept current behavior unchanged:
  - create payload still sends the raw selected branch value
  - `calendar-days` and `queue` still only send `branch_id` when the selected branch is UUID-shaped

### Branch ambiguity still unsolved
- Backend docs still allow mixed branch behavior:
  - write path can accept text-like `branch_id`
  - availability reads only want UUID-shaped `branch_id` when provided
- The frontend still has no backend-sourced branch UUID mapping and therefore intentionally does not invent one.

### Tests added
- `src/services/appointmentContract.test.js`
- `src/services/appointmentsService.test.js`
- Covered cases:
  - UUID vs non-UUID `branch_id` handling on availability reads
  - raw `branch_id` preservation on create payloads
  - no label fallback for `treatment_item_text`
  - omission of `receipt_evidence` for non-API OCR or empty evidence
  - receipt field filtering to backend-supported keys only
  - preservation of `verification_source` and `verification_metadata`
  - omission of unsupported optional top-level keys

### Assumptions
- `BookingFlowPage.jsx` uses the same booking branch catalog values as the receipt-backed modal, so centralizing the branch list there reduces drift without changing endpoint behavior in this task.
- Vitest is the smallest compatible test stack for this Vite/ESM repo.

### Verification for this update
- `npm run test` passed.
- `npm run build` passed.

## Update 2026-03-18T08:26:46.0906141+07:00

### Scope
- Switch `BillVerificationPage` to the real persisted `GET /api/appointment-drafts` dashboard flow.
- Align frontend branch handling with the explicit backend branch contract in `scGlamLiff-reception`.
- Separate database lifecycle status from UI readiness status for draft cards.

### Files changed
- `src/pages/BillVerificationPage.jsx`
- `src/pages/BillVerificationPage.css`
- `src/pages/BillVerificationPage.test.jsx`
- `src/pages/billVerificationDrafts.js`
- `src/pages/billVerificationDrafts.test.js`
- `src/components/NewBillRecipientModal.jsx`
- `src/components/NewBillRecipientModal.test.jsx`
- `src/services/appointmentDraftService.js`
- `src/services/appointmentDraftService.test.js`
- `src/services/appointmentContract.js`
- `src/services/appointmentContract.test.js`
- `src/services/appointmentsService.js`
- `src/services/branchCatalog.js`
- `src/services/branchContract.js`
- `src/services/branchContract.test.js`
- `src/services/appointmentDraftReadiness.js`
- `IMPLEMENTATION_LOG_RECEIPT_BOOKING.md`

### Backend contract assumptions followed
- `GET /api/appointment-drafts` is now a real PostgreSQL-backed persisted list endpoint and should be treated as the dashboard reload source.
- Draft rows survive refresh because they live in PostgreSQL, not in browser session state.
- Write paths keep `branch_id` as opaque text when provided.
- Queue/calendar filters only accept UUID-shaped `branch_id` query params.
- The frontend must not invent UUID remapping for values such as `branch-003`.

### What changed
- `src/services/appointmentDraftService.js` now treats `GET /api/appointment-drafts` as a normal supported endpoint and no longer rewrites `404/405` into a special blocked-state capability code.
- `src/pages/BillVerificationPage.jsx` now:
  - loads persisted backend drafts on mount
  - keeps loading / empty / error states only
  - continues showing updated rows immediately after save/update/submit through returned server draft rows
  - reloads persisted rows again after browser refresh because mount now always goes back to `/api/appointment-drafts`
- `src/pages/billVerificationDrafts.js` now maps backend draft rows into the existing card UI with:
  - a real derived display status label
  - a real backend-backed note (`updated_at` / `submitted_at`) instead of the old fake expiry copy
- Added `src/services/appointmentDraftReadiness.js` as the shared readiness helper for draft completeness semantics.
- `src/components/NewBillRecipientModal.jsx` now uses that shared readiness helper for the in-modal draft status note and preserves unknown stored backend branch values when reopening a draft.

### Display status semantics
- Database lifecycle status remains the backend record state such as `draft`, `submitted`, or `cancelled`.
- UI display readiness is derived separately:
  - `draft` + missing submit-required fields => `เตรียมข้อมูล`
  - `draft` + all submit-required fields present => `พร้อมจอง`
  - `submitted` => `จองแล้ว`
  - `cancelled` => `ยกเลิกแล้ว`
- These UI labels are not written back as backend lifecycle statuses.

### Branch contract alignment
- Branch contract logic is now centralized in `src/services/branchContract.js`.
- The frontend now mirrors the backend split explicitly:
  - write payloads keep the selected raw branch value as `branch_id`
  - availability requests only send `branch_id` when the selected value is UUID-shaped
  - no fake UUID mapping is generated for text values such as `branch-003`
- `src/services/appointmentContract.js` now documents and keeps the intentional client-side queue narrowing step for non-UUID branch values:
  - queue request omits the unsupported server filter
  - returned rows are narrowed locally by the selected raw stored `branch_id`
- `src/services/branchCatalog.js` still keeps hard-coded user-selectable branch options for now, but reopening an existing draft no longer drops a backend branch value that is outside that static catalog.

### Remaining limitations
- The selectable branch catalog is still hard-coded on the frontend; it now preserves unknown stored values on reopen, but it is not yet sourced from a backend branch list endpoint.
- `GET /api/appointment-drafts` still uses the backend default status filter, so cancelled rows only appear if the backend includes them in that response or a future filtered list view is added.
- Calendar day counts cannot be branch-filtered server-side for non-UUID branch values until the backend branch identifier model is unified.

### Verification for this update
- `npm test` passed.
- `npm run build` passed.

## Update 2026-03-17T19:13:13.1700099+07:00

### Draft card status semantics aligned to product meaning
- Updated `src/pages/billVerificationDrafts.js` so draft cards no longer render a generic raw `ร่าง` label.
- For rows whose backend `status` is still `draft`, the frontend now derives display state from completeness against the backend draft-submit contract:
  - `เตรียม` = still missing one or more submit-required fields
  - `พร้อม` = has all submit-required fields needed before `POST /api/appointment-drafts/:id/submit`
- The required-field check currently follows backend documentation for draft submit:
  - `customer_full_name`
  - `phone`
  - `treatment_id`
  - `branch_id`
  - `scheduled_at`
  - `staff_name`
  - plus `package_id` when the stored booking-option source is `package`
- Explicit backend draft statuses still win:
  - `submitted` -> `จองแล้ว`
  - `cancelled` -> `ยกเลิก`

### Tests updated
- `src/pages/billVerificationDrafts.test.js`
  - added coverage for incomplete draft -> `เตรียม`
  - added coverage for complete draft -> `พร้อม`
  - kept coverage for submitted/cancelled pass-through states
- `src/pages/BillVerificationPage.test.jsx`
  - updated rendered-card expectation from raw `ร่าง` to derived `เตรียม`

### Verification for this update
- `npm run test` passed.

## Update 2026-03-17T18:57:43.9544608+07:00

### Files inspected
- `C:\Users\scgro\Desktop\Webapp training project\scGlamLiff-reception\backend\API_CONTRACT.md`
- `C:\Users\scgro\Desktop\Webapp training project\scGlamLiff-reception\backend\src\routes\appointmentDrafts.js`
- `src/pages/BillVerificationPage.jsx`
- `src/pages/BillVerificationPage.css`
- `src/pages/billVerificationDrafts.js`
- `src/components/NewBillRecipientModal.jsx`
- `src/services/appointmentDraftService.js`

### Backend contract assumptions followed
- `/api/appointment-drafts` currently supports create/get-by-id/patch/submit only.
- There is still no confirmed `GET /api/appointment-drafts` list/search endpoint in the backend contract or current route file.
- Because the backend list endpoint is not available yet, the frontend must not invent a fake persistent list source.

### What changed
- Added `listAppointmentDrafts()` in `src/services/appointmentDraftService.js` as a thin canonical probe for `GET /api/appointment-drafts`.
- When the backend returns `404` or `405`, the service now raises `DRAFT_LIST_UNAVAILABLE_CODE` so the page can show an honest blocked state instead of pretending the list exists.
- `src/pages/BillVerificationPage.jsx` now:
  - tries to load draft rows from backend on mount
  - renders real draft-backed cards when rows are available
  - shows loading, empty, unsupported, and error states with minimal UI change
  - keeps the current-session adapter path so drafts saved from the modal still appear immediately even while the backend lacks a list endpoint
  - passes `initialDraft` into the modal for a practical click-to-edit route on draft rows
- `src/components/NewBillRecipientModal.jsx` now hydrates an existing draft back into the form when opened from the list:
  - customer/phone/branch/provider
  - scheduled date/time if present
  - canonical treatment/package selection state from stored draft metadata
  - persisted `receipt_evidence` back into the modal review state when available
- `src/pages/BillVerificationPage.css` gained only small state-panel and clickable-card-button styling; no page redesign was introduced.

### Tests added
- `src/pages/BillVerificationPage.test.jsx`
  - renders backend draft rows into the existing card UI
  - shows the blocked-state message when backend draft list is unavailable
  - verifies clicking a draft card opens the modal with that draft in state
- `src/services/appointmentDraftService.test.js`
  - verifies successful list fetch handling
  - verifies `404/405` are normalized into `DRAFT_LIST_UNAVAILABLE_CODE`
- `src/components/NewBillRecipientModal.test.jsx`
  - added draft hydration coverage for opening an existing draft from the page

### BillVerificationPage behavior after this update
- The page no longer depends only on mock card data.
- If the backend list endpoint becomes available, the page is already wired to consume it.
- Until then, the page can only show:
  - drafts returned by a future backend list endpoint, or
  - drafts created/updated during the current page session through modal callbacks

### Remaining limitations
- Historical draft records still cannot reload after page refresh because backend list/search is not implemented yet.
- The click-to-open path is intentionally limited to rows whose status is still `draft`; submitted/cancelled rows stay display-only in this page pass.
- The page still depends on authenticated cookie session state to read backend drafts when a list endpoint is eventually enabled.

### Verification for this update
- `npm run test` passed.
- `npm run build` passed.

## Update 2026-03-17T18:45:12.3969132+07:00

### Draft flow behavior
- Added frontend draft API helpers in `src/services/appointmentDraftService.js` for:
  - `createAppointmentDraft(payload)`
  - `getAppointmentDraft(id)`
  - `updateAppointmentDraft(id, payload)`
  - `submitAppointmentDraft(id)`
- All draft calls use `credentials: 'include'`, matching canonical booking behavior.
- Added draft-specific contract builders in `src/services/appointmentContract.js`:
  - `buildCanonicalAppointmentDraftCreatePayload(...)`
  - `buildCanonicalAppointmentDraftPatchPayload(...)`
- Draft builders intentionally differ from real create:
  - allow missing `scheduled_at`
  - allow missing `staff_name`
  - keep current text-tolerant `branch_id` behavior
  - preserve filtered `receipt_evidence` when real API OCR data exists
  - omit empty strings / empty objects from create payloads
  - use explicit clears in patch payloads when an existing draft field is now blank in the UI

### Save draft vs real submit
- `บันทึกร่าง` now creates a draft when no draft id exists, and patches the current draft when one already exists.
- Incomplete promo-qualified data can now be saved as a draft without creating a real appointment row.
- Real `บันทึก` still requires the full booking fields.
- If no draft id exists, real `บันทึก` still uses canonical `POST /api/appointments`.
- If a draft id exists, real `บันทึก` now:
  - patches the draft with current form values when needed
  - then calls `POST /api/appointment-drafts/:id/submit`
  - instead of creating a second disconnected direct appointment

### BillVerificationPage integration
- Backend still has no draft list/search endpoint.
- Because of that, `src/pages/BillVerificationPage.jsx` now uses a minimal session-local adapter path:
  - `NewBillRecipientModal` publishes draft changes upward via callback
  - `BillVerificationPage` stores those returned draft rows in component state
  - the existing `BillCard` UI now renders those draft-backed rows when available
- Status mapping currently used:
  - `draft` -> `เตรียม`
  - `submitted` -> `พร้อม`
  - `cancelled` -> `ยกเลิก`
- Booking date display shows a Thai-friendly formatted datetime when `scheduled_at` exists, otherwise a placeholder.

### Tests added for draft work
- Extended `src/services/appointmentContract.test.js` to cover:
  - draft create payloads with missing `scheduled_at` / `staff_name`
  - omission of empty optional draft fields
  - patch payload clears for now-empty fields
- Added `src/components/NewBillRecipientModal.test.jsx` to cover:
  - `บันทึกร่าง` calls draft API, not real appointment create, for incomplete bookings
  - completed existing drafts use `submitAppointmentDraft(...)`
  - normal real create still works when no draft id exists

### Remaining limitations
- There is still no backend draft list endpoint, so `BillVerificationPage` cannot load historical drafts on refresh yet.
- Current page integration shows draft rows created during the current page session only.
- The modal keeps draft id only in local component state for the active draft flow; reopening an old draft from the page is not implemented in this pass.
- Draft submit still depends on the same canonical create prerequisites:
  - valid authenticated staff cookie session
  - valid `branch_id`
  - complete submit fields on the draft
  - canonical create conflict/package validation passing

### Verification for this update
- `npm run test` passed.
- `npm run build` passed.

## Update 2026-03-18

### Scope
- Add a LIFF startup guard that checks whether the current LINE-opened smartphone is a registered active branch device before normal frontend usage continues.
- Keep existing staff auth intact and separate.
- Use the existing backend branch-device registration endpoints in `scGlamLiff-reception` without redesigning unrelated booking pages.

### Files changed
- `src/App.jsx`
- `src/components/BranchDeviceStartupGate.jsx`
- `src/components/BranchDeviceStartupGate.test.jsx`
- `src/context/BranchDeviceContext.jsx`
- `src/pages/BillVerificationPage.jsx`
- `src/pages/BookingFlowPage.jsx`
- `src/pages/BookingFlowPage.test.jsx`
- `src/services/branchDeviceRegistrationService.js`
- `src/services/branchDeviceRegistrationService.test.js`
- `src/utils/liffIdentity.js`
- `src/utils/liffSession.js`
- `IMPLEMENTATION_LOG_RECEIPT_BOOKING.md`

### Backend endpoints used
- `GET /api/branch-device-registrations/me`
  - public LIFF verification lookup
  - frontend sends LIFF identity only through trusted token headers
- `POST /api/branch-device-registrations`
  - still requires existing staff cookie auth
  - frontend sends the selected `branch_id`, optional `device_label`, optional `liff_app_id`, and LIFF verification headers

### Startup guard flow
1. Existing LIFF auth/bootstrap runs first.
2. After auth is ready in real LIFF mode, frontend calls `GET /api/branch-device-registrations/me`.
3. The guard branches explicitly:
   - `registered && active` -> continue into the app
   - `registered === false` -> show registration-required UI
   - `registered && !active` -> show inactive/blocked UI
   - request / LIFF verification failure -> show explicit verification error UI
4. The frontend does not silently fall through when LIFF verification is missing or rejected.

### LIFF identity handling
- Added `src/utils/liffIdentity.js` as the small LIFF identity helper module.
- It is responsible for:
  - LIFF initialization
  - in-client / login checks
  - reading LIFF id/access tokens
  - building backend verification headers
- Trusted header format now matches the backend contract:
  - `Authorization: Bearer <LINE access token>` when available
  - `X-Line-Access-Token`
  - `X-Line-Id-Token`
  - `X-Liff-App-Id`
- Frontend does not use raw LIFF profile fields as the registration source of truth.

### Registration flow
- `src/components/BranchDeviceStartupGate.jsx` now provides a minimal first-time registration form:
  - branch selector
  - optional device label
  - register button
- On submit:
  - frontend calls `POST /api/branch-device-registrations`
  - keeps `credentials: 'include'`
  - sends LIFF verification headers plus optional `liff_app_id` metadata
  - then refreshes `GET /api/branch-device-registrations/me`
- Successful registration moves the guard into the normal ready state instead of requiring a manual page reload.

### Registered branch context usage
- Added `src/context/BranchDeviceContext.jsx` so the confirmed registered branch is available to the frontend after the guard succeeds.
- Current practical enforcement in this pass:
  - `src/pages/BookingFlowPage.jsx`
    - preselects the registered branch
    - disables the branch selector to avoid accidental mismatch
    - still preserves an unknown backend branch value in the select if it is outside the hard-coded catalog
  - `src/pages/BillVerificationPage.jsx`
    - passes the registered branch into `NewBillRecipientModal` as the default branch for new draft work
- Not fully enforced yet:
  - `NewBillRecipientModal.jsx` is prefixed via `defaultBranchId` from the page path but the modal branch selector is not globally locked everywhere in this pass

### UX states added
- Checking device registration
- Registration required
- Inactive device
- Verification error
- Ready/continue

### Tests added
- `src/components/BranchDeviceStartupGate.test.jsx`
  - success path
  - unregistered path
  - inactive path
  - registration submit path
- `src/services/branchDeviceRegistrationService.test.js`
  - LIFF token header usage on service requests
  - registration POST payload shape
- `src/pages/BookingFlowPage.test.jsx`
  - registered branch prefill/constrain behavior

### Remaining limitations
- The selectable branch list is still hard-coded on the frontend; the guard uses the same known branch catalog and preserves unknown stored values where the UI already supports that.
- The registration UI is intentionally minimal and currently lives only in the startup guard; there is no separate admin/staff management screen in this pass.
- Existing staff auth remains a prerequisite for `POST /api/branch-device-registrations`; this pass does not change login/session/cookie deployment behavior.
- Branch enforcement is strongest in `BookingFlowPage.jsx`; some other pages only prefill branch context rather than hard-lock every possible branch edit path.

## Update 2026-03-18T15:45:00+07:00

### LIFF device-registration troubleshooting reference
- Added `LIFF_DEVICE_REGISTRATION_BREADCRUMBS.md` as the dedicated incident/troubleshooting log for the LIFF startup guard and branch-device registration journey.
- That file is now the first reference to read when any of these break again:
  - wrong production API base URL
  - stale LIFF bundle still calling legacy auth bootstrap
  - backend `/api/branch-device-registrations/me` 500s
  - missing production migration for `branch_device_registrations`
  - uncertainty about canonical branch value for branch 003
  - staff cookie persistence failure inside LINE WebView
  - the current pragmatic decision to move registration POST toward a route-scoped non-cookie fallback instead of a wider auth rewrite
- This was split into its own document because the debugging path crossed both frontend and backend repos, production env/config, Render logs, GitHub Pages deploy config, and DB verification steps.

## Update 2026-03-22T09:30:13.3170176+07:00

### Scope
- Make the existing OCR receipt route usable end-to-end for the Bill Verification flow without rewriting unrelated appointment flows.
- Standardize the OCR response contract and make the real OCR path explicit.

### Active OCR path now enforced
- `src/components/NewBillRecipientModal.jsx` uploads the receipt image and still owns the Bill Verification UI flow.
- `src/services/receiptOcrService.js` now resolves OCR through a dedicated OCR base URL when `VITE_OCR_API_BASE_URL` is set.
- Active backend chain is now:
  - `backend/routes/ocr.routes.js`
  - `backend/middleware/receipt-upload.middleware.js`
  - `backend/controllers/ocr.controller.js`
  - `backend/services/ocr/receipt-ocr.service.js`
  - `backend/services/ocr/python-ocr-client.service.js`
  - `backend/services/ocr_python/app/main.py`

### What changed
- Added `VITE_OCR_API_BASE_URL` so OCR can stay local even when other frontend API calls point elsewhere.
- Standardized OCR success/error payloads across frontend, Node backend, and Python service.
- Marked legacy/mock OCR results explicitly as non-active OCR evidence with:
  - `code: "OCR_LEGACY_MOCK_RESULT"`
  - `ocrStatus: "mock"`
  - `ocrMetadata.activePath: false`
- Updated the frontend mapping so legacy/mock OCR results do not silently flow into canonical receipt evidence as if they were real API OCR.
- Added concise OCR diagnostics at the Node route/controller layer.

### Validation
- `npx vitest run src/services/receiptOcrService.test.js` passed.
- `npm run build` passed.
- `python -m compileall backend/services/ocr_python/app/main.py backend/services/ocr_python/app/services/receipt_parser.py` passed.

### Remaining blocker
- Real OCR still depends on the local Python OCR runtime and its dependencies being installed.
- During this pass, the current environment was still missing Python packages required to run the real OCR engine.

### Related docs updated in this pass
- `OCR_INTEGRATION_STATUS.md`
- `OCR_IMPLEMENTATION_LOG.md`
- `DEV_MOCK_SETUP.md`
- `docs/bill-verification-mock-note.md`
- `backend/services/ocr_python/README.md`

## 2026-03-22 10:14 +07:00 — Cross-repo OCR routing alignment

### Goal
- Stop routing Bill Verification OCR to the wrong local backend.
- Make the frontend in this repo call the real backend route that now lives in `scGlamLiff-reception`.

### What changed
- Kept `src/components/NewBillRecipientModal.jsx` as the upload/UI owner.
- Kept `src/services/receiptOcrService.js` as the frontend OCR caller and response mapper.
- Confirmed the active public backend route now lives in `scGlamLiff-reception/backend/src/routes/ocr.js`.
- Added `VITE_OCR_API_BASE_URL=http://localhost:5050` to `.env.development.local`.
- Kept `vite.config.js` proxy on `http://localhost:5050`.
- Rewrote OCR status docs in this repo so they no longer claim the active backend OCR route is inside `scGlamLiFFF/scGlamLiFF/backend`.

### Active path after this update
1. `src/components/NewBillRecipientModal.jsx`
2. `src/services/receiptOcrService.js`
3. `scGlamLiff-reception/backend/src/routes/ocr.js`
4. `scGlamLiff-reception/backend/src/controllers/ocrController.js`
5. `scGlamLiff-reception/backend/src/services/ocr/receiptOcrService.js`
6. `scGlamLiff-reception/backend/src/services/ocr/pythonOcrClient.js`
7. `backend/services/ocr_python/app/main.py`

### Legacy / inactive path
- Local Node OCR modules under this repo's `backend/` folder are now legacy/WIP for Bill Verification OCR.
- `VITE_USE_MOCK=true` and `rawTextOverride` are still mock/legacy paths only.

### Validation in this pass
- `npx vitest run src/services/receiptOcrService.test.js`
- `npm run build`
- `python -m compileall backend/services/ocr_python/app/main.py backend/services/ocr_python/app/services/receipt_parser.py`

### Remaining blocker
- Real OCR still cannot run locally until Python packages are installed:
  - `fastapi`
  - `paddle`
  - `paddleocr`
  - `python_multipart`
- `../REPO_STATUS_AUDIT.md`
