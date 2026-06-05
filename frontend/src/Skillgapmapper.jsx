// SkillGapMapper.jsx
// Add to App.jsx:
//   import SkillGapMapper from "./SkillGapMapper";
//   {showSkillGap && <SkillGapMapper onClose={() => setShowSkillGap(false)} groqKey={GROQ_KEY} />}
//
// Add button in JobsView (inside selected job panel):
//   <button onClick={() => setShowSkillGap(true)}>🗺️ AI Skill Gap Mapper</button>

import { useState } from "react";

const GROQ_MODEL = "llama-3.3-70b-versatile";

// ── Free course links per skill keyword ──────────────────────
const COURSE_DB = {
  // AI / ML
  python:        { platform: "freeCodeCamp", url: "https://www.youtube.com/watch?v=rfscVS0vtbw", label: "Python Full Course" },
  tensorflow:    { platform: "Google",       url: "https://www.tensorflow.org/tutorials",         label: "TensorFlow Tutorials" },
  pytorch:       { platform: "PyTorch.org",  url: "https://pytorch.org/tutorials/",               label: "PyTorch Official Tutorials" },
  "machine learning": { platform: "Coursera", url: "https://www.coursera.org/learn/machine-learning", label: "ML by Andrew Ng (Audit Free)" },
  "deep learning":    { platform: "fast.ai",  url: "https://course.fast.ai/",                     label: "Practical Deep Learning" },
  nlp:           { platform: "Hugging Face", url: "https://huggingface.co/learn/nlp-course",      label: "NLP Course" },
  langchain:     { platform: "YouTube",      url: "https://www.youtube.com/watch?v=lG7Uxts9SXs", label: "LangChain Crash Course" },
  pandas:        { platform: "Kaggle",       url: "https://www.kaggle.com/learn/pandas",          label: "Pandas (Free)" },
  numpy:         { platform: "NumPy.org",    url: "https://numpy.org/learn/",                     label: "NumPy Quickstart" },
  "scikit-learn":{ platform: "Scikit-learn", url: "https://scikit-learn.org/stable/tutorial/",   label: "Official Tutorials" },

  // Web / Full Stack
  react:         { platform: "React.dev",    url: "https://react.dev/learn",                      label: "Official React Docs" },
  "node.js":     { platform: "freeCodeCamp", url: "https://www.youtube.com/watch?v=Oe421EPjeBE", label: "Node.js Full Course" },
  nodejs:        { platform: "freeCodeCamp", url: "https://www.youtube.com/watch?v=Oe421EPjeBE", label: "Node.js Full Course" },
  javascript:    { platform: "JavaScript.info", url: "https://javascript.info/",                  label: "The Modern JS Tutorial" },
  typescript:    { platform: "TypeScript.org", url: "https://www.typescriptlang.org/docs/handbook/", label: "TS Handbook" },
  "next.js":     { platform: "Vercel",       url: "https://nextjs.org/learn",                     label: "Next.js Learn" },
  "express.js":  { platform: "freeCodeCamp", url: "https://www.youtube.com/watch?v=SccSCuHhOw0", label: "Express.js Course" },
  fastapi:       { platform: "FastAPI Docs", url: "https://fastapi.tiangolo.com/tutorial/",       label: "FastAPI Official Tutorial" },
  flask:         { platform: "freeCodeCamp", url: "https://www.youtube.com/watch?v=Z1RJmh_OqeA", label: "Flask Full Course" },

  // Databases
  sql:           { platform: "SQLZoo",       url: "https://sqlzoo.net/",                          label: "SQLZoo (Interactive)" },
  postgresql:    { platform: "PostgreSQL.org", url: "https://www.postgresql.org/docs/current/tutorial.html", label: "Official Tutorial" },
  mongodb:       { platform: "MongoDB Univ.", url: "https://learn.mongodb.com/",                  label: "MongoDB University (Free)" },
  mysql:         { platform: "W3Schools",    url: "https://www.w3schools.com/mysql/",             label: "MySQL Tutorial" },
  redis:         { platform: "Redis.io",     url: "https://redis.io/learn/",                     label: "Redis Learn" },

  // Cloud & DevOps
  aws:           { platform: "AWS",          url: "https://aws.amazon.com/training/digital/",     label: "AWS Training (Free Tier)" },
  azure:         { platform: "Microsoft",    url: "https://learn.microsoft.com/en-us/azure/",     label: "Microsoft Learn Azure" },
  "gcp":         { platform: "Google Cloud", url: "https://cloud.google.com/learn/",              label: "Google Cloud Skills Boost" },
  docker:        { platform: "Docker.com",   url: "https://docs.docker.com/get-started/",         label: "Docker Get Started" },
  kubernetes:    { platform: "Kubernetes.io",url: "https://kubernetes.io/docs/tutorials/",        label: "Kubernetes Tutorials" },
  "ci/cd":       { platform: "GitHub",       url: "https://docs.github.com/en/actions",           label: "GitHub Actions Docs" },
  linux:         { platform: "Linux Foundation", url: "https://training.linuxfoundation.org/resources/?_sft_content_type=free-course", label: "LF Free Courses" },

  // System Design / CS
  "system design": { platform: "ByteByteGo", url: "https://www.youtube.com/@ByteByteGo",        label: "ByteByteGo YouTube" },
  "data structures": { platform: "Visualgo", url: "https://visualgo.net/",                       label: "Visualgo (Visual DS)" },
  algorithms:    { platform: "LeetCode",     url: "https://leetcode.com/explore/",               label: "LeetCode Explore" },
  java:          { platform: "Codecademy",   url: "https://www.codecademy.com/learn/learn-java", label: "Learn Java (Free)" },
  "c++":         { platform: "LearnCpp",     url: "https://www.learncpp.com/",                   label: "LearnCpp.com" },

  // Security
  cybersecurity: { platform: "Cybrary",      url: "https://www.cybrary.it/catalog/cybersecurity/", label: "Cybrary Free Courses" },
  networking:    { platform: "Cisco",        url: "https://www.netacad.com/courses/networking",   label: "Cisco NetAcad (Free)" },

  // Soft Skills / Other
  git:           { platform: "Atlassian",    url: "https://www.atlassian.com/git/tutorials",      label: "Git Tutorials" },
  "communication": { platform: "Coursera",  url: "https://www.coursera.org/learn/wharton-communication-skills", label: "Communication (Audit Free)" },
};

