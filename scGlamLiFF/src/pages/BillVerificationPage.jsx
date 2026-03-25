import { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/AppLayout";
import NewBillRecipientModal from "../components/NewBillRecipientModal";
import { useBranchDevice } from "../context/BranchDeviceContext";
import {
  AppointmentDraftApiError,
  listAppointmentDrafts
} from "../services/appointmentDraftService";
import {
  mapDraftToBillCard,
  sortDraftsNewestFirst
} from "./billVerificationDrafts";
import "./BillVerificationPage.css";

const createDetailPanelId = (value) =>
  `bill-verification-detail-${String(value || "item")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")}`;

const getDraftListErrorMessage = (error) => {
  if (error instanceof AppointmentDraftApiError) {
    if (error.status === 401 || error.status === 403) {
      return "ยังไม่ได้เข้าสู่ระบบพนักงาน จึงโหลดรายการร่างไม่ได้";
    }

    return error.message || "โหลดรายการร่างไม่สำเร็จ";
  }

  return "โหลดรายการร่างไม่สำเร็จ";
};

function BillInfoRow({ label, value }) {
  return (
    <div className="bill-verification-card__info-row">
      <span className="bill-verification-card__info-label">{label}</span>
      <span className="bill-verification-card__info-value">{value}</span>
    </div>
  );
}

function BillCard({
  status,
  tone,
  statusNote,
  name,
  phone,
  promo,
  bookingDate,
  onSelect
}) {
  const editContent = (
    <>
      <div className="bill-verification-card__edit-icon" aria-hidden="true">
        ✎
      </div>
      <div className="bill-verification-card__edit-button">แก้ไขข้อมูล</div>
    </>
  );

  return (
    <article className="bill-verification-card">
      <div className="bill-verification-card__status-box">
        <span className="bill-verification-card__status-label">สถานะ :</span>
        <span
          className={`bill-verification-card__status bill-verification-card__status--${tone}`}
        >
          {status}
        </span>
        <span className="bill-verification-card__status-note">{statusNote}</span>
      </div>

      <div className="bill-verification-card__info-box">
        <BillInfoRow label="ชื่อ-นามสกุล :" value={name} />
        <BillInfoRow label="เบอร์โทรศัพท์ :" value={phone} />
        <BillInfoRow label="โปรโมชั่น :" value={promo} />
        <BillInfoRow label="จองวันที่ :" value={bookingDate} />
      </div>

      {typeof onSelect === "function" ? (
        <button
          type="button"
          className="bill-verification-card__edit-box bill-verification-card__edit-box--button"
          onClick={onSelect}
        >
          {editContent}
        </button>
      ) : (
        <div className="bill-verification-card__edit-box" aria-hidden="true">
          {editContent}
        </div>
      )}
    </article>
  );
}

function BillSummaryRow({
  id,
  name,
  bookingDate,
  expanded,
  onToggle
}) {
  const detailPanelId = createDetailPanelId(id);

  return (
    <div className="bill-verification-summary-row">
      <div className="bill-verification-summary-cell">
        <span className="bill-verification-summary-cell__label">วันที่เวลา</span>
        <span className="bill-verification-summary-cell__value">
          {bookingDate}
        </span>
      </div>

      <div className="bill-verification-summary-cell">
        <span className="bill-verification-summary-cell__label">ชื่อ-สกุล</span>
        <span className="bill-verification-summary-cell__value">{name}</span>
      </div>

      <div className="bill-verification-summary-cell bill-verification-summary-cell--note">
        <span className="bill-verification-summary-cell__label">หมายเหตุ</span>

        <button
          type="button"
          className="bill-verification-summary-cell__toggle"
          aria-expanded={expanded}
          aria-controls={detailPanelId}
          onClick={onToggle}
        >
          {expanded ? "หด" : "ขยาย"}
        </button>
      </div>
    </div>
  );
}

function BillVerificationPage() {
  const { branchId: registeredBranchId } = useBranchDevice();
  const [isNewRecipientModalOpen, setIsNewRecipientModalOpen] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [draftRecords, setDraftRecords] = useState([]);
  const [draftListStatus, setDraftListStatus] = useState("loading");
  const [draftListMessage, setDraftListMessage] = useState("");
  const [expandedBillIds, setExpandedBillIds] = useState([]);

  useEffect(() => {
    let isActive = true;
    setDraftListStatus("loading");
    setDraftListMessage("");

    const loadDrafts = async () => {
      try {
        const drafts = await listAppointmentDrafts();

        if (!isActive) {
          return;
        }

        setDraftRecords(sortDraftsNewestFirst(drafts));
        setDraftListStatus("ready");
      } catch (error) {
        if (!isActive) {
          return;
        }

        setDraftListStatus("error");
        setDraftListMessage(getDraftListErrorMessage(error));
      }
    };

    loadDrafts();

    return () => {
      isActive = false;
    };
  }, []);

  const displayedBills = useMemo(
    () =>
      sortDraftsNewestFirst(draftRecords).map((draft) => ({
        rawDraft: draft,
        card: mapDraftToBillCard(draft)
      })),
    [draftRecords]
  );
  const displayedBillIds = useMemo(
    () => displayedBills.map(({ card }) => card.id),
    [displayedBills]
  );

  useEffect(() => {
    setExpandedBillIds((current) => {
      const next = current.filter((id) => displayedBillIds.includes(id));

      if (
        next.length === current.length &&
        next.every((value, index) => value === current[index])
      ) {
        return current;
      }

      return next;
    });
  }, [displayedBillIds]);

  const handleOpenNewDraft = () => {
    setSelectedDraft(null);
    setIsNewRecipientModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsNewRecipientModalOpen(false);
    setSelectedDraft(null);
  };

  const handleDraftChange = (draft) => {
    if (!draft?.id) {
      return;
    }

    setDraftRecords((current) => {
      const nextRecords = current.some((item) => item.id === draft.id)
        ? current.map((item) => (item.id === draft.id ? draft : item))
        : [draft, ...current];

      return sortDraftsNewestFirst(nextRecords);
    });
    setDraftListStatus("ready");
    setDraftListMessage("");
    setSelectedDraft(draft);
    setExpandedBillIds((current) =>
      current.includes(draft.id) ? current : [draft.id, ...current]
    );
  };

  const toggleBillExpansion = (id) => {
    setExpandedBillIds((current) =>
      current.includes(id)
        ? current.filter((itemId) => itemId !== id)
        : [...current, id]
    );
  };

  const showCards = displayedBills.length > 0;
  const showLoadingState = draftListStatus === "loading" && !showCards;
  const showErrorState = draftListStatus === "error" && !showCards;
  const showEmptyState = draftListStatus === "ready" && !showCards;

  return (
    <>
      <AppLayout
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Bill verification" }
        ]}
        headerSearch={
          <div className="bill-verification-page__header-spacer" aria-hidden="true" />
        }
      >
        <div className="bill-verification-page">
          <section className="bill-verification-page__hero">
            <button
              className="bill-verification-panel bill-verification-panel--new bill-verification-panel--new-button"
              type="button"
              aria-haspopup="dialog"
              aria-expanded={isNewRecipientModalOpen}
              onClick={handleOpenNewDraft}
            >
              <div className="bill-verification-panel__plus" aria-hidden="true">
                +
              </div>
              <div className="bill-verification-panel__title">ผู้รับสิทธิ์ใหม่</div>
            </button>
          </section>

          <section className="bill-verification-page__cards">
            {showCards ? (
              <>
                <div className="bill-verification-summary-header" aria-hidden="true">
                  <span>วันที่เวลา</span>
                  <span>ชื่อ-สกุล</span>
                  <span>หมายเหตุ</span>
                </div>

                {displayedBills.map(({ rawDraft, card }) => {
                  const isExpanded = expandedBillIds.includes(card.id);
                  const detailPanelId = createDetailPanelId(card.id);

                  return (
                    <section
                      key={card.id}
                      className={`bill-verification-record${
                        isExpanded ? " bill-verification-record--expanded" : ""
                      }`}
                    >
                      <BillSummaryRow
                        id={card.id}
                        {...card}
                        expanded={isExpanded}
                        onToggle={() => toggleBillExpansion(card.id)}
                      />

                      {isExpanded ? (
                        <div
                          id={detailPanelId}
                          className="bill-verification-record__details"
                        >
                          <BillCard
                            {...card}
                            onSelect={
                              String(rawDraft?.status || "draft")
                                .trim()
                                .toLowerCase() === "draft"
                                ? () => {
                                    setSelectedDraft(rawDraft);
                                    setIsNewRecipientModalOpen(true);
                                  }
                                : undefined
                            }
                          />
                        </div>
                      ) : null}
                    </section>
                  );
                })}
              </>
            ) : null}

            {showLoadingState ? (
              <div className="bill-verification-panel bill-verification-panel--status">
                <h2>กำลังโหลดรายการร่าง</h2>
                <p>กำลังโหลดร่างที่บันทึกไว้จากฐานข้อมูล...</p>
              </div>
            ) : null}

            {showErrorState ? (
              <div className="bill-verification-panel bill-verification-panel--status">
                <h2>โหลดรายการร่างไม่สำเร็จ</h2>
                <p>{draftListMessage}</p>
              </div>
            ) : null}

            {showEmptyState ? (
              <div className="bill-verification-panel bill-verification-panel--status">
                <h2>ยังไม่มีรายการร่าง</h2>
                <p>เมื่อบันทึกร่างลงระบบ รายการจะกลับมาได้แม้รีเฟรชหน้า</p>
              </div>
            ) : null}
          </section>
        </div>
      </AppLayout>

      <NewBillRecipientModal
        open={isNewRecipientModalOpen}
        onClose={handleCloseModal}
        defaultBranchId={registeredBranchId || ""}
        onDraftChange={handleDraftChange}
        initialDraft={selectedDraft}
      />
    </>
  );
}

export default BillVerificationPage;
