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

app.use("/", omiseRouter);

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
