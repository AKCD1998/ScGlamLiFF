import { Link } from "react-router-dom";
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
      <footer className="app-footer">
        <div className="app-footer__links">
          <Link to="/privacy">Privacy Policy</Link>
          <span aria-hidden="true">·</span>
          <Link to="/terms">Terms</Link>
        </div>
        <div className="app-footer__meta">
          © SC Group (1989) Co., Ltd.
        </div>
      </footer>
    </div>
  );
}

export default AppLayout;