function getCourseLink(skillName) {
  const key = skillName.toLowerCase().trim();
  for (const [pattern, course] of Object.entries(COURSE_DB)) {
    if (key.includes(pattern) || pattern.includes(key)) return course;
  }
  // Fallback: Google search
  return {
    platform: "Google",
    url: `https://www.google.com/search?q=${encodeURIComponent(skillName + " free course tutorial")}`,
    label: `Search "${skillName}" tutorials`,
  };
}

// ── Styles ───────────────────────────────────────────────────
const inp = {
  width: "100%", background: "#0f172a", border: "1px solid #1e293b",
  borderRadius: 8, color: "#f1f5f9", fontSize: 13, padding: "10px 12px",
  outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};
const lbl = {
  fontSize: 11, color: "#64748b", fontWeight: 600, display: "block",
  marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em",
};

function Spinner() {
  return (
    <span style={{
      display: "inline-block", width: 16, height: 16,
      border: "2px solid #334155", borderTopColor: "#a78bfa",
      borderRadius: "50%", animation: "sgSpin 0.7s linear infinite",
    }} />
  );
}

// ── Priority badge ───────────────────────────────────────────
function PriorityBadge({ priority }) {
  const map = {
    High:   { bg: "#7f1d1d22", color: "#f87171", border: "#7f1d1d55", dot: "#ef4444" },
    Medium: { bg: "#78350f22", color: "#fb923c", border: "#78350f55", dot: "#f97316" },
    Low:    { bg: "#14532d22", color: "#4ade80", border: "#14532d55", dot: "#22c55e" },
  };
  const s = map[priority] || map.Low;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: s.bg, color: s.color, border: `1px solid ${s.border}`, display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot }} />
      {priority}
    </span>
  );
}

