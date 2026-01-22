export const getNextBooking = ({ lineUserId, treatmentCode }) => {
  if (lineUserId === "U_TEST_002") {
    return null;
  }

  if (treatmentCode !== "smooth") {
    return null;
  }

  return {
    appointment_id: "APT_TEST_001",
    line_user_id: lineUserId,
    treatment_code: treatmentCode,
    dateISO: "2026-01-31T13:00:00+07:00",
    dateText: "31 ม.ค. 2569 13:00 น.",
    addons: [
      { name: "Mask : normal", priceTHB: 200 },
      { name: "Misting : vitamin water", priceTHB: 100 },
      { name: "Scrub : x", priceTHB: 0 }
    ],
    addonsTotalTHB: 300,
    note: "ยืนยันการเข้ารับบริการ ไม่ใช่การชำระเงิน"
  };
};
