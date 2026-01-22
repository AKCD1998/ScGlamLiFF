import { useEffect, useState } from "react";
import myTreatmentMock from "../data/myTreatmentMock";
import LineProfileCard from "../components/LineProfileCard";
import CourseProgressCard from "../components/CourseProgressCard";
import NextAppointmentCard from "../components/NextAppointmentCard";
import ServiceHistoryTable from "../components/ServiceHistoryTable";
import AppLayout from "../components/AppLayout";
import { getMockUserId, storeMockUserIdFromQuery } from "../utils/mockAuth";
import "./MyTreatmentSmoothPage.css";

function MyTreatmentSmoothPage() {
  const [courseData, setCourseData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [noSmoothCourse, setNoSmoothCourse] = useState(false);
  const [mockUserId, setMockUserId] = useState(getMockUserId());

  useEffect(() => {
    const queryUserId = storeMockUserIdFromQuery();
    setMockUserId(queryUserId || getMockUserId());
  }, []);

  useEffect(() => {
    let isActive = true;

    const fetchTreatments = async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      return response.json();
    };

    const loadTreatments = async () => {
      setIsLoading(true);
      setFetchError(null);
      setNoSmoothCourse(false);

      const encodedUserId = encodeURIComponent(mockUserId);
      const proxyUrl = `/api/me/treatments?line_user_id=${encodedUserId}`;
      const fallbackUrl = `http://localhost:3002/api/me/treatments?line_user_id=${encodedUserId}`;

      try {
        let data;
        try {
          data = await fetchTreatments(proxyUrl);
        } catch (error) {
          data = await fetchTreatments(fallbackUrl);
        }

        if (!isActive) {
          return;
        }

        const smoothItem = data.items?.find((item) => item.code === "smooth");

        if (!smoothItem) {
          setCourseData(null);
          setNoSmoothCourse(true);
          return;
        }

        const totalSessions = myTreatmentMock.course.total;
        const remainingSessions = Number(smoothItem.remaining_sessions) || 0;
        const usedSessions = Math.max(0, totalSessions - remainingSessions);

        setCourseData({
          ...myTreatmentMock.course,
          name: smoothItem.title_en || myTreatmentMock.course.name,
          remainingSessions,
          total: totalSessions,
          used: usedSessions
        });
      } catch (error) {
        if (!isActive) {
          return;
        }
        setFetchError(error);
        setCourseData(myTreatmentMock.course);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    if (mockUserId) {
      loadTreatments();
    }

    return () => {
      isActive = false;
    };
  }, [mockUserId]);

  const profileData = {
    ...myTreatmentMock.profile,
    id: mockUserId || myTreatmentMock.profile.id
  };

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

        {isLoading ? (
          <p className="my-treatment-page__status">Loading treatments...</p>
        ) : null}
        {fetchError ? (
          <p className="my-treatment-page__status">
            Failed to load treatments. Showing mock data.
          </p>
        ) : null}

        <section className="my-treatment-summary">
          <LineProfileCard profile={profileData} />
          {courseData ? (
            <CourseProgressCard course={courseData} />
          ) : noSmoothCourse ? (
            <section className="my-treatment-card course-progress-card">
              <div className="course-progress-card__summary">
                No Smooth package for this user.
              </div>
            </section>
          ) : null}
        </section>

        <NextAppointmentCard appointment={myTreatmentMock.nextAppointment} />

        <ServiceHistoryTable history={myTreatmentMock.history} />
      </div>
    </AppLayout>
  );
}

export default MyTreatmentSmoothPage;
