import { useState, useEffect } from "react";
import { useLang } from "../../context/LangContext";
import { useAuth } from "../../context/AuthContext";
import { useVoiceInput } from "../../utils/useVoiceInput";
import API from "../../api/api";
import { io } from "socket.io-client";

const CATEGORIES = ["vegetable","fruit","grain","pulse","spice","dairy","other"];
const SEASONS    = ["kharif","rabi","zaid","perennial"];
const SOILS      = ["loamy","clay","sandy","silt","peat","chalk","other"];

export default function FarmerDashboard() {
  const { t, lang } = useLang();
  const { user }    = useAuth();
  const { listening, startListening } = useVoiceInput(lang);

  const [tab, setTab]   = useState("crops");      // crops | add | ml | tips
  const [crops, setCrops]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]   = useState({ type: "", text: "" });
  const [locLoading, setLocLoading] = useState(false);
  const [mlLoading, setMlLoading]   = useState(false);
  const [mlResult, setMlResult]     = useState(null);
  const [tipsResult, setTipsResult] = useState(null);

  const [form, setForm] = useState({
    name:"", description:"", category:"vegetable", price:"", quantity:"",
    unit:"kg", season:"kharif", isOrganic: false,
    location:"", latitude:"", longitude:"",
    harvestDate:"", image: null,
  });

  const [weather, setWeather] = useState({ temp:"28", hum:"65", rain:"80" });
  const [tipsForm, setTipsForm] = useState({ crop:"", soil:"loamy" });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target?.value ?? e }));
  const setW = (k) => (e) => setWeather((w) => ({ ...w, [k]: e.target.value }));
  const speak = (field) => startListening((txt) => setForm((f) => ({ ...f, [field]: txt })));

  useEffect(() => { 
    fetchCrops(); 
    
    const socket = io("http://localhost:5000");
    socket.on("order_created", () => fetchCrops());
    
    return () => socket.disconnect();
  }, []);

  const fetchCrops = async () => {
    try {
      const res = await API.get("/crops");
      const mine = res.data.filter(c => c.farmer?._id === user?._id || c.farmer === user?._id);
      setCrops(mine);
    } catch {}
  };

  const getLocation = () => {
    if (!navigator.geolocation) { alert("Geolocation not supported"); return; }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`);
        const d = await r.json();
        setForm((f) => ({
          ...f,
          location: d.display_name || `${coords.latitude},${coords.longitude}`,
          latitude: coords.latitude,
          longitude: coords.longitude
        }));
      } catch {
        setForm((f) => ({ ...f, latitude: coords.latitude, longitude: coords.longitude }));
      } finally { setLocLoading(false); }
    }, () => { alert("Cannot get location"); setLocLoading(false); });
  };

  const handleAddCrop = async () => {
    if (!form.name || !form.price || !form.quantity) { setMsg({ type:"error", text:"Name, price & quantity required." }); return; }
    setLoading(true); setMsg({ type:"", text:"" });
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => { if (k !== "image" && v !== "") fd.append(k, v); });
      if (user?._id) fd.append("farmer", user._id);
      if (form.image) fd.append("image", form.image);
      await API.post("/crops/add", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setMsg({ type:"success", text:"✅ Crop listed successfully!" });
      setForm({ name:"", description:"", category:"vegetable", price:"", quantity:"", unit:"kg", season:"kharif", isOrganic:false, location:"", latitude:"", longitude:"", harvestDate:"", image:null });
      fetchCrops();
      setTab("crops");
    } catch (err) {
      setMsg({ type:"error", text: err.response?.data?.error || "Failed to add crop." });
    } finally { setLoading(false); }
  };

  const deleteCrop = async (id) => {
    if (!confirm("Remove this crop from marketplace?")) return;
    try { await API.delete(`/crops/${id}`); fetchCrops(); } catch {}
  };

  const runCropSuggest = async () => {
    setMlLoading(true); setMlResult(null);
    try {
      const res = await API.post("/ml/crop-suggest", { temp: weather.temp, hum: weather.hum, rain: weather.rain });
      setMlResult(res.data);
    } catch { setMlResult({ error: "ML service unavailable" }); }
    finally { setMlLoading(false); }
  };

  const runFarmerTips = async () => {
    setMlLoading(true); setTipsResult(null);
    try {
      const res = await API.post("/ml/farmer-suggest", { crop: tipsForm.crop, soil: tipsForm.soil });
      setTipsResult(res.data);
    } catch { setTipsResult({ error: "ML service unavailable" }); }
    finally { setMlLoading(false); }
  };

  const statusColor = (qty) => qty > 20 ? "badge-green" : qty > 5 ? "badge-yellow" : "badge-red";

  return (
    <div className="page-wrapper">
      <div className="flex-between mb-3">
        <div>
          <h1 className="page-title" style={{ textAlign:"left", fontSize:"1.8rem" }}>
            🌾 {t("welcome")}, {user?.name?.split(" ")[0] || "Farmer"}
          </h1>
          <p style={{ color:"var(--green-pale)", fontSize:"0.85rem" }}>Manage your crops & get AI-powered insights</p>
        </div>
        <button className="btn-primary" style={{ width:"auto" }} onClick={() => setTab("add")}>
          + {t("addCrop")}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid-4 mb-3">
        {[
          { icon:"🌱", label:"My Crops", value: crops.length },
          { icon:"✅", label:"Available", value: crops.filter(c=>c.isAvailable).length },
          { icon:"📦", label:"Total Stock", value: `${crops.reduce((a,c)=>a+(c.quantity||0),0)} kg` },
          { icon:"💰", label:"Avg Price", value: crops.length ? `₹${Math.round(crops.reduce((a,c)=>a+(c.price||0),0)/crops.length)}` : "₹0" }
        ].map((s,i) => (
          <div className="stat-card" key={i}>
            <span className="stat-icon">{s.icon}</span>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {[
          { k:"crops", l:"🌿 My Crops" },
          { k:"add",   l:`➕ ${t("addCrop")}` },
          { k:"ml",    l:"🤖 AI Suggestions" },
          { k:"tips",  l:"💡 Farming Tips" }
        ].map(tb => (
          <button key={tb.k} className={`tab-btn ${tab===tb.k?"active":""}`} onClick={() => setTab(tb.k)}>
            {tb.l}
          </button>
        ))}
      </div>

      {/* ── MY CROPS TAB ── */}
      {tab === "crops" && (
        <div>
          {crops.length === 0 ? (
            <div className="glass-card text-center" style={{ padding:"3rem" }}>
              <p style={{ fontSize:"3rem" }}>🌱</p>
              <p style={{ color:"var(--green-pale)", marginTop:"1rem" }}>No crops listed yet. Add your first crop!</p>
              <button className="btn-primary mt-2" style={{ width:"auto" }} onClick={() => setTab("add")}>+ Add Crop</button>
            </div>
          ) : (
            <div className="grid-auto">
              {crops.map(c => (
                <div className="crop-card" key={c._id}>
                  {c.image
                    ? <img src={`http://localhost:5000${c.image}`} alt={c.name} />
                    : <div style={{ height:160, background:"linear-gradient(135deg,#1a4a2e,#2d7a4f)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"3rem" }}>🌿</div>
                  }
                  <div className="crop-card-body">
                    <div className="flex-between">
                      <h3>{c.name}</h3>
                      {c.isOrganic && <span className="organic-tag">🌿 Organic</span>}
                    </div>
                    <div className="crop-price">₹{c.price}/{c.unit||"kg"}</div>
                    <div className="crop-qty">
                      <span className={`badge ${statusColor(c.quantity)}`}>
                        {c.quantity} {c.unit||"kg"} available
                      </span>
                    </div>
                    {c.location && <p style={{ fontSize:"0.75rem", color:"var(--text-muted)", marginBottom:"0.75rem" }}>📍 {c.location.substring(0,40)}...</p>}
                    <button className="btn-danger" style={{ width:"100%", padding:"0.5rem" }} onClick={() => deleteCrop(c._id)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ADD CROP TAB ── */}
      {tab === "add" && (
        <div className="glass-card" style={{ maxWidth:680, margin:"0 auto" }}>
          <h3 className="section-title">🌿 {t("addCrop")}</h3>
          {msg.text && <div className={`alert alert-${msg.type} mb-2`}>{msg.text}</div>}

          <div className="grid-2">
            <div className="form-group">
              <label className="field-label">{t("cropName")} *</label>
              <div className="input-wrapper">
                <input className="rs-input" placeholder="e.g. Tomato, Rice..." value={form.name} onChange={set("name")} />
                <button type="button" className={`mic-btn ${listening?"active":""}`} onClick={() => speak("name")}>🎤</button>
              </div>
            </div>
            <div className="form-group">
              <label className="field-label">{t("category")}</label>
              <select className="rs-select" value={form.category} onChange={set("category")}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="field-label">{t("description")}</label>
            <div className="input-wrapper">
              <input className="rs-input" placeholder="Brief description of quality, freshness..." value={form.description} onChange={set("description")} />
              <button type="button" className={`mic-btn ${listening?"active":""}`} onClick={() => speak("description")}>🎤</button>
            </div>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="field-label">{t("price")} *</label>
              <div className="input-wrapper">
                <input className="rs-input" type="number" placeholder="0" value={form.price} onChange={set("price")} />
                <button type="button" className={`mic-btn ${listening?"active":""}`} onClick={() => speak("price")}>🎤</button>
              </div>
            </div>
            <div className="form-group">
              <label className="field-label">{t("quantity")} *</label>
              <div className="input-wrapper">
                <input className="rs-input" type="number" placeholder="0" value={form.quantity} onChange={set("quantity")} />
                <button type="button" className={`mic-btn ${listening?"active":""}`} onClick={() => speak("quantity")}>🎤</button>
              </div>
            </div>
            <div className="form-group">
              <label className="field-label">Unit</label>
              <select className="rs-select" value={form.unit} onChange={set("unit")}>
                {["kg","g","litre","piece","dozen"].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="field-label">{t("season")}</label>
              <select className="rs-select" value={form.season} onChange={set("season")}>
                {SEASONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="field-label">Harvest Date</label>
              <input className="rs-input" type="date" value={form.harvestDate} onChange={set("harvestDate")} />
            </div>
          </div>

          {/* Location */}
          <div className="form-group">
            <label className="field-label">{t("location")}</label>
            <div style={{ display:"flex", gap:"0.6rem" }}>
              <div className="input-wrapper" style={{ flex:1 }}>
                <input className="rs-input" placeholder="Farm location" value={form.location} onChange={set("location")} />
                <button type="button" className={`mic-btn ${listening?"active":""}`} onClick={() => speak("location")}>🎤</button>
              </div>
              <button type="button" className="btn-icon" onClick={getLocation} disabled={locLoading} title="Auto-detect location">
                {locLoading ? "⏳" : "📍"}
              </button>
            </div>
            {form.latitude && <p style={{ fontSize:"0.72rem", color:"var(--green-light)", marginTop:"0.3rem" }}>✅ Location captured</p>}
          </div>

          {/* Organic toggle */}
          <div className="toggle-row">
            <span className="toggle-label">🌿 {t("organic")}?</span>
            <label style={{ display:"flex", alignItems:"center", gap:"0.5rem", cursor:"pointer" }}>
              <input type="checkbox" checked={form.isOrganic} onChange={(e) => setForm(f=>({...f,isOrganic:e.target.checked}))} style={{ width:18,height:18 }} />
              <span style={{ color:"var(--green-pale)", fontSize:"0.85rem" }}>{form.isOrganic ? "Yes, certified organic" : "No"}</span>
            </label>
          </div>

          {/* Image Upload */}
          <div className="form-group mt-2">
            <label className="field-label">Crop Image</label>
            <label className="file-upload-area">
              <input type="file" accept="image/*" onChange={(e) => setForm(f=>({...f,image:e.target.files[0]}))} />
              <span className="file-upload-icon">📷</span>
              <p className="file-upload-text">
                {form.image ? `✅ ${form.image.name}` : "Click to upload crop photo (JPG/PNG)"}
              </p>
            </label>
          </div>

          <button className="btn-primary mt-2" onClick={handleAddCrop} disabled={loading}>
            {loading ? t("loading") : `🌾 List on Marketplace`}
          </button>
        </div>
      )}

      {/* ── ML SUGGESTIONS TAB ── */}
      {tab === "ml" && (
        <div>
          <div className="grid-2">
            <div className="ml-card">
              <h3 className="section-title">🌤️ {t("cropSuggest")}</h3>
              <p style={{ color:"var(--green-pale)", fontSize:"0.82rem", marginBottom:"1rem" }}>
                Enter today's weather data and get AI-powered crop recommendations.
              </p>
              <div className="grid-3" style={{ gap:"0.75rem" }}>
                {[
                  { k:"temp", l:t("temperature"), pl:"28" },
                  { k:"hum",  l:t("humidity"),    pl:"65" },
                  { k:"rain", l:t("rainfall"),     pl:"80" }
                ].map(f => (
                  <div key={f.k} className="form-group">
                    <label className="field-label">{f.l}</label>
                    <div className="input-wrapper">
                      <input className="rs-input" type="number" placeholder={f.pl} value={weather[f.k]} onChange={setW(f.k)} />
                      <button type="button" className={`mic-btn ${listening?"active":""}`} onClick={() => startListening(txt => setWeather(w=>({...w,[f.k]:txt})))}>🎤</button>
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn-primary mt-2" onClick={runCropSuggest} disabled={mlLoading}>
                {mlLoading ? t("loading") : `🤖 ${t("analyze")}`}
              </button>
              {mlResult && !mlResult.error && (
                <div className="ml-result">
                  <p>🌾 <strong style={{ color:"var(--yellow-wheat)" }}>Recommended:</strong> {mlResult.recommended_crop}</p>
                  <p>📊 Confidence: {mlResult.confidence}%</p>
                  <p>🔄 Alternatives: {mlResult.alternatives?.join(", ")}</p>
                </div>
              )}
              {mlResult?.error && <div className="alert alert-error mt-2">⚠️ {mlResult.error}</div>}
            </div>

            <div className="ml-card">
              <h3 className="section-title">📊 {t("demandForecast")}</h3>
              <p style={{ color:"var(--green-pale)", fontSize:"0.82rem", marginBottom:"1rem" }}>
                Discover which crops are in highest demand this season.
              </p>
              <DemandPanel />
            </div>
          </div>
        </div>
      )}

      {/* ── FARMING TIPS TAB ── */}
      {tab === "tips" && (
        <div className="ml-card">
          <h3 className="section-title">💡 {t("farmerTips")}</h3>
          <p style={{ color:"var(--green-pale)", fontSize:"0.82rem", marginBottom:"1rem" }}>
            Get personalized farming advice based on your crop and soil type.
          </p>
          <div className="grid-2">
            <div>
              <label className="field-label">Crop Name</label>
              <div className="input-wrapper">
                <input className="rs-input" placeholder="e.g. Rice, Wheat..." value={tipsForm.crop}
                  onChange={(e) => setTipsForm(f=>({...f,crop:e.target.value}))} />
                <button type="button" className={`mic-btn ${listening?"active":""}`}
                  onClick={() => startListening(txt => setTipsForm(f=>({...f,crop:txt})))}>🎤</button>
              </div>
            </div>
            <div>
              <label className="field-label">{t("soilType")}</label>
              <select className="rs-select" value={tipsForm.soil} onChange={(e) => setTipsForm(f=>({...f,soil:e.target.value}))}>
                {SOILS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <button className="btn-primary mt-2" onClick={runFarmerTips} disabled={mlLoading || !tipsForm.crop} style={{ maxWidth:200 }}>
            {mlLoading ? t("loading") : "💡 Get Tips"}
          </button>
          {tipsResult && !tipsResult.error && (
            <div className="ml-result mt-2">
              <p><strong style={{ color:"var(--yellow-wheat)" }}>Crop:</strong> {tipsResult.crop} | <strong style={{ color:"var(--yellow-wheat)" }}>Soil:</strong> {tipsResult.soil_type}</p>
              <ul style={{ marginTop:"0.75rem", paddingLeft:"1.25rem" }}>
                {tipsResult.suggestions?.map((s,i) => (
                  <li key={i} style={{ color:"var(--cream)", fontSize:"0.88rem", marginBottom:"0.4rem" }}>✅ {s}</li>
                ))}
              </ul>
            </div>
          )}
          {tipsResult?.error && <div className="alert alert-error mt-2">⚠️ {tipsResult.error}</div>}
        </div>
      )}
    </div>
  );
}

function DemandPanel() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const currentMonth = months[new Date().getMonth()];
  const [month, setMonth] = useState(currentMonth);

  const run = async () => {
    setLoading(true);
    try {
      const res = await API.post("/ml/demand-predict", { month });
      setResult(res.data);
    } catch { setResult(null); }
    finally { setLoading(false); }
  };

  return (
    <>
      <div className="form-group">
        <label className="field-label">Month</label>
        <select className="rs-select" value={month} onChange={(e) => setMonth(e.target.value)}>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <button className="btn-primary" onClick={run} disabled={loading}>
        {loading ? "Analyzing..." : "🔍 Predict Demand"}
      </button>
      {Array.isArray(result) && (
        <div className="ml-result">
          {result.map((r,i) => (
            <div key={i} style={{ marginBottom:"0.75rem", paddingBottom:"0.75rem", borderBottom: i < result.length-1 ? "1px solid rgba(82,183,136,0.15)" : "none" }}>
              <p><strong style={{ color:"var(--yellow-wheat)" }}>#{i+1} {r.product}</strong> <span className={`badge ${r.trend==="Upward"?"badge-green":"badge-blue"}`}>{r.trend}</span></p>
              <p style={{ fontSize:"0.8rem", marginTop:"0.2rem" }}>Score: {r.demand_score}/10 | Season: {r.season}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}