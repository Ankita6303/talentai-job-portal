import { useState, useEffect, useCallback } from "react";


const API = "https://talentai-job-portal.onrender.com";

const token = () => localStorage.getItem("talentai_token");
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token()}`,
});

// ─── tiny helpers ────────────────────────────────────────────
const badge = (verdict) => {
  const map = {
    "Strong Match": { bg: "#d1fae5", color: "#065f46" },
    "Good Match":   { bg: "#dbeafe", color: "#1e40af" },
    "Partial Match":{ bg: "#fef9c3", color: "#854d0e" },
    "Low Match":    { bg: "#fee2e2", color: "#991b1b" },
  };
  const s = map[verdict] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{ background: s.bg, color: s.color, padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
      {verdict || "—"}
    </span>
  );
};

const recBadge = (rec) => {
  const map = {
    "Advance to Interview": { bg: "#d1fae5", color: "#065f46" },
    Hold:                   { bg: "#fef9c3", color: "#854d0e" },
    Reject:                 { bg: "#fee2e2", color: "#991b1b" },
  };
  const s = map[rec] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{ background: s.bg, color: s.color, padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
      {rec || "—"}
    </span>
  );
};

const statusBadge = (status) => {
  const map = {
    pending:    { bg: "#f3f4f6", color: "#374151" },
    reviewed:   { bg: "#dbeafe", color: "#1e40af" },
    shortlisted:{ bg: "#d1fae5", color: "#065f46" },
    rejected:   { bg: "#fee2e2", color: "#991b1b" },
    hired:      { bg: "#ede9fe", color: "#4c1d95" },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ background: s.bg, color: s.color, padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>
      {status || "pending"}
    </span>
  );
};

// ─── Score Ring ───────────────────────────────────────────────
function ScoreRing({ score }) {
  const r = 26, c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score || 0));
  const dash = (pct / 100) * c;
  const col = pct >= 70 ? "#10b981" : pct >= 45 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={64} height={64} viewBox="0 0 64 64">
      <circle cx={32} cy={32} r={r} fill="none" stroke="#e5e7eb" strokeWidth={6} />
      <circle cx={32} cy={32} r={r} fill="none" stroke={col} strokeWidth={6}
        strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
        transform="rotate(-90 32 32)" />
      <text x={32} y={37} textAnchor="middle" fontSize={14} fontWeight={700} fill={col}>{pct}</text>
    </svg>
  );
}

// ─── Stat Card ────────────────────────────────────────────────
function StatCard({ label, value, color = "#6366f1" }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "1.2rem 1.5rem", borderTop: `4px solid ${color}` }}>
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#111827" }}>{value ?? "—"}</div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}
        onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#6b7280", lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Job Form ─────────────────────────────────────────────────
const emptyJob = { title: "", department: "", location: "", type: "Full-time", salary_min: "", salary_max: "", description: "", skills: "", requirements: "", experience_required: "", roles_responsibilities: "" };

function JobForm({ initial = emptyJob, onSave, onCancel, saving }) {
  const [form, setForm] = useState({ ...emptyJob, ...initial,
    skills: Array.isArray(initial.skills) ? initial.skills.join(", ") : initial.skills || "",
    requirements: Array.isArray(initial.requirements) ? initial.requirements.join("\n") : initial.requirements || "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const inp = {
    width: "100%", padding: "9px 12px", border: "1px solid #d1d5db",
    borderRadius: 8, fontSize: 14, boxSizing: "border-box", outline: "none",
    fontFamily: "inherit",
  };

  const handleSubmit = () => {
    if (!form.title || !form.department || !form.description)
      return alert("Title, department and description are required.");
    const payload = {
      ...form,
      skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
      requirements: form.requirements.split("\n").map((s) => s.trim()).filter(Boolean),
      salary_min: form.salary_min || null,
      salary_max: form.salary_max || null,
    };
    onSave(payload);
  };

  const row = { marginBottom: 14 };
  const label = { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 4 };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={row}>
          <label style={label}>Job Title *</label>
          <input style={inp} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Frontend Developer" />
        </div>
        <div style={row}>
          <label style={label}>Department *</label>
          <input style={inp} value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="e.g. Engineering" />
        </div>
        <div style={row}>
          <label style={label}>Location</label>
          <input style={inp} value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Remote / Mumbai" />
        </div>
        <div style={row}>
          <label style={label}>Job Type</label>
          <select style={inp} value={form.type} onChange={(e) => set("type", e.target.value)}>
            {["Full-time", "Part-time", "Contract", "Internship", "Freelance"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={row}>
          <label style={label}>Min Salary (₹)</label>
          <input style={inp} type="number" value={form.salary_min} onChange={(e) => set("salary_min", e.target.value)} placeholder="e.g. 500000" />
        </div>
        <div style={row}>
          <label style={label}>Max Salary (₹)</label>
          <input style={inp} type="number" value={form.salary_max} onChange={(e) => set("salary_max", e.target.value)} placeholder="e.g. 1200000" />
        </div>
      </div>

      <div style={row}>
        <label style={label}>Experience Required</label>
        <input style={inp} value={form.experience_required} onChange={(e) => set("experience_required", e.target.value)} placeholder="e.g. 2-4 years in React development" />
      </div>

      <div style={row}>
        <label style={label}>Required Skills <span style={{ color: "#9ca3af", fontWeight: 400 }}>(comma separated)</span></label>
        <input style={inp} value={form.skills} onChange={(e) => set("skills", e.target.value)} placeholder="React, TypeScript, Node.js, SQL" />
      </div>

      <div style={row}>
        <label style={label}>Roles & Responsibilities</label>
        <textarea style={{ ...inp, height: 90, resize: "vertical" }} value={form.roles_responsibilities}
          onChange={(e) => set("roles_responsibilities", e.target.value)}
          placeholder="• Lead frontend development&#10;• Collaborate with design team&#10;• Code reviews" />
      </div>

      <div style={row}>
        <label style={label}>Requirements <span style={{ color: "#9ca3af", fontWeight: 400 }}>(one per line)</span></label>
        <textarea style={{ ...inp, height: 100, resize: "vertical" }} value={form.requirements}
          onChange={(e) => set("requirements", e.target.value)}
          placeholder="Bachelor's degree in CS&#10;3+ years React experience&#10;Strong problem-solving skills" />
      </div>

      <div style={{ ...row, marginBottom: 0 }}>
        <label style={label}>Job Description *</label>
        <textarea style={{ ...inp, height: 120, resize: "vertical" }} value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Describe the role, company culture, what makes this role exciting..." />
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
        <button onClick={onCancel} style={{ padding: "9px 20px", border: "1px solid #d1d5db", borderRadius: 8, background: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={saving}
          style={{ padding: "9px 24px", border: "none", borderRadius: 8, background: "#4f46e5", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 14, opacity: saving ? 0.7 : 1 }}>
          {saving ? "Saving…" : "Save Job"}
        </button>
      </div>
    </div>
  );
}

// ─── Login Screen ─────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inp = { width: "100%", padding: "11px 14px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 15, boxSizing: "border-box", outline: "none", fontFamily: "inherit", marginBottom: 12 };

  const submit = async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Login failed");
      localStorage.setItem("talentai_token", d.token);
      onLogin(d.user);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#667eea22,#764ba222)", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "2.5rem 2rem", width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>⚡</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#111827" }}>TalentAI Admin</h1>
          <p style={{ margin: "6px 0 0", color: "#6b7280", fontSize: 14 }}>Sign in to manage jobs & applicants</p>
        </div>
        {error && <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 14px", borderRadius: 8, fontSize: 14, marginBottom: 14 }}>{error}</div>}
        <input style={inp} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input style={inp} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
        <button onClick={submit} disabled={loading}
          style={{ width: "100%", padding: "12px", border: "none", borderRadius: 10, background: "#4f46e5", color: "#fff", fontWeight: 700, fontSize: 16, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.8 : 1, marginTop: 4 }}>
          {loading ? "Signing in…" : "Sign In"}
        </button>
        <p style={{ textAlign: "center", fontSize: 13, color: "#9ca3af", marginTop: 16 }}>
          No account? <a href="#" onClick={async (e) => {
            e.preventDefault();
            const name = prompt("Your name?");
            if (!name) return;
            const r = await fetch(`${API}/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) });
            const d = await r.json();
            if (!r.ok) { alert(d.error); return; }
            localStorage.setItem("talentai_token", d.token);
            onLogin(d.user);
          }} style={{ color: "#4f46e5", fontWeight: 600 }}>Register</a>
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  MAIN ADMIN PANEL
// ══════════════════════════════════════════════════════════════
export default function AdminPanel() {
  const [user, setUser] = useState(() => {
    const t = localStorage.getItem("talentai_token");
    return t ? { name: "Admin" } : null;
  });
  const [tab, setTab] = useState("dashboard");
  const [jobs, setJobs] = useState([]);
  const [apps, setApps] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const [showJobForm, setShowJobForm] = useState(false);
  const [editJob, setEditJob] = useState(null);
  const [saving, setSaving] = useState(false);

  const [selectedApp, setSelectedApp] = useState(null);
  const [appFilter, setAppFilter] = useState("all");
  const [appSort, setAppSort] = useState("score");
  const [jobFilter, setJobFilter] = useState("all");

  const fetchJobs = useCallback(async () => {
    const r = await fetch(`${API}/jobs`, { headers: authHeaders() });
    const d = await r.json(); setJobs(Array.isArray(d) ? d : []);
  }, []);

  const fetchApps = useCallback(async () => {
    const r = await fetch(`${API}/applications?sort=${appSort}`, { headers: authHeaders() });
    const d = await r.json(); setApps(Array.isArray(d) ? d : []);
  }, [appSort]);

  const fetchStats = useCallback(async () => {
    const r = await fetch(`${API}/stats`, { headers: authHeaders() });
    const d = await r.json(); setStats(d);
  }, []);

  useEffect(() => { if (user) { fetchJobs(); fetchApps(); fetchStats(); } }, [user, fetchJobs, fetchApps, fetchStats]);

  // ── Job CRUD ──
  const saveJob = async (payload) => {
    setSaving(true);
    try {
      const url = editJob ? `${API}/jobs/${editJob.id}` : `${API}/jobs`;
      const method = editJob ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      await fetchJobs(); await fetchStats();
      setShowJobForm(false); setEditJob(null);
    } catch (e) { alert("Error: " + e.message); }
    finally { setSaving(false); }
  };

  const deleteJob = async (id) => {
    if (!confirm("Deactivate this job? Existing applications are kept.")) return;
    await fetch(`${API}/jobs/${id}`, { method: "DELETE", headers: authHeaders() });
    fetchJobs(); fetchStats();
  };

  const updateAppStatus = async (id, status, notes) => {
    await fetch(`${API}/applications/${id}/status`, {
      method: "PATCH", headers: authHeaders(),
      body: JSON.stringify({ status, recruiter_notes: notes }),
    });
    fetchApps();
    if (selectedApp?.id === id) setSelectedApp((a) => ({ ...a, status, recruiter_notes: notes }));
  };

  // ── Filtered apps ──
  const filteredApps = apps.filter((a) => {
    if (appFilter === "all") return true;
    if (appFilter === "advance") return a.ai_recommendation === "Advance to Interview";
    if (appFilter === "hold")    return a.ai_recommendation === "Hold";
    if (appFilter === "reject")  return a.ai_recommendation === "Reject";
    return true;
  }).filter((a) => jobFilter === "all" || a.job_id === jobFilter);

  if (!user) return <LoginScreen onLogin={setUser} />;

  const sideItems = [
    { key: "dashboard", label: "Dashboard",    icon: "📊" },
    { key: "jobs",      label: "Jobs",          icon: "💼" },
    { key: "applicants",label: "Applicants",    icon: "👥" },
  ];

  // ── styles ──
  const card = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "1.25rem 1.5rem", marginBottom: 16 };
  const th = { padding: "11px 14px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" };
  const td = { padding: "12px 14px", fontSize: 14, color: "#111827", borderBottom: "1px solid #f3f4f6", verticalAlign: "middle" };
  const btn = (bg = "#4f46e5", col = "#fff") => ({ padding: "8px 16px", border: "none", borderRadius: 8, background: bg, color: col, cursor: "pointer", fontWeight: 600, fontSize: 13 });

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: 220, background: "#1e1b4b", display: "flex", flexDirection: "column", padding: "24px 0", flexShrink: 0, position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "0 20px 24px", borderBottom: "1px solid #312e81" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>⚡ TalentAI</div>
          <div style={{ fontSize: 12, color: "#a5b4fc", marginTop: 2 }}>Admin Panel</div>
        </div>
        <nav style={{ flex: 1, padding: "16px 10px" }}>
          {sideItems.map((s) => (
            <button key={s.key} onClick={() => setTab(s.key)}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", border: "none", borderRadius: 10, background: tab === s.key ? "#4f46e5" : "transparent", color: tab === s.key ? "#fff" : "#a5b4fc", cursor: "pointer", fontWeight: 600, fontSize: 14, marginBottom: 4, textAlign: "left" }}>
              <span>{s.icon}</span>{s.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "16px 20px", borderTop: "1px solid #312e81" }}>
          <div style={{ fontSize: 13, color: "#a5b4fc", marginBottom: 8 }}>👤 {user.name || "Admin"}</div>
          <button onClick={() => { localStorage.removeItem("talentai_token"); setUser(null); }}
            style={{ ...btn("#312e81", "#a5b4fc"), width: "100%", textAlign: "center" }}>Sign Out</button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, padding: "28px 32px", overflowY: "auto" }}>

        {/* ════ DASHBOARD ════ */}
        {tab === "dashboard" && (
          <div>
            <h1 style={{ margin: "0 0 24px", fontSize: 26, fontWeight: 800, color: "#111827" }}>Dashboard</h1>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 16, marginBottom: 28 }}>
              <StatCard label="Total Applications" value={stats?.total ?? 0} color="#4f46e5" />
              <StatCard label="Avg AI Score" value={stats?.average_score ? `${stats.average_score}%` : "0%"} color="#10b981" />
              <StatCard label="Advance to Interview" value={stats?.by_recommendation?.["Advance to Interview"] ?? 0} color="#0ea5e9" />
              <StatCard label="Active Jobs" value={jobs.length} color="#f59e0b" />
            </div>

            {/* By Recommendation */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={card}>
                <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>AI Recommendations</h3>
                {stats?.by_recommendation ? Object.entries(stats.by_recommendation).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    {recBadge(k)}
                    <span style={{ fontWeight: 700, fontSize: 18 }}>{v}</span>
                  </div>
                )) : <p style={{ color: "#9ca3af" }}>No data yet</p>}
              </div>

              <div style={card}>
                <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Applications by Job</h3>
                {stats?.by_job?.length ? stats.by_job.map((j) => (
                  <div key={j.title} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, fontSize: 14 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{j.title}</div>
                      <div style={{ color: "#6b7280", fontSize: 12 }}>{j.department}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontWeight: 700 }}>{j.total}</span>
                      <span style={{ color: "#9ca3af", fontSize: 12, marginLeft: 6 }}>avg {j.avg_score}</span>
                    </div>
                  </div>
                )) : <p style={{ color: "#9ca3af" }}>No applications yet</p>}
              </div>
            </div>
          </div>
        )}

        {/* ════ JOBS ════ */}
        {tab === "jobs" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#111827" }}>Jobs ({jobs.length})</h1>
              <button onClick={() => { setEditJob(null); setShowJobForm(true); }} style={btn()}>+ Post New Job</button>
            </div>

            {jobs.length === 0 ? (
              <div style={{ ...card, textAlign: "center", padding: "3rem", color: "#9ca3af" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>💼</div>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No jobs posted yet</div>
                <button onClick={() => setShowJobForm(true)} style={btn()}>Post Your First Job</button>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}>
                  <thead><tr style={{ background: "#f9fafb" }}>
                    <th style={th}>Title</th>
                    <th style={th}>Department</th>
                    <th style={th}>Location</th>
                    <th style={th}>Type</th>
                    <th style={th}>Experience</th>
                    <th style={th}>Skills</th>
                    <th style={th}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {jobs.map((j) => (
                      <tr key={j.id} style={{ cursor: "default" }}>
                        <td style={{ ...td, fontWeight: 700 }}>{j.title}</td>
                        <td style={td}>{j.department}</td>
                        <td style={td}>{j.location || "—"}</td>
                        <td style={td}><span style={{ background: "#ede9fe", color: "#4c1d95", padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{j.type || "—"}</span></td>
                        <td style={td}>{j.experience_required || "—"}</td>
                        <td style={{ ...td, maxWidth: 200 }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {(Array.isArray(j.skills) ? j.skills : JSON.parse(j.skills || "[]")).slice(0, 3).map((s) => (
                              <span key={s} style={{ background: "#e0e7ff", color: "#3730a3", padding: "1px 8px", borderRadius: 999, fontSize: 11 }}>{s}</span>
                            ))}
                            {(Array.isArray(j.skills) ? j.skills : JSON.parse(j.skills || "[]")).length > 3 &&
                              <span style={{ color: "#9ca3af", fontSize: 11 }}>+{(Array.isArray(j.skills) ? j.skills : JSON.parse(j.skills || "[]")).length - 3} more</span>}
                          </div>
                        </td>
                        <td style={td}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => { setEditJob(j); setShowJobForm(true); }} style={btn("#e0e7ff", "#3730a3")}>Edit</button>
                            <button onClick={() => deleteJob(j.id)} style={btn("#fee2e2", "#991b1b")}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ════ APPLICANTS ════ */}
        {tab === "applicants" && (
          <div>
            <h1 style={{ margin: "0 0 20px", fontSize: 26, fontWeight: 800, color: "#111827" }}>Applicants ({filteredApps.length})</h1>

            {/* Filters */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
              <select value={appFilter} onChange={(e) => setAppFilter(e.target.value)}
                style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, background: "#fff" }}>
                <option value="all">All Recommendations</option>
                <option value="advance">Advance to Interview</option>
                <option value="hold">Hold</option>
                <option value="reject">Reject</option>
              </select>

              <select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}
                style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, background: "#fff" }}>
                <option value="all">All Jobs</option>
                {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>

              <select value={appSort} onChange={(e) => setAppSort(e.target.value)}
                style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, background: "#fff" }}>
                <option value="score">Sort: AI Score</option>
                <option value="date">Sort: Date</option>
                <option value="name">Sort: Name</option>
              </select>
            </div>

            {filteredApps.length === 0 ? (
              <div style={{ ...card, textAlign: "center", padding: "3rem", color: "#9ca3af" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>No applications yet</div>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}>
                  <thead><tr style={{ background: "#f9fafb" }}>
                    <th style={th}>Applicant</th>
                    <th style={th}>Job</th>
                    <th style={th}>AI Score</th>
                    <th style={th}>Verdict</th>
                    <th style={th}>Recommendation</th>
                    <th style={th}>Status</th>
                    <th style={th}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {filteredApps.map((a) => (
                      <tr key={a.id} style={{ cursor: "pointer" }} onClick={() => setSelectedApp(a)}>
                        <td style={td}>
                          <div style={{ fontWeight: 700 }}>{a.name}</div>
                          <div style={{ color: "#6b7280", fontSize: 12 }}>{a.email}</div>
                        </td>
                        <td style={td}>
                          <div style={{ fontWeight: 600 }}>{a.job_title}</div>
                          <div style={{ color: "#6b7280", fontSize: 12 }}>{a.department}</div>
                        </td>
                        <td style={{ ...td, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                          <ScoreRing score={a.ai_score} />
                        </td>
                        <td style={td}>{badge(a.ai_verdict)}</td>
                        <td style={td}>{recBadge(a.ai_recommendation)}</td>
                        <td style={td}>{statusBadge(a.status)}</td>
                        <td style={td} onClick={(e) => e.stopPropagation()}>
                          <select value={a.status || "pending"}
                            onChange={(e) => updateAppStatus(a.id, e.target.value, a.recruiter_notes)}
                            style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, background: "#fff" }}>
                            {["pending", "reviewed", "shortlisted", "rejected", "hired"].map((s) => <option key={s}>{s}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ════ Job Form Modal ════ */}
      {showJobForm && (
        <Modal title={editJob ? "Edit Job" : "Post New Job"} onClose={() => { setShowJobForm(false); setEditJob(null); }}>
          <JobForm initial={editJob || emptyJob} onSave={saveJob} onCancel={() => { setShowJobForm(false); setEditJob(null); }} saving={saving} />
        </Modal>
      )}

      {/* ════ Applicant Detail Modal ════ */}
      {selectedApp && (
        <Modal title={`${selectedApp.name} — ${selectedApp.job_title}`} onClose={() => setSelectedApp(null)}>
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div style={{ background: "#f9fafb", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                <ScoreRing score={selectedApp.ai_score} />
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>AI Score</div>
              </div>
              <div style={{ background: "#f9fafb", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Verdict</div>
                {badge(selectedApp.ai_verdict)}
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8, marginBottom: 4 }}>Recommendation</div>
                {recBadge(selectedApp.ai_recommendation)}
              </div>
              <div style={{ background: "#f9fafb", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Experience</div>
                <div style={{ fontWeight: 700 }}>{selectedApp.ai_experience_years ?? "—"} yrs</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8, marginBottom: 4 }}>Status</div>
                {statusBadge(selectedApp.status)}
              </div>
            </div>

            {selectedApp.ai_summary && (
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 14, lineHeight: 1.6 }}>
                {selectedApp.ai_summary}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>✅ Matched Skills</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {(Array.isArray(selectedApp.ai_matched_skills) ? selectedApp.ai_matched_skills : JSON.parse(selectedApp.ai_matched_skills || "[]")).map((s) => (
                    <span key={s} style={{ background: "#d1fae5", color: "#065f46", padding: "2px 9px", borderRadius: 999, fontSize: 12 }}>{s}</span>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>❌ Missing Skills</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {(Array.isArray(selectedApp.ai_missing_skills) ? selectedApp.ai_missing_skills : JSON.parse(selectedApp.ai_missing_skills || "[]")).map((s) => (
                    <span key={s} style={{ background: "#fee2e2", color: "#991b1b", padding: "2px 9px", borderRadius: 999, fontSize: 12 }}>{s}</span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>💪 Strengths</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#374151" }}>
                  {(Array.isArray(selectedApp.ai_strengths) ? selectedApp.ai_strengths : JSON.parse(selectedApp.ai_strengths || "[]")).map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>⚠️ Concerns</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#374151" }}>
                  {(Array.isArray(selectedApp.ai_concerns) ? selectedApp.ai_concerns : JSON.parse(selectedApp.ai_concerns || "[]")).map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            </div>

            {(Array.isArray(selectedApp.ai_interview_questions) ? selectedApp.ai_interview_questions : JSON.parse(selectedApp.ai_interview_questions || "[]")).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>🎤 Suggested Interview Questions</div>
                <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#374151" }}>
                  {(Array.isArray(selectedApp.ai_interview_questions) ? selectedApp.ai_interview_questions : JSON.parse(selectedApp.ai_interview_questions || "[]")).map((q, i) => <li key={i} style={{ marginBottom: 4 }}>{q}</li>)}
                </ol>
              </div>
            )}

            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Update Status</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                {["pending", "reviewed", "shortlisted", "rejected", "hired"].map((s) => (
                  <button key={s} onClick={() => updateAppStatus(selectedApp.id, s, selectedApp.recruiter_notes)}
                    style={{ ...btn(selectedApp.status === s ? "#4f46e5" : "#f3f4f6", selectedApp.status === s ? "#fff" : "#374151"), textTransform: "capitalize" }}>
                    {s}
                  </button>
                ))}
              </div>
              <textarea placeholder="Recruiter notes…" defaultValue={selectedApp.recruiter_notes || ""}
                onBlur={(e) => updateAppStatus(selectedApp.id, selectedApp.status, e.target.value)}
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box", minHeight: 80, resize: "vertical", fontFamily: "inherit" }} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}