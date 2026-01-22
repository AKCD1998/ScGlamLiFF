import CourseBundleCard from "./CourseBundleCard";
import "./CourseBundleList.css";

function CourseBundleList({ bundles }) {
  const sortedBundles = bundles || [];

  return (
    <section className="course-bundle-list">
      <header className="course-bundle-list__header">
        <h2>คอร์สนวดหน้าของคุณ</h2>
        <span>รวมทั้งหมด {sortedBundles.length} คอร์ส</span>
      </header>
      <div className="course-bundle-list__scroll">
        {sortedBundles.length ? (
          sortedBundles.map((bundle) => (
            <CourseBundleCard key={bundle.id} bundle={bundle} />
          ))
        ) : (
          <p className="course-bundle-list__empty">ยังไม่มีคอร์สที่ใช้งานได้</p>
        )}
      </div>
    </section>
  );
}

export default CourseBundleList;
