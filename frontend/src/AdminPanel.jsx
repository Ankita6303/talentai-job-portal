import { useState, useEffect, useCallback } from "react";

// ── CONFIG ───────────────────────────────────────────────────
const API = "https://talentai-job-portal.onrender.com";
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || ""; // 🔑 Replace with your Groq API key
const GROQ_MODEL = "llama-3.3-70b-versatile"; // Fast & capable — free on Groq

const getToken = () => localStorage.getItem("talentai_token");
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});
const parseSkills = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
};

// ── Theme ────────────────────────────────────────────────────
const T = {
  sidebar: "#1e1b4b",
  sidebarBorder: "#312e81",
  sidebarText: "#a5b4fc",
  sidebarActive: "#4f46e5",
  bg: "#f9fafb",
  card: "#ffffff",
  cardBorder: "#e5e7eb",
  text: "#111827",
  muted: "#6b7280",
  hint: "#9ca3af",
  primary: "#4f46e5",
  primaryHover: "#4338ca",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#0ea5e9",
};

// ── Helpers ──────────────────────────────────────────────────
const scoreColor = (s) => s >= 70 ? T.success : s >= 45 ? T.warning : T.danger;
const verdictStyle = { "Strong Match": { bg: "#d1fae5", color: "#065f46" }, "Good Match": { bg: "#dbeafe", color: "#1e40af" }, "Partial Match": { bg: "#fef9c3", color: "#854d0e" }, "Low Match": { bg: "#fee2e2", color: "#991b1b" } };
const recStyle = { "Advance to Interview": { bg: "#d1fae5", color: "#065f46" }, "Hold": { bg: "#fef9c3", color: "#854d0e" }, "Reject": { bg: "#fee2e2", color: "#991b1b" } };
const statusStyle = { pending: { bg: "#f3f4f6", color: "#374151" }, reviewed: { bg: "#dbeafe", color: "#1e40af" }, shortlisted: { bg: "#d1fae5", color: "#065f46" }, rejected: { bg: "#fee2e2", color: "#991b1b" }, hired: { bg: "#ede9fe", color: "#4c1d95" } };

const Badge = ({ text, map, fallback = {} }) => {
  const s = (map && map[text]) || fallback;
  return (
    <span style={{ background: s.bg || "#f3f4f6", color: s.color || "#374151", padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, textTransform: "capitalize", whiteSpace: "nowrap" }}>
      {text || "—"}
    </span>
  );
};

// ── Score Ring ───────────────────────────────────────────────
function ScoreRing({ score }) {
  const r = 26, c = 2 * Math.PI * r, pct = Math.max(0, Math.min(100, score || 0));
  const dash = (pct / 100) * c, col = scoreColor(pct);
  return (
    <svg width={64} height={64} viewBox="0 0 64 64">
      <circle cx={32} cy={32} r={r} fill="none" stroke="#e5e7eb" strokeWidth={6} />
      <circle cx={32} cy={32} r={r} fill="none" stroke={col} strokeWidth={6} strokeDasharray={`${dash} ${c}`} strokeLinecap="round" transform="rotate(-90 32 32)" />
      <text x={32} y={37} textAnchor="middle" fontSize={14} fontWeight={700} fill={col}>{pct}</text>
    </svg>
  );
}

// ── Stat Card ─────────────────────────────────────────────────
function StatCard({ label, value, color = T.primary }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: "1.2rem 1.5rem", borderTop: `4px solid ${color}` }}>
      <div style={{ fontSize: 13, color: T.muted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: T.text }}>{value ?? "—"}</div>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────
