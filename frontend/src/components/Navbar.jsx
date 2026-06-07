import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, ShoppingBag, Leaf, Truck, Shield, LogOut, User, Bell } from "lucide-react";
import API from "../api/api";
import { io } from "socket.io-client";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { lang, changeLang, t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const socket = io("http://localhost:5000");
      socket.on("notification", (data) => {
        if (data.userId === user._id) fetchNotifications();
      });
      return () => socket.disconnect();
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await API.get(`/notifications/${user._id}`);
      setNotifications(res.data);
    } catch (e) { console.error("Failed to fetch notifications"); }
  };

  const markAsRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch {}
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const active = (path) => location.pathname === path ? "navbar-link active" : "navbar-link";

  return (
    <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
      <Link to="/" className="navbar-brand">
        <motion.div whileHover={{ rotate: 10, scale: 1.05 }} className="navbar-logo">🌾</motion.div>
        <div>
          <span className="navbar-title">{t("appName")}</span>
          <span className="navbar-subtitle">{t("tagline")}</span>
        </div>
      </Link>

      <ul className="navbar-links">
        <li><Link to="/" className={active("/")}><Home size={18} /> {t("home")}</Link></li>
        <li><Link to="/marketplace" className={active("/marketplace")}><ShoppingBag size={18} /> {t("marketplace")}</Link></li>
        {user?.role === "farmer" && (
          <li><Link to="/farmer" className={active("/farmer")}><Leaf size={18} /> {t("dashboard")}</Link></li>
        )}
        {user?.role === "agent" && (
          <li><Link to="/agent" className={active("/agent")}><Truck size={18} /> {t("deliveries")}</Link></li>
        )}
        {user?.role === "admin" && (
          <li><Link to="/admin" className={active("/admin")}><Shield size={18} /> {t("adminPanel")}</Link></li>
        )}
        <li>
          <select className="lang-select" value={lang} onChange={(e) => changeLang(e.target.value)}>
            <option value="en">🇬🇧 EN</option>
            <option value="te">🇮🇳 తె</option>
            <option value="hi">🇮🇳 हि</option>
            <option value="kn">🇮🇳 ಕನ್</option>
            <option value="ta">🇮🇳 தமி</option>
          </select>
        </li>
        {user ? (
          <>
            {user.role === "agent" && user.experiencePoints > 0 && (
              <li>
                <span className="rewards-badge" style={{ padding: "0.3rem 0.8rem", fontSize: "0.8rem" }}>⭐ {user.experiencePoints} XP</span>
              </li>
            )}
            {user.role !== "agent" && user.rewardPoints > 0 && (
              <li>
                <span className="rewards-badge" style={{ padding: "0.3rem 0.8rem", fontSize: "0.8rem" }}>🏆 {user.rewardPoints} Pts</span>
              </li>
            )}
            <li style={{ color: "var(--text-dark)", fontSize: "0.95rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <div style={{ background: "var(--green-pale)", padding: "6px", borderRadius: "50%", color: "var(--green-deep)" }}><User size={16} /></div>
              {user.name?.split(" ")[0]}
            </li>
            <li ref={notifRef} style={{ position: "relative" }}>
              <button 
                className="btn-icon" 
                style={{ position: "relative", background: showNotifs ? "var(--green-pale)" : "transparent" }}
                onClick={() => setShowNotifs(!showNotifs)}
              >
                <Bell size={20} color="var(--text-dark)" />
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <span style={{ position: "absolute", top: 0, right: 0, background: "#ef4444", color: "white", borderRadius: "50%", width: 18, height: 18, fontSize: "0.65rem", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", border: "2px solid white" }}>
                    {notifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </button>
              
              <AnimatePresence>
                {showNotifs && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="notif-dropdown"
                  >
                    <div className="notif-header">
                      <h4 style={{ fontSize: "1rem" }}>{t("notifications")}</h4>
                      <span style={{ fontSize: "0.75rem", color: "var(--green-mid)" }}>{notifications.filter(n => !n.isRead).length} {t("unread")}</span>
                    </div>
                    <div className="notif-body">
                      {notifications.length === 0 ? (
                        <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "1rem 0" }}>{t("noNotifications")}</p>
                      ) : (
                        notifications.map(n => (
                          <div 
                            key={n._id} 
                            className={`notif-item ${!n.isRead ? "unread" : ""}`}
                            onClick={() => { if (!n.isRead) markAsRead(n._id); }}
                          >
                            <div className="notif-icon">{n.type === "order" ? "📦" : n.type === "delivery" ? "🚚" : n.type === "payment" ? "💰" : "🔔"}</div>
                            <div className="notif-content">
                              <div className="notif-title">{n.title}</div>
                              <div className="notif-msg">{n.message}</div>
                              <div className="notif-time">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                            {!n.isRead && <div className="notif-dot"></div>}
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
            <li>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn-secondary" onClick={handleLogout} style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem", background: "#fef2f2", color: "#ef4444", borderColor: "#fecaca" }}>
                <LogOut size={16} /> {t("logout")}
              </motion.button>
            </li>
          </>
        ) : (
          <>
            <li>
              <Link to="/login" style={{ textDecoration: "none" }}>
                <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn-secondary" style={{ padding: "0.5rem 1.25rem", fontSize: "0.9rem", display: "inline-block", borderRadius: "100px", color: "var(--text-dark)", borderColor: "#e2e8f0" }}>{t("login")}</motion.span>
              </Link>
            </li>
            <li>
              <Link to="/register" style={{ textDecoration: "none" }}>
                <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn-primary" style={{ padding: "0.5rem 1.25rem", fontSize: "0.9rem", display: "inline-block", width: "auto", borderRadius: "100px" }}>{t("register")}</motion.span>
              </Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}