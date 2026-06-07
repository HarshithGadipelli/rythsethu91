import { Link } from "react-router-dom";
import { useLang } from "../../context/LangContext";
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Tractor, ShieldCheck, Truck, Home, PackageCheck, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import API from "../../api/api";

export default function LandingPage() {
  const { t } = useLang();
  const { user } = useAuth();

  const [liveStats, setLiveStats] = useState({
    farmers: 0,
    customers: 0,
    orders: 0,
    revenue: 0
  });

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const handleMouseMove = (e) => {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = (e.clientY / window.innerHeight) * 2 - 1;
    setMousePos({ x, y });
  };

  useEffect(() => {
    API.get("/public/stats").then(res => {
      setLiveStats(res.data);
    }).catch(err => console.error("Failed to fetch stats", err));
  }, []);

  const stats = [
    { icon: "🌾", value: liveStats.farmers > 0 ? liveStats.farmers.toLocaleString() : "0", label: "Real Farmers" },
    { icon: "🛒", value: liveStats.customers > 0 ? liveStats.customers.toLocaleString() : "0", label: "Happy Customers" },
    { icon: "🚚", value: liveStats.orders > 0 ? liveStats.orders.toLocaleString() : "0", label: "Real Deliveries" },
    { icon: "💰", value: liveStats.revenue > 0 ? `₹${liveStats.revenue.toLocaleString()}` : "₹0", label: "Total Sales Volume" }
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
    <div onMouseMove={handleMouseMove}>
      {/* ─── HERO ─── */}
      <section className="landing-hero">
        <span className="hero-emoji">🌾</span>
        <h1 className="page-title">{t("appName")}</h1>
        <p className="hero-tagline" style={{ color: "var(--text-mid)", fontWeight: 600, maxWidth: "600px", margin: "0 auto", fontSize: "1.15rem" }}>
          {t("tagline")} — Farm fresh produce delivered to your doorstep, powered by AI & community.
        </p>

        {/* Dynamic Supply Chain Animation */}
        <div style={{ width: "100%", maxWidth: "800px", margin: "4rem auto 3rem", position: "relative", height: "120px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          
          {/* Animated Dashed Path */}
          <div style={{ position: "absolute", top: "50%", left: "40px", right: "40px", height: "4px", background: "repeating-linear-gradient(to right, #cbd5e1 0, #cbd5e1 10px, transparent 10px, transparent 20px)", zIndex: 0, transform: "translateY(-50%)" }}></div>
          
          {/* Active Path Fill Animation */}
          <motion.div 
            animate={{ width: ["0%", "33%", "66%", "100%", "100%"] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", times: [0, 0.25, 0.5, 0.75, 1] }}
            style={{ position: "absolute", top: "50%", left: "40px", right: "40px", height: "4px", background: "var(--green-mid)", zIndex: 0, transform: "translateY(-50%)", originX: 0 }}
          />

          {/* Nodes */}
          {[
            { icon: <Tractor size={28} color="var(--green-deep)" />, label: t("farmer"), color: "var(--green-light)", step: 0 },
            { icon: <ShieldCheck size={28} color="#0ea5e9" />, label: t("adminVerify"), color: "#e0f2fe", step: 1 },
            { icon: <MapPin size={28} color="#f59e0b" />, label: t("agentHub"), color: "#fef3c7", step: 2 },
            { icon: <Home size={28} color="var(--text-dark)" />, label: t("customer"), color: "#f1f5f9", step: 3 }
          ].map((node, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1, gap: "0.75rem", background: "white" }}>
              <motion.div 
                animate={{ scale: [1, 1.1, 1], boxShadow: ["0 0 0 rgba(22,163,74,0)", "0 0 20px rgba(22,163,74,0.4)", "0 0 0 rgba(22,163,74,0)"] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 1.5 }}
                style={{ width: "64px", height: "64px", borderRadius: "50%", background: node.color, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid white", boxShadow: "var(--shadow-soft)" }}
              >
                {node.icon}
              </motion.div>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-mid)", background: "white", padding: "0 4px" }}>{node.label}</span>
            </div>
          ))}

          {/* Moving Delivery Agent (Truck + Package) */}
          <motion.div
            animate={{ 
              x: ["0%", "33%", "66%", "100%", "100%"],
              opacity: [0, 1, 1, 1, 0]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", times: [0, 0.25, 0.5, 0.75, 1] }}
            style={{ position: "absolute", top: "50%", left: "32px", width: "calc(100% - 64px)", transform: "translateY(-50%)", zIndex: 2, pointerEvents: "none" }}
          >
            <div style={{ position: "absolute", top: "-45px", left: "-20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <motion.div 
                animate={{ y: [0, -5, 0] }} 
                transition={{ duration: 0.5, repeat: Infinity }}
                style={{ background: "white", padding: "6px", borderRadius: "50%", boxShadow: "var(--shadow-hover)", border: "2px solid var(--green-mid)" }}
              >
                <Truck size={24} color="var(--green-mid)" />
              </motion.div>
              <span style={{ fontSize: "0.7rem", fontWeight: 800, background: "var(--green-mid)", color: "white", padding: "2px 6px", borderRadius: "100px", whiteSpace: "nowrap" }}>{t("outForDelivery")}</span>
            </div>
          </motion.div>
        </div>

        {/* CTA Buttons */}
        {!user ? (
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center", marginTop: "2rem" }}>
            <Link to="/register">
              <button className="btn-primary" style={{ width: "auto", padding: "1rem 2.5rem", fontSize: "1.05rem" }}>
                🌱 {t("getStarted")}
              </button>
            </Link>
            <Link to="/marketplace">
              <button className="btn-secondary" style={{ width: "auto", padding: "1rem 2.5rem", fontSize: "1.05rem" }}>
                🛒 {t("shopNow")}
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

      {/* ─── RAM SETU VISION SECTION ─── */}
      <section className="sethu-section">
        <div className="sethu-bg-layer" style={{ 
          backgroundImage: `url(/ram_setu_bridge.png)`,
          transform: `translate(${mousePos.x * -15}px, ${mousePos.y * -15}px) scale(1.05)`
        }}></div>
        <div className="sethu-overlay"></div>
        <div className="sethu-content" style={{ transform: `perspective(1000px) rotateX(${mousePos.y * -5}deg) rotateY(${mousePos.x * 5}deg)` }}>
          <span className="story-tag" style={{ color:"var(--green-light)", letterSpacing:"3px" }}>The Vision</span>
          <h2 className="sethu-title">The Farmer's Bridge</h2>
          <p className="sethu-desc">
            Just as the ancient Ram Setu was built stone by stone to connect two lands, <strong style={{ color:"var(--green-light)", fontWeight:600 }}>Rythu Sethu</strong> is built block by block—technology, logistics, and trust—to bridge the gap between hard-working farmers and conscious consumers.
          </p>

          <div className="interactive-gallery">
            <div className="tilt-card" style={{ transform: `perspective(1000px) rotateX(${mousePos.y * -10}deg) rotateY(${mousePos.x * 10}deg) translateZ(30px)` }}>
              <img src="/fresh_harvest_basket.png" alt="Fresh Harvest Basket" />
            </div>
            <div className="tilt-card" style={{ transform: `perspective(1000px) rotateX(${mousePos.y * -15}deg) rotateY(${mousePos.x * 15}deg) translateZ(50px)` }}>
              <img src="/ram_setu_bridge.png" alt="Ram Setu Connection" />
            </div>
            <div className="tilt-card" style={{ transform: `perspective(1000px) rotateX(${mousePos.y * -8}deg) rotateY(${mousePos.x * 8}deg) translateZ(20px)` }}>
              <img src="/digital_farmer.png" alt="Digital Farmer" />
            </div>
          </div>
        </div>
      </section>
      {/* ─── STORY SECTION (SYMBIOTIC RELATIONSHIP) ─── */}
      <section className="story-section">
        
        {/* Block 1: Farmer */}
        <div className="story-block">
          <div className="story-image-container">
            <div className="floating-badge top-left">
              🌾 +20% Revenue
            </div>
            <div className="floating-badge bottom-right">
              ⭐ Premium Quality
            </div>
            <div className="story-image-wrapper">
              <img src="/farmer_harvest.png" alt="Happy Indian Farmer" />
            </div>
          </div>
          <div className="story-content">
            <span className="story-tag">For the Farmers</span>
            <h2 className="story-title">Grow More. Earn More.</h2>
            <p className="story-desc">
              We eliminate middlemen to ensure that the people who grow our food get the respect and price they deserve. By leveraging AI, we help farmers forecast demand and grow what sells.
            </p>
            <ul className="story-features">
              <li>
                <div className="story-icon">📈</div>
                <span><strong>Predictive AI:</strong> Know exactly what to plant for the upcoming season to maximize profits.</span>
              </li>
              <li>
                <div className="story-icon">🤝</div>
                <span><strong>Direct Access:</strong> Sell directly to households, restaurants, and local businesses.</span>
              </li>
              <li>
                <div className="story-icon">💰</div>
                <span><strong>Fair Pricing:</strong> Set your own prices and keep 100% of the profits.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Block 2: Customer */}
        <div className="story-block">
          <div className="story-image-container">
            <div className="floating-badge top-left">
              🛒 Farm Fresh
            </div>
            <div className="floating-badge bottom-right">
              🌱 100% Organic
            </div>
            <div className="story-image-wrapper">
              <img src="/happy_family_meal.png" alt="Family enjoying fresh food" />
            </div>
          </div>
          <div className="story-content">
            <span className="story-tag">For the Customers</span>
            <h2 className="story-title">Fresh, Healthy, Affordable.</h2>
            <p className="story-desc">
              Bring the farm directly to your dining table. By buying straight from the source, you ensure your family gets the freshest organic produce while supporting local agriculture.
            </p>
            <ul className="story-features">
              <li>
                <div className="story-icon">🥬</div>
                <span><strong>Harvested Today:</strong> Get vegetables and fruits picked just hours before delivery.</span>
              </li>
              <li>
                <div className="story-icon">🏷️</div>
                <span><strong>Lower Prices:</strong> Without middlemen margins, fresh food becomes affordable for everyone.</span>
              </li>
              <li>
                <div className="story-icon">🔍</div>
                <span><strong>Full Transparency:</strong> Know exactly who grew your food and the soil it came from.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Block 3: The Connection */}
        <div className="story-block">
          <div className="story-image-container">
            <div className="floating-badge bottom-left">
              🤝 Symbiotic Bond
            </div>
            <div className="story-image-wrapper">
              <img src="/symbiotic_handshake.png" alt="Symbiotic connection between farmer and customer" />
            </div>
          </div>
          <div className="story-content">
            <span className="story-tag">The Connection</span>
            <h2 className="story-title">A Symbiotic Relationship.</h2>
            <p className="story-desc">
              Rythu Sethu isn't just an app; it's a movement to bring back the lost connection between the grower and the consumer. We build trust, sustainability, and community.
            </p>
            <ul className="story-features">
              <li>
                <div className="story-icon">🚚</div>
                <span><strong>Smart Logistics:</strong> Our local delivery agents ensure fast, eco-friendly transport.</span>
              </li>
              <li>
                <div className="story-icon">🌍</div>
                <span><strong>Sustainable Future:</strong> Less transportation waste, better soil health, happier families.</span>
              </li>
            </ul>
          </div>
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
