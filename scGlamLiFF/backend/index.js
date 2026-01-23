import "dotenv/config";
import cors from "cors";
import express from "express";
import pg from "pg";
import omiseRouter from "./routes/omise.routes.js";

const { Pool } = pg;

const app = express();
const port = process.env.PORT || 3002;
const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const SHOP_TZ = "Asia/Bangkok";
const LEAD_TIME_MINUTES = 120;
const SLOT_INTERVAL_MINUTES = 45;
const OPEN_TIME = "08:00";
const LAST_START_TIME = "18:15";

const parseTimeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map((part) => Number(part));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
};

const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

const getBangkokNow = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SHOP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(new Date());

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(
    `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}+07:00`
  );
};

const getBangkokDateOnly = (date) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SHOP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
};

const buildBangkokDateTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) {
    return null;
  }
  const [year, month, day] = dateStr.split("-").map((part) => Number(part));
  const [hours, minutes] = timeStr.split(":").map((part) => Number(part));
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return null;
  }
  return new Date(
    `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}:00+07:00`
  );
};

const getBangkokDayRange = (dateStr) => {
  const start = buildBangkokDateTime(dateStr, "00:00");
  const end = buildBangkokDateTime(dateStr, "23:59");
  if (!start || !end) {
    return null;
  }
  end.setSeconds(59, 999);
  return { start, end };
};

const isSlotOnGrid = (timeStr) => {
  const minutes = parseTimeToMinutes(timeStr);
  const openMinutes = parseTimeToMinutes(OPEN_TIME);
  const lastMinutes = parseTimeToMinutes(LAST_START_TIME);
  if (minutes === null || openMinutes === null || lastMinutes === null) {
    return false;
  }
  if (minutes < openMinutes || minutes > lastMinutes) {
    return false;
  }
  return (minutes - openMinutes) % SLOT_INTERVAL_MINUTES === 0;
};

const generateSlots = () => {
  const openMinutes = parseTimeToMinutes(OPEN_TIME);
  const lastMinutes = parseTimeToMinutes(LAST_START_TIME);
  if (openMinutes === null || lastMinutes === null) {
    return [];
  }
  const slots = [];
  for (
    let minutes = openMinutes;
    minutes <= lastMinutes;
    minutes += SLOT_INTERVAL_MINUTES
  ) {
    slots.push(minutesToTime(minutes));
  }
  return slots;
};

const getBangkokMinutes = (date) => {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: SHOP_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  const [hourStr, minuteStr] = formatter.format(date).split(":");
  return Number(hourStr) * 60 + Number(minuteStr);
};

const validateSchedule = ({ date, time, nowBangkok }) => {
  const scheduledAt = buildBangkokDateTime(date, time);
  if (!scheduledAt) {
    return { ok: false, status: 400, error: "Invalid date or time format" };
  }

  if (!isSlotOnGrid(time)) {
    return { ok: false, status: 422, error: "Time is not on slot grid" };
  }

  const lastMinutes = parseTimeToMinutes(LAST_START_TIME);
  const slotMinutes = parseTimeToMinutes(time);
  if (slotMinutes === null || lastMinutes === null || slotMinutes > lastMinutes) {
    return { ok: false, status: 422, error: "Time is after last booking start" };
  }

  const leadMs = LEAD_TIME_MINUTES * 60 * 1000;
  const minAllowed = new Date(nowBangkok.getTime() + leadMs);
  if (scheduledAt < minAllowed) {
    return { ok: false, status: 422, error: "Lead time requirement not met" };
  }

  return { ok: true, scheduledAt };
};

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

const verifyLineIdToken = async (idToken) => {
  if (!LINE_CHANNEL_ID || !LINE_CHANNEL_SECRET) {
    throw new Error("LINE channel env is missing");
  }

  const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      id_token: idToken,
      client_id: LINE_CHANNEL_ID
    }).toString()
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message =
      payload.error_description || payload.error || "Invalid LINE ID token";
    throw new Error(message);
  }

  return response.json();
};

app.post("/api/liff/session", async (req, res) => {
  const { idToken } = req.body || {};
  if (!idToken) {
    res.status(400).json({ error: "idToken is required" });
    return;
  }

  if (!LINE_CHANNEL_ID || !LINE_CHANNEL_SECRET) {
    res.status(500).json({
      error: "LINE_CHANNEL_ID or LINE_CHANNEL_SECRET is not configured"
    });
    return;
  }

  try {
    const payload = await verifyLineIdToken(idToken);
    res.json({
      lineUserId: payload.sub,
      displayName: payload.name || null
    });
  } catch (error) {
    console.error("Failed to verify LINE ID token", error);
    res.status(401).json({
      error: error.message || "Invalid LINE ID token"
    });
  }
});

