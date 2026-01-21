import { useTheme } from "../ThemeContext";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      className="theme-toggle"
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
    >
      <span className="theme-toggle__icon" aria-hidden="true">
        {isDark ? "🌙" : "☀️"}
      </span>
      <span className="sr-only">Toggle dark mode</span>
      <span className={`theme-toggle__track${isDark ? " is-dark" : ""}`}>
        <span className="theme-toggle__thumb" />
      </span>
    </button>
  );
}

export default ThemeToggle;
