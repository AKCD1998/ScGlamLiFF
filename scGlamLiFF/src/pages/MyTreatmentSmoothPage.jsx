import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import myTreatmentMock from "../data/myTreatmentMock";
import LineProfileCard from "../components/LineProfileCard";
import CourseBundleList from "../components/CourseBundleList";
import NextAppointmentCard from "../components/NextAppointmentCard";
import ServiceHistoryTable from "../components/ServiceHistoryTable";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import { apiUrl } from "../utils/apiBase";
import LoadingOverlay from "../components/LoadingOverlay";
import formatBangkokDateTime from "../utils/formatBangkokDateTime";
import "./MyTreatmentSmoothPage.css";

function MyTreatmentSmoothPage() {
  const location = useLocation();
  const [courseData, setCourseData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [noSmoothCourse, setNoSmoothCourse] = useState(false);
  const [historyData, setHistoryData] = useState({ purchaseRows: [], usageRows: [] });
  const [historyError, setHistoryError] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [bundleCourses, setBundleCourses] = useState([]);
  const [bundleError, setBundleError] = useState(null);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [nextAppointment, setNextAppointment] = useState(null);
  const [appointmentStatus, setAppointmentStatus] = useState("idle");
  const [appointmentError, setAppointmentError] = useState(null);
  const [appointmentRefreshKey, setAppointmentRefreshKey] = useState(0);
  const { user } = useAuth();
  const lineUserId = user?.lineUserId;
  const displayName = user?.displayName;


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

      const encodedUserId = encodeURIComponent(lineUserId);
      const requestUrl = apiUrl(
        `/api/me/treatments?line_user_id=${encodedUserId}`
      );

      try {
        const data = await fetchTreatments(requestUrl);

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

    if (lineUserId) {
      loadTreatments();
    }

    return () => {
      isActive = false;
    };
  }, [lineUserId, location.key]);

  useEffect(() => {
    let isActive = true;

    const fetchHistory = async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      return response.json();
    };

    const loadHistory = async () => {
      setHistoryLoading(true);
      setHistoryError(null);
      const encodedUserId = encodeURIComponent(lineUserId);
      const requestUrl = apiUrl(
        `/api/me/history?line_user_id=${encodedUserId}&treatment_code=smooth`
      );

      try {
        const data = await fetchHistory(requestUrl);

        if (!isActive) {
          return;
        }

        setHistoryData({
          purchaseRows: Array.isArray(data.purchaseRows) ? data.purchaseRows : [],
          usageRows: Array.isArray(data.usageRows) ? data.usageRows : []
        });
      } catch (error) {
        if (!isActive) {
          return;
        }
        setHistoryError(error);
        setHistoryData({ purchaseRows: [], usageRows: [] });
      } finally {
        if (isActive) {
          setHistoryLoading(false);
        }
      }
    };

    if (lineUserId) {
      loadHistory();
    }

    return () => {
      isActive = false;
    };
  }, [lineUserId, location.key]);

  useEffect(() => {
    let isActive = true;

    const fetchCourses = async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      return response.json();
    };

    const loadCourses = async () => {
      setBundleLoading(true);
      setBundleError(null);
      const encodedUserId = encodeURIComponent(lineUserId);
      const requestUrl = apiUrl(`/api/my-courses?lineUserId=${encodedUserId}`);

      try {
        const data = await fetchCourses(requestUrl);

        if (!isActive) {
          return;
        }

        const courses = Array.isArray(data.courses) ? data.courses : [];
        const smoothCourses = courses.filter(
          (course) => course.treatmentCode === "smooth"
        );
        setBundleCourses(smoothCourses);
        setNoSmoothCourse(smoothCourses.length === 0);
      } catch (error) {
        if (!isActive) {
          return;
        }
        setBundleError(error);
        setBundleCourses([]);
        setNoSmoothCourse(true);
      } finally {
        if (isActive) {
          setBundleLoading(false);
        }
      }
    };

    if (lineUserId) {
      loadCourses();
    }

    return () => {
      isActive = false;
    };
  }, [lineUserId, location.key]);

  useEffect(() => {
    let isActive = true;

    const fetchNext = async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      return response.json();
    };

    const loadNextAppointment = async () => {
      setAppointmentStatus("loading");
      setAppointmentError(null);
      const encodedUserId = encodeURIComponent(lineUserId);
      const requestUrl = apiUrl(
        `/api/appointments/next?line_user_id=${encodedUserId}&treatment_code=smooth`
      );

      try {
        const data = await fetchNext(requestUrl);

        if (!isActive) {
          return;
        }

        const item = data.item || null;
        setNextAppointment(item);
        if (item) {
          setAppointmentStatus("ready");
        } else {
          setAppointmentStatus("empty");
        }
      } catch (error) {
        if (!isActive) {
          return;
        }
        setNextAppointment(null);
        setAppointmentError(error);
        setAppointmentStatus("error");
      }
    };

    if (lineUserId) {
      loadNextAppointment();
    }

    return () => {
      isActive = false;
    };
  }, [lineUserId, location.key, appointmentRefreshKey]);

  const bundleData = useMemo(
    () =>
      bundleCourses.map((course) => ({
        id: course.purchaseId,
        treatmentTitle: course.treatmentTitle,
        totalSessions: course.totalSessions,
        remainingSessions: course.remainingSessions,
        purchasedAt: course.purchasedAt,
        expiresAt: course.expiresAt,
        status: course.status
      })),
    [bundleCourses]
  );

  const profileData = {
    ...myTreatmentMock.profile,
    name: displayName || myTreatmentMock.profile.name,
    id: lineUserId || myTreatmentMock.profile.id
  };

  const isPageLoading =
    isLoading ||
    historyLoading ||
    bundleLoading ||
    appointmentStatus === "loading";

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
        {historyError ? (
          <p className="my-treatment-page__status">Failed to load history.</p>
        ) : null}
        {bundleError ? (
          <p className="my-treatment-page__status">Failed to load courses.</p>
        ) : null}

        <section className="my-treatment-summary">
          <LineProfileCard profile={profileData} />
          {bundleData.length ? (
            <CourseBundleList bundles={bundleData} />
          ) : noSmoothCourse ? (
            <section className="my-treatment-card course-progress-card">
              <div className="course-progress-card__summary">
                No Smooth package for this user.
              </div>
            </section>
          ) : null}
        </section>

        <NextAppointmentCard
          status={appointmentStatus}
          onRetry={() => setAppointmentRefreshKey((value) => value + 1)}
          appointment={
            nextAppointment
              ? {
                  id: nextAppointment.id,
                  treatmentCode: "smooth",
                  // Avoid double conversion: format once in Bangkok time.
                  dateText: formatBangkokDateTime(nextAppointment.scheduled_at),
                  scheduledAtRaw: nextAppointment.scheduled_at,
                  addons: Array.isArray(nextAppointment.selected_toppings)
                    ? nextAppointment.selected_toppings.map((item) => ({
                        name: item.name,
                        priceTHB: item.price_thb
                      }))
                    : [],
                  addonsTotalTHB: nextAppointment.addons_total_thb || 0,
                  branchId: nextAppointment.branch_id
                }
              : null
          }
        />

        <ServiceHistoryTable history={historyData} />
      </div>
      <LoadingOverlay
        open={isPageLoading}
        text="กำลังโหลดข้อมูลการจอง..."
      />
    </AppLayout>
  );
}

export default MyTreatmentSmoothPage;

// Manual test:
// 1) /my-treatments/smooth?mock_user_id=U_TEST_001&dev=1
// 2) ต้องเห็น overlay ระหว่างโหลด และไม่แสดงวันนัดแบบ mock
// 3) ถ้าไม่มีนัดหมายให้ขึ้น "ยังไม่มีการจอง"
