import { useState, useEffect } from "react";
import { useLang } from "../../context/LangContext";
import { useAuth } from "../../context/AuthContext";
import { useVoiceInput } from "../../utils/useVoiceInput";
import AutoSuggestInput from "../../components/AutoSuggestInput";
import { useNavigate } from "react-router-dom";
import API from "../../api/api";
import { playTTS } from "../../utils/tts";
import { io } from "socket.io-client";
import { parseSpokenNumber, parseVoiceToFormMultilingual } from "../../utils/voiceParser";

const CATEGORIES = ["vegetable","fruit","grain","pulse","spice","dairy","other"];
const SEASONS    = ["kharif","rabi","zaid","perennial"];
const SOILS      = ["loamy","clay","sandy","silt","peat","chalk","other"];

// Voice parsing is now handled by voiceParser.js

const DemandPanel = () => {
  const [demand, setDemand] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.post("/ml/demand-predict").then(res => {
      setDemand(res.data.demand);
      setLoading(false);
    }).catch(err => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Loading demand data from database...</p>;
  if (!demand || demand.length === 0) return <p>No demand data available.</p>;

  return (
    <div>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {demand.map((crop, i) => (
          <li key={i} style={{ padding: "0.75rem", background: "var(--green-pale)", color: "var(--green-deep)", marginBottom: "0.5rem", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ fontSize: "1.1rem" }}>#{i+1} {crop}</strong>
            <span style={{ fontSize: "0.85rem", background: "var(--green-mid)", color: "white", padding: "2px 8px", borderRadius: "10px" }}>🔥 High Demand</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default function FarmerDashboard() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const { listening, activeField, interim, startListening } = useVoiceInput(lang);

  const [tab, setTab] = useState("crops");
  const [crops, setCrops] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [locLoading, setLocLoading] = useState(false);
  const [focusField, setFocusField] = useState("name");
  const [mlLoading, setMlLoading] = useState(false);
  const [mlResult, setMlResult] = useState(null);
  const [tipsResult, setTipsResult] = useState(null);

  const [form, setForm] = useState({
    name:"", description:"", category:"vegetable", price:"", quantity:"",
    unit:"kg", season:"kharif", isOrganic: false,
    location:"", latitude:"", longitude:"",
    harvestDate:"", image: null,
  });

  const [weatherLive, setWeatherLive] = useState(null);
  const [tipsForm, setTipsForm] = useState({ crop:"", soil:"loamy" });

  const fetchLiveWeather = async () => {
    if (!form.latitude || !form.longitude) {
      setMsg({ type: "error", text: "Please detect your location in the Add Crop tab first!" });
      return;
    }
    setMlLoading(true);
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${form.latitude}&longitude=${form.longitude}&current=temperature_2m,relative_humidity_2m,precipitation`);
      const data = await res.json();
      setWeatherLive({
        temp: data.current.temperature_2m,
        hum: data.current.relative_humidity_2m,
        rain: data.current.precipitation
      });
      setMsg({ type: "success", text: "Live weather data fetched successfully." });
    } catch (e) {
      setMsg({ type: "error", text: "Failed to fetch live weather." });
    } finally {
      setMlLoading(false);
    }
  };

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
    const isNumeric = ["price", "quantity", "farmSize", "experience"].includes(field);
    if (typeof val === "function") {
      setForm((f) => {
        const prev = f[field];
        const newVal = val(prev);
        return { ...f, [field]: isNumeric ? parseSpokenNumber(newVal) : newVal };
      });
    } else {
      setForm((f) => ({ ...f, [field]: isNumeric ? parseSpokenNumber(val) : val }));
    }
  }, { fieldId: field });

  useEffect(() => { 
    fetchCrops();
    fetchOrders();
    const socket = io("http://localhost:5000");
    socket.on("order_created", () => { fetchCrops(); fetchOrders(); });
    socket.on("farmer_verified", () => window.location.reload());

    // Listen for AI Autofill events
    const handleAIAutofill = (e) => {
      if (e.detail.context === "farmer_add_crop" && e.detail.parsedData) {
        setTab("add");
        const pd = e.detail.parsedData;
        setForm(f => ({
          ...f,
          name: pd.name || f.name,
          quantity: pd.quantity || f.quantity,
          unit: pd.unit || f.unit,
          price: pd.price || f.price,
          isOrganic: pd.isOrganic !== undefined ? pd.isOrganic : f.isOrganic
        }));
      }
    };
    window.addEventListener("ai_autofill", handleAIAutofill);

    return () => {
      socket.disconnect();
      window.removeEventListener("ai_autofill", handleAIAutofill);
    };
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
      setForm({ name:"", description:"", category:"vegetable", price:"", quantity:"", unit:"kg", season:"kharif", isOrganic:false, isPrebooking:false, location:"", latitude:"", longitude:"", harvestDate:"", image:null });
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
    if (!weatherLive) return setMsg({ type: "error", text: "Please fetch live weather first." });
    setMlLoading(true); setMlResult(null);
    try {
      const res = await API.post("/ml/crop-suggest", { temp: weatherLive.temp, hum: weatherLive.hum, rain: weatherLive.rain });
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
          { icon:"💰", label:"Revenue", value: `₹${totalRevenue.toLocaleString()}` },
          { icon:"🏆", label:"Reward Points", value: user?.rewardPoints || 0 }
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
        <div className="guided-layout">
        <div className="glass-card" style={{ flex: 1 }}>
          <div className="flex-between mb-2">
            <h3 className="section-title mb-0">🌿 {t("addCrop")}</h3>
            <button 
              type="button" 
              className={`btn-primary ${listening && activeField === "smartFill" ? "pulse" : ""}`} 
              style={{ width:"auto", background:"var(--yellow-wheat)", color:"#000", fontWeight:600, padding:"0.5rem 1rem" }} 
              onClick={() => {
                startListening((text) => {
                  const updates = parseVoiceToFormMultilingual(text, lang);
                  setForm(f => ({ ...f, ...updates }));
                  setMsg({ type:"success", text:`🎙️ Voice parsed: "${text}"`});
                }, { replace: true, fieldId: "smartFill" });
              }}>
              {listening && activeField === "smartFill" ? "🎙️ Listening..." : "🎤 Smart Voice Fill"}
            </button>
          </div>
          <p style={{ color:"var(--text-muted)", fontSize:"0.85rem", marginBottom:"1rem" }}>
            Click "Smart Voice Fill" and say something like <em>"I have 50 kg of organic tomatoes from Hyderabad for 40 rupees per kg"</em> to auto-fill the form!
          </p>

          <div className="grid-2">
            <AutoSuggestInput 
              value={form.name} 
              onChange={set("name")} 
              onSpeak={() => speak("name")} 
              onFocus={() => setFocusField("name")}
              onTTS={() => playTTS(`Crop Name is ${form.name}`, lang)}
              listening={listening && activeField === "name"} 
              interim={interim} 
              label={`${t("cropName")} *`} 
              placeholder="e.g. Tomato, Rice..." 
              fieldType="crop" 
            />
            <div className="form-group">
              <label className="field-label">{t("category")}</label>
              <select className="rs-select" value={form.category} onChange={set("category")} onFocus={() => setFocusField("name")}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <AutoSuggestInput 
            value={form.description} 
            onChange={set("description")} 
            onSpeak={() => speak("description")} 
            onFocus={() => setFocusField("name")}
            onTTS={() => playTTS(`Description is ${form.description}`, lang)}
            listening={listening && activeField === "description"} 
            interim={interim} 
            label={t("description")} 
            placeholder="Brief description of quality, freshness..." 
          />

          <div className="grid-3">
            <div className="form-group">
              <label className="field-label">{t("price")} (₹) *</label>
              <div className="input-wrapper">
                <input
                  className="rs-input"
                  type="number"
                  placeholder="0"
                  value={listening && activeField === "price" && interim ? `${form.price} ${interim}...` : form.price}
                  onChange={set("price")}
                  onFocus={() => setFocusField("price")}
                  style={listening && activeField === "price" && interim ? { color: "rgba(183,228,199,0.7)", fontStyle: "italic" } : {}}
                />
                <button type="button" className={`mic-btn ${listening && activeField === "price" ? "active" : ""}`} onClick={() => speak("price")}>🎤</button>
                <button type="button" className="tts-btn" onClick={() => playTTS(`Price is ${form.price} rupees`, lang)}>🔊</button>
              </div>
            </div>
            <div className="form-group">
              <label className="field-label">{t("quantity")} *</label>
              <div className="input-wrapper">
                <input
                  className="rs-input"
                  type="number"
                  placeholder="0"
                  value={listening && activeField === "quantity" && interim ? `${form.quantity} ${interim}...` : form.quantity}
                  onChange={set("quantity")}
                  onFocus={() => setFocusField("quantity")}
                  style={listening && activeField === "quantity" && interim ? { color: "rgba(183,228,199,0.7)", fontStyle: "italic" } : {}}
                />
                <button type="button" className={`mic-btn ${listening && activeField === "quantity" ? "active" : ""}`} onClick={() => speak("quantity")}>🎤</button>
                <button type="button" className="tts-btn" onClick={() => playTTS(`Quantity is ${form.quantity}`, lang)}>🔊</button>
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
              <label className="field-label">{t("harvestDate")}</label>
              <input className="rs-input" type="date" value={form.harvestDate} onChange={set("harvestDate")} required={form.isPrebooking} />
            </div>
          </div>

          <div className="form-group">
            <label className="field-label">{t("location")}</label>
            <div style={{ display:"flex", gap:"0.6rem" }}>
              <div className="input-wrapper" style={{ flex:1 }}>
                <input
                  className="rs-input"
                  placeholder="Farm location"
                  value={listening && activeField === "location" && interim ? `${form.location} ${interim}...` : form.location}
                  onChange={set("location")}
                  onFocus={() => setFocusField("location")}
                  style={listening && activeField === "location" && interim ? { color: "rgba(183,228,199,0.7)", fontStyle: "italic" } : {}}
                />
                <button type="button" className={`mic-btn ${listening && activeField === "location" ? "active" : ""}`} onClick={() => speak("location")}>🎤</button>
                <button type="button" className="tts-btn" onClick={() => playTTS(`Location is ${form.location}`, lang)}>🔊</button>
              </div>
              <button type="button" className="btn-icon" onClick={getLocation} disabled={locLoading} title="Auto-detect">
                {locLoading ? "⏳" : "📍"}
              </button>
            </div>
            {form.latitude && <p style={{ fontSize:"0.72rem", color:"var(--green-light)", marginTop:"0.3rem" }}>✅ Location captured</p>}
          </div>

          <div className="grid-2 mt-2">
            <div className="toggle-row">
              <span className="toggle-label">🌿 {t("organic")}?</span>
              <label style={{ display:"flex", alignItems:"center", gap:"0.5rem", cursor:"pointer" }}>
                <input type="checkbox" checked={form.isOrganic} onChange={(e) => setForm(f=>({...f,isOrganic:e.target.checked}))} style={{ width:18,height:18 }} />
                <span style={{ color:"var(--green-pale)", fontSize:"0.85rem" }}>{form.isOrganic ? "Yes" : "No"}</span>
              </label>
            </div>
            <div className="toggle-row">
              <span className="toggle-label">📅 {t("isPrebooking")}?</span>
              <label style={{ display:"flex", alignItems:"center", gap:"0.5rem", cursor:"pointer" }}>
                <input type="checkbox" checked={form.isPrebooking} onChange={(e) => setForm(f=>({...f,isPrebooking:e.target.checked}))} style={{ width:18,height:18 }} />
                <span style={{ color:"var(--green-pale)", fontSize:"0.85rem" }}>{form.isPrebooking ? "Yes, listed for pre-booking" : "No, already harvested"}</span>
              </label>
            </div>
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

        {/* ── GUIDED FORM BOX ── */}
        <div className="form-guide-box">
          <h4 style={{ color: "var(--green-deep)", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>🧭</span> Form Guide
            <button type="button" className="tts-btn" onClick={() => playTTS("This is the form guide. Follow the steps to list your crop.", lang)}>🔊</button>
          </h4>
          <div className={`guide-step ${focusField === "name" ? "active" : ""}`}>
            <strong>Step 1: Crop Name</strong><br/>Enter the name of your crop (e.g. Tomato, Rice).
          </div>
          <div className={`guide-step ${focusField === "price" ? "active" : ""}`}>
            <strong>Step 2: Pricing</strong><br/>Set a competitive price per unit in Rupees.
          </div>
          <div className={`guide-step ${focusField === "quantity" ? "active" : ""}`}>
            <strong>Step 3: Quantity</strong><br/>How much stock do you have available right now?
          </div>
          <div className={`guide-step ${focusField === "location" ? "active" : ""}`}>
            <strong>Step 4: Location</strong><br/>Allow auto-detect so agents can find your farm easily.
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1rem" }}>
            💡 Tip: Click the 🔊 icon next to fields to hear them spoken aloud.
          </p>
        </div>
        </div>
      )}

      {/* ── ML SUGGESTIONS TAB ── */}
      {tab === "ml" && (
        <div className="grid-2">
          <div className="ml-card">
            <h3 className="section-title">🌤️ {t("cropSuggest")}</h3>
            <p style={{ color:"var(--green-pale)", fontSize:"0.82rem", marginBottom:"1rem" }}>Uses Real-Time Weather via Open-Meteo API.</p>
            
            {weatherLive ? (
              <div className="grid-3 mb-2" style={{ gap:"0.75rem" }}>
                <div className="stat-card" style={{ padding: "1rem" }}>
                  <div className="stat-icon" style={{ fontSize: "1.5rem", width: "40px", height: "40px" }}>🌡️</div>
                  <div className="stat-value" style={{ fontSize: "1.2rem" }}>{weatherLive.temp}°C</div>
                  <div className="stat-label">Temp</div>
                </div>
                <div className="stat-card" style={{ padding: "1rem" }}>
                  <div className="stat-icon" style={{ fontSize: "1.5rem", width: "40px", height: "40px" }}>💧</div>
                  <div className="stat-value" style={{ fontSize: "1.2rem" }}>{weatherLive.hum}%</div>
                  <div className="stat-label">Humidity</div>
                </div>
                <div className="stat-card" style={{ padding: "1rem" }}>
                  <div className="stat-icon" style={{ fontSize: "1.5rem", width: "40px", height: "40px" }}>🌧️</div>
                  <div className="stat-value" style={{ fontSize: "1.2rem" }}>{weatherLive.rain}mm</div>
                  <div className="stat-label">Rainfall</div>
                </div>
              </div>
            ) : (
              <button className="btn-secondary mb-2" onClick={fetchLiveWeather} disabled={mlLoading}>
                {mlLoading ? t("detecting") : `📡 ${t("fetchWeather")}`}
              </button>
            )}

            <button className="btn-primary mt-2" onClick={runCropSuggest} disabled={mlLoading || !weatherLive}>
              {mlLoading ? t("loading") : `🤖 Analyze Weather & ${t("suggestCrop")}`}
            </button>
            {mlResult && !mlResult.error && (
              <div className="ml-result">
                <p>🌾 <strong style={{ color:"var(--yellow-wheat)" }}>Recommended:</strong> {mlResult.recommended_crop} <button type="button" className="tts-btn" onClick={() => playTTS(`Recommended Crop is ${mlResult.recommended_crop}`, lang)}>🔊</button></p>
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
              }, { fieldId: "tipsCrop" })}
              onFocus={() => setFocusField("tipsCrop")}
              onTTS={() => playTTS(`Crop is ${tipsForm.crop}`, lang)}
              listening={listening && activeField === "tipsCrop"} interim={interim} label="Crop Name" placeholder="e.g. Rice, Wheat..." fieldType="crop" />
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
