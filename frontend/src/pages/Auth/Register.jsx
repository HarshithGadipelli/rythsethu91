import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import { useVoiceInput } from "../../utils/useVoiceInput";

const SOIL_TYPES = ["loamy", "clay", "sandy", "silt", "peat", "chalk", "other"];
const LANGUAGES = [{ v: "en", l: "English" }, { v: "te", l: "తెలుగు" }, { v: "hi", l: "हिंदी" }];

const VoiceInput = ({ value, onChange, onSpeak, listening, placeholder, type = "text", label }) => (
  <div className="form-group">
    <label className="field-label">{label}</label>
    <div className="input-wrapper">
      <input className="rs-input" type={type} placeholder={placeholder} value={value} onChange={onChange} />
      <button type="button" className={`mic-btn ${listening ? "active" : ""}`} onClick={onSpeak} title="Speak">🎤</button>
    </div>
  </div>
);

export default function Register() {
  const { login } = useAuth();
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const { listening, startListening } = useVoiceInput(lang);

  const [step, setStep] = useState(1); // multi-step form
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [locLoading, setLocLoading] = useState(false);

  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", confirmPass: "",
    role: "customer", language: "en", aadhaar: "",
    // Location
    location: "", latitude: "", longitude: "",
    // Farmer extras
    farmName: "", farmLocation: "", farmSize: "", soilType: "loamy", experience: "",
    // Customer extras
    address: "", pincode: "", city: "", state: "",
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: typeof e === "string" ? e : e.target.value }));

  const speak = (field) => startListening((text) => setForm((f) => ({ ...f, [field]: text })));

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
          city: d.address?.city || d.address?.town || d.address?.village || "",
          state: d.address?.state || ""
        }));
      } catch { 
        setForm((f) => ({ ...f, location: `${coords.latitude}, ${coords.longitude}`, latitude: coords.latitude, longitude: coords.longitude }));
      } finally { setLocLoading(false); }
    }, () => { alert("Could not get location"); setLocLoading(false); });
  };

  const handleRegister = async () => {
    setError("");
    if (!form.name || !form.email || !form.password) { setError("Name, email & password are required."); return; }
    if (form.password !== form.confirmPass) { setError("Passwords do not match."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      const payload = { ...form };
      delete payload.confirmPass;
      const res = await API.post("/auth/register", payload);
      login(res.data.user, res.data.token);
      const role = res.data.user.role;
      if (role === "farmer") navigate("/farmer");
      else if (role === "agent") navigate("/agent");
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
            <span>Step {step} of {form.role === "customer" ? 2 : 3}</span>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {[1, 2, ...(form.role !== "customer" ? [3] : [])].map(s => (
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

              <VoiceInput value={form.name} onChange={set("name")} onSpeak={() => speak("name")} listening={listening} label={t("name")} placeholder="e.g. Ravi Kumar" />
              <VoiceInput value={form.email} onChange={set("email")} onSpeak={() => speak("email")} listening={listening} label={t("email")} type="email" placeholder="you@example.com" />
              <VoiceInput value={form.phone} onChange={set("phone")} onSpeak={() => speak("phone")} listening={listening} label={t("phone")} type="tel" placeholder="+91 9876543210" />

              <VoiceInput value={form.password} onChange={set("password")} onSpeak={() => speak("password")} listening={listening} label={t("password")} type="password" placeholder="Min 6 characters" />
              <VoiceInput value={form.confirmPass} onChange={set("confirmPass")} onSpeak={() => speak("confirmPass")} listening={listening} label="Confirm Password" type="password" placeholder="Repeat password" />

              {/* Role selector */}
              <div className="form-group">
                <label className="field-label">{t("role")}</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
                  {[
                    { v: "farmer", icon: "🌾", l: t("farmer") },
                    { v: "customer", icon: "🛒", l: t("customer") },
                    { v: "agent", icon: "🚚", l: t("agent") }
                  ].map((r) => (
                    <button
                      key={r.v}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, role: r.v }))}
                      style={{
                        padding: "0.85rem 0.5rem",
                        borderRadius: "var(--radius-md)",
                        border: form.role === r.v ? "2px solid var(--green-light)" : "1.5px solid rgba(82,183,136,0.25)",
                        background: form.role === r.v ? "rgba(82,183,136,0.2)" : "rgba(255,255,255,0.05)",
                        color: form.role === r.v ? "var(--cream)" : "var(--green-pale)",
                        cursor: "pointer",
                        textAlign: "center",
                        transition: "all 0.2s"
                      }}
                    >
                      <div style={{ fontSize: "1.5rem" }}>{r.icon}</div>
                      <div style={{ fontSize: "0.8rem", fontWeight: 600, marginTop: "0.3rem" }}>{r.l}</div>
                    </button>
                  ))}
                </div>
              </div>

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

              <VoiceInput value={form.address} onChange={set("address")} onSpeak={() => speak("address")} listening={listening} label={t("address")} placeholder="Full address" />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <VoiceInput value={form.pincode} onChange={set("pincode")} onSpeak={() => speak("pincode")} listening={listening} label="Pincode" placeholder="500001" />
                <VoiceInput value={form.city} onChange={set("city")} onSpeak={() => speak("city")} listening={listening} label="City" placeholder="City" />
              </div>

              <VoiceInput value={form.aadhaar} onChange={set("aadhaar")} onSpeak={() => speak("aadhaar")} listening={listening} label={t("aadhaar")} placeholder="XXXX-XXXX-XXXX" />

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button className="btn-secondary" onClick={() => setStep(1)}>← Back</button>
                {form.role === "customer" || form.role === "agent"
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

              <VoiceInput value={form.farmName} onChange={set("farmName")} onSpeak={() => speak("farmName")} listening={listening} label={t("farmName")} placeholder="e.g. Sri Rama Farms" />
              
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
                <VoiceInput value={form.farmSize} onChange={set("farmSize")} onSpeak={() => speak("farmSize")} listening={listening} label={t("farmSize")} type="number" placeholder="e.g. 5" />
                <VoiceInput value={form.experience} onChange={set("experience")} onSpeak={() => speak("experience")} listening={listening} label={t("experience")} type="number" placeholder="Years" />
              </div>

              <div className="form-group">
                <label className="field-label">{t("soilType")}</label>
                <select className="rs-select" value={form.soilType} onChange={set("soilType")}>
                  {SOIL_TYPES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>

              <div style={{ display: "flex", gap: "0.75rem" }}>
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