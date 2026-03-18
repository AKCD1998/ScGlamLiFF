**Overview**
Customer Profile + Course Status Module Plan (scGlamLiFF)

**Structure**
A) Current Structure Map
Key files:
- `src/pages/MyTreatmentSmoothPage.jsx` — “My Treatment (Smooth)” page; fetches profile/treatments/course bundles/history/next appointment and renders cards.
- `src/pages/MyTreatmentSmoothPage.css` — layout + card styles for profile, course list, next appointment, history; includes responsive rules.
- `src/pages/BookingFlowPage.jsx` — booking flow for “smooth”; creates appointments and selects addons.
- `src/pages/BookingFlowPage.css` — booking flow layout and controls.
- `src/MyTreatmentsPage.jsx` — list of owned treatments; entry point to MyTreatmentSmoothPage.
- `src/MyTreatmentsPage.css` — treatments list layout.
- `src/components/LineProfileCard.jsx` — profile header card (name, Line user id, female count).
- `src/components/CourseBundleList.jsx` — renders list of course bundles.
- `src/components/CourseBundleCard.jsx` — single package card with expiry + dot progress.
- `src/components/DotProgress.jsx` — dot progress indicator for course usage.
- `src/components/CourseProgressCard.jsx` — generic course progress card (currently unused).
- `src/components/NextAppointmentCard.jsx` — next appointment summary + CTA + QR modal.
- `src/components/BookingDetailsModal.jsx` — appointment details + barcode/QR modal.
- `src/components/ServiceHistoryTable.jsx` — history table (purchase + usage rows).
- `src/components/AppLayout.jsx` — page shell with header, breadcrumbs, footer.
- `src/components/LoadingOverlay.jsx` — full-page loading overlay used by MyTreatmentSmoothPage and BookingFlowPage.
- `src/context/AuthContext.jsx` — LIFF auth + mock user support; provides `useAuth()`.
- `src/utils/apiBase.js` — `apiUrl()` helper for API base URL.
- `src/utils/liffSession.js` — LIFF session initialization; calls `/api/liff/session`.
- `src/utils/formatBangkokDateTime.js` — formats appointment times in Bangkok TZ.
- `src/utils/mockAuth.js` — mock user id from query/localStorage.
- `src/data/myTreatmentMock.js` — fallback mock profile/course/history data.
- `src/data/bookingMock.js` — mock next-appointment payload (unused in current UI flow).
- `backend/index.js` — backend API definitions for treatments, courses, appointments, history, LIFF session.
- `backend/sql/history_tables.sql` — `purchase_history` and `usage_history` tables.

Key components (props/state + where used):
- `LineProfileCard` (`src/components/LineProfileCard.jsx`) — props: `profile { name, id, femaleCount }`; used in `MyTreatmentSmoothPage`.
- `CourseBundleList` (`src/components/CourseBundleList.jsx`) — props: `bundles[]`; renders `CourseBundleCard`; used in `MyTreatmentSmoothPage`.
- `CourseBundleCard` (`src/components/CourseBundleCard.jsx`) — props: `bundle { treatmentTitle, totalSessions, remainingSessions, expiresAt, status }`; computes used/expired/near-expiry; used by `CourseBundleList`.
- `DotProgress` (`src/components/DotProgress.jsx`) — props: `total`, `used`; visual progress; used by `CourseBundleCard`.
- `CourseProgressCard` (`src/components/CourseProgressCard.jsx`) — props: `course { name, total, used, remainingSessions }`; unused but matches “course status” UI.
- `NextAppointmentCard` (`src/components/NextAppointmentCard.jsx`) — props: `appointment`, `status`, `onEdit`, `onRetry`; local state: `isModalOpen`, `isRedeeming`; used in `MyTreatmentSmoothPage`.
- `BookingDetailsModal` (`src/components/BookingDetailsModal.jsx`) — props: `open`, `appointment`, `bookingDetails`, `redeemToken`, `onRedeem`, `showAcknowledge`, `showPaymentPlaceholder`; used by `NextAppointmentCard` and `BookingFlowPage`.
- `ServiceHistoryTable` (`src/components/ServiceHistoryTable.jsx`) — props: `history` (array or `{ purchaseRows, usageRows }`); used in `MyTreatmentSmoothPage`.
- `AppLayout` (`src/components/AppLayout.jsx`) — props: `breadcrumbs`, `headerSearch`, `children`; used by most pages.
- `LoadingOverlay` (`src/components/LoadingOverlay.jsx`) — props: `open`, `text`; used by `MyTreatmentSmoothPage` and `BookingFlowPage`.

