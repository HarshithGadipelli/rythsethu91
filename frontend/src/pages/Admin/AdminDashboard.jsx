import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import API from "../../api/api";

const TABS = ["overview","users","orders","crops","farmers"];

export default function AdminDashboard() {
  const { user } = useAuth();
  const { t }    = useLang();

  const [tab, setTab]     = useState("overview");
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [crops, setCrops]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]       = useState({ type:"", text:"" });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [ur, or, cr] = await Promise.all([
        API.get("/admin/users"),
        API.get("/admin/orders"),
        API.get("/crops"),
      ]);
      setUsers(ur.data);
      setOrders(or.data);
      setCrops(cr.data);
    } catch(e) {
      setMsg({ type:"error", text:"Failed to load data." });
    } finally { setLoading(false); }
  };

  const deleteUser = async (id, name) => {
    if (!confirm(`Remove user "${name}"? This cannot be undone.`)) return;
    try {
      await API.delete(`/admin/users/${id}`);
      setMsg({ type:"success", text:`✅ User "${name}" removed.` });
      loadAll();
    } catch { setMsg({ type:"error", text:"Failed to delete user." }); }
    setTimeout(() => setMsg({ type:"", text:"" }), 3000);
  };

  const changeRole = async (id, role) => {
    try {
      await API.put(`/admin/users/${id}/role`, { role });
      setMsg({ type:"success", text:`✅ Role updated to "${role}".` });
      loadAll();
    } catch { setMsg({ type:"error", text:"Failed to update role." }); }
    setTimeout(() => setMsg({ type:"", text:"" }), 3000);
  };

  const updateOrderStatus = async (id, status) => {
    try {
      await API.put(`/orders/${id}/status`, { status });
      setMsg({ type:"success", text:`✅ Order status updated.` });
      loadAll();
    } catch { setMsg({ type:"error", text:"Failed to update order." }); }
  };

  const removeCrop = async (id) => {
    if (!confirm("Remove this crop listing?")) return;
    try {
      await API.delete(`/crops/${id}`);
      setMsg({ type:"success", text:"✅ Crop removed." });
      loadAll();
    } catch { setMsg({ type:"error", text:"Failed to remove crop." }); }
  };

  const stats = {
    totalUsers: users.length,
    farmers:    users.filter(u => u.role==="farmer").length,
    customers:  users.filter(u => u.role==="customer").length,
    agents:     users.filter(u => u.role==="agent").length,
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status==="pending").length,
    deliveredOrders: orders.filter(o => o.status==="delivered").length,
    totalCrops: crops.length,
    organicCrops: crops.filter(c => c.isOrganic).length,
    totalRevenue: orders.reduce((a,o) => a+(o.totalAmount||0), 0),
  };

  const roleColor = { farmer:"badge-green", customer:"badge-blue", agent:"badge-yellow", admin:"badge-red" };
  const orderColor = { pending:"badge-yellow", confirmed:"badge-blue", delivered:"badge-green", cancelled:"badge-red" };

  return (
    <div className="page-wrapper" style={{ maxWidth:1280 }}>
      <div className="flex-between mb-3">
        <div>
          <h1 className="page-title" style={{ textAlign:"left", fontSize:"1.8rem" }}>🛡️ {t("adminPanel")}</h1>
          <p style={{ color:"var(--green-pale)", fontSize:"0.85rem" }}>Platform overview and management</p>
        </div>
        <button className="btn-secondary" onClick={loadAll}>🔄 Refresh</button>
      </div>

      {msg.text && <div className={`alert alert-${msg.type} mb-3`}>{msg.text}</div>}

      {/* Tabs */}
      <div className="tab-bar mb-3">
        {[
          { k:"overview", l:"📊 Overview" },
          { k:"users",   l:`👥 Users (${users.length})` },
          { k:"orders",  l:`📦 Orders (${orders.length})` },
          { k:"crops",   l:`🌾 Crops (${crops.length})` },
          { k:"farmers", l:`🌱 Farmers` },
        ].map(tb => (
          <button key={tb.k} className={`tab-btn ${tab===tb.k?"active":""}`} onClick={() => setTab(tb.k)}>
            {tb.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loader-wrapper"><div className="loader"></div><p className="loader-text">{t("loading")}</p></div>
      ) : (
        <>
          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <>
              <div className="grid-4 mb-3">
                {[
                  { icon:"👥", label:"Total Users",    value: stats.totalUsers },
                  { icon:"🌾", label:"Farmers",         value: stats.farmers },
                  { icon:"🛒", label:"Customers",       value: stats.customers },
                  { icon:"🚚", label:"Agents",          value: stats.agents },
                ].map((s,i)=>(
                  <div className="stat-card" key={i}>
                    <span className="stat-icon">{s.icon}</span>
                    <div className="stat-value">{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="grid-4 mb-3">
                {[
                  { icon:"📦", label:"Total Orders",    value: stats.totalOrders },
                  { icon:"⏳", label:"Pending Orders",  value: stats.pendingOrders },
                  { icon:"✅", label:"Delivered",        value: stats.deliveredOrders },
                  { icon:"💰", label:"Total Revenue",   value: `₹${stats.totalRevenue.toLocaleString()}` },
                ].map((s,i)=>(
                  <div className="stat-card" key={i}>
                    <span className="stat-icon">{s.icon}</span>
                    <div className="stat-value">{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="grid-2">
                <div className="glass-card">
                  <h3 className="section-title">🌾 Crop Stats</h3>
                  <div className="toggle-row">
                    <span className="toggle-label">Total Listings</span>
                    <strong style={{ color:"var(--yellow-wheat)" }}>{stats.totalCrops}</strong>
                  </div>
                  <div className="toggle-row">
                    <span className="toggle-label">Organic Certified</span>
                    <strong style={{ color:"var(--green-light)" }}>{stats.organicCrops}</strong>
                  </div>
                  <div className="toggle-row">
                    <span className="toggle-label">Non-Organic</span>
                    <strong style={{ color:"var(--text-muted)" }}>{stats.totalCrops - stats.organicCrops}</strong>
                  </div>
                </div>
                <div className="glass-card">
                  <h3 className="section-title">📊 Order Breakdown</h3>
                  {["pending","confirmed","processing","assigned","picked_up","in_transit","delivered","cancelled"].map(s => {
                    const c = orders.filter(o=>o.status===s).length;
                    if (!c) return null;
                    return (
                      <div className="toggle-row" key={s}>
                        <span className="toggle-label capitalize">{s.replace("_"," ")}</span>
                        <span className={`badge ${orderColor[s]||"badge-blue"}`}>{c}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── USERS ── */}
          {tab === "users" && (
            <div className="glass-card" style={{ overflowX:"auto" }}>
              <table className="rs-table">
                <thead>
                  <tr>
                    <th>Name</th><th>Email</th><th>Phone</th>
                    <th>Role</th><th>Verified</th><th>Joined</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id}>
                      <td><strong style={{ color:"var(--cream)" }}>{u.name||"—"}</strong></td>
                      <td style={{ color:"var(--green-pale)", fontSize:"0.85rem" }}>{u.email}</td>
                      <td style={{ color:"var(--text-muted)", fontSize:"0.82rem" }}>{u.phone||"—"}</td>
                      <td>
                        <select
                          value={u.role}
                          onChange={(e) => changeRole(u._id, e.target.value)}
                          style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(82,183,136,0.25)", borderRadius:6, color:"var(--cream)", padding:"3px 6px", fontSize:"0.8rem", cursor:"pointer" }}
                        >
                          {["farmer","customer","agent","admin"].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td><span className={`badge ${u.isVerified?"badge-green":"badge-red"}`}>{u.isVerified?"✅":"⏳"}</span></td>
                      <td style={{ color:"var(--text-muted)", fontSize:"0.78rem" }}>
                        {new Date(u.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td>
                        {u.role !== "admin" && (
                          <button className="btn-danger" style={{ padding:"0.35rem 0.75rem", fontSize:"0.78rem" }} onClick={() => deleteUser(u._id, u.name)}>
                            🗑️ Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── ORDERS ── */}
          {tab === "orders" && (
            <div className="glass-card" style={{ overflowX:"auto" }}>
              <table className="rs-table">
                <thead>
                  <tr>
                    <th>Order ID</th><th>Crop</th><th>Customer</th>
                    <th>Qty</th><th>Amount</th><th>Payment</th><th>Status</th><th>Date</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o._id}>
                      <td style={{ fontSize:"0.78rem", color:"var(--text-muted)" }}>#{o._id.substring(0,8).toUpperCase()}</td>
                      <td><strong style={{ color:"var(--cream)" }}>{o.crop?.name || "—"}</strong></td>
                      <td style={{ color:"var(--green-pale)", fontSize:"0.85rem" }}>{o.customer?.name || "—"}</td>
                      <td style={{ color:"var(--cream)" }}>{o.quantity}</td>
                      <td style={{ color:"var(--yellow-wheat)", fontWeight:700 }}>₹{(o.totalAmount||0).toLocaleString()}</td>
                      <td><span className="badge badge-blue">{o.paymentMode||"cod"}</span></td>
                      <td>
                        <select
                          value={o.status}
                          onChange={(e) => updateOrderStatus(o._id, e.target.value)}
                          style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(82,183,136,0.25)", borderRadius:6, color:"var(--cream)", padding:"3px 6px", fontSize:"0.78rem", cursor:"pointer" }}
                        >
                          {["pending","confirmed","processing","assigned","picked_up","in_transit","delivered","cancelled"].map(s =>
                            <option key={s} value={s}>{s.replace("_"," ")}</option>
                          )}
                        </select>
                      </td>
                      <td style={{ color:"var(--text-muted)", fontSize:"0.75rem" }}>
                        {new Date(o.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td>
                        <span className={`badge ${orderColor[o.status]||"badge-blue"}`}>{o.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── CROPS ── */}
          {tab === "crops" && (
            <div className="grid-auto">
              {crops.map(c => (
                <div className="crop-card" key={c._id}>
                  {c.image
                    ? <img src={`http://localhost:5000${c.image}`} alt={c.name} />
                    : <div style={{ height:120, background:"linear-gradient(135deg,#1a4a2e,#2d7a4f)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"2.5rem" }}>🌿</div>
                  }
                  <div className="crop-card-body">
                    <div className="flex-between">
                      <h3>{c.name}</h3>
                      {c.isOrganic && <span className="organic-tag">🌿</span>}
                    </div>
                    <div className="crop-price">₹{c.price}/{c.unit||"kg"}</div>
                    <p style={{ fontSize:"0.78rem", color:"var(--text-muted)", marginBottom:"0.75rem" }}>
                      {c.quantity} {c.unit||"kg"} • {c.category}
                    </p>
                    <button className="btn-danger" style={{ width:"100%", padding:"0.45rem" }} onClick={() => removeCrop(c._id)}>
                      🗑️ Remove Listing
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── FARMERS ── */}
          {tab === "farmers" && (
            <div className="glass-card" style={{ overflowX:"auto" }}>
              <table className="rs-table">
                <thead>
                  <tr>
                    <th>Name</th><th>Email</th><th>Phone</th>
                    <th>Location</th><th>Language</th><th>Joined</th><th>Verify</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u=>u.role==="farmer").map(u => (
                    <tr key={u._id}>
                      <td><strong style={{ color:"var(--cream)" }}>{u.name||"—"}</strong></td>
                      <td style={{ color:"var(--green-pale)", fontSize:"0.82rem" }}>{u.email}</td>
                      <td style={{ color:"var(--text-muted)", fontSize:"0.82rem" }}>{u.phone||"—"}</td>
                      <td style={{ color:"var(--text-muted)", fontSize:"0.78rem" }}>{u.location?.substring(0,30)||"—"}</td>
                      <td><span className="badge badge-blue">{u.language||"en"}</span></td>
                      <td style={{ color:"var(--text-muted)", fontSize:"0.75rem" }}>
                        {new Date(u.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td>
                        <span className={`badge ${u.isVerified?"badge-green":"badge-yellow"}`}>
                          {u.isVerified ? "✅ Verified" : "⏳ Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