app.get("/api/me/treatments", async (req, res) => {
  const lineUserId = req.query.line_user_id || "U_TEST_001";

  try {
    const result = await pool.query(
      `select t.code, t.title_th, t.title_en, t.duration_min, ut.remaining_sessions
       from user_treatments ut
       join treatments t on t.id = ut.treatment_id
       where ut.line_user_id = $1
         and ut.is_active = true
         and ut.remaining_sessions > 0
       order by t.code`,
      [lineUserId]
    );

    res.json({ line_user_id: lineUserId, items: result.rows });
  } catch (error) {
    console.error("Failed to load treatments", error);
    res.status(500).json({ error: "Failed to load treatments" });
  }
});

app.get("/api/toppings", async (req, res) => {
  const isActiveOnly = req.query.active !== "false";

  try {
    // SQL: select active toppings ordered by category and price.
    const result = await pool.query(
      `select id, code, category, title_th, title_en, price_thb
       from toppings
       where ($1::boolean is false) or is_active = true
       order by category, price_thb, code`,
      [!isActiveOnly ? false : true]
    );

    res.json({ items: result.rows });
  } catch (error) {
    console.error("Failed to load toppings", error);
    if (error.code === "42P01") {
      res.status(500).json({
        error: "Missing toppings table. Create toppings before using /api/toppings."
      });
      return;
    }
    res.status(500).json({ error: "Failed to load toppings" });
  }
});

app.get("/api/availability", async (req, res) => {
  const branchId = req.query.branch_id;
  const date = req.query.date;
  const treatmentCode = req.query.treatment_code;

  if (!branchId || !date || !treatmentCode) {
    res.status(400).json({ error: "branch_id, date, treatment_code are required" });
    return;
  }

  const nowBangkok = getBangkokNow();
  const todayBangkok = getBangkokDateOnly(nowBangkok);

  if (date < todayBangkok) {
    res.status(422).json({ error: "Cannot book in the past" });
    return;
  }

  const dayRange = getBangkokDayRange(date);
  if (!dayRange) {
    res.status(400).json({ error: "Invalid date format" });
    return;
  }

  try {
    // SQL: ensure treatment exists.
    const treatmentResult = await pool.query(
      "select id from treatments where code = $1",
      [treatmentCode]
    );

    if (treatmentResult.rowCount === 0) {
      res.status(400).json({ error: "Treatment not found" });
      return;
    }

    // SQL: load booked slots for date/branch.
    const appointmentsResult = await pool.query(
      `select scheduled_at
       from appointments
       where branch_id = $1
         and scheduled_at >= $2
         and scheduled_at <= $3
         and status in ('booked', 'rescheduled')`,
      [branchId, dayRange.start, dayRange.end]
    );

    const bookedTimes = new Set(
      appointmentsResult.rows.map((row) => {
        const formatted = new Intl.DateTimeFormat("en-GB", {
          timeZone: SHOP_TZ,
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        }).format(new Date(row.scheduled_at));
        return formatted;
      })
    );

    // SQL: load blocked slots for date/branch.
    const blockedResult = await pool.query(
      `select slot_start, slot_end
       from branch_slots
       where branch_id = $1
         and is_blocked = true
         and slot_start < $3
         and slot_end > $2`,
      [branchId, dayRange.start, dayRange.end]
    );

    const blockedRanges = blockedResult.rows.map((row) => ({
      startMinutes: getBangkokMinutes(new Date(row.slot_start)),
      endMinutes: getBangkokMinutes(new Date(row.slot_end))
    }));

    const openMinutes = parseTimeToMinutes(OPEN_TIME);
    const leadTimeDate = new Date(
      nowBangkok.getTime() + LEAD_TIME_MINUTES * 60 * 1000
    );
    const leadMinutes = getBangkokMinutes(leadTimeDate);
    const elapsedFromOpen = Math.max(0, leadMinutes - openMinutes);
    const leadSteps = Math.ceil(elapsedFromOpen / SLOT_INTERVAL_MINUTES);
    const minSlotMinutes =
      date === todayBangkok ? openMinutes + leadSteps * SLOT_INTERVAL_MINUTES : null;

    const slots = generateSlots().filter((slot) => {
      if (bookedTimes.has(slot)) {
        return false;
      }
      const minutes = parseTimeToMinutes(slot);
      if (minutes === null) {
        return false;
      }
      if (minSlotMinutes !== null && minutes < minSlotMinutes) {
        return false;
      }
      const isBlocked = blockedRanges.some(
        (range) => minutes >= range.startMinutes && minutes < range.endMinutes
      );
      return !isBlocked;
    });

    res.json({ slots });
  } catch (error) {
    console.error("Failed to load availability", error);
    res.status(500).json({ error: "Failed to load availability" });
  }
});

