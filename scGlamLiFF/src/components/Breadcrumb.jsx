import { Link, useNavigate } from "react-router-dom";

function Breadcrumb({ items }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="breadcrumb">
      <button className="breadcrumb__back" type="button" onClick={handleBack}>
        {"<- ย้อนกลับ"}
      </button>
      <div className="breadcrumb__trail">
        {items.map((item, index) => (
          <span key={`${item.label}-${index}`} className="breadcrumb__item">
            {item.to ? <Link to={item.to}>{item.label}</Link> : item.label}
            {index < items.length - 1 ? <span>{" > "}</span> : null}
          </span>
        ))}
      </div>
    </div>
  );
}

export default Breadcrumb;
