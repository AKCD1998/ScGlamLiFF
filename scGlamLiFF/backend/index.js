import "dotenv/config";
import cors from "cors";
import express from "express";
import pg from "pg";
import omiseRouter from "./routes/omise.routes.js";

const { Pool } = pg;

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
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
