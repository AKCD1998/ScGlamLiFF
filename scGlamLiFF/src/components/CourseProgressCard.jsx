import SegmentedMeter from "./SegmentedMeter";

function CourseProgressCard({ course }) {
  return (
    <section className="my-treatment-card course-progress-card">
      <div className="course-progress-card__summary">
        คอร์ส: <span>{course.name}</span> ใช้ไป {course.used} ครั้ง จากทั้งหมด{" "}
        {course.total} ครั้ง
      </div>
      {typeof course.remainingSessions === "number" ? (
        <div className="course-progress-card__summary">
          เหลืออีก {course.remainingSessions} ครั้ง
        </div>
      ) : null}
      <SegmentedMeter total={course.total} used={course.used} />
    </section>
  );
}

export default CourseProgressCard;
