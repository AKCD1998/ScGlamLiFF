import TreatmentOption from "./TreatmentOption";
import "./MyTreatmentsPage.css";
import smoothImage from "./assets/smooth.png";
import { useNavigate } from "react-router-dom";
import AppLayout from "./components/AppLayout";

function MyTreatmentsPage({ onSelectSmooth }) {
  const navigate = useNavigate();

  const handleSmooth = () => {
    if (onSelectSmooth) {
      onSelectSmooth();
    } else {
      navigate("/my-treatments/smooth");
    }
  };

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "My Treatments" }
      ]}
    >
      <div className="treatments-page">
        <header className="treatments-header">
          <h1 className="treatments-title">ทรีตเมนต์ของคุณ</h1>
        </header>
        <main className="treatments-list">
          <TreatmentOption
            title="Smooth"
            imageSrc={smoothImage}
            isActive
            onClick={handleSmooth}
          />
          <TreatmentOption
            title="Expert"
            imageSrc={smoothImage}
            isActive={false}
            onClick={() => console.log("/treatments/expert")}
          />
          <TreatmentOption
            title="Enchanting Glam Renew"
            imageSrc={smoothImage}
            isActive={false}
            onClick={() => console.log("/treatments/glam-renew")}
          />

          <TreatmentOption
            title="ซื้อทรีตเมนต์เพิ่ม"
            imageSrc={smoothImage}
            isActive
            onClick={() => navigate("/treatments/top-picks")}
          />
        </main>
      </div>
    </AppLayout>
  );
}

export default MyTreatmentsPage;
