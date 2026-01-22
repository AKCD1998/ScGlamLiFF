import express from "express";

const router = express.Router();
const secretKey = process.env.OMISE_SECRET_KEY;

if (!secretKey) {
  console.warn("Missing OMISE_SECRET_KEY in environment.");
}

const omiseRequest = async (path, options = {}) => {
  const auth = Buffer.from(`${secretKey}:`).toString("base64");
  const response = await fetch(`https://api.omise.co${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      ...options.headers
    }
  });

  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload?.message || "Omise request failed");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

router.post("/api/create-promptpay", async (req, res) => {
  const { amountTHB, orderId } = req.body || {};
  const amountNumber = Number(amountTHB);

  if (!amountNumber || amountNumber <= 0) {
    res.status(400).json({ error: "amountTHB must be greater than 0" });
    return;
  }

  const amount = Math.round(amountNumber * 100);
  const params = new URLSearchParams({
    amount: amount.toString(),
    currency: "THB",
    "source[type]": "promptpay",
    "metadata[orderId]": orderId || ""
  });

  try {
    const charge = await omiseRequest("/charges", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });

    res.json({
      chargeId: charge.id,
      status: charge.status,
      amount: charge.amount,
      currency: charge.currency,
      orderId: charge?.metadata?.orderId || orderId || "",
      qrImageUrl: charge?.source?.scannable_code?.image?.download_uri || "",
      raw: charge
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Failed to create PromptPay charge",
      raw: error.payload || null
    });
  }
});

router.get("/api/charge/:id", async (req, res) => {
  try {
    const charge = await omiseRequest(`/charges/${req.params.id}`);
    res.json({ status: charge.status, raw: charge });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Failed to fetch charge",
      raw: error.payload || null
    });
  }
});

router.post("/webhooks/omise", (req, res) => {
  const event = req.body || {};
  const charge = event?.data || {};
  console.log("Omise webhook:", {
    type: event.type,
    chargeId: charge.id,
    status: charge.status,
    orderId: charge?.metadata?.orderId
  });
  // TODO: After real payment confirmation, update line_users and user_treatments.
  res.json({ ok: true });
});

export default router;
