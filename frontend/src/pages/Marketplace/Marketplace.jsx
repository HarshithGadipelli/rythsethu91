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

// Fix leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const farmerIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
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
    if (crop?.latitude && crop?.longitude) {
      map.flyTo([crop.latitude, crop.longitude], 12, { duration: 1.2 });
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
  const { listening, interim, startListening } = useVoiceInput(lang);

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
    return () => socket.disconnect();
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
  const deliveryDistance = selected ? haversineDistance(
    selected.latitude, selected.longitude, orderLat, orderLng
  ) : 0;
  const deliveryCharges = deliveryType === "farm_pickup" ? 0 : Math.round(DELIVERY_BASE + (deliveryDistance * DELIVERY_PER_KM));
  const subtotal = selected ? selected.price * orderQty : 0;
  const totalAmount = subtotal + deliveryCharges;

  const openCrop = async (crop) => {
    setSelected(crop);
    setShowModal(true);
    setNutrition(null);
    setOrderQty(1);
    setDeliveryType("standard");
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

  const mapLocations = filtered.filter(c => c.latitude && c.longitude);

  return (
    <div className="page-wrapper" style={{ maxWidth:"100%", padding:"1.5rem" }}>
      <div className="flex-between mb-3">
        <div>
          <h1 className="page-title" style={{ textAlign:"left", fontSize:"1.8rem" }}>🛒 {t("marketplace")}</h1>
          <p style={{ color:"var(--green-pale)", fontSize:"0.85rem" }}>{filtered.length} fresh products from local farmers</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem", alignItems:"center" }}>
          {user && (
            <button className={`btn-secondary`} onClick={() => setShowOrders(!showOrders)}>
              📦 My Orders ({myOrders.length})
            </button>
          )}
          <div className="tab-bar" style={{ margin:0 }}>
            <button className={`tab-btn ${viewTab==="list"?"active":""}`} onClick={() => setViewTab("list")}>📋 List</button>
            <button className={`tab-btn ${viewTab==="map"?"active":""}`} onClick={() => setViewTab("map")}>🗺️ Map</button>
          </div>
        </div>
      </div>

      {/* My Orders Panel */}
      {showOrders && user && (
        <div className="glass-card mb-3" style={{ maxHeight:300, overflowY:"auto" }}>
          <h3 className="section-title" style={{ fontSize:"1rem" }}>📦 My Orders</h3>
          {myOrders.length === 0 ? (
            <p style={{ color:"var(--text-muted)", fontSize:"0.85rem" }}>No orders yet.</p>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
              {myOrders.map(o => (
                <div key={o._id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0.6rem", background:"rgba(255,255,255,0.05)", borderRadius:"var(--radius-sm)" }}>
                  <div>
                    <span style={{ color:"var(--cream)", fontWeight:600, fontSize:"0.88rem" }}>{o.crop?.name || "Order"}</span>
                    <span style={{ color:"var(--text-muted)", fontSize:"0.78rem", marginLeft:"0.5rem" }}>{o.quantity} {o.crop?.unit||"kg"}</span>
                  </div>
                  <div style={{ display:"flex", gap:"0.75rem", alignItems:"center" }}>
                    <span style={{ color:"var(--yellow-wheat)", fontWeight:700 }}>₹{(o.totalAmount||0).toLocaleString()}</span>
                    <span className={`badge ${o.status==="delivered"?"badge-green":o.status==="cancelled"?"badge-red":"badge-yellow"}`}>{o.status?.replace("_"," ")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search + Filter */}
      <div style={{ display:"flex", gap:"1rem", marginBottom:"1.5rem", flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ flex:1, minWidth:220 }}>
          <AutoSuggestInput
            value={search}
            onChange={setSearch}
            placeholder={`🔍 ${t("search")}...`}
            fieldType="crop"
            onSpeak={() => startListening((val) => {
              if (typeof val === "function") setSearch(f=>val(f));
              else setSearch(val);
            }, { replace: true })}
            listening={listening}
            interim={interim}
          />
        </div>
        <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
          {CATS.map(c => (
            <button key={c} onClick={() => setCategory(c)} style={{
              padding:"0.4rem 0.85rem", borderRadius:"100px",
              border: category===c ? "none" : "1px solid rgba(82,183,136,0.3)",
              background: category===c ? "var(--gradient-btn)" : "rgba(255,255,255,0.05)",
              color: category===c ? "var(--cream)" : "var(--green-pale)",
              fontSize:"0.8rem", fontWeight:600, cursor:"pointer", transition:"all 0.2s"
            }}>
              {c === "all" ? "🌾 All" : c.charAt(0).toUpperCase()+c.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── MAP VIEW ── */}
      {viewTab === "map" ? (
        <div className="marketplace-layout">
          <div className="marketplace-sidebar">
            {loading ? (
              <div className="loader-wrapper"><div className="loader"></div></div>
            ) : filtered.length === 0 ? (
              <div className="glass-card text-center" style={{ padding:"2rem" }}>
                <p style={{ fontSize:"2.5rem" }}>🌿</p>
                <p style={{ color:"var(--green-pale)", marginTop:"0.75rem" }}>No crops found.</p>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
                {filtered.map(c => (
                  <div key={c._id} onClick={() => setSelected(c)} style={{
                    display:"flex", gap:"0.75rem", alignItems:"center", padding:"0.85rem",
                    background: selected?._id === c._id ? "rgba(82,183,136,0.2)" : "rgba(255,255,255,0.06)",
                    border: selected?._id === c._id ? "1.5px solid var(--green-light)" : "1px solid var(--card-border)",
                    borderRadius:"var(--radius-md)", cursor:"pointer", transition:"all 0.2s"
                  }}>
                    <div style={{ width:56, height:56, borderRadius:8, background:"linear-gradient(135deg,#1a4a2e,#2d7a4f)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.5rem", flexShrink:0, overflow:"hidden" }}>
                      {c.image ? <img src={`http://localhost:5000${c.image}`} alt={c.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : "🌿"}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"0.4rem" }}>
                        <h4 style={{ color:"var(--cream)", fontSize:"0.95rem", fontWeight:700 }}>{c.name}</h4>
                        {c.isOrganic && <span className="organic-tag">🌿</span>}
                      </div>
                      <div style={{ color:"var(--yellow-wheat)", fontWeight:700, fontSize:"1rem" }}>₹{c.price}/{c.unit||"kg"}</div>
                      <div style={{ color:"var(--green-pale)", fontSize:"0.75rem" }}>{c.quantity} {c.unit||"kg"} left</div>
                    </div>
                    <button className="btn-primary" style={{ width:"auto", padding:"0.5rem 0.75rem", fontSize:"0.78rem", flexShrink:0 }} onClick={(e) => { e.stopPropagation(); openCrop(c); }}>Buy</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="marketplace-map-panel">
            <div className="map-container">
              <MapContainer center={[17.385, 78.4867]} zoom={6} style={{ height:"100%", width:"100%", borderRadius:"var(--radius-lg)" }}>
                <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community" />
                <MapInvalidator />
                {selected && <FlyToMarker crop={selected} />}
                {mapLocations.map(c => (
                  <Marker key={c._id} position={[c.latitude, c.longitude]} icon={farmerIcon}>
                    <Popup>
                      <div style={{ minWidth:180, fontFamily:"Poppins,sans-serif" }}>
                        <strong style={{ fontSize:"1rem" }}>{c.name}</strong><br/>
                        <span style={{ color:"#2d7a4f", fontWeight:700 }}>₹{c.price}/{c.unit||"kg"}</span><br/>
                        <span style={{ color:"#666", fontSize:"0.8rem" }}>{c.quantity} {c.unit||"kg"} available</span><br/>
                        {c.isOrganic && <span style={{ background:"#e8f5e9", color:"#2e7d32", padding:"1px 6px", borderRadius:10, fontSize:"0.7rem", fontWeight:700 }}>🌿 Organic</span>}
                        <br/>
                        <button onClick={() => openCrop(c)} style={{ marginTop:8, background:"#2d7a4f", color:"white", border:"none", padding:"6px 12px", borderRadius:6, cursor:"pointer", width:"100%", fontWeight:600 }}>View & Order</button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        </div>
      ) : (
        /* ── GRID LIST VIEW ── */
        loading ? (
          <div className="loader-wrapper"><div className="loader"></div><p className="loader-text">{t("loading")}</p></div>
        ) : filtered.length === 0 ? (
          <div className="glass-card text-center" style={{ padding:"3rem" }}>
            <p style={{ fontSize:"3rem" }}>🌿</p>
            <p style={{ color:"var(--green-pale)", marginTop:"1rem" }}>{t("noData")}</p>
          </div>
        ) : (
          <div className="grid-auto">
            {filtered.map(c => (
              <div className="crop-card" key={c._id} onClick={() => openCrop(c)}>
                {c.image
                  ? <img src={`http://localhost:5000${c.image}`} alt={c.name} />
                  : <div style={{ height:160, background:"linear-gradient(135deg,#1a4a2e,#2d7a4f)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"3.5rem" }}>
                      {c.category==="fruit"?"🍎":c.category==="grain"?"🌾":c.category==="vegetable"?"🥦":c.category==="spice"?"🌶️":"🌿"}
                    </div>
                }
                <div className="crop-card-body">
                  <div className="flex-between">
                    <h3>{c.name}</h3>
                    {c.isOrganic && <span className="organic-tag">🌿</span>}
                  </div>
                  <div className="crop-price">₹{c.price}/{c.unit||"kg"}</div>
                  <div className="crop-qty">{c.quantity} {c.unit||"kg"} available</div>
                  {c.location && <p style={{ fontSize:"0.75rem", color:"var(--text-muted)", margin:"0.3rem 0 0.75rem" }}>📍 {c.location.substring(0,35)}...</p>}
                  <button className="btn-primary" style={{ fontSize:"0.85rem", padding:"0.65rem" }}>🛒 {t("buy")}</button>
                </div>
              </div>
            ))}
          </div>
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
                    {selected.isOrganic && <span className="organic-tag mb-1">🌿 Certified Organic</span>}
                    <div style={{ color:"var(--yellow-wheat)", fontSize:"1.3rem", fontWeight:800, marginTop:"0.4rem" }}>₹{selected.price}/{selected.unit||"kg"}</div>
                    <div style={{ color:"var(--green-pale)", fontSize:"0.82rem", marginTop:"0.25rem" }}>📦 {selected.quantity} {selected.unit||"kg"} in stock • {selected.category}</div>
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
                  <label className="field-label">Delivery Option</label>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem" }}>
                    <div className={`delivery-option ${deliveryType==="farm_pickup"?"selected":""}`} onClick={() => setDeliveryType("farm_pickup")}>
                      <h4>🏡 Buy at Farm</h4>
                      <p>Pick up directly from farmer</p>
                      <div className="price" style={{ marginTop:"0.4rem" }}>FREE</div>
                    </div>
                    <div className={`delivery-option ${deliveryType==="standard"?"selected":""}`} onClick={() => setDeliveryType("standard")}>
                      <h4>🚚 Home Delivery</h4>
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
                    <input className="rs-input" type="number" min={1} max={selected.quantity} value={orderQty} onChange={(e) => setOrderQty(Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label className="field-label">Payment Method</label>
                    <select className="rs-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                      <option value="cod">💵 Cash on Delivery</option>
                      <option value="online">💳 Pay Online (UPI/Card)</option>
                    </select>
                  </div>
                </div>

                {/* Address (only for delivery) */}
                {deliveryType !== "farm_pickup" && (
                  <div className="form-group">
                    <label className="field-label">Delivery Address</label>
                    <div style={{ display: "flex", gap: "0.6rem" }}>
                      <div className="input-wrapper" style={{ flex: 1 }}>
                        <input className="rs-input" placeholder="Your delivery address..." value={orderAddr} onChange={(e) => setOrderAddr(e.target.value)} />
                        <button type="button" className={`mic-btn ${listening ? "active" : ""}`} onClick={() => startListening((val) => {
                          if (typeof val === "function") setOrderAddr(prev => val(prev));
                          else setOrderAddr(val);
                        })}>🎤</button>
                      </div>
                      <button type="button" className="btn-icon" onClick={detectLocation} title="Auto-detect">📍</button>
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
                  <div className="bill-row total"><span>Total</span><span>₹{totalAmount.toLocaleString()}</span></div>
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
    </div>
  );
}
