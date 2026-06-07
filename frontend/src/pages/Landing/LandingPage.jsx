import { Link } from "react-router-dom";
import { useLang } from "../../context/LangContext";
import { useAuth } from "../../context/AuthContext";

export default function LandingPage() {
  const { t } = useLang();
  const { user } = useAuth();

  const stats = [
    { icon: "🌾", value: "1,200+", label: "Farmers" },
    { icon: "🛒", value: "8,500+", label: "Customers" },
    { icon: "🚚", label: "Deliveries", value: "24,000+" },
    { icon: "📦", value: "340+", label: "Crop Varieties" }
  ];

  const features = [
    { icon: "🤖", title: "AI Crop Suggestions", desc: "ML-powered recommendations based on weather & soil" },
    { icon: "🗺️", title: "Live Map Tracking", desc: "See farm locations & track your delivery in real-time" },
    { icon: "🎤", title: "Voice Input", desc: "Speak in Telugu, Hindi or English — we understand you" },
    { icon: "📊", title: "Demand Forecast", desc: "Know which crops will sell best this season" },
    { icon: "🌿", title: "Organic Certified", desc: "Verified organic produce from trusted farmers" },
    { icon: "💳", title: "Instant Payments", desc: "UPI, card, and COD — pay the way you prefer" }
  ];

  return (
    <div>
      {/* ─── HERO ─── */}
      <section className="landing-hero">
        <span className="hero-emoji">🌾</span>
        <h1 className="page-title">{t("appName")}</h1>
        <p className="hero-tagline">
          {t("tagline")} — Farm fresh produce delivered to your doorstep, powered by AI & community.
        </p>

        {/* Bridge Animation */}
        <div className="bridge-visual">
          <div className="bridge-node" style={{ borderColor: "var(--green-light)" }}>
            <span className="bridge-node-icon">👨‍🌾</span>
            <span className="bridge-node-label">{t("farmer")}</span>
          </div>

          <div className="bridge-connector">
            <div className="bridge-line-h"></div>
            <span className="bridge-line-label">🌱 Fresh Harvest</span>
          </div>

          <div className="bridge-node" style={{ borderColor: "var(--yellow-wheat)" }}>
            <span className="bridge-node-icon">🚚</span>
            <span className="bridge-node-label">{t("agent")}</span>
          </div>

          <div className="bridge-connector">
            <div className="bridge-line-h"></div>
            <span className="bridge-line-label">📦 Fast Delivery</span>
          </div>

          <div className="bridge-node" style={{ borderColor: "var(--sky-blue)" }}>
            <span className="bridge-node-icon">🏡</span>
            <span className="bridge-node-label">{t("customer")}</span>
          </div>
        </div>

        {/* CTA Buttons */}
        {!user ? (
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center", marginTop: "2rem" }}>
            <Link to="/register">
              <button className="btn-primary" style={{ width: "auto", padding: "1rem 2.5rem", fontSize: "1.05rem" }}>
                🌱 Get Started Free
              </button>
            </Link>
            <Link to="/marketplace">
              <button className="btn-secondary" style={{ padding: "1rem 2.5rem", fontSize: "1.05rem" }}>
                🛒 Browse Marketplace
              </button>
            </Link>
          </div>
        ) : (
          <div style={{ marginTop: "2rem" }}>
            <p style={{ color: "var(--green-pale)", marginBottom: "1rem" }}>
              👋 Welcome back, <strong style={{ color: "var(--yellow-wheat)" }}>{user.name}</strong>!
            </p>
            <Link to={user.role === "farmer" ? "/farmer" : user.role === "agent" ? "/agent" : "/marketplace"}>
              <button className="btn-primary" style={{ width: "auto", padding: "1rem 2.5rem" }}>
                Go to Dashboard →
              </button>
            </Link>
          </div>
        )}

        {/* Stats */}
        <div className="grid-4 mt-4" style={{ maxWidth: "800px", width: "100%" }}>
          {stats.map((s, i) => (
            <div key={i} className="stat-card">
              <span className="stat-icon">{s.icon}</span>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── ROLE PORTALS ─── */}
      <section className="page-wrapper">
        <h2 className="page-title mb-3">Choose Your Role</h2>
        <div className="role-cards-grid">
          {[
            { to: "/marketplace", icon: "🛒", title: "Customer Portal", desc: "Browse fresh produce, track orders, get nutritional info", color: "var(--sky-blue)" },
            { to: "/farmer", icon: "🌾", title: "Farmer Portal", desc: "List crops, get AI suggestions, manage inventory", color: "var(--green-light)" },
            { to: "/agent", icon: "🚚", title: "Agent Portal", desc: "Manage deliveries, update status, view routes", color: "var(--yellow-wheat)" },
            { to: "/admin", icon: "🛡️", title: "Admin Panel", desc: "Oversee the entire platform, users & analytics", color: "var(--brown-light)" }
          ].map((r, i) => (
            <Link to={r.to} className="role-card" key={i}>
              <div className="role-card-inner" style={{ borderColor: `${r.color}33` }}>
                <span className="role-card-icon">{r.icon}</span>
                <div className="role-card-title" style={{ color: r.color }}>{r.title}</div>
                <div className="role-card-desc">{r.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="page-wrapper mt-4">
        <h2 className="page-title mb-3">Why Rythu Sethu?</h2>
        <div className="grid-3">
          {features.map((f, i) => (
            <div className="glass-card" key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>{f.icon}</div>
              <h3 style={{ color: "var(--yellow-wheat)", marginBottom: "0.5rem", fontSize: "1rem" }}>{f.title}</h3>
              <p style={{ color: "var(--green-pale)", fontSize: "0.85rem", lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{
        marginTop: "4rem", padding: "2rem",
        borderTop: "1px solid rgba(82,183,136,0.2)",
        textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem"
      }}>
        <p>🌾 Rythu Sethu 4.0 — Connecting Farmers & Customers Across India</p>
        <p style={{ marginTop: "0.5rem" }}>Made with ❤️ for Indian Agriculture</p>
      </footer>
    </div>
  );
}