app.post("/api/appointments", async (req, res) => {
  const {
    line_user_id: lineUserId,
    treatment_code: treatmentCode,
    branch_id: branchId,
    date,
    time,
    selected_toppings: selectedToppings,
    addons_total_thb: addonsTotalThb
  } = req.body || {};

  let normalizedToppings = selectedToppings;
  if (typeof normalizedToppings === "string") {
    try {
      normalizedToppings = JSON.parse(normalizedToppings);
    } catch (error) {
      res.status(400).json({ error: "selected_toppings must be valid JSON" });
      return;
    }
  }

  if (normalizedToppings && !Array.isArray(normalizedToppings)) {
    if (typeof normalizedToppings === "object") {
      normalizedToppings = [normalizedToppings];
    } else {
      res.status(400).json({ error: "selected_toppings must be an array" });
      return;
    }
  }

  if (!lineUserId || !treatmentCode || !branchId || !date || !time) {
    res.status(400).json({ error: "Missing required booking fields" });
    return;
  }

  const nowBangkok = getBangkokNow();
  const scheduleCheck = validateSchedule({ date, time, nowBangkok });
  if (!scheduleCheck.ok) {
    res.status(scheduleCheck.status).json({ error: scheduleCheck.error });
    return;
  }

  const scheduledAt = scheduleCheck.scheduledAt;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // SQL: load treatment id by code.
    const treatmentResult = await client.query(
      "select id from treatments where code = $1",
      [treatmentCode]
    );

    if (treatmentResult.rowCount === 0) {
      await client.query("ROLLBACK");
      res.status(400).json({ error: "Treatment not found" });
      return;
    }

    const treatmentId = treatmentResult.rows[0].id;

    // SQL: check active course with remaining sessions.
    const courseResult = await client.query(
      `select remaining_sessions
       from user_treatments
       where line_user_id = $1
         and treatment_id = $2
         and is_active = true`,
      [lineUserId, treatmentId]
    );

    if (
      courseResult.rowCount === 0 ||
      Number(courseResult.rows[0].remaining_sessions) <= 0
    ) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "No remaining sessions for this course" });
      return;
    }

    // SQL: prevent double booking for the same slot.
    const existsResult = await client.query(
      `select 1
       from appointments
       where branch_id = $1
         and scheduled_at = $2
         and status in ('booked', 'rescheduled')
       limit 1`,
      [branchId, scheduledAt]
    );

    if (existsResult.rowCount > 0) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "Slot already booked" });
      return;
    }

    // SQL: ensure slot is not blocked by branch_slots.
    const blockedResult = await client.query(
      `select 1
       from branch_slots
       where branch_id = $1
         and is_blocked = true
         and slot_start <= $2
         and slot_end > $2
       limit 1`,
      [branchId, scheduledAt]
    );

    if (blockedResult.rowCount > 0) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "Slot is blocked by staff" });
      return;
    }

    // SQL: insert appointment.
    const toppingsPayload = JSON.stringify(normalizedToppings || []);

    const appointmentResult = await client.query(
      `insert into appointments
       (line_user_id, treatment_id, branch_id, scheduled_at, status,
        selected_toppings, addons_total_thb, reschedule_count, max_reschedule,
        cancellation_policy, created_at, updated_at)
       values ($1, $2, $3, $4, 'booked', $5::jsonb, $6, 0, 1, 'standard', now(), now())
       returning id, line_user_id, treatment_id, branch_id, scheduled_at,
                 status, selected_toppings, addons_total_thb, reschedule_count, max_reschedule`,
      [
        lineUserId,
        treatmentId,
        branchId,
        scheduledAt,
        toppingsPayload,
        Number.isFinite(Number(addonsTotalThb)) ? Number(addonsTotalThb) : 0
      ]
    );

    const appointment = appointmentResult.rows[0];

    // SQL: insert appointment_events log.
    await client.query(
      `insert into appointment_events
       (appointment_id, event_type, actor, note, meta, event_at)
       values ($1, 'created', 'customer', $2, $3, now())`,
      [
        appointment.id,
        null,
        {
          branch_id: branchId,
          scheduled_at: scheduledAt,
          selected_toppings: normalizedToppings || [],
          addons_total_thb: addonsTotalThb || 0
        }
      ]
    );

    await client.query("COMMIT");

    res.json({
      id: appointment.id,
      branch_id: appointment.branch_id,
      scheduled_at: appointment.scheduled_at,
      status: appointment.status,
      selected_toppings: appointment.selected_toppings,
      addons_total_thb: appointment.addons_total_thb
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to create appointment", error);
    res.status(500).json({ error: "Failed to create appointment" });
  } finally {
    client.release();
  }
});

