function TreatmentOption({ title, imageSrc, isActive, onClick }) {
  const handleClick = () => {
    if (!isActive) {
      return;
    }
    if (onClick) {
      onClick();
    }
  };

  return (
    <button
      className={`treatment-option${isActive ? "" : " treatment-option--inactive"}`}
      type="button"
      onClick={handleClick}
      disabled={!isActive}
    >
      <img className="treatment-thumb" src={imageSrc} alt={title} />
      <span className="treatment-title">{title}</span>
    </button>
  );
}

export default TreatmentOption;
