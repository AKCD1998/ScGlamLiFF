const formatDateTime = (date) => {
  const pad = (value) => String(value).padStart(2, "0");
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  return `${day}/${month}/${year} ${hour}:${minute}`;
};

const parseAddonFields = (addons) => {
  let scrub = "-";
  let facialMask = "-";
  let misting = "-";
  let extraPrice = 0;

  addons.forEach((addon) => {
    const name = addon?.name || "";
    const price = Number(addon?.priceTHB) || 0;
    extraPrice += price;

    if (name.toLowerCase().includes("scrub")) {
      scrub = name.replace(/^scrub\s*:\s*/i, "");
    }
    if (name.toLowerCase().includes("mask")) {
      facialMask = name.replace(/^mask\s*:\s*/i, "");
    }
    if (name.toLowerCase().includes("misting")) {
      misting = name.replace(/^misting\s*:\s*/i, "");
    }
  });

  return { scrub, facialMask, misting, extraPrice };
};

export const buildSmoothHistory = ({ courseData, appointmentData }) => {
  if (!courseData) {
    return { purchaseRows: [], usageRows: [] };
  }

  const totalSessions = Number(courseData.total) || 0;
  const usedSessions = Number(courseData.used) || 0;
  const purchaseCount = Math.max(1, Math.min(3, Math.ceil(totalSessions / 3)));

  const purchaseBaseDate = new Date("2026-01-01T10:00:00");
  const purchasePrices = [399, 999, 2999];

  const purchaseRows = Array.from({ length: purchaseCount }).map((_, index) => {
    const purchaseDate = new Date(purchaseBaseDate);
    purchaseDate.setDate(purchaseDate.getDate() + index * 30);
    const expiryDate = new Date(purchaseDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    return {
      id: `purchase-${index + 1}`,
      dateTime: formatDateTime(purchaseDate),
      serviceName: "Smooth",
      provider: "-",
      scrub: "-",
      facialMask: "-",
      misting: "-",
      extraPrice: `฿${purchasePrices[index % purchasePrices.length]}`,
      note: `หมดเขต: ${formatDateTime(expiryDate)}`
    };
  });

  const usageBaseDate = appointmentData?.dateISO
    ? new Date(appointmentData.dateISO)
    : new Date("2026-01-31T13:00:00");
  const addons = Array.isArray(appointmentData?.addons)
    ? appointmentData.addons
    : [];
  const { scrub, facialMask, misting, extraPrice } = parseAddonFields(addons);

  const usageRows = Array.from({ length: usedSessions }).map((_, index) => {
    const serviceDate = new Date(usageBaseDate);
    serviceDate.setDate(serviceDate.getDate() - (usedSessions - index - 1) * 14);

    return {
      id: `usage-${index + 1}`,
      dateTime: formatDateTime(serviceDate),
      serviceName: `Smooth #${index + 1}`,
      provider: index % 2 === 0 ? "Therapist A" : "Therapist B",
      scrub,
      facialMask,
      misting,
      extraPrice: `฿${extraPrice}`,
      note: "-"
    };
  });

  return { purchaseRows, usageRows };
};
