import { useState, useEffect, useRef } from "react";
import PhotoPicker from "./PhotoPicker.jsx";
import SmartSkillsInput from "./SmartSkillsInput";
const API = import.meta.env.VITE_API_URL || "https://talentai-job-portal.onrender.com";

// ── helpers ───────────────────────────────────────────────────
const token = () => localStorage.getItem("student_token") || localStorage.getItem("talentai_token");
const authH = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });
const inp = {
  width: "100%", background: "#0f172a", border: "1px solid #1e293b",
  borderRadius: 8, color: "#f1f5f9", fontSize: 14, padding: "10px 12px",
  outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};
const lbl = { fontSize: 12, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 5 };
const card = { background: "#0f1117", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "22px 24px", marginBottom: 18 };

function Avatar({ name, photo, size = 72 }) {
  if (photo) return <img src={photo} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "3px solid #4f46e5" }} />;
  const initials = (name || "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 800, color: "#fff", border: "3px solid #4f46e5", flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function Spinner() {
  return <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid #334155", borderTopColor: "#60a5fa", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />;
}

function SkillTag({ skill, onRemove }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(79,70,229,0.1)", color: "#818cf8", border: "1px solid rgba(79,70,229,0.2)", padding: "4px 12px", borderRadius: 6, letterSpacing: "0.02em", fontSize: 12, fontWeight: 600 }}>
      {skill}
      {onRemove && <button onClick={onRemove} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════
//  AUTH SCREEN
// ══════════════════════════════════════════════════════════════
function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.email || !form.password) return setError("Email and password required");
    if (mode === "register") {
      if (!form.name) return setError("Name is required");
      if (form.password !== form.confirm) return setError("Passwords don't match");
      if (form.password.length < 6) return setError("Password must be at least 6 characters");
    }
    setLoading(true); setError("");
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/student/register";
      const body = mode === "login"
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password };
      const r = await fetch(`${API}${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Request failed");
      localStorage.setItem("student_token", d.token);
      onLogin(d.user || d);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#070d1a", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#0c1220", border: "1px solid #1e293b", borderRadius: 20, padding: "36px 32px", boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎓</div>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800, color: "#f1f5f9" }}>TalentAI</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Student Career Portal</p>
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#0f172a", borderRadius: 10, padding: 4 }}>
          {["login", "register"].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); }}
              style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", fontWeight: 600, fontSize: 14, cursor: "pointer",
                background: mode === m ? "#4f46e5" : "transparent", color: mode === m ? "#fff" : "#64748b", transition: "all 0.2s" }}>
              {m === "login" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        {error && <div style={{ background: "#7f1d1d22", border: "1px solid #f87171", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#f87171" }}>⚠️ {error}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "register" && (
            <div>
              <label style={lbl}>Full Name *</label>
              <input style={inp} placeholder="Ankita Bansod" value={form.name} onChange={e => set("name", e.target.value)} />
            </div>
          )}
          <div>
            <label style={lbl}>Email *</label>
            <input style={inp} type="email" placeholder="you@gmail.com" value={form.email} onChange={e => set("email", e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Password *</label>
            <input style={inp} type="password" placeholder="••••••••" value={form.password} onChange={e => set("password", e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
          </div>
          {mode === "register" && (
            <div>
              <label style={lbl}>Confirm Password *</label>
              <input style={inp} type="password" placeholder="••••••••" value={form.confirm} onChange={e => set("confirm", e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
            </div>
          )}
          <button onClick={submit} disabled={loading}
            style={{ padding: "13px", borderRadius: 10, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: loading ? 0.8 : 1, marginTop: 4 }}>
            {loading ? <><Spinner /> Please wait…</> : mode === "login" ? "Sign In →" : "Create Account →"}
          </button>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "#475569", marginTop: 20 }}>
          {mode === "login" ? "New here? " : "Already have an account? "}
          <span style={{ color: "#60a5fa", cursor: "pointer", fontWeight: 600 }} onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
            {mode === "login" ? "Create account" : "Sign in"}
          </span>
        </p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  PROFILE EDIT FORM
// ══════════════════════════════════════════════════════════════
function ProfileForm({ profile, onSave, onCancel }) {
  const [form, setForm] = useState({
    photo: "", bio: "", college: "", degree: "", graduation_year: "",
    github: "", linkedin: "", portfolio: "",
    skills: [], experience: [], projects: [],
    ...profile,
  });
  const [skillInput, setSkillInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addSkill = () => {
  const s = skillInput.trim();
  const currentSkills = form.skills || [];
  if (s && !currentSkills.includes(s)) {
    set("skills", [...currentSkills, s]);
    setSkillInput("");
  }
};
  const removeSkill = (s) => set("skills", form.skills.filter(x => x !== s));

  const addExp = () => set("experience", [...(form.experience || []), { company: "", role: "", duration: "", description: "" }]);
  const setExp = (i, k, v) => set("experience", form.experience.map((e, idx) => idx === i ? { ...e, [k]: v } : e));
  const removeExp = (i) => set("experience", form.experience.filter((_, idx) => idx !== i));

  const addProj = () => set("projects", [...(form.projects || []), { name: "", tech: "", link: "", description: "" }]);
  const setProj = (i, k, v) => set("projects", form.projects.map((p, idx) => idx === i ? { ...p, [k]: v } : p));
  const removeProj = (i) => set("projects", form.projects.filter((_, idx) => idx !== i));

  const handlePhoto = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    // Compress image to max 200x200
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX = 200;
      const ratio = Math.min(MAX / img.width, MAX / img.height);
      canvas.width  = img.width  * ratio;
      canvas.height = img.height * ratio;
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      set("photo", canvas.toDataURL("image/jpeg", 0.7)); // compress to 70% quality
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
};
  const save = async () => {
    setSaving(true); setError("");
    try {
      const r = await fetch(`${API}/student/profile`, {
        method: "PUT", headers: authH(), body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Save failed");
      onSave(d);
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const sectionTitle = (icon, text, color = "#60a5fa") => (
    <p style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color }}>{icon} {text}</p>
  );

  return (
    <div style={{ maxWidth: 740, margin: "0 auto" }}>
      {error && <div style={{ background: "#7f1d1d22", border: "1px solid #f87171", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#f87171" }}>⚠️ {error}</div>}

      {/* Photo + Basic */}
      <div style={card}>
        {sectionTitle("👤", "Basic Information", "#a78bfa")}
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", marginBottom: 16 }}>
         <div style={{ textAlign: "center" }}>
  <div onClick={() => setShowPicker(true)} style={{ cursor: "pointer", position: "relative", display: "inline-block" }}>
    <Avatar name={profile?.name || "?"} photo={form.photo} size={80} />
    <div style={{ position: "absolute", bottom: 0, right: 0, background: "#4f46e5", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, border: "2px solid #0c1220" }}>📷</div>
  </div>
  <div style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>Click to change</div>
  {showPicker && (
    <PhotoPicker
      currentPhoto={form.photo}
      name={profile?.name || ""}
      onSave={(photo) => { set("photo", photo); setShowPicker(false); }}
      onCancel={() => setShowPicker(false)}
    />
  )}
</div>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Bio / Headline</label>
            <textarea style={{ ...inp, height: 72, resize: "none" }} placeholder="Full-stack developer passionate about AI and open source…" value={form.bio} onChange={e => set("bio", e.target.value)} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
  <div><label style={lbl}>Full Name *</label><input style={inp} placeholder="Ankita Bansod" value={form.display_name || profile?.name || ""} onChange={e => set("display_name", e.target.value)} /></div>
  <div><label style={lbl}>Mobile Number</label><input style={inp} type="tel" placeholder="+91 83083 92372" value={form.mobile || ""} onChange={e => set("mobile", e.target.value)} /></div>
  <div><label style={lbl}>College / University</label><input style={inp} placeholder="SVPM College of Engineering" value={form.college} onChange={e => set("college", e.target.value)} /></div>
  <div><label style={lbl}>Degree</label><input style={inp} placeholder="B.E. Computer Engineering" value={form.degree} onChange={e => set("degree", e.target.value)} /></div>
          <div><label style={lbl}>Graduation Year</label>
            <select style={{ ...inp }} value={form.graduation_year} onChange={e => set("graduation_year", e.target.value)}>
              <option value="">Select year</option>
              {[2023,2024,2025,2026,2027,2028,2029,2030].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Portfolio Website</label><input style={inp} placeholder="https://ankita.dev" value={form.portfolio} onChange={e => set("portfolio", e.target.value)} /></div>
          <div><label style={lbl}>GitHub</label><input style={inp} placeholder="github.com/ankita" value={form.github} onChange={e => set("github", e.target.value)} /></div>
          <div><label style={lbl}>LinkedIn</label><input style={inp} placeholder="linkedin.com/in/ankita" value={form.linkedin} onChange={e => set("linkedin", e.target.value)} /></div>
        </div>
      </div>

      {/* Skills */}
      <div style={card}>
        {sectionTitle("Skills")}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input style={{ ...inp, flex: 1 }} placeholder="Type a skill and press Enter…" value={skillInput}
            onChange={e => setSkillInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }} />
          <button onClick={addSkill} style={{ padding: "10px 18px", borderRadius: 8, background: "#4f46e5", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>+ Add</button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {form.skills.map((s, i) => <SkillTag key={i} skill={s} onRemove={() => removeSkill(s)} />)}
          {(form.skills || []).length === 0 && <span style={{ fontSize:13, color:"#334155" }}>No skills added yet</span>}
        </div>
      </div>

      {/* Experience */}
      <div style={card}>
        {sectionTitle("Work Experience")}
        {(form.experience || []).map((exp, i) => (
          <div key={i} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Experience #{i + 1}</span>
              <button onClick={() => removeExp(i)} style={{ background: "none", border: "none", color: "#334155", cursor: "pointer", fontSize: 18, padding: 0 }}>×</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div><label style={lbl}>Company</label><input style={inp} placeholder="TechCorp Pvt. Ltd." value={exp.company} onChange={e => setExp(i, "company", e.target.value)} /></div>
              <div><label style={lbl}>Role / Title</label><input style={inp} placeholder="Full Stack Intern" value={exp.role} onChange={e => setExp(i, "role", e.target.value)} /></div>
              <div><label style={lbl}>Duration</label><input style={inp} placeholder="Jun 2024 – Aug 2024" value={exp.duration} onChange={e => setExp(i, "duration", e.target.value)} /></div>
            </div>
            <div><label style={lbl}>Description</label>
              <textarea style={{ ...inp, height: 72, resize: "none" }} placeholder="What you did, what you built, impact…" value={exp.description} onChange={e => setExp(i, "description", e.target.value)} />
            </div>
          </div>
        ))}
        <button onClick={addExp} style={{ padding: "10px 18px", borderRadius: 8, background: "#1e293b", border: "1px dashed #334155", color: "#94a3b8", fontWeight: 600, cursor: "pointer", width: "100%", fontSize: 13 }}>+ Add Experience</button>
      </div>

      {/* Projects */}
      <div style={card}>
        {sectionTitle("Projects")}
        {(form.projects || []).map((proj, i) => (
          <div key={i} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Project #{i + 1}</span>
              <button onClick={() => removeProj(i)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 18, padding: 0 }}>×</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div><label style={lbl}>Project Name</label><input style={inp} placeholder="TalentAI Resume Platform" value={proj.name} onChange={e => setProj(i, "name", e.target.value)} /></div>
              <div><label style={lbl}>Tech Stack</label><input style={inp} placeholder="Python, React, PostgreSQL" value={proj.tech} onChange={e => setProj(i, "tech", e.target.value)} /></div>
              <div><label style={lbl}>GitHub / Live Link</label><input style={inp} placeholder="github.com/ankita/project" value={proj.link} onChange={e => setProj(i, "link", e.target.value)} /></div>
            </div>
            <div><label style={lbl}>Description</label>
              <textarea style={{ ...inp, height: 72, resize: "none" }} placeholder="What it does, your role, results achieved…" value={proj.description} onChange={e => setProj(i, "description", e.target.value)} />
            </div>
          </div>
        ))}
        <button onClick={addProj} style={{ padding: "10px 18px", borderRadius: 8, background: "#1e293b", border: "1px dashed #334155", color: "#94a3b8", fontWeight: 600, cursor: "pointer", width: "100%", fontSize: 13 }}>+ Add Project</button>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
        {onCancel && <button onClick={onCancel} style={{ padding: "11px 24px", borderRadius: 10, background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", fontWeight: 600, cursor: "pointer" }}>Cancel</button>}
        <button onClick={save} disabled={saving}
          style={{ padding: "11px 32px", borderRadius: 10, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, opacity: saving ? 0.8 : 1 }}>
          {saving ? <><Spinner /> Saving…</> : "Save Profile"}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  PROFILE VIEW
// ══════════════════════════════════════════════════════════════
function ProfileView({ user, profile, onEdit, onLogout }) {
  const completionFields = ["photo", "bio", "college", "degree", "graduation_year", "github", "linkedin"];
  const filled = completionFields.filter(f => profile?.[f]).length;
  const completion = Math.round((filled / completionFields.length) * 100);
  const hasSkills = profile?.skills?.length > 0;
  const hasExp = profile?.experience?.length > 0;
  const hasProj = profile?.projects?.length > 0;
  const totalBonus = [hasSkills, hasExp, hasProj].filter(Boolean).length;
  const finalPct = Math.min(100, completion + totalBonus * 5);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      {/* Profile Header */}
      <div style={{ background: "linear-gradient(135deg,#1a0a2e,#0c1220)", border: "1px solid #1e293b", borderRadius: 16, padding: "28px 28px 22px", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          <Avatar name={user.name} photo={profile?.photo} size={88} />
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>
  {profile?.display_name || user.name}
</h2>
            {profile?.bio && <p style={{ margin: "0 0 8px", fontSize: 14, color: "#94a3b8", lineHeight: 1.5 }}>{profile.bio}</p>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 12, color: "#64748b" }}>
              {profile?.college && <span>🏫 {profile.college}</span>}
              {profile?.degree && <span>🎓 {profile.degree}</span>}
              {profile?.graduation_year && <span>📅 Class of {profile.graduation_year}</span>}
              {user.email && <span>✉ {user.email}</span>}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 12, marginTop: 6 }}>
              {profile?.github && <a href={`https://${profile.github.replace(/^https?:\/\//,"")}`} target="_blank" rel="noreferrer" style={{ color: "#60a5fa", textDecoration: "none" }}>💻 {profile.github}</a>}
              {profile?.linkedin && <a href={`https://${profile.linkedin.replace(/^https?:\/\//,"")}`} target="_blank" rel="noreferrer" style={{ color: "#60a5fa", textDecoration: "none" }}>🔗 {profile.linkedin}</a>}
              {profile?.portfolio && <a href={profile.portfolio} target="_blank" rel="noreferrer" style={{ color: "#60a5fa", textDecoration: "none" }}>🌐 Portfolio</a>}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
            <button onClick={onEdit} style={{ padding: "10px 20px", background: "#4f46e5", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", letterSpacing: "0.02em" }}>Edit Profile</button>
            <button style={{ padding:"10px 20px", background:"transparent", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"#64748b", fontSize:13, fontWeight:500, cursor:"pointer" }}>
  Sign out
</button>
          </div>
        </div>

        {/* Completion bar */}
        <div style={{ marginTop: 18, background: "#0f172a", borderRadius: 10, padding: "12px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Profile Completion</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: finalPct >= 80 ? "#22c55e" : finalPct >= 50 ? "#eab308" : "#f97316" }}>{finalPct}%</span>
          </div>
          <div style={{ background: "#1e293b", borderRadius: 4, height: 6, overflow: "hidden" }}>
            <div style={{ width: `${finalPct}%`, height: "100%", background: "linear-gradient(90deg, #4f46e5, #818cf8)", borderRadius: 4, transition: "width 1s ease" }} />
          </div>
          {finalPct < 100 && <p style={{ margin: "6px 0 0", fontSize: 11, color: "#475569" }}>
            {!profile?.photo ? "Add a profile photo · " : ""}{!profile?.bio ? "Add a bio · " : ""}{!hasSkills ? "Add skills · " : ""}{!hasExp ? "Add experience · " : ""}{!hasProj ? "Add projects" : ""}
          </p>}
        </div>
      </div>

      {/* Skills */}
      {hasSkills && (
        <div style={card}>
         <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"#64748b" }}>Skills</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {profile.skills.map((s, i) => <SkillTag key={i} skill={s} />)}
          </div>
        </div>
      )}

      {/* Experience */}
      {hasExp && (
        <div style={card}>
          <p style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700, color: "#64748b" }}>Work Experience</p>
          {profile.experience.map((exp, i) => (
            <div key={i} style={{ borderLeft: "3px solid #4f46e5", paddingLeft: 14, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>{exp.role}</div>
                  <div style={{ fontSize: 13, color: "#60a5fa", fontWeight: 600 }}>{exp.company}</div>
                </div>
                {exp.duration && <span style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap", marginLeft: 8 }}>{exp.duration}</span>}
              </div>
              {exp.description && <p style={{ margin: "6px 0 0", fontSize: 13, color: "#94a3b8", lineHeight: 1.55 }}>{exp.description}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Projects */}
      {hasProj && (
        <div style={card}>
          <p style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700, color: "#64748b" }}>Projects</p>
          {profile.projects.map((proj, i) => (
            <div key={i} style={{ borderLeft: "3px solid #7c3aed", paddingLeft: 14, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>{proj.name}</div>
                  {proj.tech && <div style={{ fontSize: 12, color: "#a78bfa", fontWeight: 600, marginTop: 2 }}>{proj.tech}</div>}
                </div>
                {proj.link && <a href={proj.link.startsWith("http") ? proj.link : `https://${proj.link}`} target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, color: "#60a5fa", textDecoration: "none", whiteSpace: "nowrap", marginLeft: 8 }}>View →</a>}
              </div>
              {proj.description && <p style={{ margin: "6px 0 0", fontSize: 13, color: "#94a3b8", lineHeight: 1.55 }}>{proj.description}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!hasSkills && !hasExp && !hasProj && (
        <div style={{ ...card, textAlign: "center", padding: "40px 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}></div>
          <p style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", margin: "0 0 8px" }}>Complete your profile</p>
          <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 20px" }}>Add your skills, experience and projects to stand out to employers.</p>
          <button onClick={onEdit} style={{ padding: "11px 28px", borderRadius: 10, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            Complete Profile
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  MAIN STUDENT PORTAL
// ══════════════════════════════════════════════════════════════
export default function StudentPortal({ onClose }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = token();
    if (t) loadMe(t);
    else setLoading(false);
  }, []);

  const loadMe = async () => {
    try {
      const r = await fetch(`${API}/auth/me`, { headers: authH() });
      if (!r.ok) { localStorage.removeItem("student_token"); setLoading(false); return; }
      const u = await r.json();
      setUser(u);
      await loadProfile();
    } catch { setLoading(false); }
  };

  const loadProfile = async () => {
    try {
      const r = await fetch(`${API}/student/profile`, { headers: authH() });
      if (r.ok) { const p = await r.json(); setProfile(p); }
    } catch {}
    setLoading(false);
  };

  const handleLogin = async (u) => {
    setUser(u);
    setLoading(true);
    await loadProfile();
    setEditing(!profile);
  };

  const handleSave = (saved) => { setProfile(saved); setEditing(false); };

  const handleLogout = () => {
    localStorage.removeItem("student_token");
    setUser(null); setProfile(null); setEditing(false);
  };

  if (loading) return (
    <div style={{ position: "fixed", inset: 0, background: "#070d1a", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600 }}>
      <Spinner />
    </div>
  );

  if (!user) return <AuthScreen onLogin={handleLogin} />;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#070d1a", zIndex: 600, overflowY: "auto" }}>
      {/* Nav */}
      <div style={{ background: "rgba(10,11,17,0.9)", borderBottom: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(12px)", padding: "0 24px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", alignItems: "center", height: 52, gap: 16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
  <div style={{ width:8, height:8, borderRadius:"50%", background:"#4f46e5" }}/>
  <span>Student Portal</span>
</div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, color: "#64748b" }}>Hey..!! {user.name}</span>
            {onClose && <button onClick={onClose} style={{ padding: "8px 16px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#94a3b8", fontSize: 12, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 14 }}>←</span> Jobs</button>}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 20px" }}>
        {editing ? (
          <ProfileForm
            profile={profile || {}}
            onSave={handleSave}
            onCancel={profile ? () => setEditing(false) : null}
          />
        ) : (
          <ProfileView
            user={user}
            profile={profile}
            onEdit={() => setEditing(true)}
            onLogout={handleLogout}
          />
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}