app.get("/api/appointments/next", async (req, res) => {
  const lineUserId = req.query.line_user_id;
  const treatmentCode = req.query.treatment_code;

  if (!lineUserId || !treatmentCode) {
    res.status(400).json({ error: "line_user_id and treatment_code are required" });
    return;
  }

  const nowBangkok = getBangkokNow();

  try {
    // SQL: resolve treatment id.
    const treatmentResult = await pool.query(
      "select id from treatments where code = $1",
      [treatmentCode]
    );

    if (treatmentResult.rowCount === 0) {
      res.status(400).json({ error: "Treatment not found" });
      return;
    }

    const treatmentId = treatmentResult.rows[0].id;

    // SQL: find earliest future appointment.
    const appointmentResult = await pool.query(
      `select id, branch_id, scheduled_at, status, selected_toppings, addons_total_thb
       from appointments
       where line_user_id = $1
         and treatment_id = $2
         and status in ('booked', 'rescheduled')
         and scheduled_at >= $3
       order by scheduled_at asc
       limit 1`,
      [lineUserId, treatmentId, nowBangkok]
    );

    if (appointmentResult.rowCount === 0) {
      res.json({ item: null });
      return;
    }

    res.json({ item: appointmentResult.rows[0] });
  } catch (error) {
    console.error("Failed to load next appointment", error);
    res.status(500).json({ error: "Failed to load next appointment" });
  }
});

app.patch("/api/appointments/:id/reschedule", async (req, res) => {
  const appointmentId = req.params.id;
  const { date, time } = req.body || {};

  if (!date || !time) {
    res.status(400).json({ error: "date and time are required" });
    return;
  }

  const nowBangkok = getBangkokNow();
  const scheduleCheck = validateSchedule({ date, time, nowBangkok });
  if (!scheduleCheck.ok) {
    res.status(scheduleCheck.status).json({ error: scheduleCheck.error });
    return;
  }

  const scheduledAt = scheduleCheck.scheduledAt;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // SQL: lock appointment for update.
    const appointmentResult = await client.query(
      `select *
       from appointments
       where id = $1
       for update`,
      [appointmentId]
    );

    if (appointmentResult.rowCount === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Appointment not found" });
      return;
    }

    const appointment = appointmentResult.rows[0];
    if (["completed", "cancelled"].includes(appointment.status)) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "Appointment cannot be rescheduled" });
      return;
    }

    const maxReschedule =
      Number(appointment.max_reschedule) || 1;
    const currentReschedule = Number(appointment.reschedule_count) || 0;
    if (currentReschedule >= maxReschedule) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "Reschedule limit reached" });
      return;
    }

    // SQL: prevent double booking for the same slot.
    const existsResult = await client.query(
      `select 1
       from appointments
       where branch_id = $1
         and scheduled_at = $2
         and status in ('booked', 'rescheduled')
         and id <> $3
       limit 1`,
      [appointment.branch_id, scheduledAt, appointmentId]
    );

    if (existsResult.rowCount > 0) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "Slot already booked" });
      return;
    }

    // SQL: ensure slot is not blocked by branch_slots.
    const blockedResult = await client.query(
      `select 1
       from branch_slots
       where branch_id = $1
         and is_blocked = true
         and slot_start <= $2
         and slot_end > $2
       limit 1`,
      [appointment.branch_id, scheduledAt]
    );

    if (blockedResult.rowCount > 0) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "Slot is blocked by staff" });
      return;
    }

    // SQL: update appointment schedule.
    const updateResult = await client.query(
      `update appointments
       set scheduled_at = $1,
           status = 'rescheduled',
           reschedule_count = reschedule_count + 1,
           updated_at = now()
       where id = $2
       returning id, branch_id, scheduled_at, status, reschedule_count`,
      [scheduledAt, appointmentId]
    );

    // SQL: insert appointment_events log.
    await client.query(
      `insert into appointment_events
       (appointment_id, event_type, actor, note, meta, event_at)
       values ($1, 'rescheduled', 'customer', $2, $3, now())`,
      [
        appointmentId,
        null,
        { scheduled_at: scheduledAt }
      ]
    );

    await client.query("COMMIT");
    res.json({ item: updateResult.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to reschedule appointment", error);
    res.status(500).json({ error: "Failed to reschedule appointment" });
  } finally {
    client.release();
  }
});

