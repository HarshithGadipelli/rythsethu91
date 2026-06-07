import { useState, useEffect } from "react";
import { useLang } from "../../context/LangContext";
import { useAuth } from "../../context/AuthContext";
import { useVoiceInput } from "../../utils/useVoiceInput";
import AutoSuggestInput from "../../components/AutoSuggestInput";
import API from "../../api/api";
import { io } from "socket.io-client";

const CATEGORIES = ["vegetable","fruit","grain","pulse","spice","dairy","other"];
const SEASONS    = ["kharif","rabi","zaid","perennial"];
const SOILS      = ["loamy","clay","sandy","silt","peat","chalk","other"];

const parseVoiceToForm = (text) => {
  const lower = text.toLowerCase();
  const updates = {};
  
  const commonCrops = ["tomato", "potato", "onion", "rice", "wheat", "cotton", "apple", "mango", "banana", "chili", "garlic", "ginger", "cabbage", "cauliflower", "carrot", "brinjal", "spinach", "pulses", "sugarcane"];
  for (let crop of commonCrops) {
    if (lower.includes(crop)) {
      updates.name = crop.charAt(0).toUpperCase() + crop.slice(1);
      if (["apple", "mango", "banana"].includes(crop)) updates.category = "fruit";
      else if (["rice", "wheat"].includes(crop)) updates.category = "grain";
      else if (["cotton", "sugarcane"].includes(crop)) updates.category = "other";
      else if (["chili", "garlic", "ginger"].includes(crop)) updates.category = "spice";
      else if (["pulses"].includes(crop)) updates.category = "pulse";
      else updates.category = "vegetable";
      break;
    }
  }

  const categories = ["vegetable","fruit","grain","pulse","spice","dairy","other"];
  for (let c of categories) {
    if (lower.includes(c)) updates.category = c;
  }
  
  const priceMatch = lower.match(/(?:rs\.?|rupees|price|₹)\s*(\d+)/) || lower.match(/(\d+)\s*(?:rs\.?|rupees|₹|\/kg|per kg)/);
  if (priceMatch) updates.price = priceMatch[1];

  const qtyMatch = lower.match(/(\d+)\s*(kg|kilos|g|grams|litre|liters|piece|pieces|dozen|ton|tons)/);
  if (qtyMatch) {
    let q = parseInt(qtyMatch[1]);
    let u = qtyMatch[2];
    if (u === "ton" || u === "tons") { q *= 1000; u = "kg"; }
    else if (u === "kilos") u = "kg";
    else if (u === "grams") u = "g";
    else if (u === "liters") u = "litre";
    else if (u === "pieces") u = "piece";
    updates.quantity = q;
    updates.unit = u;
  }

  const seasons = ["kharif", "rabi", "zaid", "perennial"];
  for (let s of seasons) {
    if (lower.includes(s)) updates.season = s;
  }

  if (lower.includes("organic") || lower.includes("natural")) {
    updates.isOrganic = true;
  }

  const locMatch = lower.match(/(?:in|from|at)\s+([a-zA-Z]+)/);
  if (locMatch) {
    const loc = locMatch[1];
    if (!commonCrops.includes(loc) && !seasons.includes(loc) && loc !== "organic") {
      updates.location = loc.charAt(0).toUpperCase() + loc.slice(1);
    }
  }

  return updates;
};

