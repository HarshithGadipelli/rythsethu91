import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import { useVoiceInput } from "../../utils/useVoiceInput";
import AutoSuggestInput from "../../components/AutoSuggestInput";

const SOIL_TYPES = ["loamy", "clay", "sandy", "silt", "peat", "chalk", "other"];
const LANGUAGES = [{ v: "en", l: "English" }, { v: "te", l: "తెలుగు" }, { v: "hi", l: "हिंदी" }];

export default function Register() {
  const { login } = useAuth();
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const { listening, interim, startListening } = useVoiceInput(lang);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [locLoading, setLocLoading] = useState(false);

  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", confirmPass: "",
    role: "customer", language: "en", aadhaar: "",
    location: "", latitude: "", longitude: "",
    farmName: "", farmLocation: "", farmSize: "", soilType: "loamy", experience: "",
    address: "", pincode: "", city: "", state: "",
    adminSecret: ""
  });

  const set = (k) => (val) => {
    if (typeof val === "function") {
      setForm((f) => ({ ...f, [k]: val(f[k]) }));
    } else if (typeof val === "object" && val?.target) {
      setForm((f) => ({ ...f, [k]: val.target.value }));
    } else {
      setForm((f) => ({ ...f, [k]: val }));
    }
  };

  const speak = (field) => startListening((val) => {
    if (typeof val === "function") {
      setForm((f) => ({ ...f, [field]: val(f[field]) }));
    } else {
      setForm((f) => ({ ...f, [field]: val }));
    }
  });

  const getLocation = () => {
    if (!navigator.geolocation) { alert("Geolocation not supported"); return; }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`);
        const d = await r.json();
        setForm((f) => ({
          ...f,
          location: d.display_name || `${coords.latitude}, ${coords.longitude}`,
          latitude: coords.latitude,
          longitude: coords.longitude,
          city: d.address?.city || d.address?.town || d.address?.village || f.city,
          state: d.address?.state || f.state
        }));
      } catch { 
        setForm((f) => ({ ...f, location: `${coords.latitude}, ${coords.longitude}`, latitude: coords.latitude, longitude: coords.longitude }));
      } finally { setLocLoading(false); }
    }, () => { alert("Could not get location"); setLocLoading(false); });
  };

  const totalSteps = form.role === "farmer" ? 3 : 2;

  const handleRegister = async () => {
    setError("");
    if (!form.name || !form.email || !form.password) { setError("Name, email & password are required."); return; }
    if (form.password !== form.confirmPass) { setError("Passwords do not match."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (form.role === "admin" && !form.adminSecret) { setError("Admin access code is required."); return; }
    setLoading(true);
    try {
      const payload = { ...form };
      delete payload.confirmPass;
      const res = await API.post("/auth/register", payload);
      login(res.data.user, res.data.token);
      const role = res.data.user.role;
      if (role === "farmer") navigate("/farmer");
      else if (role === "agent") navigate("/agent");
      else if (role === "admin") navigate("/admin");
      else navigate("/marketplace");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Try again.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ width: "100%", maxWidth: "560px" }}>
        <div className="text-center mb-4">
          <span style={{ fontSize: "3.5rem", display: "block" }}>🌱</span>
          <h1 className="page-title" style={{ fontSize: "1.8rem" }}>Join {t("appName")}</h1>
        </div>

        <div className="glass-card">
          {/* Step indicator */}
          <div className="flex-between mb-3" style={{ fontSize: "0.8rem", color: "var(--green-pale)" }}>
            <span>Step {step} of {totalSteps}</span>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
                <div key={s} style={{
                  width: 28, height: 5, borderRadius: 3,
                  background: step >= s ? "var(--green-light)" : "rgba(82,183,136,0.2)"
                }} />
              ))}
            </div>
          </div>

          {error && <div className="alert alert-error mb-2">⚠️ {error}</div>}

          {/* ── STEP 1: Basic Info ── */}
          {step === 1 && (
            <>
              <h3 className="section-title">👤 Basic Information</h3>

              <AutoSuggestInput value={form.name} onChange={set("name")} onSpeak={() => speak("name")} listening={listening} interim={interim} label={t("name")} placeholder="e.g. Ravi Kumar" fieldType="name" />
              
              <div className="form-group">
                <label className="field-label">{t("email")}</label>
                <div className="input-wrapper">
                  <input className="rs-input" type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} />
                </div>
              </div>

              <div className="form-group">
                <label className="field-label">{t("phone")}</label>
                <div className="input-wrapper">
                  <input className="rs-input" type="tel" placeholder="+91 9876543210" value={form.phone} onChange={set("phone")} />
                </div>
              </div>

              <div className="form-group">
                <label className="field-label">{t("password")}</label>
                <div className="input-wrapper">
                  <input className="rs-input" type="password" placeholder="Min 6 characters" value={form.password} onChange={set("password")} />
                </div>
              </div>
              
              <div className="form-group">
                <label className="field-label">Confirm Password</label>
                <div className="input-wrapper">
                  <input className="rs-input" type="password" placeholder="Repeat password" value={form.confirmPass} onChange={set("confirmPass")} />
                </div>
              </div>

              {/* Role selector — 4 roles */}
              <div className="form-group">
                <label className="field-label">{t("role")}</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.6rem" }}>
                  {[
                    { v: "farmer", icon: "🌾", l: t("farmer") },
                    { v: "customer", icon: "🛒", l: t("customer") },
                    { v: "agent", icon: "🚚", l: "Delivery" },
                    { v: "admin", icon: "🛡️", l: "Admin" }
                  ].map((r) => (
                    <button
                      key={r.v}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, role: r.v }))}
                      style={{
                        padding: "0.75rem 0.3rem",
                        borderRadius: "var(--radius-md)",
                        border: form.role === r.v ? "2px solid var(--green-light)" : "1.5px solid rgba(82,183,136,0.25)",
                        background: form.role === r.v ? "rgba(82,183,136,0.2)" : "rgba(255,255,255,0.05)",
                        color: form.role === r.v ? "var(--cream)" : "var(--green-pale)",
                        cursor: "pointer",
                        textAlign: "center",
                        transition: "all 0.2s"
                      }}
                    >
                      <div style={{ fontSize: "1.4rem" }}>{r.icon}</div>
                      <div style={{ fontSize: "0.72rem", fontWeight: 600, marginTop: "0.25rem" }}>{r.l}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Admin secret code */}
              {form.role === "admin" && (
                <div className="form-group">
                  <label className="field-label">🔐 Admin Access Code</label>
                  <div className="input-wrapper">
                    <input className="rs-input" type="password" placeholder="Enter admin secret code" value={form.adminSecret} onChange={set("adminSecret")} />
                  </div>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                    Contact the platform administrator for the access code.
                  </p>
                </div>
              )}

              {/* Language */}
              <div className="form-group">
                <label className="field-label">{t("languagePref")}</label>
                <select className="rs-select" value={form.language} onChange={set("language")}>
                  {LANGUAGES.map(l => <option key={l.v} value={l.v}>{l.l}</option>)}
                </select>
              </div>

              <button className="btn-primary" onClick={() => setStep(2)}>Next →</button>
            </>
          )}

          {/* ── STEP 2: Location & Identity ── */}
          {step === 2 && (
            <>
              <h3 className="section-title">📍 Location & Identity</h3>

              <div className="form-group">
                <label className="field-label">{t("location")}</label>
                <div style={{ display: "flex", gap: "0.6rem" }}>
                  <div className="input-wrapper" style={{ flex: 1 }}>
                    <input className="rs-input" placeholder="Village / Town / City" value={form.location} onChange={set("location")} />
                    <button type="button" className={`mic-btn ${listening ? "active" : ""}`} onClick={() => speak("location")}>🎤</button>
                  </div>
                  <button type="button" className="btn-icon" onClick={getLocation} disabled={locLoading} title="Auto-detect">
                    {locLoading ? "⏳" : "📍"}
                  </button>
                </div>
                {form.latitude && (
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
                    ✅ {form.location.substring(0, 60)}...
                  </p>
                )}
              </div>

              <AutoSuggestInput value={form.address} onChange={set("address")} onSpeak={() => speak("address")} listening={listening} interim={interim} label={t("address")} placeholder="Full address" />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <AutoSuggestInput value={form.pincode} onChange={set("pincode")} onSpeak={() => speak("pincode")} listening={listening} interim={interim} label="Pincode" placeholder="500001" />
                <AutoSuggestInput value={form.city} onChange={set("city")} onSpeak={() => speak("city")} listening={listening} interim={interim} label="City" placeholder="City" fieldType="city" />
              </div>

              <AutoSuggestInput value={form.state} onChange={set("state")} onSpeak={() => speak("state")} listening={listening} interim={interim} label="State" placeholder="State" fieldType="state" />

              <AutoSuggestInput value={form.aadhaar} onChange={set("aadhaar")} onSpeak={() => speak("aadhaar")} listening={listening} interim={interim} label={t("aadhaar")} placeholder="XXXX-XXXX-XXXX" />

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button className="btn-secondary" onClick={() => setStep(1)}>← Back</button>
                {form.role !== "farmer"
                  ? <button className="btn-primary" onClick={handleRegister} disabled={loading}>
                      {loading ? t("loading") : `✅ ${t("register")}`}
                    </button>
                  : <button className="btn-primary" onClick={() => setStep(3)}>Next →</button>
                }
              </div>
            </>
          )}

          {/* ── STEP 3: Farmer Details ── */}
          {step === 3 && form.role === "farmer" && (
            <>
              <h3 className="section-title">🌾 Farm Details</h3>

              <AutoSuggestInput value={form.farmName} onChange={set("farmName")} onSpeak={() => speak("farmName")} listening={listening} interim={interim} label={t("farmName")} placeholder="e.g. Sri Rama Farms" />
              
              <div className="form-group">
                <label className="field-label">Farm Location</label>
                <div style={{ display: "flex", gap: "0.6rem" }}>
                  <div className="input-wrapper" style={{ flex: 1 }}>
                    <input className="rs-input" placeholder="Village / District" value={form.farmLocation} onChange={set("farmLocation")} />
                    <button type="button" className={`mic-btn ${listening ? "active" : ""}`} onClick={() => speak("farmLocation")}>🎤</button>
                  </div>
                  <button type="button" className="btn-icon" onClick={() => {
                    if (!navigator.geolocation) { alert("Geolocation not supported"); return; }
                    setLocLoading(true);
                    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
                      try {
                        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`);
                        const d = await r.json();
                        setForm((f) => ({ ...f, farmLocation: d.display_name || `${coords.latitude}, ${coords.longitude}` }));
                      } catch { 
                        setForm((f) => ({ ...f, farmLocation: `${coords.latitude}, ${coords.longitude}` }));
                      } finally { setLocLoading(false); }
                    }, () => { alert("Could not get location"); setLocLoading(false); });
                  }} disabled={locLoading} title="Auto-detect">
                    {locLoading ? "⏳" : "📍"}
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group">
                  <label className="field-label">{t("farmSize")} (acres)</label>
                  <div className="input-wrapper">
                    <input className="rs-input" type="number" placeholder="e.g. 5" value={form.farmSize} onChange={set("farmSize")} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="field-label">{t("experience")} (years)</label>
                  <div className="input-wrapper">
                    <input className="rs-input" type="number" placeholder="Years" value={form.experience} onChange={set("experience")} />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="field-label">{t("soilType")}</label>
                <select className="rs-select" value={form.soilType} onChange={set("soilType")}>
                  {SOIL_TYPES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>

              {/* Verification notice */}
              <div className="alert alert-info" style={{ marginTop: "1rem" }}>
                ℹ️ Your account will be reviewed by our admin team before you can list crops on the marketplace. This ensures trust and quality.
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                <button className="btn-secondary" onClick={() => setStep(2)}>← Back</button>
                <button className="btn-primary" onClick={handleRegister} disabled={loading}>
                  {loading ? t("loading") : `🌾 ${t("register")}`}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center mt-3" style={{ fontSize: "0.85rem", color: "var(--green-pale)" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--yellow-wheat)", fontWeight: 600, textDecoration: "none" }}>
            {t("login")} →
          </Link>
        </p>
      </div>
    </div>
  );
}