app.patch("/api/appointments/:id/cancel", async (req, res) => {
  const appointmentId = req.params.id;
  const { reason } = req.body || {};
  const nowBangkok = getBangkokNow();
  const nowBangkokDate = getBangkokDateOnly(nowBangkok);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // SQL: lock appointment for update.
    const appointmentResult = await client.query(
      `select *
       from appointments
       where id = $1
       for update`,
      [appointmentId]
    );

    if (appointmentResult.rowCount === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Appointment not found" });
      return;
    }

    const appointment = appointmentResult.rows[0];
    if (appointment.status === "completed") {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "Appointment already completed" });
      return;
    }

    const scheduledAt = new Date(appointment.scheduled_at);
    const hoursDiff = (scheduledAt - nowBangkok) / (1000 * 60 * 60);
    const scheduledDate = getBangkokDateOnly(scheduledAt);
    let refundPolicy = "no_refund";
    let rescheduleAllowed = false;

    if (hoursDiff >= 24) {
      refundPolicy = "full_refund";
    } else if (scheduledDate === nowBangkokDate) {
      refundPolicy = "no_refund";
      rescheduleAllowed =
        Number(appointment.reschedule_count || 0) <
        Number(appointment.max_reschedule || 1);
    }

    // SQL: update appointment status.
    await client.query(
      `update appointments
       set status = 'cancelled',
           updated_at = now()
       where id = $1`,
      [appointmentId]
    );

    // SQL: insert appointment_events log.
    await client.query(
      `insert into appointment_events
       (appointment_id, event_type, actor, note, meta, event_at)
       values ($1, 'cancelled', 'customer', $2, $3, now())`,
      [
        appointmentId,
        reason || null,
        {
          cancelled_at: nowBangkok,
          refund_policy: refundPolicy,
          reschedule_allowed: rescheduleAllowed
        }
      ]
    );

    await client.query("COMMIT");
    res.json({
      ok: true,
      refund_policy: refundPolicy,
      reschedule_allowed: rescheduleAllowed
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to cancel appointment", error);
    res.status(500).json({ error: "Failed to cancel appointment" });
  } finally {
    client.release();
  }
});

app.post("/api/appointments/:id/redeem", async (req, res) => {
  const appointmentId = req.params.id;
  const { staff_id: staffId, branch_id: branchId } = req.body || {};
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // SQL: lock appointment for update.
    const appointmentResult = await client.query(
      `select *
       from appointments
       where id = $1
       for update`,
      [appointmentId]
    );

    if (appointmentResult.rowCount === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Appointment not found" });
      return;
    }

    const appointment = appointmentResult.rows[0];
    if (!["booked", "rescheduled"].includes(appointment.status)) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "Appointment cannot be redeemed" });
      return;
    }

    // SQL: decrement remaining sessions.
    const usageResult = await client.query(
      `update user_treatments
       set remaining_sessions = remaining_sessions - 1
       where line_user_id = $1
         and treatment_id = $2
         and is_active = true
         and remaining_sessions > 0
       returning remaining_sessions`,
      [appointment.line_user_id, appointment.treatment_id]
    );

    if (usageResult.rowCount === 0) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "No remaining sessions to redeem" });
      return;
    }

    const remainingSessions = usageResult.rows[0].remaining_sessions;

    // SQL: update appointment status.
    await client.query(
      `update appointments
       set status = 'completed',
           updated_at = now()
       where id = $1`,
      [appointmentId]
    );

    // SQL: insert appointment_events log.
    await client.query(
      `insert into appointment_events
       (appointment_id, event_type, actor, note, meta, event_at)
       values ($1, 'redeemed', 'staff', $2, $3, now())`,
      [
        appointmentId,
        null,
        { staff_id: staffId || null, branch_id: branchId || null }
      ]
    );

    await client.query("COMMIT");
    res.json({
      ok: true,
      remaining_sessions: remainingSessions,
      appointment_status: "completed"
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to redeem appointment", error);
    res.status(500).json({ error: "Failed to redeem appointment" });
  } finally {
    client.release();
  }
});

