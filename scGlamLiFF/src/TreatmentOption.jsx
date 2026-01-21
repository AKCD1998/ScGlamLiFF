function TreatmentOption({ title, imageSrc, isActive, isDisabled = false, onClick }) {
  const handleClick = () => {
    if (isDisabled) {
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
      disabled={isDisabled}
    >
      <img className="treatment-thumb" src={imageSrc} alt={title} />
      <span className="treatment-title">{title}</span>
    </button>
  );
}

export default TreatmentOption;