// ── Single skill card ────────────────────────────────────────
function SkillCard({ skill, index, total }) {
  const [open, setOpen] = useState(false);
  const course = getCourseLink(skill.name);
  const isLast = index === total - 1;

  return (
    <div style={{ display: "flex", gap: 0 }}>
      {/* Timeline */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginRight: 14, flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
          background: skill.priority === "High" ? "#7f1d1d" : skill.priority === "Medium" ? "#78350f" : "#14532d",
          border: `2px solid ${skill.priority === "High" ? "#ef4444" : skill.priority === "Medium" ? "#f97316" : "#22c55e"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 800, color: "#fff",
          boxShadow: `0 0 12px ${skill.priority === "High" ? "#ef444444" : skill.priority === "Medium" ? "#f9731644" : "#22c55e44"}`,
        }}>
          {index + 1}
        </div>
        {!isLast && <div style={{ width: 2, flex: 1, minHeight: 20, background: "linear-gradient(#1e293b, #0f172a)", marginTop: 4 }} />}
      </div>

      {/* Card */}
      <div style={{
        flex: 1, marginBottom: isLast ? 0 : 16,
        background: "#0c1220", border: "1px solid #1e293b",
        borderRadius: 12, overflow: "hidden",
        transition: "border-color 0.2s",
        borderColor: open ? (skill.priority === "High" ? "#ef444466" : skill.priority === "Medium" ? "#f9731666" : "#22c55e66") : "#1e293b",
      }}>
        {/* Header */}
        <div
          onClick={() => setOpen(o => !o)}
          style={{ padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", marginBottom: 3 }}>{skill.name}</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <PriorityBadge priority={skill.priority} />
                <span style={{ fontSize: 10, color: "#475569" }}>{skill.time_to_learn}</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <a
              href={course.url}
              target="_blank"
              rel="noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 6,
                background: "#1e3a5f", color: "#60a5fa", border: "1px solid #2563eb55",
                textDecoration: "none", whiteSpace: "nowrap",
              }}
            >
              {course.platform} →
            </a>
            <span style={{ color: "#475569", fontSize: 16, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }}>▾</span>
          </div>
        </div>

        {/* Expanded */}
        {open && (
          <div style={{ padding: "0 16px 16px", borderTop: "1px solid #1e293b" }}>
            <p style={{ margin: "12px 0 8px", fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>{skill.reason}</p>
            {skill.subtopics?.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <p style={{ margin: "0 0 6px", fontSize: 10, color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Topics to cover</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {skill.subtopics.map((t, i) => (
                    <span key={i} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "#0f172a", color: "#94a3b8", border: "1px solid #1e293b" }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
            <a
              href={course.url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 8,
                background: "linear-gradient(135deg,#1d4ed8,#2563eb)",
                color: "#fff", textDecoration: "none", marginTop: 4,
              }}
            >
              📚 {course.label}
              <span style={{ fontSize: 10, opacity: 0.7 }}>({course.platform})</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Progress ring ────────────────────────────────────────────
function GapRing({ score }) {
  const col = score >= 75 ? "#22c55e" : score >= 50 ? "#eab308" : score >= 25 ? "#f97316" : "#ef4444";
  const label = score >= 75 ? "Strong" : score >= 50 ? "Moderate" : score >= 25 ? "Significant" : "Critical";
  const r = 44, c = 2 * Math.PI * r, fill = (score / 100) * c;
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={100} height={100} viewBox="0 0 100 100">
        <circle cx={50} cy={50} r={r} fill="none" stroke="#1e293b" strokeWidth={8} />
        <circle cx={50} cy={50} r={r} fill="none" stroke={col} strokeWidth={8}
          strokeDasharray={`${fill} ${c}`} strokeLinecap="round" transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dasharray 1.2s ease" }} />
        <text x={50} y={46} textAnchor="middle" fontSize={22} fontWeight={800} fill={col} fontFamily="inherit">{score}</text>
        <text x={50} y={60} textAnchor="middle" fontSize={10} fill="#475569" fontFamily="inherit">/ 100</text>
      </svg>
      <div style={{ fontSize: 12, fontWeight: 700, color: col }}>{label} Gap</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function SkillGapMapper({ onClose, groqKey }) {
  const [step, setStep] = useState(0); // 0=form, 1=loading, 2=results
  const [jobTitle, setJobTitle] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [currentSkills, setCurrentSkills] = useState("");
  const [yearsExp, setYearsExp] = useState("0-1");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loadingMsg, setLoadingMsg] = useState("");

  const callGroq = async (prompt, system, maxTokens = 2000) => {
    const key = groqKey || (typeof import.meta !== "undefined" && import.meta.env?.VITE_GROQ_API_KEY) || "";
    if (!key || key.trim() === "") throw new Error("Groq API key not found. Add VITE_GROQ_API_KEY to frontend/.env");
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({
        model: GROQ_MODEL, max_tokens: maxTokens,
        messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
      }),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Groq error ${res.status}`); }
    const d = await res.json();
    return d.choices?.[0]?.message?.content || "";
  };

  const analyze = async () => {
    if (!jobTitle.trim()) { setError("Please enter a target job title."); return; }
    if (!currentSkills.trim()) { setError("Please enter your current skills."); return; }
    setStep(1); setError("");

    const msgs = [
      "Analyzing your current skills…",
      "Comparing with job requirements…",
      "Identifying skill gaps…",
      "Building your learning roadmap…",
      "Finding free course links…",
    ];
    let i = 0;
    setLoadingMsg(msgs[0]);
    const interval = setInterval(() => { i = Math.min(i + 1, msgs.length - 1); setLoadingMsg(msgs[i]); }, 1800);

    try {
      const raw = await callGroq(
        `You are an expert career coach and skills gap analyst.

TARGET JOB: ${jobTitle}
JOB DESCRIPTION: ${jobDesc || "Not provided — infer from job title"}
CANDIDATE CURRENT SKILLS: ${currentSkills}
YEARS OF EXPERIENCE: ${yearsExp}

Analyze the gap between candidate's skills and job requirements. Return ONLY raw JSON, no markdown.

{
  "gap_score": <0-100, where 100 means no gap at all>,
  "present_skills": ["skill1", "skill2"],
  "missing_skills": [
    {
      "name": "Skill Name",
      "priority": "High",
      "reason": "2 sentence explanation of why this skill is critical for this role",
      "time_to_learn": "2-4 weeks",
      "subtopics": ["Topic 1", "Topic 2", "Topic 3"]
    }
  ],
  "roadmap_summary": "3 sentence personalized roadmap summary for this candidate",
  "estimated_ready_in": "3-6 months",
  "strengths": ["strength1", "strength2", "strength3"],
  "quick_wins": ["quick action 1", "quick action 2", "quick action 3"],
  "job_fit_percent": <0-100>
}

Rules:
- missing_skills must be sorted: High priority first, then Medium, then Low
- Include 4-8 missing skills maximum
- Be specific and realistic
- present_skills should only list skills actually mentioned by the candidate`,
        "You are a career coach. Return ONLY raw JSON starting with {. No markdown, no explanation.",
        2000
      );

      clearInterval(interval);
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("AI returned invalid response. Please try again.");
      setResult(JSON.parse(match[0]));
      setStep(2);
    } catch (e) {
      clearInterval(interval);
      setError(e.message);
      setStep(0);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.93)",
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      zIndex: 500, padding: 16, overflowY: "auto",
    }}>
      <div style={{
        background: "#070d1a", border: "1px solid #1e293b", borderRadius: 20,
        width: "100%", maxWidth: step === 2 ? 980 : 640,
        margin: "20px auto", padding: 32, boxShadow: "0 30px 80px rgba(0,0,0,0.7)",
      }}>
        <style>{`
          @keyframes sgSpin { to { transform: rotate(360deg); } }
          @keyframes sgPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.9)} }
          @keyframes sgSlide { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        `}</style>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🗺️</div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#f1f5f9" }}>AI Skill Gap Mapper</h1>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Analyze your skill gaps · Get personalized roadmap · Free course links</p>
          </div>
          <button onClick={onClose} style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", width: 34, height: 34, borderRadius: "50%", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>×</button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#7f1d1d22", border: "1px solid #f87171", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#f87171", display: "flex", justifyContent: "space-between" }}>
            <span>⚠️ {error}</span>
            <button onClick={() => setError("")} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}>✕</button>
          </div>
        )}

        {/* ── STEP 0: FORM ── */}
        {step === 0 && (
          <div style={{ animation: "sgSlide 0.3s ease" }}>
            <div style={{ background: "#0c1220", border: "1px solid #1e293b", borderRadius: 12, padding: "20px 22px", marginBottom: 14 }}>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "#a78bfa", fontWeight: 700 }}>🎯 Target Role</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={lbl}>Job Title *</label>
                  <input style={inp} placeholder="e.g. ML Engineer" value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Your Experience</label>
                  <select style={{ ...inp, cursor: "pointer" }} value={yearsExp} onChange={e => setYearsExp(e.target.value)}>
                    <option value="0-1">0–1 years (Fresher)</option>
                    <option value="1-2">1–2 years (Junior)</option>
                    <option value="2-4">2–4 years (Mid)</option>
                    <option value="4+">4+ years (Senior)</option>
                  </select>
                </div>
              </div>
              <label style={lbl}>Job Description <span style={{ textTransform: "none", letterSpacing: 0, color: "#334155" }}>(optional — improves accuracy)</span></label>
              <textarea style={{ ...inp, height: 100, resize: "vertical" }}
                placeholder="Paste job description for more accurate gap analysis…"
                value={jobDesc} onChange={e => setJobDesc(e.target.value)} />
            </div>

            <div style={{ background: "#0c1220", border: "1px solid #1e293b", borderRadius: 12, padding: "20px 22px", marginBottom: 20 }}>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "#34d399", fontWeight: 700 }}>🛠 Your Current Skills *</p>
              <label style={lbl}>Skills you already have <span style={{ textTransform: "none", letterSpacing: 0, color: "#334155" }}>(comma separated or one per line)</span></label>
              <textarea style={{ ...inp, height: 110, resize: "vertical" }}
                placeholder={"Python, React, SQL, Git, Docker\nBasic ML knowledge\nJava, Node.js"}
                value={currentSkills} onChange={e => setCurrentSkills(e.target.value)} />
            </div>

            <button onClick={analyze} style={{
              width: "100%", padding: "14px", borderRadius: 12,
              background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
              border: "none", color: "#fff", fontSize: 15, fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", gap: 10, boxShadow: "0 4px 20px #7c3aed44",
            }}>
              🗺️ Analyze My Skill Gap →
            </button>
          </div>
        )}

        {/* ── STEP 1: LOADING ── */}
        {step === 1 && (
          <div style={{ textAlign: "center", padding: "60px 20px", animation: "sgSlide 0.3s ease" }}>
            <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto 28px" }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid #1e293b", borderTopColor: "#7c3aed", animation: "sgSpin 0.9s linear infinite" }} />
              <div style={{ position: "absolute", inset: 10, borderRadius: "50%", border: "3px solid #1e293b", borderTopColor: "#4f46e5", animation: "sgSpin 1.3s linear infinite reverse" }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>🗺️</div>
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", margin: "0 0 8px" }}>{loadingMsg}</p>
            <p style={{ fontSize: 13, color: "#475569" }}>Groq AI is analyzing your profile for <strong style={{ color: "#a78bfa" }}>{jobTitle}</strong></p>
          </div>
        )}

        {/* ── STEP 2: RESULTS ── */}
        {step === 2 && result && (
          <div style={{ animation: "sgSlide 0.3s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20, alignItems: "start" }}>

              {/* Left panel */}
              <div>
                {/* Gap score */}
                <div style={{ background: "#0c1220", border: "1px solid #1e293b", borderRadius: 12, padding: "18px", marginBottom: 14, textAlign: "center" }}>
                  <p style={{ margin: "0 0 10px", fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Gap Analysis Score</p>
                  <GapRing score={result.gap_score ?? 50} />
                  <div style={{ marginTop: 12, padding: "8px 12px", background: "#0f172a", borderRadius: 8, border: "1px solid #1e293b" }}>
                    <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>Job Fit</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#a78bfa" }}>{result.job_fit_percent ?? 0}%</div>
                  </div>
                  <div style={{ marginTop: 8, padding: "8px 12px", background: "#0f172a", borderRadius: 8, border: "1px solid #1e293b" }}>
                    <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>Ready In</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#22c55e" }}>{result.estimated_ready_in}</div>
                  </div>
                </div>

                {/* Strengths */}
                {result.strengths?.length > 0 && (
                  <div style={{ background: "#0c1220", border: "1px solid #14532d", borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
                    <p style={{ margin: "0 0 10px", fontSize: 11, color: "#4ade80", fontWeight: 700, textTransform: "uppercase" }}>✓ Your Strengths</p>
                    {result.strengths.map((s, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 6 }}>
                        <span style={{ color: "#22c55e", fontSize: 12, flexShrink: 0, marginTop: 1 }}>✓</span>
                        <span style={{ fontSize: 12, color: "#86efac" }}>{s}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Present skills */}
                {result.present_skills?.length > 0 && (
                  <div style={{ background: "#0c1220", border: "1px solid #1e293b", borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
                    <p style={{ margin: "0 0 10px", fontSize: 11, color: "#60a5fa", fontWeight: 700, textTransform: "uppercase" }}>Skills You Have</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {result.present_skills.map((s, i) => (
                        <span key={i} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "#0f2744", color: "#60a5fa", border: "1px solid #2563eb44" }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick wins */}
                {result.quick_wins?.length > 0 && (
                  <div style={{ background: "#0c1220", border: "1px solid #78350f55", borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
                    <p style={{ margin: "0 0 10px", fontSize: 11, color: "#fb923c", fontWeight: 700, textTransform: "uppercase" }}>⚡ Quick Wins</p>
                    {result.quick_wins.map((w, i) => (
                      <div key={i} style={{ display: "flex", gap: 6, marginBottom: 7, alignItems: "flex-start" }}>
                        <span style={{ color: "#f97316", fontSize: 11, flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
                        <span style={{ fontSize: 12, color: "#fed7aa", lineHeight: 1.5 }}>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Redo */}
                <button onClick={() => { setStep(0); setResult(null); }}
                  style={{ width: "100%", padding: "10px", borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                  🔄 Analyze Again
                </button>
              </div>

              {/* Right panel — roadmap */}
              <div>
                {/* Summary */}
                <div style={{ background: "linear-gradient(135deg,#1a0a2e,#0f172a)", border: "1px solid #7c3aed44", borderRadius: 12, padding: "16px 18px", marginBottom: 20 }}>
                  <p style={{ margin: "0 0 6px", fontSize: 11, color: "#a78bfa", fontWeight: 700, textTransform: "uppercase" }}>📋 Your Personalized Roadmap</p>
                  <p style={{ margin: 0, fontSize: 13, color: "#c4b5fd", lineHeight: 1.7 }}>{result.roadmap_summary}</p>
                </div>

                {/* Skills to learn */}
                {result.missing_skills?.length > 0 ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>
                        Skills to Learn <span style={{ fontSize: 11, color: "#64748b", fontWeight: 400 }}>({result.missing_skills.length} gaps found)</span>
                      </p>
                      <div style={{ display: "flex", gap: 6, fontSize: 10 }}>
                        {["High", "Medium", "Low"].map(p => (
                          <PriorityBadge key={p} priority={p} />
                        ))}
                      </div>
                    </div>
                    <div>
                      {result.missing_skills.map((skill, i) => (
                        <SkillCard key={i} skill={skill} index={i} total={result.missing_skills.length} />
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "40px 20px", background: "#0c1220", borderRadius: 12, border: "1px solid #14532d" }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                    <p style={{ fontSize: 16, fontWeight: 700, color: "#22c55e" }}>You have all the required skills!</p>
                    <p style={{ fontSize: 13, color: "#64748b" }}>Your profile is a strong match for this role.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}