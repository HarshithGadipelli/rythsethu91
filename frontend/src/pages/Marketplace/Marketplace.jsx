import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import API from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import { useVoiceInput } from "../../utils/useVoiceInput";
import AutoSuggestInput from "../../components/AutoSuggestInput";
import { io } from "socket.io-client";
import { parseSpokenNumber } from "../../utils/voiceParser";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Map as MapIcon, List, ShoppingBag, Truck, PackageCheck, Zap } from "lucide-react";

// Fix leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const farmerIcon = L.divIcon({
  className: "custom-farmer-icon",
  html: `<div style="
    display: flex;
    justify-content: center;
    align-items: center;
    width: 36px;
    height: 36px;
    background: linear-gradient(135deg, #2d7a4f, #1b4d3e);
    border: 2px solid #ffffff;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
  ">
    <div style="
      transform: rotate(45deg);
      font-size: 1.25rem;
    ">🌾</div>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36]
});

// Haversine distance calculation
function haversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function FlyToMarker({ crop }) {
  const map = useMap();
  useEffect(() => {
    const lat = crop?.latitude || crop?.farmer?.latitude;
    const lng = crop?.longitude || crop?.farmer?.longitude;
    if (lat && lng) {
      map.flyTo([lat, lng], 12, { duration: 1.2 });
    }
  }, [crop]);
  return null;
}

function MapInvalidator() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 200);
  }, [map]);
  return null;
}

export default function Marketplace() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const { listening, activeField, interim, startListening } = useVoiceInput(lang);

  const [crops, setCrops] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [orderQty, setOrderQty] = useState(1);
  const [orderAddr, setOrderAddr] = useState("");
  const [orderLat, setOrderLat] = useState(null);
  const [orderLng, setOrderLng] = useState(null);
  const [deliveryType, setDeliveryType] = useState("standard");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [usePoints, setUsePoints] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [msg, setMsg] = useState({ type:"", text:"" });
  const [nutritionData, setNutrition] = useState(null);
  const [nutLoading, setNutLoading] = useState(false);
  const [viewTab, setViewTab] = useState("list");
  const [showBill, setShowBill] = useState(null);
  const [myOrders, setMyOrders] = useState([]);
  const [showOrders, setShowOrders] = useState(false);

  const CATS = ["all","vegetable","fruit","grain","pulse","spice","dairy","other"];
  const DELIVERY_BASE = 30;
  const DELIVERY_PER_KM = 5;

  useEffect(() => { 
    fetchCrops();
    if (user) fetchMyOrders();
    const socket = io("http://localhost:5000");
    socket.on("order_created", () => fetchCrops());
    socket.on("order_updated", () => { if (user) fetchMyOrders(); });

    // AI Autofill Listener
    const handleAIAutofill = (e) => {
      if (e.detail.context === "marketplace_search" && e.detail.parsedData) {
        const pd = e.detail.parsedData;
        if (pd.searchQuery) setSearch(pd.searchQuery);
        if (pd.category) setCategory(pd.category);
        setViewTab("list"); // Ensure they see the results
      }
    };
    window.addEventListener("ai_autofill", handleAIAutofill);

    return () => {
      socket.disconnect();
      window.removeEventListener("ai_autofill", handleAIAutofill);
    };
  }, []);

  useEffect(() => {
    let f = [...crops];
    if (category !== "all") f = f.filter(c => c.category === category);
    if (search.trim()) f = f.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
    setFiltered(f);
  }, [crops, search, category]);

  const fetchCrops = async () => {
    setLoading(true);
    try {
      const res = await API.get("/crops");
      const available = res.data.filter(c => c.isAvailable !== false && c.quantity > 0);
      setCrops(available);
      setFiltered(available);
    } catch {} finally { setLoading(false); }
  };

  const fetchMyOrders = async () => {
    try {
      const res = await API.get(`/orders/customer/${user._id}`);
      setMyOrders(res.data);
    } catch {}
  };

  // Calculate delivery distance and charges
  const cropLat = selected?.latitude || selected?.farmer?.latitude;
  const cropLng = selected?.longitude || selected?.farmer?.longitude;
  const deliveryDistance = selected ? haversineDistance(
    cropLat, cropLng, orderLat, orderLng
  ) : 0;
  const deliveryCharges = deliveryType === "farm_pickup" ? 0 : Math.round(DELIVERY_BASE + (deliveryDistance * DELIVERY_PER_KM));
  const subtotal = selected ? selected.price * orderQty : 0;
  const totalBeforeDiscount = subtotal + deliveryCharges;
  const maxPoints = Math.min(user?.rewardPoints || 0, totalBeforeDiscount);
  const pointsDiscount = usePoints ? maxPoints : 0;
  const totalAmount = totalBeforeDiscount - pointsDiscount;

  const openCrop = async (crop) => {
    setSelected(crop);
    setShowModal(true);
    setNutrition(null);
    setOrderQty(1);
    setDeliveryType("standard");
    setUsePoints(false);
    setShowBill(null);
    setMsg({ type:"", text:"" });
    setNutLoading(true);
    try {
      const res = await API.post("/ml/nutrition", { crop: crop.name });
      setNutrition(res.data);
    } catch {} finally { setNutLoading(false); }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) { alert("Geolocation not supported"); return; }
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      setOrderLat(coords.latitude);
      setOrderLng(coords.longitude);
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`);
        const d = await r.json();
        setOrderAddr(d.display_name || `${coords.latitude}, ${coords.longitude}`);
      } catch { 
        setOrderAddr(`${coords.latitude}, ${coords.longitude}`);
      }
    }, () => { alert("Could not get location"); });
  };

  const loadRazorpay = () => new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  const placeOrder = async () => {
    if (!user) { setMsg({ type:"error", text:"Please login to place an order." }); return; }
    if (orderQty < 1) { setMsg({ type:"error", text:"Quantity must be at least 1." }); return; }
    if (deliveryType !== "farm_pickup" && !orderAddr) { setMsg({ type:"error", text:"Please enter your delivery address." }); return; }
    setOrdering(true); setMsg({ type:"", text:"" });
    
    try {
      if (paymentMethod === "online") {
        const isLoaded = await loadRazorpay();
        if (!isLoaded) { setMsg({ type:"error", text:"Payment SDK failed. Are you online?" }); setOrdering(false); return; }
        const orderRes = await API.post("/payment/razorpay/create-order", { amount: totalAmount });
        const { id: order_id, currency, amount } = orderRes.data;
        
        const options = {
          key: "rzp_test_MOCKKEYID",
          amount: amount.toString(),
          currency,
          name: "Rythu Sethu",
          description: `${orderQty} ${selected.unit||"kg"} of ${selected.name}`,
          order_id,
          handler: async function (response) {
            try {
              await API.post("/payment/razorpay/verify-payment", response);
              await createPlatformOrder("online", "paid");
            } catch { setMsg({ type:"error", text: "Payment verification failed." }); }
          },
          prefill: { name: user.name, email: user.email, contact: user.phone },
          theme: { color: "#2d7a4f" }
        };
        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (res) => setMsg({ type:"error", text: "Payment failed: " + res.error.description }));
        rzp.open();
        setOrdering(false);
      } else {
        await createPlatformOrder("cod", "pending");
      }
    } catch (err) {
      setMsg({ type:"error", text: err.response?.data?.error || "Order failed." });
      setOrdering(false);
    }
  };

  const createPlatformOrder = async (payMode, payStatus) => {
    const orderData = {
      crop: selected._id,
      customer: user._id,
      farmer: selected.farmer?._id || selected.farmer,
      quantity: orderQty,
      totalAmount,
      subtotal,
      deliveryCharges,
      pointsUsed: pointsDiscount,
      deliveryDistance: Math.round(deliveryDistance * 10) / 10,
      deliveryType,
      paymentMode: payMode,
      paymentStatus: payStatus,
      deliveryAddress: deliveryType === "farm_pickup" ? "Farm Pickup" : orderAddr,
      deliveryLatitude: orderLat,
      deliveryLongitude: orderLng,
    };

    const res = await API.post("/orders/create", orderData);
    setShowBill({
      billNumber: res.data.billNumber,
      cropName: selected.name,
      quantity: orderQty,
      unit: selected.unit || "kg",
      unitPrice: selected.price,
      subtotal,
      deliveryType,
      deliveryCharges,
      pointsUsed: pointsDiscount,
      deliveryDistance: Math.round(deliveryDistance * 10) / 10,
      totalAmount,
      paymentMode: payMode,
      farmerName: selected.farmer?.name || "Farmer",
      farmerLocation: selected.location || "",
      customerName: user.name,
      deliveryAddress: deliveryType === "farm_pickup" ? "Farm Pickup" : orderAddr,
      date: new Date().toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric", hour:"2-digit", minute:"2-digit" })
    });
    setMsg({ type:"success", text:`✅ Order placed successfully!` });
    fetchCrops();
    if (user) fetchMyOrders();
    setOrdering(false);
  };

  const mapLocations = filtered.filter(c => {
    const lat = c.latitude || c.farmer?.latitude;
    const lng = c.longitude || c.farmer?.longitude;
    return lat !== undefined && lat !== null && lng !== undefined && lng !== null;
  });

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-wrapper" style={{ maxWidth:"100%", padding:"1.5rem" }}>
      {/* Premium Hero Banner */}
      <motion.div 
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="marketplace-hero-banner" style={{
        backgroundImage: "linear-gradient(135deg, rgba(22, 163, 74, 0.85), rgba(5, 150, 105, 0.95)), url('http://localhost:5000/uploads/hero.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        borderRadius: "var(--radius-lg)",
        padding: "3.5rem 2.5rem",
        marginBottom: "2.5rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        boxShadow: "0 15px 35px -5px rgba(22, 163, 74, 0.2)",
        position: "relative",
        overflow: "hidden"
      }}>
        <motion.span 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{ 
          background: "rgba(255, 255, 255, 0.2)", 
          color: "white", 
          padding: "0.4rem 1rem", 
          borderRadius: "100px", 
          fontSize: "0.85rem", 
          fontWeight: 700, 
          textTransform: "uppercase", 
          letterSpacing: "0.1em", 
          marginBottom: "1rem", 
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255, 255, 255, 0.4)",
          display: "flex", alignItems: "center", gap: "0.5rem"
        }}>
          <Zap size={16} fill="white" /> {t("tagline")}
        </motion.span>
        <motion.h2 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{ color: "white", fontSize: "2.5rem", fontWeight: 800, margin: "0 0 0.5rem", fontFamily: "'Outfit', sans-serif" }}>
          Freshness Delivered.
        </motion.h2>
        <motion.p 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{ color: "rgba(255,255,255,0.9)", fontSize: "1.1rem", maxWidth: "600px", margin: 0, lineHeight: 1.6 }}>
          Explore high-quality organic crops directly sourced from local farmers. Switch to Map view to pinpoint farms near you!
        </motion.p>
      </motion.div>

      <div className="flex-between mb-3">
        <div>
          <h1 className="page-title" style={{ textAlign:"left", fontSize:"1.8rem", color:"var(--text-dark)", backgroundImage:"none", WebkitTextFillColor:"var(--text-dark)", textShadow:"none" }}>
            🛒 {t("marketplace")}
          </h1>
          <p style={{ color:"var(--text-muted)", fontSize:"0.95rem" }}>{filtered.length} fresh products from local farmers</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem", alignItems:"center" }}>
          {user && (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className={`btn-secondary`} onClick={() => setShowOrders(!showOrders)} style={{ background:"white", color:"var(--text-dark)", borderColor:"#e2e8f0" }}>
              <PackageCheck size={18} style={{ marginRight:4 }} /> {t("myOrders")} ({myOrders.length})
            </motion.button>
          )}
          <div className="tab-bar" style={{ margin:0, background:"white", border:"1px solid #e2e8f0", padding:4, borderRadius:12 }}>
            <motion.button whileTap={{ scale: 0.95 }} className={`tab-btn ${viewTab==="list"?"active":""}`} onClick={() => setViewTab("list")} style={viewTab==="list"?{background:"var(--green-mid)", color:"white"}:{color:"var(--text-mid)"}}>
              <List size={16} style={{marginRight:4}} /> List
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} className={`tab-btn ${viewTab==="map"?"active":""}`} onClick={() => setViewTab("map")} style={viewTab==="map"?{background:"var(--green-mid)", color:"white"}:{color:"var(--text-mid)"}}>
              <MapIcon size={16} style={{marginRight:4}} /> Map
            </motion.button>
          </div>
        </div>
      </div>

      {/* My Orders Panel */}
      <AnimatePresence>
        {showOrders && user && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card mb-3" style={{ overflowY:"auto", background:"white", borderColor:"#e2e8f0", borderRadius:"var(--radius-lg)" }}>
            <h3 className="section-title" style={{ fontSize:"1.1rem", color:"var(--text-dark)", marginBottom:"1rem" }}>📦 {t("myOrders")}</h3>
            {myOrders.length === 0 ? (
              <p style={{ color:"var(--text-muted)", fontSize:"0.95rem" }}>No orders yet.</p>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
                {myOrders.map(o => (
                  <div key={o._id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"1rem", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:"var(--radius-md)" }}>
                    <div>
                      <span style={{ color:"var(--text-dark)", fontWeight:700, fontSize:"1rem", display:"block" }}>{o.crop?.name || "Order"}</span>
                      <span style={{ color:"var(--text-muted)", fontSize:"0.85rem" }}>{o.quantity} {o.crop?.unit||"kg"} • {o.date}</span>
                    </div>
                    <div style={{ display:"flex", gap:"1rem", alignItems:"center" }}>
                      <span style={{ color:"var(--green-mid)", fontWeight:800, fontSize:"1.1rem" }}>₹{(o.totalAmount||0).toLocaleString()}</span>
                      <span className={`badge ${o.status==="delivered"?"badge-green":o.status==="cancelled"?"badge-red":"badge-yellow"}`}>{o.status?.replace("_"," ")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search + Filter Horizontal Bar (Premium Style) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "2rem" }}>
        
        {/* Search & AI Bar */}
        <div style={{ marginBottom: "2rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 300, position: "relative" }}>
            <AutoSuggestInput 
              value={search} 
              onChange={setSearch} 
              onSpeak={() => startListening((val) => {
                if (typeof val === "function") setSearch(f=>val(f));
                else setSearch(val);
              }, { replace: true, fieldId: "search" })}
              listening={listening && activeField === "search"}
              interim={interim}
              placeholder="🔍 Search fresh crops, vegetables, grains..." 
              fieldType="default"
              style={{
                width: "100%", padding: "1.2rem 1.2rem 1.2rem 3rem", fontSize: "1.1rem",
                borderRadius: "100px", border: "1px solid #e2e8f0", background: "white",
                boxShadow: "0 4px 20px rgba(0,0,0,0.05)", outline: "none", transition: "all 0.3s"
              }}
            />
          </div>
        </div>
        
        {/* Horizontal Category Pill Scroll */}
        <div style={{ display:"flex", gap:"0.75rem", overflowX:"auto", paddingBottom:"0.5rem", flexShrink:0, maxWidth:"100%" }} className="no-scrollbar">
          {CATS.map(c => (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              key={c} onClick={() => setCategory(c)} style={{
              padding:"0.6rem 1.2rem", borderRadius:"100px",
              border: category===c ? "none" : "1px solid #e2e8f0",
              background: category===c ? "var(--green-mid)" : "white",
              color: category===c ? "white" : "var(--text-mid)",
              fontSize:"0.95rem", fontWeight:700, cursor:"pointer", transition:"all 0.2s",
              whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:"0.5rem",
              boxShadow: category===c ? "0 8px 20px rgba(22, 163, 74, 0.3)" : "0 2px 10px rgba(0,0,0,0.02)"
            }}>
              {c === "all" ? `🌾 ${t("allItems")}` : c === "vegetable" ? `🥦 ${t("veggies")}` : c === "fruit" ? `🍎 ${t("fruits")}` : c === "grain" ? `🌾 ${t("grains")}` : t(c)}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Seasonal Specials Section */}
      {filtered.some(c => c.season === "rabi" || c.season === "kharif") && search === "" && category === "all" && viewTab === "list" && (
        <div className="mb-3">
          <h3 className="section-title mb-1">🌟 {t("seasonalSpecials")}</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>{t("freshlyHarvested")}</p>
          <div className="scroll-x no-scrollbar" style={{ display: "flex", gap: "1rem", overflowX: "auto", paddingBottom: "1rem" }}>
            {filtered.filter(c => c.season === "rabi" || c.season === "kharif").slice(0, 5).map(c => (
              <div key={c._id} className="crop-card" onClick={() => openCrop(c)} style={{ minWidth: 260, cursor: "pointer", flexShrink: 0, border: "1px solid var(--green-pale)" }}>
                <div className="crop-img-wrap" style={{ height: 140 }}>
                  {c.image ? <img src={`http://localhost:5000${c.image}`} alt={c.name} /> : <div className="crop-img-fallback">🌿</div>}
                  {c.isPrebooking && <span className="organic-badge" style={{ background: "var(--yellow-wheat)", color: "black", border: "none" }}>⏳ Pre-Book</span>}
                  {c.isOrganic && <span className="organic-badge">🌿 Organic</span>}
                </div>
                <div className="crop-info" style={{ padding: "1rem" }}>
                  <div className="flex-between">
                    <h3 className="crop-title" style={{ fontSize: "1.1rem" }}>{c.name}</h3>
                    <span className="crop-price">₹{c.price}/{c.unit||"kg"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MAP VIEW ── */}
      {viewTab === "map" ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="marketplace-layout">
          <div className="marketplace-sidebar" style={{ background:"white", border:"1px solid #e2e8f0", borderRadius:"var(--radius-lg)" }}>
            {loading ? (
              <div className="loader-wrapper"><div className="loader"></div></div>
            ) : filtered.length === 0 ? (
              <div className="glass-card text-center" style={{ padding:"2rem", border:"none", boxShadow:"none" }}>
                <p style={{ fontSize:"2.5rem" }}>🌿</p>
                <p style={{ color:"var(--text-muted)", marginTop:"0.75rem" }}>{t("noData")}</p>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem", padding:"1rem" }}>
                {filtered.map(c => (
                  <motion.div whileHover={{ scale: 1.02 }} key={c._id} onClick={() => setSelected(c)} style={{
                    display:"flex", gap:"0.75rem", alignItems:"center", padding:"0.85rem",
                    background: selected?._id === c._id ? "var(--green-pale)" : "white",
                    border: selected?._id === c._id ? "1.5px solid var(--green-light)" : "1px solid #e2e8f0",
                    borderRadius:"var(--radius-md)", cursor:"pointer", transition:"all 0.2s"
                  }}>
                    <div style={{ width:56, height:56, borderRadius:8, background:"#f1f5f9", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.5rem", flexShrink:0, overflow:"hidden" }}>
                      {c.image ? <img src={`http://localhost:5000${c.image}`} alt={c.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : "🌿"}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"0.4rem" }}>
                        <h4 style={{ color:"var(--text-dark)", fontSize:"0.95rem", fontWeight:700 }}>{c.name}</h4>
                        {c.isOrganic && <span className="organic-tag" style={{ fontSize:"0.6rem", padding:"2px 6px" }}>🌿 Organic</span>}
                      </div>
                      <div style={{ color:"var(--green-mid)", fontWeight:700, fontSize:"1rem" }}>₹{c.price}/{c.unit||"kg"}</div>
                      <div style={{ color:"var(--text-muted)", fontSize:"0.75rem" }}>{c.quantity} {c.unit||"kg"} left</div>
                    </div>
                    <button className="btn-primary" style={{ width:"auto", padding:"0.5rem 0.85rem", fontSize:"0.8rem", flexShrink:0, borderRadius:"100px" }} onClick={(e) => { e.stopPropagation(); openCrop(c); }}>{t("buy")}</button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
          <div className="marketplace-map-panel">
            <div className="map-container" style={{ border:"4px solid white", boxShadow:"var(--shadow-soft)" }}>
              <MapContainer center={[17.385, 78.4867]} zoom={6} style={{ height:"100%", width:"100%", borderRadius:"calc(var(--radius-lg) - 4px)" }}>
                {/* High-Detail Hybrid Map (Satellite + Streets + Labels) */}
                <TileLayer 
                  url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" 
                  attribution="Map data &copy; Google" 
                />
                <MapInvalidator />
                {selected && <FlyToMarker crop={selected} />}
                {mapLocations.map(c => {
                  const lat = c.latitude || c.farmer?.latitude;
                  const lng = c.longitude || c.farmer?.longitude;
                  return (
                    <Marker key={c._id} position={[lat, lng]} icon={farmerIcon}>
                      <Popup>
                        <div style={{ minWidth:180, fontFamily:"Poppins,sans-serif" }}>
                          <strong style={{ fontSize:"1rem" }}>{c.name}</strong><br/>
                          <span style={{ color:"var(--green-mid)", fontWeight:800 }}>₹{c.price}/{c.unit||"kg"}</span><br/>
                          <span style={{ color:"#666", fontSize:"0.8rem" }}>{c.quantity} {c.unit||"kg"} available</span><br/>
                          {c.isOrganic && <span style={{ background:"#dcfce7", color:"#16a34a", padding:"2px 8px", borderRadius:10, fontSize:"0.7rem", fontWeight:700, display:"inline-block", marginTop:4 }}>🌿 Organic</span>}
                          <br/>
                          <button onClick={() => openCrop(c)} style={{ marginTop:12, background:"var(--green-mid)", color:"white", border:"none", padding:"8px 12px", borderRadius:100, cursor:"pointer", width:"100%", fontWeight:700 }}>View & Order</button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          </div>
        </motion.div>
      ) : (
        /* ── GRID LIST VIEW ── */
        loading ? (
          <div className="loader-wrapper"><div className="loader"></div><p className="loader-text" style={{color:"var(--text-muted)"}}>{t("loading")}</p></div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card text-center" style={{ padding:"4rem", background:"white" }}>
            <div style={{ fontSize:"4rem", marginBottom:"1rem" }}>🌱</div>
            <h3 style={{ color:"var(--text-dark)", fontSize:"1.5rem" }}>{t("noData")}</h3>
            <p style={{ color:"var(--text-muted)", marginTop:"0.5rem" }}>Try adjusting your search or filters.</p>
          </motion.div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid-auto">
            {filtered.map(c => (
              <motion.div variants={itemVariants} className="crop-card" key={c._id} onClick={() => openCrop(c)}>
                {c.image
                  ? <img src={`http://localhost:5000${c.image}`} alt={c.name} />
                  : <div style={{ height:180, background:"#f1f5f9", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"4rem" }}>
                      {c.category==="fruit"?"🍎":c.category==="grain"?"🌾":c.category==="vegetable"?"🥦":c.category==="spice"?"🌶️":"🌿"}
                    </div>
                }
                <div className="crop-card-body">
                  <div className="flex-between">
                    <h3>{c.name}</h3>
                    {c.isOrganic && <span className="organic-tag">🌿</span>}
                  </div>
                  <div className="crop-price">₹{c.price}/{c.unit||"kg"}</div>
                  <div className="crop-qty">{c.quantity} {c.unit||"kg"} left in stock</div>
                  {c.location && <p style={{ fontSize:"0.8rem", color:"var(--text-muted)", margin:"0.3rem 0 1rem", display:"flex", alignItems:"center", gap:"0.3rem" }}><MapIcon size={14}/> {c.location.substring(0,35)}...</p>}
                  
                  <div style={{ marginTop:"auto" }}>
                    <button className="btn-primary" style={{ fontSize:"0.9rem", padding:"0.75rem", borderRadius:"100px", width:"100%" }}>
                      <ShoppingBag size={18} /> {t("buy")}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )
      )}

      {/* ── ORDER MODAL ── */}
      {showModal && selected && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(8px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); setMsg({ type:"", text:"" }); setShowBill(null); } }}>
          <div className="glass-card-dark" style={{ maxWidth:600, width:"100%", maxHeight:"90vh", overflowY:"auto" }}>

            {/* ── BILL VIEW ── */}
            {showBill ? (
              <div>
                <div className="bill-receipt">
                  <div className="bill-header">
                    <h3>🌾 Rythu Sethu — Order Bill</h3>
                    <p>Bill #{showBill.billNumber}</p>
                    <p>{showBill.date}</p>
                  </div>
                  <div className="bill-row"><span className="label">Customer</span><span>{showBill.customerName}</span></div>
                  <div className="bill-row"><span className="label">Farmer</span><span>{showBill.farmerName}</span></div>
                  <div className="bill-row"><span className="label">{deliveryType === "farm_pickup" ? "Pickup" : "Delivery"} Address</span><span>{showBill.deliveryAddress?.substring(0,40)}</span></div>
                  <div style={{ borderTop:"1px dashed rgba(82,183,136,0.3)", margin:"0.75rem 0" }}></div>
                  <div className="bill-row"><span className="label">{showBill.cropName} × {showBill.quantity} {showBill.unit}</span><span>₹{showBill.unitPrice}/{showBill.unit}</span></div>
                  <div className="bill-row"><span className="label">Subtotal</span><span>₹{showBill.subtotal.toLocaleString()}</span></div>
                  {showBill.deliveryType === "farm_pickup" ? (
                    <div className="bill-row"><span className="label">Delivery</span><span className="free">🏡 Farm Pickup — FREE</span></div>
                  ) : (
                    <div className="bill-row"><span className="label">Delivery ({showBill.deliveryDistance} km)</span><span>₹{showBill.deliveryCharges}</span></div>
                  )}
                  {showBill.pointsUsed > 0 && (
                    <div className="bill-row"><span className="label" style={{ color: "var(--green-mid)" }}>Rewards Discount</span><span style={{ color: "var(--green-mid)" }}>-₹{showBill.pointsUsed}</span></div>
                  )}
                  <div className="bill-row total"><span>Total</span><span>₹{showBill.totalAmount.toLocaleString()}</span></div>
                  <div className="bill-row"><span className="label">Payment</span><span className="badge badge-blue">{showBill.paymentMode?.toUpperCase()}</span></div>
                </div>
                <div style={{ display:"flex", gap:"0.75rem", marginTop:"1rem" }}>
                  <button className="btn-secondary" onClick={() => window.print()} style={{ flex:1 }}>🖨️ Print Bill</button>
                  <button className="btn-primary" onClick={() => { setShowModal(false); setShowBill(null); setMsg({ type:"", text:"" }); }} style={{ flex:1 }}>✅ Done</button>
                </div>
              </div>
            ) : (
              <>
                {/* Crop Header */}
                <div style={{ display:"flex", gap:"1rem", marginBottom:"1.5rem", alignItems:"flex-start" }}>
                  {selected.image
                    ? <img src={`http://localhost:5000${selected.image}`} alt={selected.name} style={{ width:100, height:100, objectFit:"cover", borderRadius:12, flexShrink:0 }} />
                    : <div style={{ width:100, height:100, borderRadius:12, background:"linear-gradient(135deg,#1a4a2e,#2d7a4f)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"3rem", flexShrink:0 }}>🌿</div>
                  }
                  <div>
                    <h2 style={{ color:"var(--cream)", fontSize:"1.4rem", fontWeight:700 }}>{selected.name}</h2>
                    {selected.isPrebooking && <span className="organic-tag mb-1" style={{ background: "var(--yellow-wheat)", color: "#000", border: "none" }}>⏳ Pre-Booking</span>}
                    {selected.isOrganic && <span className="organic-tag mb-1">🌿 Certified Organic</span>}
                    <div style={{ color:"var(--yellow-wheat)", fontSize:"1.3rem", fontWeight:800, marginTop:"0.4rem" }}>₹{selected.price}/{selected.unit||"kg"}</div>
                    <div style={{ color:"var(--green-pale)", fontSize:"0.82rem", marginTop:"0.25rem" }}>
                      📦 {selected.quantity} {selected.unit||"kg"} {selected.isPrebooking ? "available for pre-order" : "in stock"} • {selected.category}
                    </div>
                    {selected.location && <div style={{ color:"var(--text-muted)", fontSize:"0.75rem", marginTop:"0.2rem" }}>📍 {selected.location.substring(0,50)}</div>}
                  </div>
                </div>

                {selected.description && (
                  <p style={{ color:"var(--green-pale)", fontSize:"0.88rem", marginBottom:"1.25rem", lineHeight:1.6 }}>{selected.description}</p>
                )}

                {/* Nutrition Info */}
                {nutLoading ? (
                  <div style={{ textAlign:"center", padding:"1rem", color:"var(--green-pale)", fontSize:"0.85rem" }}>🔬 Fetching nutrition data...</div>
                ) : nutritionData && !nutritionData.error ? (
                  <div style={{ marginBottom:"1.25rem" }}>
                    <h4 className="section-title" style={{ fontSize:"1rem" }}>🥗 {t("nutritionInfo")} (per 100g)</h4>
                    <div className="nutrition-grid">
                      {[
                        { l:"Calories", v:`${nutritionData.calories} kcal` },
                        { l:"Carbs",    v:`${nutritionData.carbs}g` },
                        { l:"Protein",  v:`${nutritionData.protein}g` },
                        { l:"Fat",      v:`${nutritionData.fat}g` },
                        { l:"Fiber",    v:`${nutritionData.fiber}g` },
                      ].map((n,i) => (
                        <div key={i} className="nut-item">
                          <div className="nut-val">{n.v}</div>
                          <div className="nut-label">{n.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Order Form */}
                <div className="section-divider"><hr /><span>Place Order</span><hr /></div>
                {msg.text && <div className={`alert alert-${msg.type} mb-2`}>{msg.text}</div>}

                {/* Delivery Type Selection */}
                <div className="form-group">
                  <label className="field-label">{t("deliveryOption")}</label>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem" }}>
                    <div className={`delivery-option ${deliveryType==="farm_pickup"?"selected":""}`} onClick={() => setDeliveryType("farm_pickup")}>
                      <h4>🏡 {t("buyAtFarm")}</h4>
                      <p>Pick up directly from farmer</p>
                      <div className="price" style={{ marginTop:"0.4rem" }}>FREE</div>
                    </div>
                    <div className={`delivery-option ${deliveryType==="standard"?"selected":""}`} onClick={() => setDeliveryType("standard")}>
                      <h4>🚚 {t("homeDelivery")}</h4>
                      <p>Delivered to your doorstep</p>
                      <div className="price" style={{ marginTop:"0.4rem" }}>
                        {deliveryDistance > 0 ? `₹${deliveryCharges} (${Math.round(deliveryDistance)}km)` : `₹${DELIVERY_BASE}+`}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid-2 mt-2">
                  <div className="form-group">
                    <label className="field-label">Quantity ({selected.unit||"kg"})</label>
                    <div className="input-wrapper">
                      <input
                        className="rs-input"
                        type="number"
                        min={1}
                        max={selected.quantity}
                        value={listening && activeField === "orderQty" && interim ? interim : orderQty}
                        onChange={(e) => setOrderQty(Number(e.target.value))}
                        style={listening && activeField === "orderQty" && interim ? { color: "rgba(183,228,199,0.7)", fontStyle: "italic" } : {}}
                      />
                      <button type="button" className={`mic-btn ${listening && activeField === "orderQty" ? "active" : ""}`} onClick={() => startListening((val) => {
                        const str = typeof val === "function" ? val("") : val;
                        const numStr = parseSpokenNumber(str);
                        const num = parseInt(numStr);
                        if (!isNaN(num)) setOrderQty(num);
                      }, { replace: true, fieldId: "orderQty" })}>🎤</button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="field-label">{t("paymentMethod")}</label>
                    <select className="rs-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                      <option value="cod">💵 {t("cashOnDelivery")}</option>
                      <option value="online">💳 {t("payOnline")}</option>
                    </select>
                  </div>
                </div>

                {/* Address (only for delivery) */}
                {deliveryType !== "farm_pickup" && (
                  <div className="form-group">
                    <label className="field-label">Delivery Address</label>
                    <div style={{ display: "flex", gap: "0.6rem" }}>
                      <div className="input-wrapper" style={{ flex: 1 }}>
                        <input
                          className="rs-input"
                          placeholder="Your delivery address..."
                          value={listening && activeField === "orderAddr" && interim ? `${orderAddr} ${interim}...` : orderAddr}
                          onChange={(e) => setOrderAddr(e.target.value)}
                          style={listening && activeField === "orderAddr" && interim ? { color: "rgba(183,228,199,0.7)", fontStyle: "italic" } : {}}
                        />
                        <button type="button" className={`mic-btn ${listening && activeField === "orderAddr" ? "active" : ""}`} onClick={() => startListening((val) => {
                          if (typeof val === "function") setOrderAddr(prev => val(prev));
                          else setOrderAddr(val);
                        }, { fieldId: "orderAddr" })}>🎤</button>
                      </div>
                      <button type="button" className="btn-icon" onClick={detectLocation} title="Auto-detect">📍</button>
                    </div>
                  </div>
                )}

                {/* Points Discount */}
                {user && user.rewardPoints > 0 && (
                  <div className="form-group" style={{ background: "var(--green-pale)", padding: "1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--green-mid)" }}>
                    <div className="flex-between">
                      <div>
                        <span style={{ fontWeight: 700, color: "var(--green-deep)" }}>🏆 Use Reward Points</span>
                        <p style={{ fontSize: "0.8rem", color: "var(--green-mid)" }}>You have {user.rewardPoints} points available. (1 point = ₹1)</p>
                      </div>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                        <input type="checkbox" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} style={{ width: 20, height: 20 }} />
                        <span style={{ fontWeight: 600, color: "var(--green-deep)" }}>Apply</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Bill Preview */}
                <div className="bill-receipt" style={{ margin:"1rem 0" }}>
                  <div className="bill-row"><span className="label">{selected.name} × {orderQty} {selected.unit||"kg"}</span><span>₹{subtotal.toLocaleString()}</span></div>
                  {deliveryType === "farm_pickup" ? (
                    <div className="bill-row"><span className="label">Delivery</span><span className="free">🏡 Farm Pickup — FREE</span></div>
                  ) : (
                    <div className="bill-row"><span className="label">Delivery {deliveryDistance > 0 ? `(${Math.round(deliveryDistance)}km)` : ""}</span><span>₹{deliveryCharges}</span></div>
                  )}
                  {pointsDiscount > 0 && (
                    <div className="bill-row"><span className="label" style={{ color: "var(--green-mid)" }}>Rewards Discount</span><span style={{ color: "var(--green-mid)" }}>-₹{pointsDiscount}</span></div>
                  )}
                  <div className="bill-row total"><span>{t("total")}</span><span>₹{totalAmount.toLocaleString()}</span></div>
                </div>

                <div style={{ display:"flex", gap:"0.75rem" }}>
                  <button className="btn-secondary" onClick={() => { setShowModal(false); setMsg({ type:"", text:"" }); }}>Cancel</button>
                  <button className="btn-primary" onClick={placeOrder} disabled={ordering || selected.quantity < orderQty} style={{ flex:1 }}>
                    {ordering ? t("loading") : `✅ Confirm — ₹${totalAmount.toLocaleString()}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