app.get("/api/my-courses", async (req, res) => {
  const lineUserId = req.query.lineUserId || req.query.line_user_id;

  if (!lineUserId) {
    res.status(400).json({ error: "lineUserId is required" });
    return;
  }

  const now = new Date();

  try {
    const purchaseResult = await pool.query(
      `select ph.id,
              ph.treatment_id,
              ph.sessions_bought,
              ph.purchased_at,
              ph.expires_at,
              t.code,
              t.title_th,
              t.title_en
       from purchase_history ph
       join treatments t on t.id = ph.treatment_id
       where ph.line_user_id = $1
       order by ph.expires_at asc nulls last, ph.purchased_at asc`,
      [lineUserId]
    );

    if (purchaseResult.rowCount === 0) {
      res.json({ courses: [] });
      return;
    }

    const purchaseRows = purchaseResult.rows;
    const treatmentIds = Array.from(
      new Set(purchaseRows.map((row) => row.treatment_id))
    );

    const usageCounts = new Map();
    try {
      const usageResult = await pool.query(
        `select treatment_id, count(*)::int as used_count
         from usage_history
         where line_user_id = $1
           and treatment_id = any($2::uuid[])
         group by treatment_id`,
        [lineUserId, treatmentIds]
      );

      usageResult.rows.forEach((row) => {
        usageCounts.set(row.treatment_id, row.used_count);
      });
    } catch (error) {
      if (error.code !== "42P01") {
        throw error;
      }
    }

    const remainingTotals = new Map();
    try {
      const remainingResult = await pool.query(
        `select treatment_id, remaining_sessions
         from user_treatments
         where line_user_id = $1
           and treatment_id = any($2::uuid[])`,
        [lineUserId, treatmentIds]
      );

      remainingResult.rows.forEach((row) => {
        remainingTotals.set(row.treatment_id, row.remaining_sessions);
      });
    } catch (error) {
      console.error("Failed to load remaining sessions", error);
    }

    const purchasesByTreatment = purchaseRows.reduce((acc, row) => {
      if (!acc.has(row.treatment_id)) {
        acc.set(row.treatment_id, []);
      }
      acc.get(row.treatment_id).push(row);
      return acc;
    }, new Map());

    const courses = [];

    purchasesByTreatment.forEach((purchases) => {
      const totalBought = purchases.reduce(
        (sum, row) => sum + Number(row.sessions_bought || 0),
        0
      );

      const usedFromHistory = usageCounts.get(purchases[0].treatment_id) || 0;
      let totalUsed = usedFromHistory;

      if (usedFromHistory === 0) {
        const remainingTotal = remainingTotals.get(purchases[0].treatment_id);
        if (typeof remainingTotal === "number") {
          totalUsed = Math.max(0, totalBought - remainingTotal);
        }
      }

      let remainingUsed = totalUsed;

      purchases.forEach((row) => {
        const sessionsBought = Number(row.sessions_bought || 0);
        const usedSessions = Math.min(remainingUsed, sessionsBought);
        remainingUsed -= usedSessions;
        const remainingSessions = Math.max(0, sessionsBought - usedSessions);
        const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
        const isExpired = expiresAt ? expiresAt < now : false;
        const isCompleted = remainingSessions === 0;
        const status = isExpired ? "expired" : isCompleted ? "completed" : "active";

        courses.push({
          purchaseId: row.id,
          treatmentId: row.treatment_id,
          treatmentCode: row.code,
          treatmentTitle: row.title_th || row.title_en || row.code,
          totalSessions: sessionsBought,
          purchasedAt: row.purchased_at,
          expiresAt: row.expires_at,
          usedSessions,
          remainingSessions,
          status
        });
      });
    });

    res.json({ courses });
  } catch (error) {
    console.error("Failed to load courses", error);
    if (error.code === "42P01") {
      res.status(500).json({
        error:
          "Missing purchase_history table. Run backend/sql/history_tables.sql to create it."
      });
      return;
    }
    res.status(500).json({ error: "Failed to load courses" });
  }
});

