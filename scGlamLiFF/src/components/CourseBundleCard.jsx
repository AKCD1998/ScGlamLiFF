import DotProgress from "./DotProgress";
import "./CourseBundleCard.css";

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const getDaysUntil = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffMs = target - start;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

function CourseBundleCard({ bundle }) {
  const total = Number(bundle.totalSessions) || 0;
  const remaining = Math.max(0, Number(bundle.remainingSessions) || 0);
  const used = Math.max(0, total - remaining);
  const daysUntil = getDaysUntil(bundle.expiresAt);
  const isExpired =
    bundle.status === "expired" || (daysUntil !== null && daysUntil < 0);
  const isCompleted = remaining === 0 || bundle.status === "completed";
  const isNearExpiry =
    !isExpired && !isCompleted && daysUntil !== null && daysUntil <= 7;

  return (
    <article
      className={`course-bundle-card${isExpired ? " is-expired" : ""}`}
    >
      <header className="course-bundle-card__header">
        <div>
          <p className="course-bundle-card__name">{bundle.treatmentTitle}</p>
          <p className="course-bundle-card__pack">{`แพ็ก ${total} ครั้ง`}</p>
        </div>
        <div className="course-bundle-card__meta">
          <span>หมดอายุ: {formatDate(bundle.expiresAt)}</span>
        </div>
      </header>

      <div className="course-bundle-card__progress">
        <DotProgress total={total} used={used} />
        <div className="course-bundle-card__count">
          <span>{`${used}/${total}`}</span>
          {isCompleted ? (
            <span className="course-bundle-card__status">✅ ใช้ครบแล้ว</span>
          ) : isExpired ? (
            <span className="course-bundle-card__status muted">
              ⛔ หมดอายุแล้ว ({formatDate(bundle.expiresAt)})
            </span>
          ) : isNearExpiry ? (
            <span className="course-bundle-card__status warn">
              ⚠️ จะหมดอายุใน {daysUntil} วัน
            </span>
          ) : (
            <span className="course-bundle-card__status">
              เหลือ {remaining} ครั้ง
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export default CourseBundleCard;
