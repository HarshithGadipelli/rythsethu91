import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { lang, changeLang, t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const active = (path) => location.pathname === path ? "navbar-link active" : "navbar-link";

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <div className="navbar-logo">🌾</div>
        <div>
          <span className="navbar-title">{t("appName")}</span>
          <span className="navbar-subtitle">{t("tagline")}</span>
        </div>
      </Link>

      <ul className="navbar-links">
        <li><Link to="/" className={active("/")}>🏠 Home</Link></li>
        <li><Link to="/marketplace" className={active("/marketplace")}>🛒 {t("marketplace")}</Link></li>
        {user?.role === "farmer" && (
          <li><Link to="/farmer" className={active("/farmer")}>🌱 {t("dashboard")}</Link></li>
        )}
        {user?.role === "agent" && (
          <li><Link to="/agent" className={active("/agent")}>🚚 {t("deliveries")}</Link></li>
        )}
        {user?.role === "admin" && (
          <li><Link to="/admin" className={active("/admin")}>🛡️ {t("adminPanel")}</Link></li>
        )}
        <li>
          <select className="lang-select" value={lang} onChange={(e) => changeLang(e.target.value)}>
            <option value="en">🇬🇧 EN</option>
            <option value="te">🇮🇳 తె</option>
            <option value="hi">🇮🇳 हि</option>
          </select>
        </li>
        {user ? (
          <>
            <li style={{ color: "var(--green-pale)", fontSize: "0.85rem" }}>👤 {user.name?.split(" ")[0]}</li>
            <li>
              <button className="btn-secondary" onClick={handleLogout} style={{ padding: "0.4rem 0.9rem", fontSize: "0.8rem" }}>
                {t("logout")}
              </button>
            </li>
          </>
        ) : (
          <>
            <li>
              <Link to="/login" style={{ textDecoration: "none" }}>
                <span className="btn-secondary" style={{ padding: "0.4rem 0.9rem", fontSize: "0.85rem", display: "inline-block" }}>{t("login")}</span>
              </Link>
            </li>
            <li>
              <Link to="/register" style={{ textDecoration: "none" }}>
                <span className="btn-primary" style={{ padding: "0.4rem 0.9rem", fontSize: "0.85rem", display: "inline-block", width: "auto" }}>{t("register")}</span>
              </Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}