API service functions (request URLs + payload shape):
- `GET /api/me/treatments?line_user_id=...` — response: `{ line_user_id, items: [{ code, title_th, title_en, duration_min, remaining_sessions }] }`. Used in `MyTreatmentsPage` and `MyTreatmentSmoothPage`.
- `GET /api/me/history?line_user_id=...&treatment_code=smooth` — response: `{ purchaseRows: [{ id, dateTime, serviceName, provider, scrub, facialMask, misting, extraPrice, note }], usageRows: [...] }`. Used in `MyTreatmentSmoothPage`.
- `GET /api/my-courses?lineUserId=...` — response: `{ courses: [{ purchaseId, treatmentId, treatmentCode, treatmentTitle, totalSessions, purchasedAt, expiresAt, usedSessions, remainingSessions, status }] }`. Used in `MyTreatmentSmoothPage`.
- `GET /api/appointments/next?line_user_id=...&treatment_code=smooth` — response: `{ item: { id, branch_id, scheduled_at, status, selected_toppings, addons_total_thb } | null }`. Used in `MyTreatmentSmoothPage`.
- `POST /api/appointments` — request: `{ line_user_id, treatment_code, branch_id, date, time, selected_toppings: [{ id, name, price_thb, category }], addons_total_thb }`; response: `{ id, branch_id, scheduled_at, status, selected_toppings, addons_total_thb }`. Used in `BookingFlowPage`.
- `POST /api/appointments/redeem` — request: `{ token, provider, scrub, facial_mask, misting, extra_price_thb, note }`; response: `{ ok, line_user_id, treatment_code, remaining_sessions_after, is_completed }`. Used in `NextAppointmentCard` and `StaffScanPage`.
- `POST /api/liff/session` — request: `{ idToken }`; response: `{ lineUserId, displayName }`. Used in `liffSession.js`.

**Module**
B) Reusable Module Design
Proposed “CustomerProfile” module layout (new shared module):
- `src/modules/customer-profile/CustomerProfilePage.jsx` — container that fetches profile, packages, and next appointment; maps API data to view model.
- `src/modules/customer-profile/components/CustomerHeaderCard.jsx` — presentational header card; base on `LineProfileCard`.
- `src/modules/customer-profile/components/CourseList.jsx` — list wrapper; base on `CourseBundleList`.
- `src/modules/customer-profile/components/CourseCard.jsx` — single package card; base on `CourseBundleCard`.
- `src/modules/customer-profile/components/UsageTimeline.jsx` — optional future; base on `ServiceHistoryTable` or a simplified list.
- `src/modules/customer-profile/components/NextAppointmentCard.jsx` — appointment summary card with action slots (no hard-coded navigation).
- `src/modules/customer-profile/index.js` — barrel exports.

Shared between LIFF and Reception:
- Presentational components: `CustomerHeaderCard`, `CourseList`, `CourseCard`, `UsageTimeline`, `NextAppointmentCard` (actions passed in as props).
- View-model mapping: “course card” wants `sessions_total`, `used`, `remaining`, `expires_at`, `status`, `treatment_name`.
- CSS tokens for card layout and responsive grid can be copied from `src/pages/MyTreatmentSmoothPage.css` and `src/components/CourseBundleCard.css`.

LIFF-specific (current repo):
- Container fetches via `useAuth()` and uses `lineUserId` from LIFF session.
- Endpoints already exist: `/api/me/treatments`, `/api/my-courses`, `/api/appointments/next`, `/api/me/history`.
- Actions: “Book” navigates to `/my-treatments/smooth/booking`; “Redeem” uses `/api/appointments/redeem`.

Reception/Admin-specific (future reuse):
- Container receives `customerId` from admin search/selection and calls `/api/customers/:id/*` endpoints.
- Actions: “Reschedule/Cancel/Check-in” should be injected from admin flow; no LIFF navigation.

Existing components you can copy as-is for the shared module:
- `src/components/LineProfileCard.jsx` → Customer header base.
- `src/components/CourseBundleList.jsx` → Course list base.
- `src/components/CourseBundleCard.jsx` → Course card base.
- `src/components/NextAppointmentCard.jsx` → Appointment card base (requires action injection to remove LIFF routing).
- `src/components/ServiceHistoryTable.jsx` → Usage/history base (optional).

