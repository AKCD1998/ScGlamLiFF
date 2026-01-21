import myTreatmentMock from "../data/myTreatmentMock";
import LineProfileCard from "../components/LineProfileCard";
import CourseProgressCard from "../components/CourseProgressCard";
import NextAppointmentCard from "../components/NextAppointmentCard";
import ServiceHistoryTable from "../components/ServiceHistoryTable";
import AppLayout from "../components/AppLayout";
import "./MyTreatmentSmoothPage.css";

function MyTreatmentSmoothPage() {
  return (
    <AppLayout
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "My Treatments", to: "/my-treatments" },
        { label: "My Treatment (Smooth)" }
      ]}
    >
      <div className="my-treatment-page">
        <header className="my-treatment-page__header">
          <h1>My Treatment (Smooth)</h1>
        </header>

        <section className="my-treatment-summary">
          <LineProfileCard profile={myTreatmentMock.profile} />
          <CourseProgressCard course={myTreatmentMock.course} />
        </section>

        <NextAppointmentCard appointment={myTreatmentMock.nextAppointment} />

        <ServiceHistoryTable history={myTreatmentMock.history} />
      </div>
    </AppLayout>
  );
}

export default MyTreatmentSmoothPage;
