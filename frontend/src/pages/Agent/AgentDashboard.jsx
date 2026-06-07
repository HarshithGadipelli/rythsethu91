import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import API from "../../api/api";
import { io } from "socket.io-client";

const STATUS_STEPS = ["assigned","picked_up","in_transit","delivered"];
const STATUS_ICONS = { assigned:"📋", picked_up:"📦", in_transit:"🚚", delivered:"✅", failed:"❌" };
const STATUS_LABELS = { assigned:"Assigned", picked_up:"Picked Up", in_transit:"In Transit", delivered:"Delivered", failed:"Failed" };

export default function AgentDashboard() {
  const { user } = useAuth();
  const { t }    = useLang();

  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [updating, setUpdating] = useState(null);
  const [filter, setFilter]     = useState("all");
  const [msg, setMsg]           = useState({ type:"", text:"" });

  useEffect(() => { 
    fetchDeliveries(); 
    
    const socket = io("http://localhost:5000");
    socket.on("delivery_assigned", () => fetchDeliveries());
    socket.on("delivery_updated", () => fetchDeliveries());
    
    return () => socket.disconnect();
  }, []);

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const res = await API.get("/delivery");
      setDeliveries(res.data);
    } catch {} finally { setLoading(false); }
  };

  const updateStatus = async (id, status) => {
    setUpdating(id);
    try {
      await API.put(`/delivery/${id}/status`, { status });
      setMsg({ type:"success", text:`✅ Status updated to "${STATUS_LABELS[status]}"` });
      fetchDeliveries();
    } catch {
      setMsg({ type:"error", text:"Failed to update status." });
    } finally {
      setUpdating(null);
      setTimeout(() => setMsg({ type:"", text:"" }), 3000);
    }
  };

  const nextStatus = (current) => {
    const idx = STATUS_STEPS.indexOf(current);
    return idx < STATUS_STEPS.length - 1 ? STATUS_STEPS[idx + 1] : null;
  };

  const filtered = filter === "all"
    ? deliveries
    : deliveries.filter(d => d.status === filter);

  const counts = STATUS_STEPS.reduce((acc, s) => {
    acc[s] = deliveries.filter(d => d.status === s).length;
    return acc;
  }, {});

  return (
    <div className="page-wrapper">
      <div className="flex-between mb-3">
        <div>
          <h1 className="page-title" style={{ textAlign:"left", fontSize:"1.8rem" }}>
            🚚 {t("welcome")}, {user?.name?.split(" ")[0] || "Agent"}
          </h1>
          <p style={{ color:"var(--green-pale)", fontSize:"0.85rem" }}>Manage and track your delivery assignments</p>
        </div>
        <button className="btn-secondary" onClick={fetchDeliveries}>🔄 Refresh</button>
      </div>

      {/* Stats */}
      <div className="grid-4 mb-3">
        {[
          { icon:"📋", label:"Assigned",   value: counts.assigned  || 0 },
          { icon:"📦", label:"Picked Up",  value: counts.picked_up || 0 },
          { icon:"🚚", label:"In Transit", value: counts.in_transit|| 0 },
          { icon:"✅", label:"Delivered",  value: counts.delivered || 0 }
        ].map((s,i) => (
          <div className="stat-card" key={i}>
            <span className="stat-icon">{s.icon}</span>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {msg.text && <div className={`alert alert-${msg.type} mb-2`}>{msg.text}</div>}

      {/* Filter tabs */}
      <div className="tab-bar mb-3">
        {[{ k:"all", l:"📦 All" }, ...STATUS_STEPS.map(s => ({ k:s, l:`${STATUS_ICONS[s]} ${STATUS_LABELS[s]}` }))].map(tb => (
          <button key={tb.k} className={`tab-btn ${filter===tb.k?"active":""}`} onClick={() => setFilter(tb.k)}>
            {tb.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loader-wrapper"><div className="loader"></div><p className="loader-text">{t("loading")}</p></div>
      ) : filtered.length === 0 ? (
        <div className="glass-card text-center" style={{ padding:"3rem" }}>
          <p style={{ fontSize:"3rem" }}>📭</p>
          <p style={{ color:"var(--green-pale)", marginTop:"1rem" }}>No deliveries in this category.</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
          {filtered.map(d => {
            const next = nextStatus(d.status);
            const stepIdx = STATUS_STEPS.indexOf(d.status);

            return (
              <div className="glass-card" key={d._id} style={{ padding:"1.5rem" }}>
                {/* Header */}
                <div className="flex-between mb-2">
                  <div>
                    <h3 style={{ color:"var(--cream)", fontWeight:700 }}>
                      Delivery #{d._id.substring(0,8).toUpperCase()}
                    </h3>
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
                      <p style={{ fontSize:"0.88rem", color:"var(--cream)" }}>{d.pickupLocation}</p>
                    </div>
                  )}
                  {d.deliveryLocation && (
                    <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"var(--radius-sm)", padding:"0.75rem" }}>
                      <p style={{ fontSize:"0.72rem", color:"var(--green-pale)", marginBottom:"0.2rem" }}>📍 DELIVER TO</p>
                      <p style={{ fontSize:"0.88rem", color:"var(--cream)" }}>{d.deliveryLocation}</p>
                    </div>
                  )}
                  {d.vehicleType && (
                    <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"var(--radius-sm)", padding:"0.75rem" }}>
                      <p style={{ fontSize:"0.72rem", color:"var(--green-pale)", marginBottom:"0.2rem" }}>🚗 VEHICLE</p>
                      <p style={{ fontSize:"0.88rem", color:"var(--cream)" }}>{d.vehicleType.toUpperCase()}</p>
                    </div>
                  )}
                  {d.estimatedTime && (
                    <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"var(--radius-sm)", padding:"0.75rem" }}>
                      <p style={{ fontSize:"0.72rem", color:"var(--green-pale)", marginBottom:"0.2rem" }}>⏱️ ETA</p>
                      <p style={{ fontSize:"0.88rem", color:"var(--cream)" }}>{d.estimatedTime}</p>
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
    </div>
  );
}
