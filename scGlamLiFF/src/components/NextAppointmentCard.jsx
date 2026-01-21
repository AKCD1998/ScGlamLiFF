import { useNavigate } from "react-router-dom";

function NextAppointmentCard({ appointment, onEdit }) {
  const navigate = useNavigate();

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
      return;
    }
    navigate("/my-treatments/smooth/booking");
  };

  return (
    <section className="my-treatment-card next-appointment-card">
      <div className="next-appointment-card__header">
        นัดหมายครั้งถัดไปวันที่....
      </div>
      <div className="next-appointment-card__body">
        <button type="button" onClick={handleEdit}>
          แก้ไข
        </button>
        <span className="next-appointment-card__date">
          {appointment.dateText}
        </span>
      </div>
    </section>
  );
}

export default NextAppointmentCard;
