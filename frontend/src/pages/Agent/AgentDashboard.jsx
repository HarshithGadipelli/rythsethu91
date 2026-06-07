import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import { useVoiceInput } from "../../utils/useVoiceInput";
import AutoSuggestInput from "../../components/AutoSuggestInput";
import API from "../../api/api";
import { io } from "socket.io-client";

const STATUS_STEPS = ["assigned","picked_up","in_transit","delivered"];
const STATUS_ICONS = { assigned:"📋", picked_up:"📦", in_transit:"🚚", delivered:"✅", failed:"❌" };
const STATUS_LABELS = { assigned:"Assigned", picked_up:"Picked Up", in_transit:"In Transit", delivered:"Delivered", failed:"Failed" };

export default function AgentDashboard() {
  const { user } = useAuth();
  const { t, lang } = useLang();

  const [tab, setTab] = useState("my");
  const [deliveries, setDeliveries] = useState([]);
  const [available, setAvailable] = useState([]);
  const [earnings, setEarnings] = useState({ totalDeliveries:0, totalEarnings:0, todayDeliveries:0, perDeliveryAvg:0 });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [filter, setFilter] = useState("all");
  const [msg, setMsg] = useState({ type:"", text:"" });
  const [search, setSearch] = useState("");
  const { listening, interim, startListening } = useVoiceInput(lang || "en");

  useEffect(() => { 
    loadAll();
    const socket = io("http://localhost:5000");
    socket.on("delivery_assigned", () => loadAll());
    socket.on("delivery_updated", () => loadAll());
    socket.on("order_created", () => fetchAvailable());
    return () => socket.disconnect();
  }, []);

  const loadAll = () => {
    fetchDeliveries();
    fetchAvailable();
    fetchEarnings();
  };

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/delivery/agent/${user?._id}`);
      setDeliveries(res.data);
    } catch {} finally { setLoading(false); }
  };

  const fetchAvailable = async () => {
    try {
      const res = await API.get("/delivery/available");
      setAvailable(res.data);
    } catch {}
  };

  const fetchEarnings = async () => {
    try {
      const res = await API.get(`/delivery/earnings/${user?._id}`);
      setEarnings(res.data);
    } catch {}
  };

  const updateStatus = async (id, status) => {
    setUpdating(id);
    try {
      await API.put(`/delivery/${id}/status`, { status });
      setMsg({ type:"success", text:`✅ Status updated to "${STATUS_LABELS[status]}"` });
      loadAll();
    } catch {
      setMsg({ type:"error", text:"Failed to update status." });
    } finally {
      setUpdating(null);
      setTimeout(() => setMsg({ type:"", text:"" }), 3000);
    }
  };

  const acceptOrder = async (orderId) => {
    setUpdating(orderId);
    try {
      await API.post(`/delivery/accept/${orderId}`, { agentId: user?._id });
      setMsg({ type:"success", text:"✅ Delivery accepted! Check your deliveries tab." });
      loadAll();
      setTab("my");
    } catch (err) {
      setMsg({ type:"error", text: err.response?.data?.error || "Failed to accept." });
    } finally {
      setUpdating(null);
      setTimeout(() => setMsg({ type:"", text:"" }), 3000);
    }
  };

  const nextStatus = (current) => {
    const idx = STATUS_STEPS.indexOf(current);
    return idx < STATUS_STEPS.length - 1 ? STATUS_STEPS[idx + 1] : null;
  };

  const lowerSearch = search.toLowerCase();
  const filteredDeliveries = deliveries.filter(d => 
    d.trackingCode?.toLowerCase().includes(lowerSearch) || 
    d.order?.crop?.name?.toLowerCase().includes(lowerSearch) ||
    d.deliveryLocation?.toLowerCase().includes(lowerSearch)
  );

  const filteredAvailable = available.filter(o => 
    o.crop?.name?.toLowerCase().includes(lowerSearch) ||
    o.deliveryAddress?.toLowerCase().includes(lowerSearch) ||
    o.customer?.name?.toLowerCase().includes(lowerSearch)
  );

  const filtered = filter === "all"
    ? filteredDeliveries
    : filteredDeliveries.filter(d => d.status === filter);

  const counts = STATUS_STEPS.reduce((acc, s) => {
    acc[s] = filteredDeliveries.filter(d => d.status === s).length;
    return acc;
  }, {});

  return (
    <div className="page-wrapper">
      <div className="flex-between mb-3" style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="page-title" style={{ textAlign:"left", fontSize:"1.8rem" }}>
            🚚 {t("welcome")}, {user?.name?.split(" ")[0] || "Agent"}
          </h1>
          <p style={{ color:"var(--green-pale)", fontSize:"0.85rem" }}>Manage deliveries & accept new orders</p>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ minWidth: 250 }}>
            <AutoSuggestInput
               value={search}
               onChange={setSearch}
               placeholder="🔍 Search deliveries, crops..."
               fieldType="default"
               onSpeak={() => startListening((val) => {
                 if (typeof val === "function") setSearch(f=>val(f));
                 else setSearch(val);
               }, { replace: true })}
               listening={listening}
               interim={interim}
            />
          </div>
          <button className="btn-secondary" onClick={loadAll}>🔄 Refresh</button>
        </div>
      </div>

      {/* Earnings Row */}
      <div className="grid-4 mb-3">
        <div className="earnings-card">
          <div className="earnings-value">₹{earnings.totalEarnings?.toLocaleString() || 0}</div>
          <div className="earnings-label">Total Earnings</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📦</span>
          <div className="stat-value">{earnings.totalDeliveries || 0}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📅</span>
          <div className="stat-value">{earnings.todayDeliveries || 0}</div>
          <div className="stat-label">Today</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">💰</span>
          <div className="stat-value">₹{earnings.perDeliveryAvg || 0}</div>
          <div className="stat-label">Avg/Delivery</div>
        </div>
      </div>

      {msg.text && <div className={`alert alert-${msg.type} mb-2`}>{msg.text}</div>}

      {/* Tabs */}
      <div className="tab-bar mb-3">
        <button className={`tab-btn ${tab==="my"?"active":""}`} onClick={() => setTab("my")}>
          📋 My Deliveries ({filteredDeliveries.length})
        </button>
        <button className={`tab-btn ${tab==="available"?"active":""}`} onClick={() => setTab("available")}>
          🆕 Available ({filteredAvailable.length})
        </button>
      </div>

      {/* ── MY DELIVERIES ── */}
      {tab === "my" && (
        <>
          {/* Filter tabs */}
          <div className="tab-bar mb-3" style={{ background:"transparent", padding:0 }}>
            {[{ k:"all", l:"📦 All" }, ...STATUS_STEPS.map(s => ({ k:s, l:`${STATUS_ICONS[s]} ${STATUS_LABELS[s]} (${counts[s]||0})` }))].map(tb => (
              <button key={tb.k} className={`tab-btn ${filter===tb.k?"active":""}`} onClick={() => setFilter(tb.k)} style={{ flex:"none", padding:"0.5rem 0.85rem", fontSize:"0.78rem" }}>
                {tb.l}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="loader-wrapper"><div className="loader"></div><p className="loader-text">{t("loading")}</p></div>
          ) : filtered.length === 0 ? (
            <div className="glass-card text-center" style={{ padding:"3rem" }}>
              <p style={{ fontSize:"3rem" }}>📭</p>
              <p style={{ color:"var(--green-pale)", marginTop:"1rem" }}>No deliveries in this category. Check "Available" tab for new orders!</p>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
              {filtered.map(d => {
                const next = nextStatus(d.status);
                const stepIdx = STATUS_STEPS.indexOf(d.status);
                const order = d.order;

                return (
                  <div className="glass-card" key={d._id} style={{ padding:"1.5rem" }}>
                    <div className="flex-between mb-2">
                      <div>
                        <h3 style={{ color:"var(--cream)", fontWeight:700 }}>
                          {d.trackingCode || `#${d._id.substring(0,8).toUpperCase()}`}
                        </h3>
                        {order?.crop && <p style={{ color:"var(--yellow-wheat)", fontSize:"0.88rem" }}>🌾 {order.crop.name} — {order.quantity} {order.crop.unit||"kg"}</p>}
                        <p style={{ color:"var(--text-muted)", fontSize:"0.78rem", marginTop:"0.2rem" }}>
                          {new Date(d.createdAt).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })}
                        </p>
                      </div>
                      <span className={`badge ${d.status==="delivered"?"badge-green":d.status==="in_transit"?"badge-blue":d.status==="failed"?"badge-red":"badge-yellow"}`}>
                        {STATUS_ICONS[d.status]} {STATUS_LABELS[d.status]}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="delivery-progress mb-2">
                      {STATUS_STEPS.map((s, i) => (
                        <div key={s} style={{ display:"flex", alignItems:"center", flex:1 }}>
                          <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                            <div className={`dp-circle ${i < stepIdx ? "done" : i === stepIdx ? "active" : ""}`}>
                              {STATUS_ICONS[s]}
                            </div>
                            <span className="dp-label" style={{ fontSize:"0.6rem", marginTop:"0.3rem" }}>{STATUS_LABELS[s]}</span>
                          </div>
                          {i < STATUS_STEPS.length - 1 && (
                            <div className={`dp-line ${i < stepIdx ? "done" : ""}`} style={{ flex:1, height:2, margin:"0 4px", marginBottom:"1.2rem" }}></div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Info grid */}
                    <div className="grid-2" style={{ gap:"0.75rem", marginBottom:"1rem" }}>
                      {d.pickupLocation && (
                        <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"var(--radius-sm)", padding:"0.75rem" }}>
                          <p style={{ fontSize:"0.72rem", color:"var(--green-pale)", marginBottom:"0.2rem" }}>📤 PICKUP FROM</p>
                          <p style={{ fontSize:"0.85rem", color:"var(--cream)" }}>{d.pickupLocation.substring(0,50)}</p>
                        </div>
                      )}
                      {d.deliveryLocation && (
                        <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"var(--radius-sm)", padding:"0.75rem" }}>
                          <p style={{ fontSize:"0.72rem", color:"var(--green-pale)", marginBottom:"0.2rem" }}>📍 DELIVER TO</p>
                          <p style={{ fontSize:"0.85rem", color:"var(--cream)" }}>{d.deliveryLocation.substring(0,50)}</p>
                        </div>
                      )}
                      {order?.customer && (
                        <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"var(--radius-sm)", padding:"0.75rem" }}>
                          <p style={{ fontSize:"0.72rem", color:"var(--green-pale)", marginBottom:"0.2rem" }}>👤 CUSTOMER</p>
                          <p style={{ fontSize:"0.85rem", color:"var(--cream)" }}>{order.customer.name} {order.customer.phone ? `• ${order.customer.phone}` : ""}</p>
                        </div>
                      )}
                      {order?.totalAmount && (
                        <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"var(--radius-sm)", padding:"0.75rem" }}>
                          <p style={{ fontSize:"0.72rem", color:"var(--green-pale)", marginBottom:"0.2rem" }}>💰 ORDER VALUE</p>
                          <p style={{ fontSize:"0.85rem", color:"var(--yellow-wheat)", fontWeight:700 }}>₹{order.totalAmount.toLocaleString()}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {d.status !== "delivered" && d.status !== "failed" && next && (
                      <button
                        className="btn-primary"
                        disabled={updating === d._id}
                        onClick={() => updateStatus(d._id, next)}
                      >
                        {updating === d._id ? t("loading") : `${STATUS_ICONS[next]} Mark as ${STATUS_LABELS[next]}`}
                      </button>
                    )}

                    {d.status === "delivered" && (
                      <div className="alert alert-success" style={{ marginTop:0 }}>
                        ✅ Delivery completed successfully!
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── AVAILABLE ORDERS ── */}
      {tab === "available" && (
        <div>
          {filteredAvailable.length === 0 ? (
            <div className="glass-card text-center" style={{ padding:"3rem" }}>
              <p style={{ fontSize:"3rem" }}>🔍</p>
              <p style={{ color:"var(--green-pale)", marginTop:"1rem" }}>No orders available for delivery right now. Check back soon!</p>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
              {filteredAvailable.map(o => (
                <div className="glass-card" key={o._id} style={{ padding:"1.5rem" }}>
                  <div className="flex-between mb-2">
                    <div>
                      <h3 style={{ color:"var(--cream)", fontWeight:700 }}>🌾 {o.crop?.name || "Order"}</h3>
                      <p style={{ color:"var(--green-pale)", fontSize:"0.85rem" }}>
                        {o.quantity} {o.crop?.unit||"kg"} • ₹{(o.totalAmount||0).toLocaleString()}
                      </p>
                    </div>
                    <span className="badge badge-yellow">⏳ Needs Delivery</span>
                  </div>

                  <div className="grid-2" style={{ gap:"0.75rem", marginBottom:"1rem" }}>
                    <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"var(--radius-sm)", padding:"0.75rem" }}>
                      <p style={{ fontSize:"0.72rem", color:"var(--green-pale)", marginBottom:"0.2rem" }}>📤 PICKUP</p>
                      <p style={{ fontSize:"0.85rem", color:"var(--cream)" }}>{o.farmer?.location?.substring(0,40) || o.crop?.location?.substring(0,40) || "Farm"}</p>
                    </div>
                    <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"var(--radius-sm)", padding:"0.75rem" }}>
                      <p style={{ fontSize:"0.72rem", color:"var(--green-pale)", marginBottom:"0.2rem" }}>📍 DELIVER TO</p>
                      <p style={{ fontSize:"0.85rem", color:"var(--cream)" }}>{o.deliveryAddress?.substring(0,40) || "Customer"}</p>
                    </div>
                    <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"var(--radius-sm)", padding:"0.75rem" }}>
                      <p style={{ fontSize:"0.72rem", color:"var(--green-pale)", marginBottom:"0.2rem" }}>👤 CUSTOMER</p>
                      <p style={{ fontSize:"0.85rem", color:"var(--cream)" }}>{o.customer?.name || "—"}</p>
                    </div>
                    <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"var(--radius-sm)", padding:"0.75rem" }}>
                      <p style={{ fontSize:"0.72rem", color:"var(--green-pale)", marginBottom:"0.2rem" }}>💰 DELIVERY FEE</p>
                      <p style={{ fontSize:"0.85rem", color:"var(--yellow-wheat)", fontWeight:700 }}>₹{o.deliveryCharges || 30}</p>
                    </div>
                  </div>

                  <button className="btn-primary" onClick={() => acceptOrder(o._id)} disabled={updating === o._id}>
                    {updating === o._id ? "Accepting..." : "✅ Accept This Delivery"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