export default function FarmerDashboard() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const { listening, interim, startListening } = useVoiceInput(lang);

  const [tab, setTab] = useState("crops");
  const [crops, setCrops] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [locLoading, setLocLoading] = useState(false);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlResult, setMlResult] = useState(null);
  const [tipsResult, setTipsResult] = useState(null);

  const [form, setForm] = useState({
    name:"", description:"", category:"vegetable", price:"", quantity:"",
    unit:"kg", season:"kharif", isOrganic: false,
    location:"", latitude:"", longitude:"",
    harvestDate:"", image: null,
  });

  const [weather, setWeather] = useState({ temp:"28", hum:"65", rain:"80" });
  const [tipsForm, setTipsForm] = useState({ crop:"", soil:"loamy" });

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

  useEffect(() => { 
    fetchCrops();
    fetchOrders();
    const socket = io("http://localhost:5000");
    socket.on("order_created", () => { fetchCrops(); fetchOrders(); });
    socket.on("farmer_verified", () => window.location.reload());
    return () => socket.disconnect();
  }, []);

  const fetchCrops = async () => {
    try {
      const res = await API.get("/crops");
      const mine = res.data.filter(c => c.farmer?._id === user?._id || c.farmer === user?._id);
      setCrops(mine);
    } catch {}
  };

  const fetchOrders = async () => {
    try {
      const res = await API.get(`/orders/farmer/${user?._id}`);
      setOrders(res.data);
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
          latitude: coords.latitude, longitude: coords.longitude
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

  const isVerified = user?.isVerified;
  const totalRevenue = orders.reduce((a, o) => a + (o.subtotal || o.totalAmount || 0), 0);

  return (
    <div className="page-wrapper">
      {/* Verification Banner */}
      {!isVerified && (
        <div className="verification-banner pending">
          <span style={{ fontSize:"1.5rem" }}>⏳</span>
          <div>
            <strong>Account Pending Verification</strong>
            <p style={{ fontSize:"0.82rem", opacity:0.85, marginTop:"0.2rem" }}>
              Our admin team is reviewing your account. You'll be able to list crops once verified. This ensures trust and quality for all buyers.
            </p>
          </div>
        </div>
      )}

      {isVerified && (
        <div className="verification-banner verified" style={{ marginBottom:"1.5rem" }}>
          <span style={{ fontSize:"1.3rem" }}>✅</span>
          <span style={{ fontWeight:600 }}>Verified Farmer — You can list crops on the marketplace</span>
        </div>
      )}

      <div className="flex-between mb-3">
        <div>
          <h1 className="page-title" style={{ textAlign:"left", fontSize:"1.8rem" }}>
            🌾 {t("welcome")}, {user?.name?.split(" ")[0] || "Farmer"}
          </h1>
          <p style={{ color:"var(--green-pale)", fontSize:"0.85rem" }}>Manage your crops & get AI-powered insights</p>
        </div>
        <button className="btn-primary" style={{ width:"auto", opacity: isVerified ? 1 : 0.5 }} onClick={() => isVerified ? setTab("add") : setMsg({ type:"error", text:"Your account must be verified before listing crops." })} disabled={!isVerified}>
          + {t("addCrop")}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid-4 mb-3">
        {[
          { icon:"🌱", label:"My Crops", value: crops.length },
          { icon:"📦", label:"Orders", value: orders.length },
          { icon:"📊", label:"Total Stock", value: `${crops.reduce((a,c)=>a+(c.quantity||0),0)} kg` },
          { icon:"💰", label:"Revenue", value: `₹${totalRevenue.toLocaleString()}` }
        ].map((s,i) => (
          <div className="stat-card" key={i}>
            <span className="stat-icon">{s.icon}</span>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {msg.text && <div className={`alert alert-${msg.type} mb-2`}>{msg.text}</div>}

      {/* Tabs */}
      <div className="tab-bar">
        {[
          { k:"crops", l:"🌿 My Crops" },
          { k:"orders", l:`📦 Orders (${orders.length})` },
          { k:"add",   l:`➕ ${t("addCrop")}` },
          { k:"ml",    l:"🤖 AI Suggestions" },
          { k:"tips",  l:"💡 Farming Tips" }
        ].map(tb => (
          <button key={tb.k} className={`tab-btn ${tab===tb.k?"active":""}`} onClick={() => {
            if (tb.k === "add" && !isVerified) { setMsg({ type:"error", text:"Account not verified yet." }); return; }
            setTab(tb.k);
          }}>
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
              <p style={{ color:"var(--green-pale)", marginTop:"1rem" }}>
                {isVerified ? "No crops listed yet. Add your first crop!" : "Get verified to start listing crops."}
              </p>
              {isVerified && <button className="btn-primary mt-2" style={{ width:"auto" }} onClick={() => setTab("add")}>+ Add Crop</button>}
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
                      <span className={`badge ${statusColor(c.quantity)}`}>{c.quantity} {c.unit||"kg"} available</span>
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

      {/* ── ORDERS TAB ── */}
      {tab === "orders" && (
        <div className="glass-card" style={{ overflowX:"auto" }}>
          <h3 className="section-title">📦 Incoming Orders</h3>
          {orders.length === 0 ? (
            <p style={{ color:"var(--text-muted)", textAlign:"center", padding:"2rem" }}>No orders received yet.</p>
          ) : (
            <table className="rs-table">
              <thead><tr><th>Order</th><th>Crop</th><th>Customer</th><th>Qty</th><th>Amount</th><th>Type</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o._id}>
                    <td style={{ fontSize:"0.75rem", color:"var(--text-muted)" }}>#{o.billNumber || o._id.substring(0,8).toUpperCase()}</td>
                    <td><strong style={{ color:"var(--cream)" }}>{o.crop?.name || "—"}</strong></td>
                    <td style={{ color:"var(--green-pale)", fontSize:"0.85rem" }}>{o.customer?.name || "—"}</td>
                    <td style={{ color:"var(--cream)" }}>{o.quantity}</td>
                    <td style={{ color:"var(--yellow-wheat)", fontWeight:700 }}>₹{(o.totalAmount||0).toLocaleString()}</td>
                    <td><span className={`badge ${o.deliveryType==="farm_pickup"?"badge-green":"badge-blue"}`}>{o.deliveryType==="farm_pickup"?"🏡 Pickup":"🚚 Delivery"}</span></td>
                    <td><span className={`badge ${o.status==="delivered"?"badge-green":o.status==="cancelled"?"badge-red":"badge-yellow"}`}>{o.status?.replace("_"," ")}</span></td>
                    <td style={{ color:"var(--text-muted)", fontSize:"0.75rem" }}>{new Date(o.createdAt).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── ADD CROP TAB ── */}
      {tab === "add" && isVerified && (
        <div className="glass-card" style={{ maxWidth:680, margin:"0 auto" }}>
          <div className="flex-between mb-2">
            <h3 className="section-title mb-0">🌿 {t("addCrop")}</h3>
            <button 
              type="button" 
              className={`btn-primary ${listening ? "pulse" : ""}`} 
              style={{ width:"auto", background:"var(--yellow-wheat)", color:"#000", fontWeight:600, padding:"0.5rem 1rem" }} 
              onClick={() => {
                startListening((text) => {
                  const updates = parseVoiceToForm(text);
                  setForm(f => ({ ...f, ...updates }));
                  setMsg({ type:"success", text:`🎙️ Voice parsed: "${text}"`});
                }, { replace: true });
              }}>
              {listening ? "🎙️ Listening..." : "🎤 Smart Voice Fill"}
            </button>
          </div>
          <p style={{ color:"var(--text-muted)", fontSize:"0.85rem", marginBottom:"1rem" }}>
            Click "Smart Voice Fill" and say something like <em>"I have 50 kg of organic tomatoes from Hyderabad for 40 rupees per kg"</em> to auto-fill the form!
          </p>

          <div className="grid-2">
            <AutoSuggestInput value={form.name} onChange={set("name")} onSpeak={() => speak("name")} listening={listening} interim={interim} label={`${t("cropName")} *`} placeholder="e.g. Tomato, Rice..." fieldType="crop" />
            <div className="form-group">
              <label className="field-label">{t("category")}</label>
              <select className="rs-select" value={form.category} onChange={set("category")}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <AutoSuggestInput value={form.description} onChange={set("description")} onSpeak={() => speak("description")} listening={listening} interim={interim} label={t("description")} placeholder="Brief description of quality, freshness..." />

          <div className="grid-3">
            <div className="form-group">
              <label className="field-label">{t("price")} (₹) *</label>
              <div className="input-wrapper">
                <input className="rs-input" type="number" placeholder="0" value={form.price} onChange={set("price")} />
              </div>
            </div>
            <div className="form-group">
              <label className="field-label">{t("quantity")} *</label>
              <div className="input-wrapper">
                <input className="rs-input" type="number" placeholder="0" value={form.quantity} onChange={set("quantity")} />
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

          <div className="form-group">
            <label className="field-label">{t("location")}</label>
            <div style={{ display:"flex", gap:"0.6rem" }}>
              <div className="input-wrapper" style={{ flex:1 }}>
                <input className="rs-input" placeholder="Farm location" value={form.location} onChange={set("location")} />
                <button type="button" className={`mic-btn ${listening?"active":""}`} onClick={() => speak("location")}>🎤</button>
              </div>
              <button type="button" className="btn-icon" onClick={getLocation} disabled={locLoading} title="Auto-detect">
                {locLoading ? "⏳" : "📍"}
              </button>
            </div>
            {form.latitude && <p style={{ fontSize:"0.72rem", color:"var(--green-light)", marginTop:"0.3rem" }}>✅ Location captured</p>}
          </div>

          <div className="toggle-row">
            <span className="toggle-label">🌿 {t("organic")}?</span>
            <label style={{ display:"flex", alignItems:"center", gap:"0.5rem", cursor:"pointer" }}>
              <input type="checkbox" checked={form.isOrganic} onChange={(e) => setForm(f=>({...f,isOrganic:e.target.checked}))} style={{ width:18,height:18 }} />
              <span style={{ color:"var(--green-pale)", fontSize:"0.85rem" }}>{form.isOrganic ? "Yes, certified organic" : "No"}</span>
            </label>
          </div>

          <div className="form-group mt-2">
            <label className="field-label">Crop Image</label>
            <label className="file-upload-area">
              <input type="file" accept="image/*" onChange={(e) => setForm(f=>({...f,image:e.target.files[0]}))} />
              <span className="file-upload-icon">📷</span>
              <p className="file-upload-text">{form.image ? `✅ ${form.image.name}` : "Click to upload crop photo"}</p>
            </label>
          </div>

          <button className="btn-primary mt-2" onClick={handleAddCrop} disabled={loading}>
            {loading ? t("loading") : `🌾 List on Marketplace`}
          </button>
        </div>
      )}

      {/* ── ML SUGGESTIONS TAB ── */}
      {tab === "ml" && (
        <div className="grid-2">
          <div className="ml-card">
            <h3 className="section-title">🌤️ {t("cropSuggest")}</h3>
            <p style={{ color:"var(--green-pale)", fontSize:"0.82rem", marginBottom:"1rem" }}>Enter weather data for AI-powered crop recommendations.</p>
            <div className="grid-3" style={{ gap:"0.75rem" }}>
              {[
                { k:"temp", l:t("temperature"), pl:"28" },
                { k:"hum",  l:t("humidity"),    pl:"65" },
                { k:"rain", l:t("rainfall"),     pl:"80" }
              ].map(f => (
                <div key={f.k} className="form-group">
                  <label className="field-label">{f.l}</label>
                  <div className="input-wrapper">
                    <input className="rs-input" type="number" placeholder={f.pl} value={weather[f.k]} onChange={(e) => setWeather(w=>({...w,[f.k]:e.target.value}))} />
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
            <p style={{ color:"var(--green-pale)", fontSize:"0.82rem", marginBottom:"1rem" }}>Discover which crops are in highest demand.</p>
            <DemandPanel />
          </div>
        </div>
      )}

      {/* ── FARMING TIPS TAB ── */}
      {tab === "tips" && (
        <div className="ml-card">
          <h3 className="section-title">💡 {t("farmerTips")}</h3>
          <p style={{ color:"var(--green-pale)", fontSize:"0.82rem", marginBottom:"1rem" }}>Get personalized farming advice.</p>
          <div className="grid-2">
            <AutoSuggestInput value={tipsForm.crop} onChange={(val) => setTipsForm(f=>({...f,crop:val}))}
              onSpeak={() => startListening((val) => {
                if (typeof val === "function") setTipsForm(f=>({...f,crop:val(f.crop)}));
                else setTipsForm(f=>({...f,crop:val}));
              })}
              listening={listening} interim={interim} label="Crop Name" placeholder="e.g. Rice, Wheat..." fieldType="crop" />
            <div className="form-group">
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