**Data**
C) Data Requirements
UI data shape (TypeScript-ish):
```ts
type CustomerProfile = {
  id: string;
  lineId?: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  genderLabel?: string;
  genderCount?: number;
};

type CoursePackage = {
  packageId: string;
  treatmentCode: string;
  treatmentName: string;
  sessionsTotal: number;
  sessionsUsed: number;
  sessionsRemaining: number;
  purchasedAt?: string; // ISO
  expiresAt?: string | null; // ISO
  status: "active" | "completed" | "expired";
};

type NextAppointment = {
  appointmentId: string;
  scheduledAt: string; // ISO
  branchId?: string;
  branchName?: string;
  status: "booked" | "rescheduled";
  addons?: { name: string; priceTHB?: number }[];
  addonsTotalTHB?: number;
};

type CustomerCourseStatusVM = {
  profile: CustomerProfile;
  packages: CoursePackage[];
  nextAppointment: NextAppointment | null;
  history?: {
    purchaseRows: Array<Record<string, string>>;
    usageRows: Array<Record<string, string>>;
  };
};
```

Minimum database tables (requested by spec):
- `customers` — core profile info (name, phone, status).
- `customer_identities` — identity mapping (e.g., LINE user id, external ids).
- `customer_packages` — purchased packages per customer (sessions_total, expires_at, status).
- `packages` — package definitions (treatment, sessions_total, price, active).
- `package_usages` — usage log per package (used_at, provider, addons).
- `appointments` — bookings with scheduled_at and status.
- `treatments` — treatment catalog.

Current repo table equivalents (for mapping, no schema changes):
- `line_users` → `customers` (LINE user profile).
- `user_treatments` → `customer_packages` (remaining sessions by treatment).
- `purchase_history` → `customer_packages` history.
- `usage_history` → `package_usages`.
- `appointments` → `appointments`.
- `treatments` → `treatments`.

**API**
D) Backend/API Plan (spec only)
Endpoint: `GET /api/customers/:id/profile`
- Request params: `:id` (customer id), optional `include=identity`.
- Response shape:
```json
{ "customer": { "id": "...", "name": "...", "phone": "...", "lineId": "...", "avatarUrl": null } }
```
- SQL outline: `select c.id, c.name, c.phone, ci.line_user_id from customers c left join customer_identities ci on ci.customer_id = c.id where c.id = $1 and c.status <> 'test'`.

Endpoint: `GET /api/customers/:id/packages?status=active`
- Request params: `:id`, query `status` (default `active`).
- Response shape:
```json
{ "packages": [ { "packageId": "...", "treatmentCode": "smooth", "treatmentName": "Smooth", "sessionsTotal": 10, "sessionsUsed": 4, "sessionsRemaining": 6, "expiresAt": "2027-01-23T...", "status": "active" } ] }
```
- SQL outline: `select cp.id, p.treatment_id, t.code, t.title_en, cp.sessions_total, cp.expires_at, count(pu.id) as used_count from customer_packages cp join packages p on p.id = cp.package_id join treatments t on t.id = p.treatment_id left join package_usages pu on pu.customer_package_id = cp.id where cp.customer_id = $1 and cp.status = 'active' group by cp.id, p.treatment_id, t.code, t.title_en`.

Endpoint: `GET /api/customers/:id/next-appointment`
- Request params: `:id`, optional `treatmentCode`.
- Response shape:
```json
{ "appointment": { "appointmentId": "...", "scheduledAt": "2026-02-05T10:30:00+07:00", "branchId": "branch-003", "status": "booked" } }
```
- SQL outline: `select id, branch_id, scheduled_at, status from appointments where customer_id = $1 and status = 'booked' and scheduled_at >= now() order by scheduled_at asc limit 1`.

Business rules (apply to all relevant endpoints):
- Exclude “Test User” or “unknown” from customer lists and profile search results.
- Course status: `sessions_used = count(package_usages)`; `sessions_remaining = sessions_total - sessions_used`.
- Only active packages by default (`status = 'active'`), unless a query flag requests completed/expired.
- Next appointment: nearest future `scheduled_at` with `status = 'booked'` (or `rescheduled` if allowed).

**Behavior**
E) UI Behavior Spec
Loading/error/empty states:
- Profile card: show skeleton text or “Loading customer…”; on error show retry inline.
- Course list: show loading state; empty state message when no active packages.
- Next appointment: show “No upcoming booking” and “Book”/“Create” CTA if empty; show retry on error.
- History/usage: optional section; show “No usage yet” when empty.

Mobile-friendly layout (match LIFF screenshot):
- Single-column layout under 900px (mirrors `MyTreatmentSmoothPage.css`).
- Cards stacked with consistent padding and border radius; avoid large tables unless responsive collapse is implemented.

Component reusability across projects:
- Keep all shared UI components presentational and prop-driven; avoid direct `useAuth()` or `navigate()` calls inside shared components.
- Provide a thin container per project for data fetching and action wiring.
- Keep data mapping functions near the container to adapt backend response shapes without changing shared UI components.