app.get("/api/me/history", async (req, res) => {
  const lineUserId = req.query.line_user_id;
  const treatmentCode = req.query.treatment_code;

  if (!lineUserId || !treatmentCode) {
    res.status(400).json({ error: "line_user_id and treatment_code are required" });
    return;
  }

  try {
    const treatmentResult = await pool.query(
      "select id from treatments where code = $1",
      [treatmentCode]
    );

    if (treatmentResult.rowCount === 0) {
      res.status(400).json({ error: "Treatment not found" });
      return;
    }

    const treatmentId = treatmentResult.rows[0].id;

    const purchaseResult = await pool.query(
      `select id, purchased_at, expires_at, price_thb, note
       from purchase_history
       where line_user_id = $1 and treatment_id = $2
       order by purchased_at desc`,
      [lineUserId, treatmentId]
    );

    const usageResult = await pool.query(
      `select id, used_at, provider, scrub, facial_mask, misting, extra_price_thb, note
       from usage_history
       where line_user_id = $1 and treatment_id = $2
       order by used_at desc`,
      [lineUserId, treatmentId]
    );

    const formatDateTime = (value) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return "";
      }
      return date
        .toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        })
        .replace(",", "");
    };

    const purchaseRows = purchaseResult.rows.map((row, index) => ({
      id: row.id || `purchase-${index}`,
      dateTime: formatDateTime(row.purchased_at),
      serviceName: treatmentCode,
      provider: "-",
      scrub: "-",
      facialMask: "-",
      misting: "-",
      extraPrice:
        typeof row.price_thb === "number" ? `฿${row.price_thb}` : row.price_thb || "-",
      note: row.expires_at
        ? `หมดเขต: ${formatDateTime(row.expires_at)}`
        : row.note || "-"
    }));

    const usageRows = usageResult.rows.map((row, index) => ({
      id: row.id || `usage-${index}`,
      dateTime: formatDateTime(row.used_at),
      serviceName: `${treatmentCode} #${usageResult.rows.length - index}`,
      provider: row.provider || "-",
      scrub: row.scrub || "-",
      facialMask: row.facial_mask || "-",
      misting: row.misting || "-",
      extraPrice:
        typeof row.extra_price_thb === "number"
          ? `฿${row.extra_price_thb}`
          : row.extra_price_thb || "-",
      note: row.note || "-"
    }));

    res.json({ purchaseRows, usageRows });
  } catch (error) {
    console.error("Failed to load history", error);
    if (error.code === "42P01") {
      res.status(500).json({
        error:
          "Missing history tables. Run backend/sql/history_tables.sql to create purchase_history and usage_history."
      });
      return;
    }
    res.status(500).json({ error: "Failed to load history" });
  }
});

