import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import { useVoiceInput } from "../../utils/useVoiceInput";

export default function Login() {
  const { login } = useAuth();
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const { listening, activeField, interim, startListening } = useVoiceInput(lang);

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleVoice = (field) => {
    startListening((val) => {
      if (typeof val === "function") {
        setForm((f) => ({ ...f, [field]: val(f[field]) }));
      } else {
        setForm((f) => ({ ...f, [field]: val }));
      }
    }, { fieldId: field });
  };

  const handleLogin = async () => {
    setError("");
    if (!form.email || !form.password) { setError("Please fill all fields."); return; }
    setLoading(true);
    try {
      const res = await API.post("/auth/login", form);
      login(res.data.user, res.data.token);
      // Redirect by role
      const role = res.data.user.role;
      if (role === "farmer") navigate("/farmer");
      else if (role === "agent") navigate("/agent");
      else if (role === "admin") navigate("/admin");
      else navigate("/marketplace");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ width: "100%", maxWidth: "440px" }}>
        {/* Logo */}
        <div className="text-center mb-4">
          <span style={{ fontSize: "4rem", display: "block", animation: "floatUp 3s ease infinite" }}>🌾</span>
          <h1 className="page-title" style={{ fontSize: "2rem" }}>{t("appName")}</h1>
          <p style={{ color: "var(--green-pale)", fontSize: "0.9rem", marginTop: "0.4rem" }}>{t("tagline")}</p>
        </div>

        <div className="glass-card">
          <h2 style={{ color: "var(--cream)", fontSize: "1.4rem", fontWeight: 700, marginBottom: "1.5rem" }}>
            {t("login")} 👋
          </h2>

          {error && <div className="alert alert-error mb-2">⚠️ {error}</div>}

          {/* Email */}
          <div className="form-group">
            <label className="field-label">{t("email")}</label>
            <div className="input-wrapper">
              <input
                className="rs-input"
                type="email"
                placeholder="you@example.com"
                value={listening && activeField === "email" && interim ? `${form.email} ${interim}...` : form.email}
                onChange={set("email")}
                autoComplete="email"
                style={listening && activeField === "email" && interim ? { color: "rgba(183,228,199,0.7)", fontStyle: "italic" } : {}}
              />
              <button
                type="button"
                className={`mic-btn ${listening && activeField === "email" ? "active" : ""}`}
                onClick={() => handleVoice("email")}
                title="Speak email"
              >🎤</button>
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="field-label">{t("password")}</label>
            <div className="input-wrapper">
              <input
                className="rs-input"
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={form.password}
                onChange={set("password")}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="mic-btn"
                onClick={() => setShowPass((s) => !s)}
                title="Toggle password"
              >{showPass ? "🙈" : "👁️"}</button>
            </div>
          </div>

          <button className="btn-primary mt-2" onClick={handleLogin} disabled={loading}>
            {loading ? <><span className="loader" style={{ width: 18, height: 18, borderWidth: 2 }}></span> {t("loading")}</> : `🚀 ${t("login")}`}
          </button>

          <div className="section-divider mt-3">
            <hr /><span>or</span><hr />
          </div>

          <p className="text-center mt-2" style={{ fontSize: "0.88rem", color: "var(--green-pale)" }}>
            New to Rythu Sethu?{" "}
            <Link to="/register" style={{ color: "var(--yellow-wheat)", fontWeight: 600, textDecoration: "none" }}>
              {t("register")} →
            </Link>
          </p>
        </div>

        {/* Demo credentials hint */}
        <div className="glass-card mt-3" style={{ padding: "1rem", opacity: 0.8 }}>
          <p style={{ fontSize: "0.75rem", color: "var(--green-pale)", textAlign: "center" }}>
            🧪 Test: farmer@test.com / customer@test.com / agent@test.com (pass: <code style={{ color: "var(--yellow-wheat)" }}>test123</code>)
          </p>
        </div>
      </div>
    </div>
  );
}