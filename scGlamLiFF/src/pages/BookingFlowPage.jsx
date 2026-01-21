import { useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import AppLayout from "../components/AppLayout";
import smoothImage from "../assets/smooth.png";
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

const timeSlots = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30"
];

const bookedSlots = ["10:30", "14:00", "16:30"];

const addOns = [
  {
    id: "collagen",
    title: "Collagen scrub",
    desc: "ขัดผิวแบบนุ่มลึก เพิ่มความเรียบเนียน",
    price: 250
  },
  {
    id: "mask-exclusive",
    title: "Facial mask - Exclusive",
    desc: "มาสก์เข้มข้นพิเศษ ฟื้นฟูผิวทันทีหลังทำ",
    price: 250
  },
  {
    id: "mask-normal",
    title: "Facial mask - Normal",
    desc: "มาสก์มาตรฐานสำหรับผิวเนียนนุ่ม",
    price: 200
  }
];

const paymentOptions = [
  "QR PromptPay",
  "Credit/Debit Card",
  "ShopeePay / SPayLater",
  "Google Pay"
];

const basePrice = 399;

function BookingFlowPage() {
  const [selectedBranch, setSelectedBranch] = useState(branches[0].id);
  const [selectedDate, setSelectedDate] = useState();
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(paymentOptions[0]);
  const [showConfirm, setShowConfirm] = useState(false);

  const addOnsTotal = useMemo(
    () =>
      selectedAddOns.reduce((sum, addOnId) => {
        const addOn = addOns.find((item) => item.id === addOnId);
        return sum + (addOn ? addOn.price : 0);
      }, 0),
    [selectedAddOns]
  );

  const grandTotal = basePrice + addOnsTotal;

  const isReadyToConfirm =
    Boolean(selectedBranch) && Boolean(selectedDate) && Boolean(selectedTime);

  const handleTimeClick = (time) => {
    if (bookedSlots.includes(time)) {
      window.alert(`เวลา ${time} เต็มแล้ว โปรดเลือกเวลาอื่น`);
      return;
    }
    setSelectedTime(time);
  };

  const toggleAddOn = (id) => {
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedBranchLabel =
    branches.find((branch) => branch.id === selectedBranch)?.label || "";

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
                />
              </div>
            </div>

            <div className="booking-card booking-card--slots">
              <div className="booking-duration">
                ให้บริการครั้งละ 60 นาที (ขึ้นกับรูปแบบบริการ)
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
                    return (
                      <button
                        key={time}
                        type="button"
                        className={`booking-slot${
                          isBooked ? " is-booked" : ""
                        }${isSelected ? " is-selected" : ""}`}
                        onClick={() => handleTimeClick(time)}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="booking-section">
          <div className="booking-section__title">SECTION 2: บริการเพิ่มเติม</div>
          <div className="booking-addons">
            {addOns.map((item) => {
              const isSelected = selectedAddOns.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`addon-card${isSelected ? " is-selected" : ""}`}
                  onClick={() => toggleAddOn(item.id)}
                  aria-pressed={isSelected}
                >
                  <span className="addon-card__check" aria-hidden="true" />
                  <img src={smoothImage} alt={item.title} />
                  <div className="addon-card__info">
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                    <span className="addon-card__price">฿{item.price}</span>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="booking-addons__total">
            รวมบริการเพิ่มเติม: ฿{addOnsTotal}
          </div>
        </section>

        <section className="booking-section">
          <div className="booking-section__title">
            SECTION 3: วิธีการชำระเงิน
          </div>
          <div className="payment-grid">
            <div className="payment-options">
              {paymentOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`payment-option${
                    selectedPayment === option ? " is-selected" : ""
                  }`}
                  onClick={() => setSelectedPayment(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="payment-summary">
              <h3>สรุปรายการ</h3>
              <div className="payment-summary__row">
                <span>บริการ Smooth</span>
                <span>฿{basePrice}</span>
              </div>
              <div className="payment-summary__row">
                <span>บริการเพิ่มเติม</span>
                <span>฿{addOnsTotal}</span>
              </div>
              <div className="payment-summary__row total">
                <span>รวมทั้งหมด</span>
                <span>฿{grandTotal}</span>
              </div>
              <button
                type="button"
                className="payment-confirm"
                disabled={!isReadyToConfirm}
                onClick={() => setShowConfirm(true)}
              >
                ยืนยันการจอง
              </button>
            </div>
          </div>
        </section>
      </div>

      {showConfirm ? (
        <div className="booking-modal__backdrop" role="dialog" aria-modal="true">
          <div className="booking-modal">
            <div className="booking-modal__header">
              <h3>ยืนยันการจอง</h3>
              <button type="button" onClick={() => setShowConfirm(false)}>
                ปิด
              </button>
            </div>
            <div className="booking-modal__content">
              <p>สาขา: {selectedBranchLabel}</p>
              <p>
                วันเวลา:{" "}
                {selectedDate?.toLocaleDateString("th-TH")} {selectedTime}
              </p>
              <p>บริการเพิ่มเติม: {selectedAddOns.length || 0} รายการ</p>
              <p>วิธีชำระเงิน: {selectedPayment}</p>
              <p className="booking-modal__note">
                (ระบบจำลอง ยังไม่ตัดเงินจริง)
              </p>
            </div>
            <div className="booking-modal__actions">
              <button type="button" onClick={() => setShowConfirm(false)}>
                รับทราบ
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppLayout>
  );
}

export default BookingFlowPage;
