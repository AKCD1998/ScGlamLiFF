import "./DotProgress.css";

function DotProgress({ total, used }) {
  const safeTotal = Math.max(1, Number(total) || 0);
  const safeUsed = Math.min(Math.max(0, Number(used) || 0), safeTotal);

  return (
    <div className="dot-progress" aria-label={`${safeUsed}/${safeTotal}`}>
      {Array.from({ length: safeTotal }).map((_, index) => (
        <span
          key={index}
          className={`dot-progress__dot${
            index < safeUsed ? " is-filled" : ""
          }`}
        />
      ))}
    </div>
  );
}

export default DotProgress;
