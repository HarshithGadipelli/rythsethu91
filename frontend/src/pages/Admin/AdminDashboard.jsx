import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import { useVoiceInput } from "../../utils/useVoiceInput";
import AutoSuggestInput from "../../components/AutoSuggestInput";
import API from "../../api/api";
import { io } from "socket.io-client";

const TABS = ["overview","users","verification","orders","deliveries","profit"];

export default function AdminDashboard() {
  const { user } = useAuth();
  const { t, lang } = useLang();

  const [tab, setTab] = useState("overview");
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [crops, setCrops] = useState([]);
  const [agents, setAgents] = useState([]);
  const [stats, setStats] = useState({});
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type:"", text:"" });
  const [assignModal, setAssignModal] = useState(null);
  const [search, setSearch] = useState("");
  const { listening, activeField, interim, startListening } = useVoiceInput(lang || "en");

  useEffect(() => {
    loadAll();
    const socket = io("http://localhost:5000");
    socket.on("order_created", () => loadAll());
    socket.on("order_updated", () => loadAll());
    socket.on("delivery_updated", () => loadAll());
    return () => socket.disconnect();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [ur, or, cr, ag, st, dl] = await Promise.all([
        API.get("/admin/users"),
        API.get("/admin/orders"),
        API.get("/crops"),
        API.get("/admin/agents"),
        API.get("/admin/stats"),
        API.get("/admin/deliveries"),
      ]);
      setUsers(ur.data);
      setOrders(or.data);
      setCrops(cr.data);
      setAgents(ag.data);
      setStats(st.data);
      setDeliveries(dl.data);
    } catch(e) {
      setMsg({ type:"error", text:"Failed to load data." });
    } finally { setLoading(false); }
  };

  const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg({ type:"", text:"" }), 3000); };

  const deleteUser = async (id, name) => {
    if (!confirm(`Remove user "${name}"?`)) return;
    try { await API.delete(`/admin/users/${id}`); flash("success",`✅ User "${name}" removed.`); loadAll(); }
    catch { flash("error","Failed to delete user."); }
  };

  const changeRole = async (id, role) => {
    try { await API.put(`/admin/users/${id}/role`, { role }); flash("success",`✅ Role updated.`); loadAll(); }
    catch { flash("error","Failed to update role."); }
  };

  const verifyFarmer = async (id, name) => {
    try { await API.put(`/admin/users/${id}/verify`); flash("success",`✅ ${name} is now verified!`); loadAll(); }
    catch { flash("error","Failed to verify."); }
  };

  const rejectFarmer = async (id, name) => {
    const reason = prompt(`Reason for rejecting ${name}?`);
    if (!reason) return;
    try { await API.put(`/admin/users/${id}/reject`, { reason }); flash("success",`❌ ${name} rejected.`); loadAll(); }
    catch { flash("error","Failed to reject."); }
  };

  const updateOrderStatus = async (id, status) => {
    try { await API.put(`/orders/${id}/status`, { status }); flash("success","✅ Order status updated."); loadAll(); }
    catch { flash("error","Failed to update order."); }
  };

  const assignAgent = async (orderId, agentId) => {
    try {
      await API.post("/admin/delivery/assign", { orderId, agentId });
      flash("success","✅ Delivery agent assigned!");
      setAssignModal(null);
      loadAll();
    } catch { flash("error","Failed to assign agent."); }
  };

  const roleColor = { farmer:"badge-green", customer:"badge-blue", agent:"badge-yellow", admin:"badge-red" };
  const orderColor = { pending:"badge-yellow", confirmed:"badge-blue", processing:"badge-blue", assigned:"badge-yellow", picked_up:"badge-blue", in_transit:"badge-blue", delivered:"badge-green", cancelled:"badge-red" };

  const lowerSearch = search.toLowerCase();
  const filteredUsers = users.filter(u => u.name?.toLowerCase().includes(lowerSearch) || u.email?.toLowerCase().includes(lowerSearch));
  const filteredOrders = orders.filter(o => o.billNumber?.toLowerCase().includes(lowerSearch) || o.crop?.name?.toLowerCase().includes(lowerSearch) || o.customer?.name?.toLowerCase().includes(lowerSearch));
  const filteredDeliveries = deliveries.filter(d => d.trackingCode?.toLowerCase().includes(lowerSearch) || d.agent?.name?.toLowerCase().includes(lowerSearch));

  const pendingFarmers = filteredUsers.filter(u => u.role === "farmer" && !u.isVerified);
  const needsDelivery = filteredOrders.filter(o => ["confirmed","processing"].includes(o.status) && !o.agent && o.deliveryType !== "farm_pickup");

  return (
    <div className="page-wrapper" style={{ maxWidth:1400 }}>
      <div className="flex-between mb-3" style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="page-title" style={{ textAlign:"left", fontSize:"1.8rem" }}>🛡️ Admin Control Center</h1>
          <p style={{ color:"var(--green-pale)", fontSize:"0.85rem" }}>Full platform management & analytics</p>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ minWidth: 250 }}>
            <AutoSuggestInput
               value={search}
               onChange={setSearch}
               placeholder="🔍 Search users, orders..."
               fieldType="default"
               onSpeak={() => startListening((val) => {
                 if (typeof val === "function") setSearch(f=>val(f));
                 else setSearch(val);
               }, { replace: true, fieldId: "search" })}
               listening={listening && activeField === "search"}
               interim={interim}
            />
          </div>
          <button className="btn-secondary" onClick={loadAll}>🔄 Refresh</button>
        </div>
      </div>

      {msg.text && <div className={`alert alert-${msg.type} mb-3`}>{msg.text}</div>}

      {/* Tabs */}
      <div className="tab-bar mb-3" style={{ flexWrap:"wrap" }}>
        {[
          { k:"overview", l:"📊 Overview" },
          { k:"users",   l:`👥 Users (${users.length})` },
          { k:"verification", l:`🌾 Verify (${pendingFarmers.length})` },
          { k:"orders",  l:`📦 Orders (${orders.length})` },
          { k:"deliveries", l:`🚚 Delivery (${needsDelivery.length})` },
          { k:"profit",  l:"💰 Profit" },
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
              <div className="admin-stats-row">
                {[
                  { icon:"👥", label:"Total Users", value: stats.totalUsers || 0 },
                  { icon:"🌾", label:"Farmers", value: stats.farmers || 0 },
                  { icon:"🛒", label:"Customers", value: stats.customers || 0 },
                  { icon:"🚚", label:"Agents", value: stats.agents || 0 },
                  { icon:"✅", label:"Verified Farmers", value: stats.verifiedFarmers || 0 },
                  { icon:"⏳", label:"Pending Verify", value: stats.pendingFarmers || 0 },
                ].map((s,i)=>(
                  <div className="stat-card" key={i}>
                    <span className="stat-icon">{s.icon}</span>
                    <div className="stat-value">{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="admin-stats-row">
                {[
                  { icon:"📦", label:"Total Orders", value: stats.totalOrders || 0 },
                  { icon:"⏳", label:"Pending", value: stats.pendingOrders || 0 },
                  { icon:"✅", label:"Delivered", value: stats.deliveredOrders || 0 },
                  { icon:"❌", label:"Cancelled", value: stats.cancelledOrders || 0 },
                  { icon:"💰", label:"Revenue", value: `₹${(stats.totalRevenue || 0).toLocaleString()}` },
                  { icon:"📈", label:"Platform Profit", value: `₹${(stats.platformProfit || 0).toLocaleString()}` },
                ].map((s,i)=>(
                  <div className="stat-card" key={i}>
                    <span className="stat-icon">{s.icon}</span>
                    <div className="stat-value">{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Quick actions */}
              <div className="grid-2">
                <div className="glass-card">
                  <h3 className="section-title">⚠️ Needs Attention</h3>
                  <div className="toggle-row"><span className="toggle-label">Pending Verifications</span><span className="badge badge-yellow">{pendingFarmers.length}</span></div>
                  <div className="toggle-row"><span className="toggle-label">Orders Awaiting Delivery</span><span className="badge badge-yellow">{needsDelivery.length}</span></div>
                  <div className="toggle-row"><span className="toggle-label">Pending Orders</span><span className="badge badge-yellow">{stats.pendingOrders || 0}</span></div>
                </div>
                <div className="glass-card">
                  <h3 className="section-title">📊 Revenue by Category</h3>
                  {stats.revenueByCategory && Object.entries(stats.revenueByCategory).map(([cat, rev]) => (
                    <div className="toggle-row" key={cat}>
                      <span className="toggle-label capitalize">{cat}</span>
                      <strong style={{ color:"var(--yellow-wheat)" }}>₹{rev.toLocaleString()}</strong>
                    </div>
                  ))}
                  {(!stats.revenueByCategory || Object.keys(stats.revenueByCategory).length === 0) && (
                    <p style={{ color:"var(--text-muted)", fontSize:"0.85rem" }}>No revenue data yet</p>
                  )}
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
                  {filteredUsers.map(u => (
                    <tr key={u._id}>
                      <td><strong style={{ color:"var(--cream)" }}>{u.name||"—"}</strong></td>
                      <td style={{ color:"var(--green-pale)", fontSize:"0.85rem" }}>{u.email}</td>
                      <td style={{ color:"var(--text-muted)", fontSize:"0.82rem" }}>{u.phone||"—"}</td>
                      <td>
                        <select value={u.role} onChange={(e) => changeRole(u._id, e.target.value)}
                          style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(82,183,136,0.25)", borderRadius:6, color:"var(--cream)", padding:"3px 6px", fontSize:"0.8rem", cursor:"pointer" }}>
                          {["farmer","customer","agent","admin"].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td><span className={`badge ${u.isVerified?"badge-green":"badge-red"}`}>{u.isVerified?"✅":"⏳"}</span></td>
                      <td style={{ color:"var(--text-muted)", fontSize:"0.78rem" }}>{new Date(u.createdAt).toLocaleDateString("en-IN")}</td>
                      <td>
                        {u.role !== "admin" && (
                          <button className="btn-danger" style={{ padding:"0.35rem 0.75rem", fontSize:"0.78rem" }} onClick={() => deleteUser(u._id, u.name)}>🗑️</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── FARMER VERIFICATION ── */}
          {tab === "verification" && (
            <div>
              {pendingFarmers.length === 0 ? (
                <div className="glass-card text-center" style={{ padding:"3rem" }}>
                  <p style={{ fontSize:"3rem" }}>✅</p>
                  <p style={{ color:"var(--green-pale)", marginTop:"1rem" }}>All farmers are verified! No pending requests.</p>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
                  {pendingFarmers.map(u => (
                    <div className="glass-card" key={u._id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"1rem" }}>
                      <div style={{ flex:1, minWidth:200 }}>
                        <h3 style={{ color:"var(--cream)", fontWeight:700 }}>{u.name}</h3>
                        <p style={{ color:"var(--green-pale)", fontSize:"0.82rem" }}>{u.email} • {u.phone || "No phone"}</p>
                        <p style={{ color:"var(--text-muted)", fontSize:"0.78rem" }}>📍 {u.location || "No location"}</p>
                        {u.aadhaar && <p style={{ color:"var(--text-muted)", fontSize:"0.78rem" }}>🪪 Aadhaar: {u.aadhaar}</p>}
                        <p style={{ color:"var(--text-muted)", fontSize:"0.72rem" }}>Joined: {new Date(u.createdAt).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}</p>
                      </div>
                      <div style={{ display:"flex", gap:"0.75rem" }}>
                        <button className="btn-primary" style={{ width:"auto", padding:"0.6rem 1.25rem" }} onClick={() => verifyFarmer(u._id, u.name)}>
                          ✅ Approve
                        </button>
                        <button className="btn-danger" style={{ padding:"0.6rem 1.25rem" }} onClick={() => rejectFarmer(u._id, u.name)}>
                          ❌ Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ORDERS ── */}
          {tab === "orders" && (
            <div className="glass-card" style={{ overflowX:"auto" }}>
              <table className="rs-table">
                <thead>
                  <tr>
                    <th>Order ID</th><th>Crop</th><th>Customer</th>
                    <th>Qty</th><th>Amount</th><th>Type</th><th>Payment</th><th>Status</th><th>Agent</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(o => (
                    <tr key={o._id}>
                      <td style={{ fontSize:"0.75rem", color:"var(--text-muted)" }}>#{o.billNumber || o._id.substring(0,8).toUpperCase()}</td>
                      <td><strong style={{ color:"var(--cream)" }}>{o.crop?.name || "—"}</strong></td>
                      <td style={{ color:"var(--green-pale)", fontSize:"0.85rem" }}>{o.customer?.name || "—"}</td>
                      <td style={{ color:"var(--cream)" }}>{o.quantity}</td>
                      <td style={{ color:"var(--yellow-wheat)", fontWeight:700 }}>₹{(o.totalAmount||0).toLocaleString()}</td>
                      <td><span className={`badge ${o.deliveryType==="farm_pickup"?"badge-green":"badge-blue"}`}>{o.deliveryType==="farm_pickup"?"🏡 Farm":"🚚 Delivery"}</span></td>
                      <td><span className="badge badge-blue">{o.paymentMode||"cod"}</span></td>
                      <td>
                        <select value={o.status} onChange={(e) => updateOrderStatus(o._id, e.target.value)}
                          style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(82,183,136,0.25)", borderRadius:6, color:"var(--cream)", padding:"3px 6px", fontSize:"0.78rem", cursor:"pointer" }}>
                          {["pending","confirmed","processing","assigned","picked_up","in_transit","delivered","cancelled"].map(s =>
                            <option key={s} value={s}>{s.replace("_"," ")}</option>
                          )}
                        </select>
                      </td>
                      <td style={{ fontSize:"0.78rem", color: o.agent ? "var(--green-light)" : "var(--text-muted)" }}>
                        {o.agent?.name || "None"}
                      </td>
                      <td>
                        {!o.agent && o.deliveryType !== "farm_pickup" && (
                          <button className="btn-warn" style={{ fontSize:"0.72rem", padding:"0.3rem 0.5rem" }} onClick={() => setAssignModal(o)}>
                            🚚 Assign
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── DELIVERY MANAGEMENT ── */}
          {tab === "deliveries" && (
            <div>
              <h3 className="section-title mb-2">📦 Orders Needing Delivery Assignment</h3>
              {needsDelivery.length === 0 ? (
                <div className="glass-card text-center" style={{ padding:"2rem" }}>
                  <p style={{ color:"var(--green-pale)" }}>✅ All delivery orders have been assigned!</p>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:"1rem", marginBottom:"2rem" }}>
                  {needsDelivery.map(o => (
                    <div className="glass-card" key={o._id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"1rem" }}>
                      <div>
                        <h4 style={{ color:"var(--cream)" }}>#{o.billNumber || o._id.substring(0,8).toUpperCase()} — {o.crop?.name}</h4>
                        <p style={{ color:"var(--green-pale)", fontSize:"0.82rem" }}>Customer: {o.customer?.name} • ₹{(o.totalAmount||0).toLocaleString()}</p>
                        <p style={{ color:"var(--text-muted)", fontSize:"0.78rem" }}>📍 {o.deliveryAddress?.substring(0,50) || "No address"}</p>
                      </div>
                      <button className="btn-primary" style={{ width:"auto" }} onClick={() => setAssignModal(o)}>🚚 Assign Agent</button>
                    </div>
                  ))}
                </div>
              )}

              <h3 className="section-title mb-2 mt-3">📋 Active Deliveries</h3>
              <div className="glass-card" style={{ overflowX:"auto" }}>
                <table className="rs-table">
                  <thead><tr><th>Tracking</th><th>Agent</th><th>Pickup</th><th>Deliver To</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {filteredDeliveries.map(d => (
                      <tr key={d._id}>
                        <td style={{ color:"var(--yellow-wheat)", fontSize:"0.82rem", fontWeight:600 }}>{d.trackingCode || "—"}</td>
                        <td style={{ color:"var(--cream)" }}>{d.agent?.name || "—"}</td>
                        <td style={{ color:"var(--text-muted)", fontSize:"0.78rem" }}>{d.pickupLocation?.substring(0,30) || "—"}</td>
                        <td style={{ color:"var(--text-muted)", fontSize:"0.78rem" }}>{d.deliveryLocation?.substring(0,30) || "—"}</td>
                        <td><span className={`badge ${d.status==="delivered"?"badge-green":d.status==="in_transit"?"badge-blue":"badge-yellow"}`}>{d.status?.replace("_"," ")}</span></td>
                        <td style={{ color:"var(--text-muted)", fontSize:"0.75rem" }}>{new Date(d.createdAt).toLocaleDateString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── PROFIT MANAGEMENT ── */}
          {tab === "profit" && (
            <div>
              <div className="admin-stats-row">
                <div className="earnings-card">
                  <div className="earnings-value">₹{(stats.totalRevenue || 0).toLocaleString()}</div>
                  <div className="earnings-label">Total Revenue</div>
                </div>
                <div className="earnings-card">
                  <div className="earnings-value">₹{(stats.totalPlatformFees || 0).toLocaleString()}</div>
                  <div className="earnings-label">Platform Fees (5%)</div>
                </div>
                <div className="earnings-card">
                  <div className="earnings-value">₹{(stats.totalDeliveryCharges || 0).toLocaleString()}</div>
                  <div className="earnings-label">Delivery Revenue</div>
                </div>
                <div className="earnings-card">
                  <div className="earnings-value">₹{(stats.platformProfit || 0).toLocaleString()}</div>
                  <div className="earnings-label">Net Platform Profit</div>
                </div>
              </div>

              <div className="glass-card mt-3">
                <h3 className="section-title">📊 Revenue Breakdown by Category</h3>
                {stats.revenueByCategory && Object.entries(stats.revenueByCategory).length > 0 ? (
                  Object.entries(stats.revenueByCategory).map(([cat, rev]) => {
                    const pct = stats.totalRevenue ? Math.round((rev / stats.totalRevenue) * 100) : 0;
                    return (
                      <div key={cat} style={{ marginBottom:"1rem" }}>
                        <div className="flex-between" style={{ marginBottom:"0.3rem" }}>
                          <span style={{ color:"var(--cream)", fontSize:"0.9rem", textTransform:"capitalize" }}>{cat}</span>
                          <span style={{ color:"var(--yellow-wheat)", fontWeight:700 }}>₹{rev.toLocaleString()} ({pct}%)</span>
                        </div>
                        <div style={{ height:8, background:"rgba(255,255,255,0.1)", borderRadius:4, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${pct}%`, background:"var(--gradient-btn)", borderRadius:4, transition:"width 0.5s ease" }}></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p style={{ color:"var(--text-muted)" }}>No revenue data yet. Revenue will appear once orders are placed.</p>
                )}
              </div>

              <div className="glass-card mt-3">
                <h3 className="section-title">💵 Farmer Payouts</h3>
                <p style={{ color:"var(--green-pale)", fontSize:"0.85rem", marginBottom:"1rem" }}>
                  Farmer payout = Order subtotal - Platform fee (5%)
                </p>
                <table className="rs-table">
                  <thead><tr><th>Farmer</th><th>Orders</th><th>Revenue</th><th>Platform Fee</th><th>Payout</th></tr></thead>
                  <tbody>
                    {users.filter(u => u.role === "farmer").map(farmer => {
                      const farmerOrders = orders.filter(o => (o.farmer?._id || o.farmer) === farmer._id);
                      const revenue = farmerOrders.reduce((a, o) => a + (o.subtotal || o.totalAmount || 0), 0);
                      const fee = Math.round(revenue * 0.05);
                      return (
                        <tr key={farmer._id}>
                          <td><strong style={{ color:"var(--cream)" }}>{farmer.name}</strong></td>
                          <td style={{ color:"var(--cream)" }}>{farmerOrders.length}</td>
                          <td style={{ color:"var(--yellow-wheat)" }}>₹{revenue.toLocaleString()}</td>
                          <td style={{ color:"var(--text-muted)" }}>₹{fee.toLocaleString()}</td>
                          <td style={{ color:"var(--green-light)", fontWeight:700 }}>₹{(revenue - fee).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── ASSIGN AGENT MODAL ── */}
      {assignModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(8px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}
          onClick={(e) => { if (e.target === e.currentTarget) setAssignModal(null); }}>
          <div className="glass-card-dark" style={{ maxWidth:480, width:"100%" }}>
            <h3 className="section-title">🚚 Assign Delivery Agent</h3>
            <p style={{ color:"var(--green-pale)", fontSize:"0.85rem", marginBottom:"1rem" }}>
              Order: <strong style={{ color:"var(--yellow-wheat)" }}>#{assignModal.billNumber || assignModal._id?.substring(0,8)}</strong> — {assignModal.crop?.name}
            </p>
            <p style={{ color:"var(--text-muted)", fontSize:"0.82rem", marginBottom:"1.5rem" }}>
              📍 Deliver to: {assignModal.deliveryAddress?.substring(0,60) || "No address"}
            </p>

            {agents.length === 0 ? (
              <p style={{ color:"var(--text-muted)" }}>No delivery agents registered yet.</p>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
                {agents.map(a => (
                  <div key={a._id} className="delivery-option" onClick={() => assignAgent(assignModal._id, a._id)}
                    style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <h4>{a.name}</h4>
                      <p>{a.phone || "No phone"} • {a.location?.substring(0,25) || "No location"}</p>
                    </div>
                    <button className="btn-primary" style={{ width:"auto", padding:"0.5rem 1rem", fontSize:"0.82rem" }}>Assign</button>
                  </div>
                ))}
              </div>
            )}

            <button className="btn-secondary mt-2" style={{ width:"100%" }} onClick={() => setAssignModal(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
