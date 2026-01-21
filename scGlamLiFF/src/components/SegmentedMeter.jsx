function SegmentedMeter({ total, used }) {
  const segments = Math.max(total, 0);
  const filled = Math.min(Math.max(used, 0), segments);

  if (segments <= 1) {
    return (
      <div className="segmented-meter__single">
        {filled}/{segments}
      </div>
    );
  }

  return (
    <div className="segmented-meter" role="presentation">
      {Array.from({ length: segments }).map((_, index) => {
        const isFilled = index < filled;
        return (
          <span
            key={`segment-${index}`}
            className={`segmented-meter__segment${
              isFilled ? " is-filled" : ""
            }`}
            style={{ transitionDelay: `${index * 40}ms` }}
          />
        );
      })}
    </div>
  );
}

export default SegmentedMeter;