app.post("/api/purchases/mock-buy", async (req, res) => {
  const {
    line_user_id: lineUserId,
    treatment_code: treatmentCode,
    sessions_bought: sessionsBought,
    expires_days_optional: expiresDaysOptional,
    note_optional: noteOptional,
    price_thb: priceThb
  } = req.body || {};

  const sessionsNumber = Number(sessionsBought);
  const expiresDays = Number.isFinite(Number(expiresDaysOptional))
    ? Number(expiresDaysOptional)
    : null;

  if (!lineUserId || !treatmentCode) {
    res.status(400).json({ error: "line_user_id and treatment_code are required" });
    return;
  }

  if (!Number.isFinite(sessionsNumber) || sessionsNumber <= 0) {
    res.status(400).json({ error: "sessions_bought must be greater than 0" });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      "insert into line_users (line_user_id) values ($1) on conflict (line_user_id) do nothing",
      [lineUserId]
    );

    const treatmentResult = await client.query(
      "select id from treatments where code = $1",
      [treatmentCode]
    );

    if (treatmentResult.rowCount === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Treatment not found" });
      return;
    }

    const treatmentId = treatmentResult.rows[0].id;

    const upsertResult = await client.query(
      `insert into user_treatments
         (line_user_id, treatment_id, remaining_sessions, purchased_at, expires_at, note, is_active)
       values
         ($1, $2, $3, now(),
          case
            when $4::int is not null then now() + make_interval(days => $4::int)
            else now() + interval '1 year'
          end,
          $5, true)
       on conflict (line_user_id, treatment_id)
       do update set
         remaining_sessions = user_treatments.remaining_sessions + excluded.remaining_sessions,
         purchased_at = now(),
         expires_at = excluded.expires_at,
         note = coalesce(excluded.note, user_treatments.note),
         is_active = true
       returning remaining_sessions`,
      [lineUserId, treatmentId, sessionsNumber, expiresDays, noteOptional || null]
    );

    try {
      await client.query(
        `insert into purchase_history
         (line_user_id, treatment_id, sessions_bought, price_thb, purchased_at, expires_at, note)
         values ($1, $2, $3, $4, now(),
           case
             when $5::int is not null then now() + make_interval(days => $5::int)
             else now() + interval '1 year'
           end,
           $6)`,
        [
          lineUserId,
          treatmentId,
          sessionsNumber,
          Number.isFinite(Number(priceThb)) ? Number(priceThb) : null,
          expiresDays,
          noteOptional || null
        ]
      );
    } catch (error) {
      await client.query("ROLLBACK");
      if (error.code === "42P01") {
        res.status(500).json({
          error:
            "Missing purchase_history table. Run backend/sql/history_tables.sql to create it."
        });
        return;
      }
      throw error;
    }

    await client.query("COMMIT");

    res.json({
      line_user_id: lineUserId,
      treatment_code: treatmentCode,
      remaining_sessions: upsertResult.rows[0]?.remaining_sessions ?? sessionsNumber
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to mock purchase", error);
    res.status(500).json({ error: "Failed to create purchase" });
  } finally {
    client.release();
  }
});

app.post("/api/appointments/redeem", async (req, res) => {
  const {
    token,
    provider,
    scrub,
    facial_mask: facialMask,
    misting,
    extra_price_thb: extraPriceThb,
    note
  } = req.body || {};

  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "token is required" });
    return;
  }

  const [prefix, lineUserId, treatmentCode] = token.split("|");

  if (prefix !== "SCGLAM" || !lineUserId || !treatmentCode) {
    res.status(400).json({ error: "Invalid token format" });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const treatmentResult = await client.query(
      "select id from treatments where code = $1",
      [treatmentCode]
    );

    if (treatmentResult.rowCount === 0) {
      await client.query("ROLLBACK");
      res.status(400).json({ error: "Treatment not found" });
      return;
    }

    const treatmentId = treatmentResult.rows[0].id;

    const updateResult = await client.query(
      `update user_treatments
       set remaining_sessions = greatest(remaining_sessions - 1, 0)
       where line_user_id = $1
         and treatment_id = $2
         and is_active = true
         and remaining_sessions > 0
       returning remaining_sessions`,
      [lineUserId, treatmentId]
    );

    if (updateResult.rowCount === 0) {
      await client.query("ROLLBACK");
      res.status(400).json({ error: "No remaining sessions to redeem" });
      return;
    }

    await client.query("COMMIT");

    const remainingSessions = updateResult.rows[0]?.remaining_sessions ?? 0;

    try {
      await client.query(
        `insert into usage_history
         (line_user_id, treatment_id, appointment_id, used_at, provider, scrub, facial_mask, misting, extra_price_thb, note)
         values ($1, $2, $3, now(), $4, $5, $6, $7, $8, $9)`,
        [
          lineUserId,
          treatmentId,
          token.split("|")[3] || null,
          provider || null,
          scrub || null,
          facialMask || null,
          misting || null,
          Number.isFinite(Number(extraPriceThb)) ? Number(extraPriceThb) : null,
          note || null
        ]
      );
    } catch (error) {
      await client.query("ROLLBACK");
      if (error.code === "42P01") {
        res.status(500).json({
          error:
            "Missing usage_history table. Run backend/sql/history_tables.sql to create it."
        });
        return;
      }
      throw error;
    }

    res.json({
      ok: true,
      line_user_id: lineUserId,
      treatment_code: treatmentCode,
      remaining_sessions_after: remainingSessions,
      is_completed: remainingSessions === 0
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to redeem appointment", error);
    res.status(500).json({ error: "Failed to redeem appointment" });
  } finally {
    client.release();
  }
});

app.use("/", omiseRouter);

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