function Modal({ title, onClose, children, maxWidth = 680 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: T.card, borderRadius: 16, padding: 28, width: "100%", maxWidth, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.text }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: T.muted, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState(null);
  const show = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };
  const colors = { success: "#10b981", error: "#ef4444", info: "#4f46e5", warning: "#f59e0b" };
  const Toast = toast ? (
    <div style={{ position: "fixed", bottom: 24, right: 24, background: colors[toast.type] || colors.success, color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
      {toast.msg}
    </div>
  ) : null;
  return { show, Toast };
}

// ── Upgrade Banner ────────────────────────────────────────────
function UpgradeBanner({ onUpgrade }) {
  return (
    <div style={{ background: "#ede9fe", border: "1px solid #ddd6fe", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <p style={{ margin: 0, fontSize: 13, color: "#5b21b6", fontWeight: 500 }}>
        👑 <strong>HR Pro</strong>: Unlock automated email/WhatsApp alerts, contact info, bulk actions & AI interview summaries
      </p>
      <button onClick={onUpgrade} style={{ padding: "8px 16px", background: T.primary, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
        Upgrade →
      </button>
    </div>
  );
}

// ── Job Form ──────────────────────────────────────────────────
const emptyJob = { title: "", department: "", location: "", type: "Full-time", salary_min: "", salary_max: "", description: "", skills: "", requirements: "", experience_required: "" };

function JobForm({ initial = emptyJob, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    ...emptyJob, ...initial,
    skills: parseSkills(initial.skills).join(", ") || (typeof initial.skills === "string" ? initial.skills : ""),
    requirements: Array.isArray(initial.requirements) ? initial.requirements.join("\n") : (initial.requirements || ""),
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inp = { width: "100%", padding: "9px 12px", border: `1px solid ${T.cardBorder}`, borderRadius: 8, fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: "inherit", color: T.text };
  const row = { marginBottom: 14 };
  const lbl = { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 4 };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.department.trim() || !form.description.trim()) return alert("Title, department and description are required.");
    onSave({ ...form, skills: form.skills.split(",").map(s => s.trim()).filter(Boolean), requirements: form.requirements.split("\n").map(s => s.trim()).filter(Boolean), salary_min: form.salary_min || null, salary_max: form.salary_max || null });
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={row}><label style={lbl}>Job Title *</label><input style={inp} value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Frontend Developer" /></div>
        <div style={row}><label style={lbl}>Department *</label><input style={inp} value={form.department} onChange={e => set("department", e.target.value)} placeholder="e.g. Engineering" /></div>
        <div style={row}><label style={lbl}>Location</label><input style={inp} value={form.location} onChange={e => set("location", e.target.value)} placeholder="e.g. Remote / Mumbai" /></div>
        <div style={row}><label style={lbl}>Job Type</label>
          <select style={inp} value={form.type} onChange={e => set("type", e.target.value)}>
            {["Full-time", "Part-time", "Contract", "Internship", "Freelance"].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={row}><label style={lbl}>Min Salary (₹)</label><input style={inp} type="number" value={form.salary_min} onChange={e => set("salary_min", e.target.value)} placeholder="e.g. 500000" /></div>
        <div style={row}><label style={lbl}>Max Salary (₹)</label><input style={inp} type="number" value={form.salary_max} onChange={e => set("salary_max", e.target.value)} placeholder="e.g. 1200000" /></div>
      </div>
      <div style={row}><label style={lbl}>Experience Required</label><input style={inp} value={form.experience_required} onChange={e => set("experience_required", e.target.value)} placeholder="e.g. 2-4 years React" /></div>
      <div style={row}><label style={lbl}>Skills <span style={{ color: T.hint, fontWeight: 400 }}>(comma separated)</span></label><input style={inp} value={form.skills} onChange={e => set("skills", e.target.value)} placeholder="React, TypeScript, Node.js" /></div>
      <div style={row}><label style={lbl}>Requirements <span style={{ color: T.hint, fontWeight: 400 }}>(one per line)</span></label>
        <textarea style={{ ...inp, height: 90, resize: "vertical" }} value={form.requirements} onChange={e => set("requirements", e.target.value)} placeholder={"Bachelor's in CS\n3+ years React\nStrong problem-solving"} />
      </div>
      <div style={{ ...row, marginBottom: 0 }}><label style={lbl}>Job Description *</label>
        <textarea style={{ ...inp, height: 120, resize: "vertical" }} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe the role, responsibilities, culture…" />
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
        <button onClick={onCancel} style={{ padding: "9px 20px", border: `1px solid ${T.cardBorder}`, borderRadius: 8, background: T.card, cursor: "pointer", fontWeight: 600, fontSize: 14, color: T.text }}>Cancel</button>
        <button onClick={handleSubmit} disabled={saving} style={{ padding: "9px 24px", border: "none", borderRadius: 8, background: T.primary, color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 14, opacity: saving ? 0.7 : 1 }}>
          {saving ? "Saving…" : "Save Job"}
        </button>
      </div>
    </div>
  );
}

// ── Login Screen ──────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInvite] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inp = { width: "100%", padding: "11px 14px", border: `1px solid ${T.cardBorder}`, borderRadius: 10, fontSize: 15, boxSizing: "border-box", outline: "none", fontFamily: "inherit", marginBottom: 12, color: T.text };

  const submit = async () => {
    if (!email || !password) { setError("Email and password are required."); return; }
    if (mode === "register" && (!name || !inviteCode)) { setError("All fields required for registration."); return; }
    setLoading(true); setError("");
    try {
      const body = mode === "login" ? { email, password } : { name, email, password, invite_code: inviteCode };
      const r = await fetch(`${API}/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Request failed");
      localStorage.setItem("talentai_token", d.token);
      onLogin(d.user || { name, email });
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#667eea22,#764ba222)", padding: 16 }}>
      <div style={{ background: T.card, borderRadius: 20, padding: "2.5rem 2rem", width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 36 }}>⚡</div>
          <h1 style={{ margin: "8px 0 0", fontSize: 24, fontWeight: 800, color: T.text }}>TalentAI Admin</h1>
          <p style={{ margin: "6px 0 0", color: T.muted, fontSize: 14 }}>Restricted access — authorized users only</p>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 20, background: "#f3f4f6", borderRadius: 10, padding: 4 }}>
          {["login", "register"].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); }}
              style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", fontWeight: 600, fontSize: 13, cursor: "pointer", background: mode === m ? T.primary : "transparent", color: mode === m ? "#fff" : T.muted }}>
              {m === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>
        {error && <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 14px", borderRadius: 8, fontSize: 14, marginBottom: 14 }}>{error}</div>}
        {mode === "register" && <input style={inp} placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />}
        <input style={inp} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input style={inp} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
        {mode === "register" && <input style={inp} type="password" placeholder="🔑 Invite Code (required)" value={inviteCode} onChange={e => setInvite(e.target.value)} />}
        <button onClick={submit} disabled={loading}
          style={{ width: "100%", padding: "12px", border: "none", borderRadius: 10, background: T.primary, color: "#fff", fontWeight: 700, fontSize: 16, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.8 : 1 }}>
          {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
        </button>
        {mode === "register" && <p style={{ textAlign: "center", fontSize: 12, color: T.hint, marginTop: 12 }}>🔒 Registration requires an invite code from the administrator</p>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  AI INTERVIEW SIMULATOR — uses Groq API (free & fast)
// ══════════════════════════════════════════════════════════════
function InterviewSimulator({ applicant, onClose }) {
  const [phase, setPhase]       = useState("idle");
  const [report, setReport]     = useState(null);
  const [errMsg, setErrMsg]     = useState("");
  const [printing, setPrinting] = useState(false);
  const { show, Toast }         = useToast();

  const skills    = parseSkills(applicant.ai_matched_skills);
  const missing   = parseSkills(applicant.ai_missing_skills);
  const questions = parseSkills(applicant.ai_interview_questions);

  // ── Call Groq API ──────────────────────────────────────────
  const generate = async () => {
    setPhase("generating");
    setErrMsg("");

    const prompt = `You are an expert HR interviewer and analyst. Simulate a complete interview for this candidate and produce a detailed report.

CANDIDATE: ${applicant.name}
ROLE: ${applicant.job_title} (${applicant.department || ""})
AI RESUME SCORE: ${applicant.ai_score}/100
AI VERDICT: ${applicant.ai_verdict || "—"}
MATCHED SKILLS: ${skills.join(", ") || "none"}
MISSING SKILLS: ${missing.join(", ") || "none"}
RESUME SUMMARY: ${applicant.ai_summary || "Not available"}
EXPERIENCE: ${applicant.ai_experience_years ?? "?"} years
INTERVIEW QUESTIONS TO USE: ${questions.length > 0 ? questions.join(" | ") : "Generate 5 relevant technical and behavioral questions"}

Simulate realistic candidate answers based on their resume data, then evaluate each answer.

IMPORTANT: Return ONLY a valid JSON object. No markdown, no code fences, no explanation before or after. Just pure JSON.

Return exactly this structure:
{
  "interview_date": "${new Date().toLocaleDateString("en-IN")}",
  "duration_minutes": 25,
  "overall_score": 72,
  "hire_recommendation": "Strong Yes",
  "hire_confidence": "High",
  "summary": "3-sentence executive summary for HR manager",
  "ratings": {
    "communication": {"score": 8, "label": "Excellent", "note": "One sentence evaluation"},
    "technical_depth": {"score": 7, "label": "Strong", "note": "One sentence evaluation"},
    "problem_solving": {"score": 6, "label": "Moderate", "note": "One sentence evaluation"},
    "cultural_fit": {"score": 8, "label": "High", "note": "One sentence evaluation"},
    "confidence": {"score": 7, "label": "High", "note": "One sentence evaluation"}
  },
  "qa_pairs": [
    {
      "question": "actual question text",
      "answer": "realistic simulated candidate answer (3-5 sentences based on their resume)",
      "score": 8,
      "rating": "Excellent",
      "feedback": "specific one-sentence evaluation of this answer",
      "follow_up": "one follow-up question the interviewer asked"
    }
  ],
  "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
  "concerns": ["specific concern 1", "specific concern 2"],
  "improvement_tips": ["actionable tip 1", "actionable tip 2"],
  "next_steps": "Recommended next action for HR"
}`;

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          max_tokens: 3000,
          temperature: 0.7,
          messages: [
            {
              role: "system",
              content: "You are an expert HR interviewer. You always respond with pure valid JSON only — no markdown, no code fences, no extra text. Just the raw JSON object.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Groq API error: ${res.status}`);
      }

      const data = await res.json();
      const raw = data?.choices?.[0]?.message?.content || "";

      // Strip markdown fences if model added them anyway
      const cleaned = raw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      const parsed = JSON.parse(cleaned);
      setReport(parsed);
      setPhase("done");
    } catch (e) {
      setErrMsg(e.message);
      setPhase("error");
    }
  };

  // ── Print ──────────────────────────────────────────────────
  const printReport = () => {
    setPrinting(true);
    setTimeout(() => { window.print(); setPrinting(false); }, 100);
  };

  // ── Helpers ────────────────────────────────────────────────
  const sc = (s) => s >= 8 ? "#10b981" : s >= 6 ? "#f59e0b" : "#ef4444";
  const recColor = (r) =>
    r === "Strong Yes" ? "#10b981" : r === "Yes" ? "#22c55e" : r === "Maybe" ? "#f59e0b" : "#ef4444";
  const ratingColor = (r) =>
    ["Excellent", "Strong", "High"].includes(r) ? "#10b981"
    : ["Good", "Moderate", "Medium"].includes(r) ? "#f59e0b" : "#ef4444";

  const ScoreDot = ({ score, size = 36 }) => {
    const col = sc(score);
    const pct = (score / 10) * 100;
    const r = (size / 2) - 3;
    const c = 2 * Math.PI * r;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={3} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={3}
          strokeDasharray={`${(pct / 100) * c} ${c}`} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize={size * 0.28} fontWeight="700" fill={col}>{score}</text>
      </svg>
    );
  };

  const BigScoreRing = ({ score }) => {
    const col = score >= 75 ? "#10b981" : score >= 55 ? "#f59e0b" : "#ef4444";
    const r = 52, circ = 2 * Math.PI * r, fill = (score / 100) * circ;
    return (
      <svg width={130} height={130} viewBox="0 0 130 130">
        <circle cx={65} cy={65} r={r} fill="none" stroke="#e5e7eb" strokeWidth={8} />
        <circle cx={65} cy={65} r={r} fill="none" stroke={col} strokeWidth={8}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" transform="rotate(-90 65 65)"
          style={{ transition: "stroke-dasharray 1s ease" }} />
        <text x={65} y={58} textAnchor="middle" fontSize={26} fontWeight="800" fill={col}>{score}</text>
        <text x={65} y={74} textAnchor="middle" fontSize={11} fill="#6b7280">/ 100</text>
        <text x={65} y={88} textAnchor="middle" fontSize={10} fill="#9ca3af">Interview Score</text>
      </svg>
    );
  };

  return (
    <Modal title="" onClose={onClose} maxWidth={760}>
      {Toast}

      {/* ── IDLE ── */}
      {phase === "idle" && (
        <div style={{ textAlign: "center", padding: "32px 16px" }}>
          <div style={{ background: "#f9fafb", border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: "20px 24px", marginBottom: 28, textAlign: "left", display: "flex", gap: 20, alignItems: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#5b21b6", flexShrink: 0 }}>
              {applicant.name?.charAt(0)?.toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 17, color: T.text, marginBottom: 2 }}>{applicant.name}</div>
              <div style={{ fontSize: 13, color: T.muted }}>{applicant.job_title} · {applicant.department || "General"}</div>
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ background: "#ede9fe", color: "#5b21b6", padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>ATS Score: {applicant.ai_score}/100</span>
                {applicant.ai_verdict && <span style={{ background: "#d1fae5", color: "#065f46", padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{applicant.ai_verdict}</span>}
                {applicant.ai_experience_years && <span style={{ background: "#dbeafe", color: "#1e40af", padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{applicant.ai_experience_years} yrs exp</span>}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎤</div>
          <h3 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 800, color: T.text }}>One-Click AI Interview Simulator</h3>
          <p style={{ color: T.muted, fontSize: 14, margin: "0 0 8px", lineHeight: 1.6 }}>
            Groq AI will simulate a full interview session for <strong>{applicant.name}</strong> — generating realistic answers, evaluating each response, and producing a complete summary instantly.
          </p>
          <p style={{ color: T.hint, fontSize: 12, margin: "0 0 28px" }}>
            ⚡ No typing needed · Uses {questions.length || 5} tailored questions · Results in ~5 seconds
          </p>
          <button onClick={generate} style={{ padding: "14px 40px", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", border: "none", borderRadius: 12, color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 20px #4f46e533", display: "inline-flex", alignItems: "center", gap: 10 }}>
            ⚡ Generate Interview Summary
          </button>
          <p style={{ margin: "14px 0 0", fontSize: 11, color: T.hint }}>Powered by Groq AI (llama3-70b) · Free & fast</p>
        </div>
      )}

      {/* ── GENERATING ── */}
      {phase === "generating" && (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto 24px" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid #e5e7eb", borderTopColor: "#4f46e5", animation: "spin 0.9s linear infinite" }} />
            <div style={{ position: "absolute", inset: 8, borderRadius: "50%", border: "3px solid #e5e7eb", borderTopColor: "#7c3aed", animation: "spin 1.4s linear infinite reverse" }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🎤</div>
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: "0 0 8px" }}>Simulating interview for {applicant.name}…</p>
          <p style={{ fontSize: 13, color: T.muted, margin: "0 0 6px" }}>Generating questions · Simulating answers · Evaluating responses</p>
          <p style={{ fontSize: 12, color: T.hint }}>Groq is fast — usually done in 5–10 seconds</p>
        </div>
      )}

      {/* ── ERROR ── */}
      {phase === "error" && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <p style={{ color: "#ef4444", fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Generation failed</p>
          <p style={{ color: T.muted, fontSize: 13, marginBottom: 6 }}>{errMsg}</p>
          <p style={{ color: T.hint, fontSize: 12, marginBottom: 20 }}>
            Check that <code>VITE_GROQ_API_KEY</code> at the top of the file is set correctly.<br />
            Get a free key at <strong>console.groq.com</strong>
          </p>
          <button onClick={() => setPhase("idle")} style={{ padding: "10px 24px", background: T.primary, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
            Try Again
          </button>
        </div>
      )}

      {/* ── DONE: full report ── */}
      {phase === "done" && report && (
        <div id="interview-report">
          {/* Header */}
          <div style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)", borderRadius: 12, padding: "20px 24px", marginBottom: 20, display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "#a5b4fc", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>AI Interview Simulation Report</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{applicant.name}</div>
              <div style={{ fontSize: 13, color: "#c7d2fe", marginTop: 2 }}>{applicant.job_title} · {report.interview_date} · ~{report.duration_minutes} min</div>
            </div>
            <BigScoreRing score={report.overall_score} />
          </div>

          {/* Hire Recommendation */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={{ background: `${recColor(report.hire_recommendation)}15`, border: `1.5px solid ${recColor(report.hire_recommendation)}44`, borderRadius: 12, padding: "14px 18px" }}>
              <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Hire Recommendation</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: recColor(report.hire_recommendation) }}>
                {report.hire_recommendation === "Strong Yes" || report.hire_recommendation === "Yes" ? "✅ " : report.hire_recommendation === "Maybe" ? "⚠️ " : "❌ "}
                {report.hire_recommendation}
              </div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>Confidence: <strong>{report.hire_confidence}</strong></div>
            </div>
            <div style={{ background: "#f9fafb", border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: "14px 18px" }}>
              <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Next Steps</div>
              <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5, fontWeight: 600 }}>{report.next_steps}</div>
            </div>
          </div>

          {/* Summary */}
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "14px 16px", marginBottom: 16, fontSize: 14, color: "#1e40af", lineHeight: 1.65 }}>
            {report.summary}
          </div>

          {/* Ratings */}
          {report.ratings && (
            <div style={{ background: "#fff", border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14 }}>📊 Performance Ratings</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
                {Object.entries(report.ratings).map(([key, val]) => (
                  <div key={key} style={{ textAlign: "center" }}>
                    <ScoreDot score={val.score} size={44} />
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.text, marginTop: 5, textTransform: "capitalize" }}>{key.replace(/_/g, " ")}</div>
                    <div style={{ fontSize: 10, color: ratingColor(val.label), fontWeight: 600, marginTop: 2 }}>{val.label}</div>
                    {val.note && <div style={{ fontSize: 10, color: T.hint, marginTop: 3, lineHeight: 1.3 }}>{val.note}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Q&A */}
          {report.qa_pairs?.length > 0 && (
            <div style={{ background: "#fff", border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14 }}>💬 Interview Transcript</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {report.qa_pairs.map((qa, i) => (
                  <div key={i} style={{ borderLeft: `3px solid ${sc(qa.score)}`, paddingLeft: 14, paddingBottom: 16, borderBottom: i < report.qa_pairs.length - 1 ? `1px solid ${T.cardBorder}` : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#4f46e5", textTransform: "uppercase", letterSpacing: "0.06em" }}>Q{i + 1}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <ScoreDot score={qa.score} size={28} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: ratingColor(qa.rating), background: `${ratingColor(qa.rating)}15`, padding: "2px 8px", borderRadius: 999 }}>{qa.rating}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 8, lineHeight: 1.5 }}>🤖 {qa.question}</div>
                    <div style={{ background: "#f9fafb", border: `1px solid ${T.cardBorder}`, borderRadius: 8, padding: "10px 12px", marginBottom: 8, fontSize: 13, color: T.text, lineHeight: 1.6 }}>
                      <span style={{ fontSize: 11, color: T.muted, display: "block", marginBottom: 4, fontWeight: 600 }}>👤 Candidate Answer (Simulated)</span>
                      {qa.answer}
                    </div>
                    <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5, marginBottom: qa.follow_up ? 6 : 0 }}>📝 <em>{qa.feedback}</em></div>
                    {qa.follow_up && (
                      <div style={{ fontSize: 12, color: "#6d28d9", marginTop: 6, background: "#faf5ff", borderRadius: 6, padding: "6px 10px" }}>
                        🔄 Follow-up: <em>{qa.follow_up}</em>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strengths + Concerns */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#065f46", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>💪 Strengths</div>
              {(report.strengths || []).map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 7, alignItems: "flex-start" }}>
                  <span style={{ color: "#10b981", marginTop: 1, flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: 13, color: "#065f46", lineHeight: 1.4 }}>{s}</span>
                </div>
              ))}
            </div>
            <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>⚠️ Concerns</div>
              {(report.concerns || []).map((c, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 7, alignItems: "flex-start" }}>
                  <span style={{ color: "#f97316", marginTop: 1, flexShrink: 0 }}>!</span>
                  <span style={{ fontSize: 13, color: "#92400e", lineHeight: 1.4 }}>{c}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          {report.improvement_tips?.length > 0 && (
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1e40af", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>💡 Improvement Tips for Candidate</div>
              {report.improvement_tips.map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 7, alignItems: "flex-start" }}>
                  <span style={{ color: "#3b82f6", flexShrink: 0, marginTop: 1 }}>→</span>
                  <span style={{ fontSize: 13, color: "#1e40af", lineHeight: 1.4 }}>{t}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", paddingTop: 4 }}>
            <button onClick={printReport} disabled={printing} style={{ padding: "10px 20px", background: T.primary, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, opacity: printing ? 0.7 : 1 }}>
              🖨️ {printing ? "Preparing…" : "Print / Save PDF"}
            </button>
            <button onClick={() => {
              const text = `INTERVIEW REPORT — ${applicant.name}\nRole: ${applicant.job_title}\nDate: ${report.interview_date}\nScore: ${report.overall_score}/100\nRecommendation: ${report.hire_recommendation}\n\nSummary:\n${report.summary}\n\nNext Steps: ${report.next_steps}`;
              navigator.clipboard.writeText(text).then(() => show("Summary copied!", "success"));
            }} style={{ padding: "10px 20px", background: "#f3f4f6", border: `1px solid ${T.cardBorder}`, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: T.text }}>
              📋 Copy Summary
            </button>
            <button onClick={() => { setPhase("idle"); setReport(null); }} style={{ padding: "10px 20px", background: "#f3f4f6", border: `1px solid ${T.cardBorder}`, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer", color: T.muted }}>
              🔄 Regenerate
            </button>
            <button onClick={onClose} style={{ padding: "10px 20px", background: "#fff", border: `1px solid ${T.cardBorder}`, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer", color: T.muted, marginLeft: "auto" }}>
              Close
            </button>
          </div>

          <style>{`
            @media print {
              body * { visibility: hidden; }
              #interview-report, #interview-report * { visibility: visible; }
              #interview-report { position: fixed; top: 0; left: 0; width: 100%; }
            }
          `}</style>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Modal>
  );
}

// ── Automation Tab ────────────────────────────────────────────
function AutomationTab({ isPremium, onUpgrade }) {
  const [rules, setRules] = useState([
    { id: 1, icon: "📧", title: "Auto email on shortlist", desc: "Send personalised email when status → shortlisted", active: true, locked: true, color: "#eff6ff" },
    { id: 2, icon: "💬", title: "WhatsApp interview invite", desc: "Send WhatsApp when AI score ≥ 80", active: false, locked: true, color: "#f0fdf4" },
    { id: 3, icon: "🗑️", title: "Auto-reject below threshold", desc: "Auto-reject applications with AI score < 40", active: false, locked: true, color: "#fef2f2" },
    { id: 4, icon: "🔔", title: "HR alert on new application", desc: "Email + WhatsApp to HR on every new applicant", active: true, locked: false, color: "#fefce8" },
  ]);
  const { show, Toast } = useToast();

  const toggle = (id) => {
    const rule = rules.find(r => r.id === id);
    if (rule.locked && !isPremium) { onUpgrade(); return; }
    setRules(rs => rs.map(r => r.id === id ? { ...r, active: !r.active } : r));
    show(rule.active ? "Rule disabled" : "Rule enabled", "info");
  };

  const [log] = useState([
    { time: "2h ago", action: "HR alert sent", detail: "New application: Ananya Iyer — Product Manager (score: 91)", ok: true },
    { time: "5h ago", action: "HR alert sent", detail: "New application: Rahul Mehta — Backend Engineer (score: 62)", ok: true },
    { time: "1d ago", action: "Email skipped", detail: "Auto-email requires Pro plan — upgrade to enable", ok: false },
    { time: "1d ago", action: "WhatsApp skipped", detail: "WhatsApp automation requires Pro plan", ok: false },
  ]);

  const th = { padding: "11px 14px", textAlign: "left", fontSize: 12, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${T.cardBorder}` };
  const td = { padding: "12px 14px", fontSize: 14, color: T.text, borderBottom: `1px solid #f3f4f6`, verticalAlign: "middle" };

  return (
    <div>
      {Toast}
      {!isPremium && <UpgradeBanner onUpgrade={onUpgrade} />}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        {rules.map(r => (
          <div key={r.id} style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: r.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{r.icon}</div>
            <div style={{ flex: 1 }}>
              // REPLACE with:
<div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2, display: "flex", alignItems: "center", gap: 6, color: "#111827" }}>
  {r.title}
                {r.locked && !isPremium && <span style={{ background: "#ede9fe", color: "#5b21b6", fontSize: 10, padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>PRO</span>}
              </div>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 10 }}>{r.desc}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div onClick={() => toggle(r.id)} style={{ width: 38, height: 20, borderRadius: 10, background: r.active ? T.primary : T.cardBorder, cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0 }}>
                  <div style={{ position: "absolute", top: 2, left: r.active ? 20 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                </div>
                <span style={{ fontSize: 12, color: T.muted }}>{r.active ? "Active" : "Inactive"}</span>
                {r.locked && !isPremium && (
                  <button onClick={onUpgrade} style={{ marginLeft: "auto", padding: "4px 10px", background: "#ede9fe", color: "#5b21b6", border: "1px solid #ddd6fe", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>🔒 Configure</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.cardBorder}`, fontWeight: 700, fontSize: 15, color: "#111827" }}>📋 Automation Log</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "#f9fafb" }}>
            <th style={th}>Time</th><th style={th}>Action</th><th style={th}>Detail</th><th style={th}>Result</th>
          </tr></thead>
          <tbody>
            {log.map((l, i) => (
              <tr key={i}>
                <td style={td}><span style={{ color: T.muted, fontSize: 12 }}>{l.time}</span></td>
                <td style={td}><strong>{l.action}</strong></td>
                <td style={{ ...td, color: T.muted, fontSize: 13 }}>{l.detail}</td>
                <td style={td}><span style={{ fontSize: 16 }}>{l.ok ? "✅" : "❌"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Subscription Tab ──────────────────────────────────────────
function SubscriptionTab({ isPremium, onUpgrade }) {
  const plans = [
    {
      name: "Free", price: "₹0", period: "forever", current: !isPremium, popular: false,
      features: ["3 active jobs", "Basic AI screening & scoring", "HR alert emails", "Manual status updates"],
      // FIX: was T.hint (#9ca3af) — now uses a visible gray
      locked: ["Contact info (blurred)", "Auto email/WhatsApp", "Automation rules", "AI Interview Simulator", "Bulk actions", "Priority support"],
    },
    {
      name: "HR Pro", price: "₹2,499", period: "per month", current: isPremium, popular: true,
      features: ["Unlimited jobs", "Advanced AI scoring", "Full contact info", "Auto email/WhatsApp", "Automation rules", "AI Interview Simulator", "Bulk actions & CSV export", "Priority support"],
      locked: [],
    },
    {
      name: "Enterprise", price: "Custom", period: "contact us", current: false, popular: false,
      features: ["Everything in Pro", "Custom AI models", "SSO & SCIM", "Dedicated account manager", "Full API access", "Custom integrations"],
      locked: [],
    },
  ];

  const openRazorpay = (plan) => {
    alert(`Razorpay checkout for ${plan.name} (${plan.price}/month)\n\nIntegrate with:\nRAZORPAY_KEY_ID=rzp_test_xxx\nRAZORPAY_KEY_SECRET=your_secret\n\nSee server.js for /payments/create-order endpoint.`);
  };

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 800, color: T.text }}>Choose your HR plan</h2>
        <p style={{ margin: 0, color: T.muted, fontSize: 15 }}>Unlock premium features to hire smarter and faster</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        {plans.map(p => (
          <div key={p.name} style={{ background: T.card, border: `${p.popular ? 2 : 1}px solid ${p.popular ? T.primary : T.cardBorder}`, borderRadius: 14, padding: "20px 18px", position: "relative" }}>
            {p.popular && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: T.primary, color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 999 }}>MOST POPULAR</div>}
            <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 4 }}>{p.name}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: p.popular ? T.primary : T.text, marginBottom: 2 }}>{p.price}</div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>{p.period}</div>
            {p.features.map(f => <div key={f} style={{ fontSize: 13, marginBottom: 6, display: "flex", gap: 6, color: "#111827" }}><span style={{ color: T.success }}>✓</span>{f}</div>)}
            {/* FIX: Changed color from T.hint (#9ca3af) to #6b7280 so locked features are visible */}
            {p.locked.map(f => <div key={f} style={{ fontSize: 13, marginBottom: 6, display: "flex", gap: 6, color: "#6b7280" }}><span>✗</span>{f}</div>)}
            <button onClick={() => p.current ? null : p.name === "Enterprise" ? alert("Contact: enterprise@talentai.com") : openRazorpay(p)}
              style={{ width: "100%", marginTop: 16, padding: "10px", border: `1px solid ${p.popular ? T.primary : T.cardBorder}`, borderRadius: 8, background: p.popular ? T.primary : p.current ? "#f3f4f6" : T.card, color: p.popular ? "#fff" : p.current ? T.muted : T.primary, fontWeight: 700, fontSize: 14, cursor: p.current ? "default" : "pointer" }}>
              {p.current ? "Current plan" : p.name === "Enterprise" ? "Contact sales →" : `Upgrade to ${p.name} →`}
            </button>
          </div>
        ))}
      </div>
      <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: "16px 20px" }}>
        <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14, color: "#111827" }}>💳 Secure payment via Razorpay</div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {["UPI", "Credit/Debit Card", "Net Banking", "EMI (3/6/12 months)", "Wallets"].map(m => (
            <span key={m} style={{ fontSize: 13, color: T.muted, display: "flex", alignItems: "center", gap: 4 }}><span style={{ color: T.success }}>✓</span>{m}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  MAIN ADMIN PANEL
// ══════════════════════════════════════════════════════════════
export default function AdminPanel() {
  const [user, setUser] = useState(() => getToken() ? { name: "Admin" } : null);
  const [tab, setTab] = useState("dashboard");
  const [jobs, setJobs] = useState([]);
  const [apps, setApps] = useState([]);
  const [stats, setStats] = useState(null);
  const [fetchErr, setFetchErr] = useState("");
  const [showJobForm, setShowJobForm] = useState(false);
  const [editJob, setEditJob] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [interviewApp, setInterviewApp] = useState(null);
  const [appFilter, setAppFilter] = useState("all");
  const [appSort, setAppSort] = useState("score");
  const [jobFilter, setJobFilter] = useState("all");
  const [isPremium] = useState(false);
  const { show, Toast } = useToast();

  const fetchJobs = useCallback(async () => {
    try { const r = await fetch(`${API}/jobs`, { headers: authHeaders() }); const d = await r.json(); setJobs(Array.isArray(d) ? d : []); }
    catch (e) { setFetchErr("Could not load jobs: " + e.message); }
  }, []);

  const fetchApps = useCallback(async () => {
    try { const r = await fetch(`${API}/applications?sort=${appSort}`, { headers: authHeaders() }); const d = await r.json(); setApps(Array.isArray(d) ? d : []); }
    catch (e) { setFetchErr("Could not load applications: " + e.message); }
  }, [appSort]);

  const fetchStats = useCallback(async () => {
    try { const r = await fetch(`${API}/stats`, { headers: authHeaders() }); const d = await r.json(); setStats(d); }
    catch (e) { console.warn("Stats:", e.message); }
  }, []);

  useEffect(() => { if (user) { fetchJobs(); fetchApps(); fetchStats(); } }, [user, fetchJobs, fetchApps, fetchStats]);

  const handleLogout = () => { localStorage.removeItem("talentai_token"); setUser(null); };

  const saveJob = async (payload) => {
    setSaving(true);
    try {
      const url = editJob ? `${API}/jobs/${editJob.id}` : `${API}/jobs`;
      const r = await fetch(url, { method: editJob ? "PUT" : "POST", headers: authHeaders(), body: JSON.stringify(payload) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Save failed");
      show("Job saved successfully!", "success");
      await fetchJobs(); await fetchStats();
      setShowJobForm(false); setEditJob(null);
    } catch (e) { show("Error: " + e.message, "error"); }
    finally { setSaving(false); }
  };

  const deleteJob = async (id) => {
    if (!window.confirm("Deactivate this job?")) return;
    await fetch(`${API}/jobs/${id}`, { method: "DELETE", headers: authHeaders() });
    show("Job deleted", "info");
    fetchJobs(); fetchStats();
  };

  const updateAppStatus = async (id, status, notes) => {
    await fetch(`${API}/applications/${id}/status`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ status, recruiter_notes: notes }) });
    show(`Status updated to: ${status}`, "success");
    fetchApps();
    if (selectedApp?.id === id) setSelectedApp(a => ({ ...a, status, recruiter_notes: notes }));
  };

  const sendEmail = async (app) => {
    if (!isPremium) { show("Upgrade to HR Pro to send emails", "warning"); return; }
    try {
      await fetch(`${API}/notify/email`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ application_id: app.id }) });
      show(`Email sent to ${app.name}!`, "success");
    } catch { show("Email failed — check RESEND_API_KEY", "error"); }
  };

  const sendWhatsApp = async (app) => {
    if (!isPremium) { show("Upgrade to HR Pro to send WhatsApp", "warning"); return; }
    const phone = app.phone?.replace(/\D/g, "");
    if (!phone) { show("No phone number on file", "error"); return; }
    const msg = encodeURIComponent(`Hi ${app.name}, your application for ${app.job_title} has been received. We'll be in touch soon! — TalentAI`);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${msg}&apikey=YOUR_KEY`;
    try { await fetch(url); show(`WhatsApp sent to ${app.name}!`, "success"); }
    catch { show("WhatsApp failed — check CallMeBot API key", "error"); }
  };

  const filteredApps = apps
    .filter(a => { if (appFilter === "advance") return a.ai_recommendation === "Advance to Interview"; if (appFilter === "hold") return a.ai_recommendation === "Hold"; if (appFilter === "reject") return a.ai_recommendation === "Reject"; return true; })
    .filter(a => jobFilter === "all" || String(a.job_id) === String(jobFilter));

  if (!user) return <LoginScreen onLogin={setUser} />;

  const card = { background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: "1.25rem 1.5rem", marginBottom: 16 };
  const th = { padding: "11px 14px", textAlign: "left", fontSize: 12, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${T.cardBorder}`, whiteSpace: "nowrap" };
  const td = { padding: "12px 14px", fontSize: 14, color: T.text, borderBottom: `1px solid #f3f4f6`, verticalAlign: "middle" };
  const btn = (bg = T.primary, col = "#fff") => ({ padding: "8px 16px", border: "none", borderRadius: 8, background: bg, color: col, cursor: "pointer", fontWeight: 600, fontSize: 13 });
  const navItems = [
    { key: "dashboard", label: "📊 Dashboard" },
    { key: "jobs", label: "💼 Jobs" },
    { key: "applicants", label: "👥 Applicants" },
    { key: "automation", label: "🤖 Automation" },
    { key: "interview", label: "🎤 AI Interview" },
    { key: "subscription", label: "👑 Plans" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, fontFamily: "system-ui,-apple-system,sans-serif" }}>
      {Toast}

      {/* Sidebar */}
      <aside style={{ width: 220, background: T.sidebar, display: "flex", flexDirection: "column", padding: "24px 0", flexShrink: 0, position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "0 20px 24px", borderBottom: `1px solid ${T.sidebarBorder}` }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>⚡ TalentAI</div>
          <div style={{ fontSize: 12, color: T.sidebarText, marginTop: 2 }}>Admin Panel</div>
        </div>
        <nav style={{ flex: 1, padding: "16px 10px" }}>
          {navItems.map(s => (
            <button key={s.key} onClick={() => setTab(s.key)}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", border: "none", borderRadius: 10, background: tab === s.key ? T.sidebarActive : "transparent", color: tab === s.key ? "#fff" : T.sidebarText, cursor: "pointer", fontWeight: 600, fontSize: 14, marginBottom: 4, textAlign: "left" }}>
              {s.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "16px 20px", borderTop: `1px solid ${T.sidebarBorder}` }}>
          <div style={{ fontSize: 13, color: T.sidebarText, marginBottom: 4 }}>👤 {user.name || "Admin"}</div>
          <div style={{ fontSize: 11, color: "#5b21b6", background: "#ede9fe", padding: "2px 8px", borderRadius: 6, display: "inline-block", marginBottom: 10 }}>{isPremium ? "👑 HR Pro" : "Free Plan"}</div>
          {!isPremium && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: T.sidebarText, marginBottom: 4 }}>Plan usage: 30%</div>
              <div style={{ background: T.sidebarBorder, borderRadius: 99, height: 4 }}><div style={{ background: T.sidebarActive, width: "30%", height: "100%", borderRadius: 99 }} /></div>
            </div>
          )}
          <button onClick={() => setTab("subscription")} style={{ ...btn("#4338ca", "#c7d2fe"), width: "100%", textAlign: "center", marginBottom: 8, fontSize: 12 }}>👑 Upgrade</button>
          <button onClick={handleLogout} style={{ ...btn(T.sidebarBorder, T.sidebarText), width: "100%", textAlign: "center", fontSize: 12 }}>Sign Out</button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: "28px 32px", overflowY: "auto" }}>
        {fetchErr && <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 16px", borderRadius: 8, marginBottom: 20, fontSize: 14 }}>⚠️ {fetchErr}</div>}

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <div>
            <h1 style={{ margin: "0 0 24px", fontSize: 26, fontWeight: 800, color: T.text }}>Dashboard</h1>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 24 }}>
              <StatCard label="Total Applications" value={stats?.total ?? apps.length} color={T.primary} />
              <StatCard label="Avg AI Score" value={stats?.average_score ? `${stats.average_score}%` : "0%"} color={T.success} />
              <StatCard label="Advance to Interview" value={stats?.by_recommendation?.["Advance to Interview"] ?? 0} color={T.info} />
              <StatCard label="Active Jobs" value={jobs.length} color={T.warning} />
            </div>
            {!isPremium && <UpgradeBanner onUpgrade={() => setTab("subscription")} />}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={card}>
                <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: T.text }}>AI Recommendations</h3>
                {stats?.by_recommendation ? Object.entries(stats.by_recommendation).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <Badge text={k} map={recStyle} /><span style={{ fontWeight: 700, fontSize: 18, color: T.text }}>{v}</span>
                  </div>
                )) : <p style={{ color: T.hint }}>No data yet</p>}
              </div>
              <div style={card}>
                <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: T.text }}>Applications by Job</h3>
                {stats?.by_job?.length ? stats.by_job.map(j => (
                  <div key={j.title} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, fontSize: 14 }}>
                    <div><div style={{ fontWeight: 600 }}>{j.title}</div><div style={{ color: T.muted, fontSize: 12 }}>{j.department}</div></div>
                    <div style={{ textAlign: "right" }}><span style={{ fontWeight: 700 }}>{j.total}</span><span style={{ color: T.hint, fontSize: 12, marginLeft: 6 }}>avg {j.avg_score}</span></div>
                  </div>
                )) : <p style={{ color: T.hint }}>No applications yet</p>}
              </div>
            </div>
          </div>
        )}

        {/* JOBS */}
        {tab === "jobs" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: T.text }}>Jobs ({jobs.length})</h1>
              <button onClick={() => { setEditJob(null); setShowJobForm(true); }} style={btn()}>+ Post New Job</button>
            </div>
            {jobs.length === 0 ? (
              <div style={{ ...card, textAlign: "center", padding: "3rem", color: T.hint }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>💼</div>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: T.text }}>No jobs posted yet</div>
                <button onClick={() => setShowJobForm(true)} style={btn()}>Post Your First Job</button>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", background: T.card, borderRadius: 12, overflow: "hidden", border: `1px solid ${T.cardBorder}` }}>
                  <thead><tr style={{ background: "#f9fafb" }}>
                    <th style={th}>Title</th><th style={th}>Department</th><th style={th}>Location</th>
                    <th style={th}>Type</th><th style={th}>Experience</th><th style={th}>Skills</th><th style={th}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {jobs.map(j => {
                      const skills = parseSkills(j.skills);
                      return (
                        <tr key={j.id}>
                          <td style={{ ...td, fontWeight: 700 }}>{j.title}</td>
                          <td style={td}>{j.department}</td>
                          <td style={td}>{j.location || "—"}</td>
                          <td style={td}><span style={{ background: "#ede9fe", color: "#4c1d95", padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{j.type || "—"}</span></td>
                          <td style={td}>{j.experience_required || "—"}</td>
                          <td style={{ ...td, maxWidth: 200 }}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                              {skills.slice(0, 3).map(s => <span key={s} style={{ background: "#e0e7ff", color: "#3730a3", padding: "1px 8px", borderRadius: 999, fontSize: 11 }}>{s}</span>)}
                              {skills.length > 3 && <span style={{ color: T.hint, fontSize: 11 }}>+{skills.length - 3} more</span>}
                            </div>
                          </td>
                          <td style={td}>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button onClick={() => { setEditJob(j); setShowJobForm(true); }} style={btn("#e0e7ff", "#3730a3")}>Edit</button>
                              <button onClick={() => deleteJob(j.id)} style={btn("#fee2e2", "#991b1b")}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* APPLICANTS */}
        {tab === "applicants" && (
          <div>
            <h1 style={{ margin: "0 0 20px", fontSize: 26, fontWeight: 800, color: T.text }}>Applicants ({filteredApps.length})</h1>
            {!isPremium && (
              <div style={{ background: "#ede9fe", border: "1px solid #ddd6fe", borderRadius: 10, padding: "10px 16px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <p style={{ margin: 0, fontSize: 13, color: "#5b21b6" }}>🔒 Contact info (email, phone) is blurred on the free plan. Upgrade to view & export.</p>
                <button onClick={() => setTab("subscription")} style={btn("#5b21b6")}>👑 Unlock</button>
              </div>
            )}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
              {[
                { val: appFilter, setter: setAppFilter, opts: [["all", "All Recommendations"], ["advance", "Advance to Interview"], ["hold", "Hold"], ["reject", "Reject"]] },
                { val: jobFilter, setter: setJobFilter, opts: [["all", "All Jobs"], ...jobs.map(j => [j.id, j.title])] },
                { val: appSort, setter: setAppSort, opts: [["score", "Sort: AI Score"], ["date", "Sort: Date"], ["name", "Sort: Name"]] },
              ].map((sel, i) => (
                <select key={i} value={sel.val} onChange={e => sel.setter(e.target.value)}
                  style={{ padding: "8px 12px", border: `1px solid ${T.cardBorder}`, borderRadius: 8, fontSize: 14, background: T.card, color: T.text }}>
                  {sel.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              ))}
            </div>
            {filteredApps.length === 0 ? (
              <div style={{ ...card, textAlign: "center", padding: "3rem", color: T.hint }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: T.text }}>No applications yet</div>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", background: T.card, borderRadius: 12, overflow: "hidden", border: `1px solid ${T.cardBorder}` }}>
                  <thead><tr style={{ background: "#f9fafb" }}>
                    <th style={th}>Applicant</th><th style={th}>Contact</th><th style={th}>AI Score</th>
                    <th style={th}>Verdict</th><th style={th}>Recommendation</th><th style={th}>Status</th><th style={th}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {filteredApps.map(a => (
                      <tr key={a.id} style={{ cursor: "pointer" }} onClick={() => setSelectedApp(a)}>
                        <td style={td}><div style={{ fontWeight: 700 }}>{a.name}</div>
                          <div style={{ color: T.muted, fontSize: 12 }}>{a.job_title}</div>
                        </td>
                        <td style={td} onClick={e => e.stopPropagation()}>
                          {isPremium ? (
                            <div>
                              <div style={{ fontSize: 12 }}>{a.email}</div>
                              <div style={{ fontSize: 12, color: T.muted }}>{a.phone || "—"}</div>
                            </div>
                          ) : (
                            <div style={{ position: "relative", display: "inline-block" }}>
                              <div style={{ filter: "blur(5px)", userSelect: "none", fontSize: 12 }}>{a.email}<br />{a.phone || "+91 99999 99999"}</div>
                              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <span style={{ fontSize: 14, cursor: "pointer" }} onClick={() => setTab("subscription")}>🔒</span>
                              </div>
                            </div>
                          )}
                        </td>
                        <td style={{ ...td, textAlign: "center" }} onClick={e => e.stopPropagation()}><ScoreRing score={a.ai_score} /></td>
                        <td style={td}><Badge text={a.ai_verdict} map={verdictStyle} /></td>
                        <td style={td}><Badge text={a.ai_recommendation} map={recStyle} /></td>
                        <td style={td}><Badge text={a.status || "pending"} map={statusStyle} /></td>
                        <td style={td} onClick={e => e.stopPropagation()}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button onClick={() => setSelectedApp(a)} style={btn("#f3f4f6", T.text)} title="View">👁️</button>
                            <button onClick={() => sendEmail(a)} style={btn(isPremium ? "#eff6ff" : "#f3f4f6", isPremium ? "#1e40af" : T.muted)} title={isPremium ? "Send Email" : "Upgrade to email"}>📧</button>
                            <button onClick={() => sendWhatsApp(a)} style={btn(isPremium ? "#f0fdf4" : "#f3f4f6", isPremium ? "#15803d" : T.muted)} title={isPremium ? "WhatsApp" : "Upgrade"}>💬</button>
                            <button onClick={() => setInterviewApp(a)} style={btn("#ede9fe", "#5b21b6")} title="AI Interview">🎤</button>
                            <select value={a.status || "pending"} onChange={e => updateAppStatus(a.id, e.target.value, a.recruiter_notes)}
                              style={{ padding: "6px 8px", border: `1px solid ${T.cardBorder}`, borderRadius: 6, fontSize: 12, background: T.card, color: T.text }}>
                              {["pending", "reviewed", "shortlisted", "rejected", "hired"].map(s => <option key={s}>{s}</option>)}
                            </select>
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

        {/* AUTOMATION */}
        {tab === "automation" && <AutomationTab isPremium={isPremium} onUpgrade={() => setTab("subscription")} />}

        {/* INTERVIEW */}
        {tab === "interview" && (
          <div>
            <h1 style={{ margin: "0 0 20px", fontSize: 26, fontWeight: 800, color: T.text }}>🎤 AI Interview Simulator</h1>
            <p style={{ color: T.muted, marginBottom: 20, fontSize: 14 }}>Select a candidate from the Applicants tab and click the 🎤 button, or choose below.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
              {apps.map(a => (
                <div key={a.id} style={{ ...card, cursor: "pointer", marginBottom: 0 }} onClick={() => setInterviewApp(a)}>
                  <div style={{ fontWeight: 700, marginBottom: 4, color: "#111827" }}>{a.name}</div>
                  <div style={{ fontSize: 13, color: T.muted, marginBottom: 8 }}>{a.job_title}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Badge text={a.ai_recommendation} map={recStyle} />
                    <span style={{ fontWeight: 700, color: scoreColor(a.ai_score), fontSize: 15 }}>{a.ai_score}</span>
                  </div>
                  <button style={{ ...btn(), width: "100%", marginTop: 10, textAlign: "center" }}>🎤 Start Interview</button>
                </div>
              ))}
              {apps.length === 0 && <p style={{ color: T.muted }}>No applicants yet.</p>}
            </div>
          </div>
        )}

        {/* SUBSCRIPTION */}
        {tab === "subscription" && <SubscriptionTab isPremium={isPremium} onUpgrade={() => show("Opening checkout…", "info")} />}
      </main>

      {/* Job Form Modal */}
      {showJobForm && (
        <Modal title={editJob ? "Edit Job" : "Post New Job"} onClose={() => { setShowJobForm(false); setEditJob(null); }}>
          <JobForm initial={editJob || emptyJob} onSave={saveJob} onCancel={() => { setShowJobForm(false); setEditJob(null); }} saving={saving} />
        </Modal>
      )}

      {/* Applicant Detail Modal */}
      {selectedApp && (
        <Modal title={`${selectedApp.name} — ${selectedApp.job_title}`} onClose={() => setSelectedApp(null)}>
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div style={{ background: "#f9fafb", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                <ScoreRing score={selectedApp.ai_score} /><div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>AI Score</div>
              </div>
              <div style={{ background: "#f9fafb", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>Verdict</div><Badge text={selectedApp.ai_verdict} map={verdictStyle} />
                <div style={{ fontSize: 12, color: T.muted, marginTop: 8, marginBottom: 4 }}>Recommendation</div><Badge text={selectedApp.ai_recommendation} map={recStyle} />
              </div>
              <div style={{ background: "#f9fafb", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>Experience</div>
                <div style={{ fontWeight: 700 }}>{selectedApp.ai_experience_years ?? "—"} yrs</div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 8, marginBottom: 4 }}>Status</div><Badge text={selectedApp.status || "pending"} map={statusStyle} />
              </div>
            </div>
            {isPremium && (
              <div style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13 }}>
                <span style={{ fontWeight: 700 }}>📧 </span>{selectedApp.email} &nbsp;|&nbsp; <span style={{ fontWeight: 700 }}>📱 </span>{selectedApp.phone || "—"}
              </div>
            )}
            {selectedApp.ai_summary && <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 14, lineHeight: 1.6 }}>{selectedApp.ai_summary}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>✅ Matched Skills</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {parseSkills(selectedApp.ai_matched_skills).map(s => <span key={s} style={{ background: "#d1fae5", color: "#065f46", padding: "2px 9px", borderRadius: 999, fontSize: 12 }}>{s}</span>)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>❌ Missing Skills</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {parseSkills(selectedApp.ai_missing_skills).map(s => <span key={s} style={{ background: "#fee2e2", color: "#991b1b", padding: "2px 9px", borderRadius: 999, fontSize: 12 }}>{s}</span>)}
                </div>
              </div>
            </div>
            {parseSkills(selectedApp.ai_interview_questions).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>🎤 Interview Questions</div>
                <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#374151" }}>
                  {parseSkills(selectedApp.ai_interview_questions).map((q, i) => <li key={i} style={{ marginBottom: 4 }}>{q}</li>)}
                </ol>
              </div>
            )}
            <div style={{ borderTop: `1px solid ${T.cardBorder}`, paddingTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Update Status</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                {["pending", "reviewed", "shortlisted", "rejected", "hired"].map(s => (
                  <button key={s} onClick={() => updateAppStatus(selectedApp.id, s, selectedApp.recruiter_notes)}
                    style={{ ...btn(selectedApp.status === s ? T.primary : "#f3f4f6", selectedApp.status === s ? "#fff" : "#374151"), textTransform: "capitalize" }}>{s}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <button onClick={() => sendEmail(selectedApp)} style={btn(isPremium ? T.primary : "#f3f4f6", isPremium ? "#fff" : T.muted)}>📧 Send Email</button>
                <button onClick={() => sendWhatsApp(selectedApp)} style={btn(isPremium ? "#25D366" : "#f3f4f6", isPremium ? "#fff" : T.muted)}>💬 WhatsApp</button>
                <button onClick={() => { setSelectedApp(null); setInterviewApp(selectedApp); }} style={btn("#ede9fe", "#5b21b6")}>🎤 AI Interview</button>
              </div>
              <textarea placeholder="Recruiter notes…" defaultValue={selectedApp.recruiter_notes || ""}
                onBlur={e => updateAppStatus(selectedApp.id, selectedApp.status, e.target.value)}
                style={{ width: "100%", padding: "9px 12px", border: `1px solid ${T.cardBorder}`, borderRadius: 8, fontSize: 14, boxSizing: "border-box", minHeight: 80, resize: "vertical", fontFamily: "inherit", color: T.text }} />
            </div>
          </div>
        </Modal>
      )}

      {/* AI Interview Modal */}
      {interviewApp && <InterviewSimulator applicant={interviewApp} onClose={() => setInterviewApp(null)} />}
    </div>
  );
}