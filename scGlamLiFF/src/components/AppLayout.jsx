import ThemeToggle from "./ThemeToggle";
import Breadcrumb from "./Breadcrumb";
import "./AppLayout.css";

function AppLayout({ children, breadcrumbs, headerSearch }) {
  return (
    <div className="app-layout">
      <header className="app-header">
        <span className="brand">SC GLAM</span>
        <div className="search app-header__search">
          {headerSearch || (
            <input type="search" placeholder="ค้นหาทรีตเมนต์" />
          )}
        </div>
        <div className="toggle">
          <ThemeToggle />
        </div>
      </header>
      {breadcrumbs ? <Breadcrumb items={breadcrumbs} /> : null}
      <main className="app-content">{children}</main>
    </div>
  );
}

export default AppLayout;
