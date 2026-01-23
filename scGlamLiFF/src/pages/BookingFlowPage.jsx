import { useEffect, useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { useLocation, useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import smoothImage from "../assets/smooth.png";
import BookingDetailsModal from "../components/BookingDetailsModal";
import LoadingOverlay from "../components/LoadingOverlay";
import { getMockUserId, storeMockUserIdFromQuery } from "../utils/mockAuth";
import "./BookingFlowPage.css";

const branches = [
  { id: "branch-003", label: "ศิริชัยเภสัช สาขาวัดช่องลม (003)", disabled: false },
  {
    id: "branch-mk",
    label: "ศิริชัยเภสัช สาขาตลาดแม่กลอง (ยังไม่พร้อมให้บริการ)",
    disabled: true
  },
  {
    id: "branch-bn",
    label: "ศิริชัยเภสัช สาขาตลาดบางน้อย (ยังไม่พร้อมให้บริการ)",
    disabled: true
  }
];

const bookedSlots = ["10:30", "14:00", "16:30"];

const SHOP_TZ = "Asia/Bangkok";
const LEAD_TIME_MINUTES = 120;
const SLOT_INTERVAL_MINUTES = 45;
const OPEN_TIME = "08:00";
const LAST_START_TIME = "18:15";

const categoryConfig = [
  {
    id: "scrub",
    label: "Scrub",
    subtitle: "ช่วยผลัดเซลล์ผิวและทำความสะอาดล้ำลึก"
  },
  {
    id: "mask",
    label: "Facial Mask",
    subtitle: "เลือกมาสก์ 1 แบบที่เหมาะกับผิว"
  },
  {
    id: "misting",
    label: "Misting",
    subtitle: "เติมความสดชื่นให้ผิวระหว่างทำ"
  }
];

const groupToppingsByCategory = (items) =>
  items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

const getMinPriceByCategory = (items, category) => {
  const prices = items
    .filter((item) => item.category === category)
    .map((item) => item.price_thb)
    .filter((value) => typeof value === "number");
  if (!prices.length) {
    return null;
  }
  return Math.min(...prices);
};

const parseTimeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map((part) => Number(part));
  return hours * 60 + minutes;
};

const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

const generateSlots = () => {
  const startMinutes = parseTimeToMinutes(OPEN_TIME);
  const endMinutes = parseTimeToMinutes(LAST_START_TIME);
  const slots = [];

  for (let minutes = startMinutes; minutes <= endMinutes; minutes += SLOT_INTERVAL_MINUTES) {
    slots.push(minutesToTime(minutes));
  }

  return slots;
};

const getBangkokDateOnly = (date) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: SHOP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(date);
};

function BookingFlowPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedBranch, setSelectedBranch] = useState(branches[0].id);
  const [selectedDate, setSelectedDate] = useState();
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedMaskId, setSelectedMaskId] = useState(null);
  const [selectedExtraIds, setSelectedExtraIds] = useState([]);
  const [openCategory, setOpenCategory] = useState(null);
  const [toppings, setToppings] = useState([]);
  const [toppingsError, setToppingsError] = useState(null);
  const [toppingsLoading, setToppingsLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mockUserId, setMockUserId] = useState(getMockUserId());

  useEffect(() => {
    let isActive = true;

    const fetchToppings = async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      return response.json();
    };

    const loadToppings = async () => {
      setToppingsLoading(true);
      setToppingsError(null);

      try {
        let data;
        try {
          data = await fetchToppings("/api/toppings?active=true");
        } catch (error) {
          data = await fetchToppings("http://localhost:3002/api/toppings?active=true");
        }

        if (!isActive) {
          return;
        }

        setToppings(Array.isArray(data.items) ? data.items : []);
      } catch (error) {
        if (!isActive) {
          return;
        }
        setToppingsError(error);
        setToppings([]);
      } finally {
        if (isActive) {
          setToppingsLoading(false);
        }
      }
    };

    loadToppings();

    return () => {
      isActive = false;
    };
  }, []);

  const toppingsByCategory = useMemo(
    () => groupToppingsByCategory(toppings),
    [toppings]
  );

  const selectedItems = useMemo(() => {
    const selectedSet = new Set(selectedExtraIds);
    if (selectedMaskId) {
      selectedSet.add(selectedMaskId);
    }
    return toppings.filter((item) => selectedSet.has(item.id));
  }, [toppings, selectedExtraIds, selectedMaskId]);

  const addOnsTotal = useMemo(
    () =>
      selectedItems.reduce((sum, item) => sum + (item.price_thb || 0), 0),
    [selectedItems]
  );

  const isReadyToConfirm =
    Boolean(selectedBranch) && Boolean(selectedDate) && Boolean(selectedTime);

  const timeSlots = useMemo(() => generateSlots(), []);

  const now = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const mockNow = params.get("now");
    if (mockNow) {
      const parsed = new Date(mockNow);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  }, [location.search]);

  const todayBangkok = useMemo(
    () => getBangkokDateOnly(now),
    [now]
  );

  const selectedBangkok = useMemo(() => {
    if (!selectedDate) {
      return null;
    }
    return getBangkokDateOnly(selectedDate);
  }, [selectedDate]);

  const minSlotMinutesToday = useMemo(() => {
    if (!selectedDate || selectedBangkok !== todayBangkok) {
      return null;
    }
    const leadTimeDate = new Date(now.getTime() + LEAD_TIME_MINUTES * 60 * 1000);
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: SHOP_TZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
    const [hourStr, minuteStr] = formatter.format(leadTimeDate).split(":");
    const leadMinutes = Number(hourStr) * 60 + Number(minuteStr);
    const startMinutes = parseTimeToMinutes(OPEN_TIME);
    const elapsedFromOpen = Math.max(0, leadMinutes - startMinutes);
    const steps = Math.ceil(elapsedFromOpen / SLOT_INTERVAL_MINUTES);
    return startMinutes + steps * SLOT_INTERVAL_MINUTES;
  }, [now, selectedDate, selectedBangkok, todayBangkok]);

  const handleTimeClick = (time) => {
    if (bookedSlots.includes(time)) {
      window.alert(`เวลา ${time} เต็มแล้ว โปรดเลือกเวลาอื่น`);
      return;
    }
    setSelectedTime(time);
  };

  const toggleExtra = (id) => {
    setSelectedExtraIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedBranchLabel =
    branches.find((branch) => branch.id === selectedBranch)?.label || "";

  const handleConfirmClick = () => {
    if (!selectedDate) {
      setConfirmError("คุณยังไม่เลือกวันที่เลย");
      return;
    }
    if (!selectedTime) {
      setConfirmError("คุณยังไม่เลือกเวลาเลย");
      return;
    }
    if (!selectedBranch) {
      setConfirmError("คุณยังไม่เลือกสาขาเลย");
      return;
    }
    setConfirmError("");
    setShowConfirm(true);
  };

  const bookingSummary = useMemo(() => {
    const dateText = selectedDate
      ? selectedDate.toLocaleDateString("th-TH")
      : "-";
    const dateISO = selectedDate ? getBangkokDateOnly(selectedDate) : null;
    const toppingsList = selectedItems.map((item) => ({
      name: item.title_th || item.title_en || item.code,
      priceTHB: item.price_thb || 0
    }));
    const toppingsPayload = selectedItems.map((item) => ({
      id: item.id,
      name: item.title_th || item.title_en || item.code,
      price_thb: item.price_thb || 0,
      category: item.category
    }));

    return {
      branchId: selectedBranch,
      branchLabel: selectedBranchLabel,
      dateText,
      dateISO,
      timeText: selectedTime || "-",
      toppings: toppingsList,
      toppingsPayload,
      addonsTotal: addOnsTotal
    };
  }, [addOnsTotal, selectedBranchLabel, selectedDate, selectedItems, selectedTime]);

  useEffect(() => {
    const queryUserId = storeMockUserIdFromQuery();
    setMockUserId(queryUserId || getMockUserId());
  }, [location.search]);

  useEffect(() => {
    if (!selectedTime) {
      return;
    }

    const slotMinutes = parseTimeToMinutes(selectedTime);
    const lastMinutes = parseTimeToMinutes(LAST_START_TIME);
    const isPastLead =
      minSlotMinutesToday !== null && slotMinutes < minSlotMinutesToday;
    const isBeyondLast = slotMinutes > lastMinutes;
    const isBooked = bookedSlots.includes(selectedTime);

    if (isPastLead || isBeyondLast || isBooked) {
      setSelectedTime("");
    }
  }, [selectedDate, selectedTime, minSlotMinutesToday]);

  const handleSubmitBooking = async () => {
    if (isSubmitting) {
      return;
    }
    if (!bookingSummary.dateISO || !selectedTime || !bookingSummary.branchId) {
      setSubmitError("กรุณาเลือกวัน เวลา และสาขาให้ครบก่อนยืนยัน");
      return;
    }

    setSubmitError("");
    setIsSubmitting(true);

    const payload = {
      line_user_id: mockUserId || "U_TEST_001",
      treatment_code: "smooth",
      branch_id: bookingSummary.branchId,
      date: bookingSummary.dateISO,
      time: selectedTime,
      selected_toppings: bookingSummary.toppingsPayload,
      addons_total_thb: bookingSummary.addonsTotal
    };

    const requestCreate = async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload.error || "Failed to create appointment");
      }
      return response.json();
    };

    try {
      try {
        await requestCreate("/api/appointments");
      } catch (error) {
        await requestCreate("http://localhost:3002/api/appointments");
      }
      setShowConfirm(false);
      navigate(`/my-treatments/smooth?mock_user_id=${encodeURIComponent(payload.line_user_id)}`);
    } catch (error) {
      setSubmitError(error.message || "สร้างการจองไม่สำเร็จ");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "My Treatments", to: "/my-treatments" },
        { label: "Booking (Smooth)" }
      ]}
    >
      <div className="booking-flow">
        <header className="booking-flow__header">
          <h1>จองคอร์ส Smooth</h1>
          <p>เลือกสาขา วัน และเวลาที่ต้องการรับบริการ</p>
        </header>

        <section className="booking-section">
          <div className="booking-section__title">
            SECTION 1: เลือกสาขา วัน และเวลา
          </div>
          <div className="booking-grid">
            <div className="booking-card">
              <label htmlFor="branch-select">สาขา</label>
              <select
                id="branch-select"
                value={selectedBranch}
                onChange={(event) => setSelectedBranch(event.target.value)}
              >
                {branches.map((branch) => (
                  <option
                    key={branch.id}
                    value={branch.id}
                    disabled={branch.disabled}
                  >
                    {branch.label}
                  </option>
                ))}
              </select>

              <div className="booking-date">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="booking-calendar"
                  disabled={{
                    before: new Date(todayBangkok)
                  }}
                />
              </div>
            </div>

            <div className="booking-card booking-card--slots">
              <div className="booking-duration">
                จองได้ทุก 45 นาที (เผื่อเวลาจัดเตรียม)
              </div>
              <div className="booking-slots__legend">
                <span className="legend-item">
                  <span className="legend-dot is-available" />
                  ว่าง
                </span>
                <span className="legend-item">
                  <span className="legend-dot is-booked" />
                  เต็ม
                </span>
                <span className="legend-item">
                  <span className="legend-dot is-lead" />
                  จองล่วงหน้าไม่พอ
                </span>
              </div>
              {!selectedDate ? (
                <div className="booking-slots__placeholder">
                  เลือกวันที่เพื่อดูเวลาว่าง
                </div>
              ) : (
                <div className="booking-slots">
                  {timeSlots.map((time) => {
                    const isBooked = bookedSlots.includes(time);
                    const isSelected = selectedTime === time;
                    const slotMinutes = parseTimeToMinutes(time);
                    const lastMinutes = parseTimeToMinutes(LAST_START_TIME);
                    const isBeyondLast = slotMinutes > lastMinutes;
                    const isLeadBlocked =
                      minSlotMinutesToday !== null && slotMinutes < minSlotMinutesToday;
                    const isDisabled = isBooked || isBeyondLast || isLeadBlocked;
                    return (
                      <button
                        key={time}
                        type="button"
                        className={`booking-slot${
                          isBooked ? " is-booked" : ""
                        }${isSelected ? " is-selected" : ""}`}
                        disabled={isDisabled}
                        onClick={() => handleTimeClick(time)}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedDate && minSlotMinutesToday !== null ? (
                <p className="booking-slots__note">
                  ต้องจองล่วงหน้าอย่างน้อย 2 ชั่วโมง
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="booking-section">
          <div className="booking-section__title">SECTION 2: บริการเพิ่มเติม</div>
          {toppingsLoading ? (
            <p className="booking-addons__status">กำลังโหลดบริการเพิ่มเติม...</p>
          ) : null}
          {toppingsError ? (
            <p className="booking-addons__status">
              โหลดบริการเพิ่มเติมไม่สำเร็จ
            </p>
          ) : null}
          <div className="addon-categories">
            {categoryConfig.map((category) => {
              const minPrice = getMinPriceByCategory(toppings, category.id);
              const isOpen = openCategory === category.id;
              return (
                <div key={category.id} className="addon-category">
                  <button
                    type="button"
                    className={`addon-category__card${
                      isOpen ? " is-open" : ""
                    }`}
                    onClick={() =>
                      setOpenCategory((prev) =>
                        prev === category.id ? null : category.id
                      )
                    }
                  >
                    <div>
                      <h3>{category.label}</h3>
                      <p>{category.subtitle}</p>
                    </div>
                    <span className="addon-category__badge">
                      {minPrice ? `เริ่มต้น ฿${minPrice}` : "-"}
                    </span>
                  </button>
                  {isOpen ? (
                    <div className="addon-panel">
                      <div className="addon-panel__header">
                        <h4>เลือก {category.label}</h4>
                        <button
                          type="button"
                          onClick={() => setOpenCategory(null)}
                        >
                          ปิด
                        </button>
                      </div>
                      <div
                        className="booking-addons"
                        role={category.id === "mask" ? "radiogroup" : undefined}
                      >
                        {(toppingsByCategory[category.id] || []).map((item) => {
                          const isMask = category.id === "mask";
                          const isSelected = isMask
                            ? selectedMaskId === item.id
                            : selectedExtraIds.includes(item.id);
                          const title = item.title_th || item.title_en || item.code;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              className={`addon-card${isSelected ? " is-selected" : ""}`}
                              onClick={() =>
                                isMask
                                  ? setSelectedMaskId(item.id)
                                  : toggleExtra(item.id)
                              }
                              aria-pressed={!isMask ? isSelected : undefined}
                              role={isMask ? "radio" : undefined}
                              aria-checked={isMask ? isSelected : undefined}
                            >
                              <span className="addon-card__check" aria-hidden="true" />
                              <img src={smoothImage} alt={title} />
                              <div className="addon-card__info">
                                <h3>{title}</h3>
                                <p>{item.title_en || item.title_th}</p>
                                <span className="addon-card__price">
                                  ฿{item.price_thb}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="booking-addons__total">
            รวมบริการเพิ่มเติม: ฿{addOnsTotal}
          </div>
        </section>

        <div className="booking-confirmation">
          <button
            type="button"
            className="payment-confirm"
            onClick={handleConfirmClick}
          >
            ตรวจสอบรายละเอียดการจอง
          </button>
          <p className="booking-confirmation__note">
            ยังไม่ชำระเงินในขั้นตอนนี้
          </p>
          {confirmError ? (
            <p className="booking-confirmation__error">{confirmError}</p>
          ) : null}
        </div>
      </div>

      <BookingDetailsModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        bookingDetails={bookingSummary}
        showPaymentPlaceholder
        showAcknowledge
        submitError={submitError}
        isProcessing={isSubmitting}
        onAcknowledge={handleSubmitBooking}
      />
      <LoadingOverlay open={isSubmitting} text="กำลังบันทึกการจอง..." />
    </AppLayout>
  );
}

export default BookingFlowPage;

// Manual test:
// 1) /my-treatments/smooth/booking?mock_user_id=U_TEST_001
// 2) เลือกวัน/เวลา -> เปิด modal -> กด "รับทราบ"
// 3) ต้องเห็น overlay "กำลังบันทึกการจอง..." แล้วไป /my-treatments/smooth
