import { useState, useRef } from "react";

const GROQ_MODEL = "llama-3.3-70b-versatile";

const inp = {
  width: "100%", background: "#0f172a", border: "1px solid #1e293b",
  borderRadius: 8, color: "#f1f5f9", fontSize: 14, padding: "10px 12px",
  outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};
const lbl = {
  fontSize: 12, color: "#64748b", fontWeight: 600, display: "block",
  marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em",
};
const card = {
  background: "#0c1220", border: "1px solid #1e293b",
  borderRadius: 12, padding: "20px 22px", marginBottom: 16,
};

function Spinner() {
  return (
    <span style={{
      display: "inline-block", width: 14, height: 14,
      border: "2px solid #334155", borderTopColor: "#60a5fa",
      borderRadius: "50%", animation: "spin 0.7s linear infinite",
    }} />
  );
}

function Steps({ current }) {
  const steps = ["Job Details", "Your Info", "AI Generate", "Preview & Export"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", display: "flex",
              alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13,
              background: i < current ? "#22c55e" : i === current ? "#4f46e5" : "#1e293b",
              color: i <= current ? "#fff" : "#475569",
              border: `2px solid ${i < current ? "#22c55e" : i === current ? "#7c3aed" : "#334155"}`,
              transition: "all 0.3s",
            }}>
              {i < current ? "✓" : i + 1}
            </div>
            <span style={{
              fontSize: 11, whiteSpace: "nowrap", fontWeight: i === current ? 700 : 400,
              color: i === current ? "#a78bfa" : i < current ? "#22c55e" : "#475569",
            }}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              flex: 1, height: 2, margin: "0 8px", marginBottom: 20, transition: "background 0.3s",
              background: i < current ? "#22c55e" : "#1e293b",
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

function ScoreRing({ score }) {
  const col = score >= 85 ? "#22c55e" : score >= 70 ? "#eab308" : score >= 55 ? "#f97316" : "#ef4444";
  const r = 38, c = 2 * Math.PI * r, fill = (score / 100) * c;
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={90} height={90} viewBox="0 0 90 90">
        <circle cx={45} cy={45} r={r} fill="none" stroke="#1e293b" strokeWidth={7} />
        <circle cx={45} cy={45} r={r} fill="none" stroke={col} strokeWidth={7}
          strokeDasharray={`${fill} ${c}`} strokeLinecap="round" transform="rotate(-90 45 45)"
          style={{ transition: "stroke-dasharray 1.2s ease" }} />
        <text x={45} y={42} textAnchor="middle" fontSize={20} fontWeight={800} fill={col} fontFamily="inherit">{score}</text>
        <text x={45} y={56} textAnchor="middle" fontSize={10} fill="#475569" fontFamily="inherit">ATS Score</text>
      </svg>
      <div style={{ fontSize: 12, fontWeight: 700, color: col, marginTop: 2 }}>
        {score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 55 ? "Average" : "Needs Work"}
      </div>
    </div>
  );
}

// ── ResumePreview ─────────────────────────────────────────────
function ResumePreview({ data }) {
  const { personal, summary, skills, experience, jobTitle, projects, education, certifications } = data;

  return (
    <div id="resume-preview" style={{
      background: "#fff", color: "#1a1a2e", fontFamily: "'Georgia', serif",
      padding: "40px 44px", maxWidth: 794, margin: "0 auto",
      fontSize: 13, lineHeight: 1.6, boxShadow: "0 4px 40px rgba(0,0,0,0.4)",
    }}>

      {/* Header */}
      <div style={{ borderBottom: "3px solid #1d4ed8", paddingBottom: 16, marginBottom: 18 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
          {personal.name || "Your Name"}
        </h1>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1d4ed8", marginBottom: 8 }}>
          {jobTitle || personal.title || "Professional Title"}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 18px", fontSize: 12, color: "#475569" }}>
          {personal.email && <span>✉ {personal.email}</span>}
          {personal.phone && <span>📱 {personal.phone}</span>}
          {personal.location && <span>📍 {personal.location}</span>}
          {personal.linkedin && <span>🔗 {personal.linkedin}</span>}
          {personal.github && <span>💻 {personal.github}</span>}
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid #e2e8f0", paddingBottom: 4, marginBottom: 8 }}>
            Professional Summary
          </h2>
          <p style={{ margin: 0, color: "#374151", lineHeight: 1.7 }}>{summary}</p>
        </div>
      )}
      {/* Technical Skills — categorized */}
      {skills?.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid #e2e8f0", paddingBottom: 4, marginBottom: 8 }}>
            Technical Skills
          </h2>
          {typeof skills[0] === "object" ? (
            skills.map((cat, i) => (
              <p key={i} style={{ margin: "0 0 5px", fontSize: 13, color: "#374151" }}>
                <strong style={{ color: "#0f172a" }}>{cat.category}:</strong>{" "}
                {Array.isArray(cat.items) ? cat.items.join(", ") : cat.items}
              </p>
            ))
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: "#374151" }}>{skills.join(", ")}</p>
          )}
        </div>
      )}


      {/* Experience */}
      {experience?.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid #e2e8f0", paddingBottom: 4, marginBottom: 10 }}>
            Work Experience
          </h2>
          {experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{exp.title}</div>
                  <div style={{ fontSize: 13, color: "#1d4ed8", fontWeight: 600 }}>
                    {exp.company}{exp.location ? ` · ${exp.location}` : ""}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap", marginLeft: 10 }}>{exp.duration}</div>
              </div>
              {exp.bullets?.length > 0 && (
                <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                  {exp.bullets.map((b, j) => (
                    <li key={j} style={{ color: "#374151", marginBottom: 3, fontSize: 13 }}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Key Projects */}
      {projects?.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid #e2e8f0", paddingBottom: 4, marginBottom: 10 }}>
            Key Projects
          </h2>
          {projects.map((proj, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{proj.name}</span>
                  {proj.tech && (
                    <span style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 500 }}> | {proj.tech}</span>
                  )}
                </div>
                {proj.duration && (
                  <span style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap", marginLeft: 10 }}>{proj.duration}</span>
                )}
              </div>
              {proj.bullets?.length > 0 && (
                <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                  {proj.bullets.map((b, j) => (
                    <li key={j} style={{ color: "#374151", marginBottom: 2, fontSize: 13 }}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      
      {/* Education */}
      {education?.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid #e2e8f0", paddingBottom: 4, marginBottom: 10 }}>
            Education
          </h2>
          {education.map((ed, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{ed.degree}</div>
                <div style={{ fontSize: 12, color: "#475569" }}>
                  {ed.institution}{ed.gpa ? ` · GPA: ${ed.gpa}` : ""}
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap", marginLeft: 10 }}>{ed.year}</div>
            </div>
          ))}
        </div>
      )}

      {/* Certifications */}
      {certifications?.length > 0 && (
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid #e2e8f0", paddingBottom: 4, marginBottom: 8 }}>
            Certifications & Achievements
          </h2>
          {certifications.map((c, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
              <span style={{ color: "#374151" }}> {c.name}</span>
              <span style={{ color: "#64748b", fontSize: 12 }}>{c.issuer}{c.year ? ` · ${c.year}` : ""}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════════
export default function ResumeBuilder({ onClose, groqKey }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [personal, setPersonal] = useState({
    name: "", email: "", phone: "", location: "", linkedin: "", github: "", title: "",
  });
  const setP = (k, v) => setPersonal(p => ({ ...p, [k]: v }));
  const [rawExp, setRawExp] = useState("");
  const [rawEdu, setRawEdu] = useState("");
  const [rawSkills, setRawSkills] = useState("");
  const [rawCerts, setRawCerts] = useState("");
  const [rawProjects, setRawProjects] = useState("");
  const [resume, setResume] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const printRef = useRef(null);

  const callGroq = async (userPrompt, systemPrompt = "You are a helpful assistant.", maxTokens = 2000) => {
    const key = groqKey || (typeof import.meta !== "undefined" && import.meta.env?.VITE_GROQ_API_KEY) || "";
    if (!key || key.trim() === "" || key === "YOUR_GROQ_API_KEY_HERE") {
      throw new Error("Groq API key not found.");
    }
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e?.error?.message || `Groq API error: ${res.status}`);
    }
    const d = await res.json();
    return d.choices?.[0]?.message?.content || "";
  };

  const generateResume = async () => {
    if (!personal.name || !personal.email) { setError("Please fill in your name and email first."); return; }
    setLoading(true); setError(""); setLoadingMsg("Analyzing job description…");
    try {
      setLoadingMsg("Building ATS-optimized resume with AI…");
      const prompt = `You are an expert resume writer and ATS optimization specialist.

JOB TITLE: ${jobTitle}
COMPANY: ${company}
JOB DESCRIPTION:
${jobDesc || "Not provided"}

CANDIDATE INFO:
Name: ${personal.name}
Email: ${personal.email}
Phone: ${personal.phone}
Location: ${personal.location}
LinkedIn: ${personal.linkedin}
GitHub: ${personal.github}

RAW EXPERIENCE:
${rawExp || "No experience provided"}

RAW PROJECTS:
${rawProjects || "No projects provided"}

RAW EDUCATION:
${rawEdu || "No education provided"}

SKILLS:
${rawSkills || "No skills provided"}

CERTIFICATIONS:
${rawCerts || "None"}

Instructions:
1. Extract keywords from the job description
2. Write an ATS-optimized professional summary (3 sentences)
3. Rewrite experience bullets using STAR format with metrics
4. Include ALL projects from RAW PROJECTS section
5. Score the resume for ATS compatibility (0-100)

Return ONLY a raw JSON object. No markdown. Start with { and end with }.

{
  "summary": "3-sentence ATS-optimized summary",
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "City, State",
      "duration": "Jan 2022 – Present",
      "bullets": ["Achievement 1 with metrics", "Achievement 2 with metrics"]
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "tech": "Python · React · PostgreSQL",
      "duration": "Jan 2025 – Mar 2025",
      "bullets": ["Built X achieving Z% improvement", "Deployed using Y technology"]
    }
  ],
  "education": [
    {
      "degree": "B.Tech Computer Science",
      "institution": "University Name",
      "year": "2020",
      "gpa": "8.5/10"
    }
  ],
  "skills": [
    {"category": "AI, ML & Python", "items": ["Python", "TensorFlow", "PyTorch"]},
    {"category": "Languages", "items": ["Java", "JavaScript", "SQL"]},
    {"category": "Cloud & Databases", "items": ["AWS", "PostgreSQL", "Docker"]},
    {"category": "Tools & DevOps", "items": ["Git", "CI/CD", "Linux"]}
  ],
  "certifications": [
    {"name": "Certification Name", "issuer": "Issuer", "year": "2023"}
  ],
  "ats_score": 82,
  "keywords_matched": ["keyword1", "keyword2"],
  "keywords_missing": ["missing1", "missing2"],
  "suggestions": [
    "Add quantified metrics to experience bullets",
    "Include more keywords from the job description",
    "Add LinkedIn profile URL",
    "Expand skills with tools from JD",
    "Add relevant certifications"
  ]
}`;

      const raw = await callGroq(
        prompt,
        "You are an expert ATS resume writer. Return ONLY raw JSON. No markdown, no code fences. Start with { and end with }.",
        3000
      );
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("AI returned invalid response. Please try again.");
      const parsed = JSON.parse(jsonMatch[0]);

      setResume({
        personal,
        jobTitle,
        summary: parsed.summary || "",
        experience: parsed.experience || [],
        projects: parsed.projects || [],
        education: parsed.education || [],
        skills: parsed.skills || [],
        certifications: parsed.certifications || [],
        atsScore: parsed.ats_score || 75,
        keywordsMatched: parsed.keywords_matched || [],
        keywordsMissing: parsed.keywords_missing || [],
      });
      setSuggestions(parsed.suggestions || []);
      setStep(3);
    } catch (e) {
      setError("AI generation failed: " + e.message);
    } finally {
      setLoading(false); setLoadingMsg("");
    }
  };

  const improveResume = async () => {
    if (!resume) return;
    setLoading(true); setLoadingMsg("AI is improving your resume…");
    try {
      const raw = await callGroq(
        `Improve this resume to score 90+ on ATS for: ${jobTitle}.
Current score: ${resume.atsScore}/100
Missing keywords: ${resume.keywordsMissing?.join(", ")}
Current summary: ${resume.summary}

Return ONLY raw JSON:
{"summary":"improved summary","skills":[{"category":"AI & ML","items":["Python"]}],"ats_score":92,"suggestions":["tip 1","tip 2"]}`,
        "You are an ATS resume expert. Return ONLY raw JSON starting with {.",
        800
      );
      const jsonMatch = raw.replace(/```json|```/g, "").trim().match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Invalid response from AI");
      const parsed = JSON.parse(jsonMatch[0]);
      setResume(r => ({
        ...r,
        summary: parsed.summary || r.summary,
        skills: parsed.skills || r.skills,
        atsScore: parsed.ats_score || r.atsScore,
      }));
      if (parsed.suggestions) setSuggestions(parsed.suggestions);
    } catch (e) {
      setError("Improvement failed: " + e.message);
    } finally {
      setLoading(false); setLoadingMsg("");
    }
  };

  const printResume = () => {
    const el = document.getElementById("resume-preview");
    if (!el) return;
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>${personal.name} - Resume</title>
      <style>body{margin:0;padding:20px;font-family:Georgia,serif;}
      @media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style>
      </head><body>${el.outerHTML}</body></html>`);
    w.document.close(); w.focus();
    setTimeout(() => { w.print(); }, 500);
  };

  const copyAsText = () => {
    if (!resume) return;
    const skillsText = resume.skills?.length
      ? typeof resume.skills[0] === "object"
        ? resume.skills.map(c => `${c.category}: ${c.items.join(", ")}`).join("\n")
        : resume.skills.join(", ")
      : "";
    const projectsText = resume.projects?.length
      ? resume.projects.map(p => `${p.name} | ${p.tech || ""} (${p.duration || ""})\n${(p.bullets || []).map(b => `• ${b}`).join("\n")}`).join("\n\n")
      : "";
    const text = `${resume.personal.name}
${[resume.personal.email, resume.personal.phone, resume.personal.location].filter(Boolean).join(" | ")}

PROFESSIONAL SUMMARY
${resume.summary}

EXPERIENCE
${resume.experience.map(e => `${e.title} at ${e.company} (${e.duration})\n${e.bullets.map(b => `• ${b}`).join("\n")}`).join("\n\n")}

${projectsText ? `KEY PROJECTS\n${projectsText}\n` : ""}
TECHNICAL SKILLS
${skillsText}

EDUCATION
${resume.education.map(e => `${e.degree} — ${e.institution} (${e.year})`).join("\n")}

Certifications & Achievements
${resume.certifications.map(c => `${c.name} — ${c.issuer}${c.year ? ` (${c.year})` : ""}`).join("\n")}`;
    navigator.clipboard.writeText(text).then(() => alert("✅ Resume copied to clipboard!"));
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.93)",
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      zIndex: 500, padding: 16, overflowY: "auto",
    }}>
      <div style={{
        background: "#070d1a", border: "1px solid #1e293b", borderRadius: 20,
        width: "100%", maxWidth: step === 3 ? 1100 : 720,
        margin: "20px auto", padding: 32, boxShadow: "0 30px 80px rgba(0,0,0,0.7)",
      }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>📄 ATS Resume Builder</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>AI-powered · Groq LLaMA 3 · Tailored to your target job</p>
          </div>
          <button onClick={onClose} style={{
            background: "#1e293b", border: "1px solid #334155", color: "#94a3b8",
            width: 36, height: 36, borderRadius: "50%", fontSize: 20, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>

        <Steps current={step} />

        {error && (
          <div style={{
            background: "#7f1d1d22", border: "1px solid #f87171", borderRadius: 10,
            padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#f87171",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span>⚠️ {error}</span>
            <button onClick={() => setError("")} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>
        )}

        {/* STEP 0 — Job Details */}
        {step === 0 && (
          <div>
            <div style={card}>
              <p style={{ margin: "0 0 16px", fontSize: 14, color: "#a78bfa", fontWeight: 700 }}>🎯 Target Job</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>Job Title *</label>
                  <input style={inp} placeholder="e.g. ML Engineer" value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Company Name</label>
                  <input style={inp} placeholder="e.g. Google" value={company} onChange={e => setCompany(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={lbl}>Job Description <span style={{ color: "#334155", textTransform: "none", letterSpacing: 0 }}>(paste for best ATS match)</span></label>
                <textarea style={{ ...inp, height: 180, resize: "vertical" }}
                  placeholder="Paste the full job description here…"
                  value={jobDesc} onChange={e => setJobDesc(e.target.value)} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => { if (!jobTitle) { setError("Job title is required."); return; } setError(""); setStep(1); }}
                style={{ padding: "11px 28px", borderRadius: 10, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                Next: Your Info →
              </button>
            </div>
          </div>
        )}

        {/* STEP 1 — Your Info */}
        {step === 1 && (
          <div>
            <div style={card}>
              <p style={{ margin: "0 0 16px", fontSize: 14, color: "#60a5fa", fontWeight: 700 }}>👤 Personal Information</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {[
                  ["name", "Full Name *", "e.g. Ankita Sharma"],
                  ["email", "Email *", "ankita@email.com"],
                  ["phone", "Phone", "+91 98765 43210"],
                  ["location", "Location", "Pune, Maharashtra"],
                  ["linkedin", "LinkedIn URL", "linkedin.com/in/ankita"],
                  ["github", "GitHub / Portfolio", "github.com/ankita"],
                ].map(([key, label, ph]) => (
                  <div key={key}>
                    <label style={lbl}>{label}</label>
                    <input style={inp} placeholder={ph} value={personal[key]} onChange={e => setP(key, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>

            <div style={card}>
              <p style={{ margin: "0 0 16px", fontSize: 14, color: "#34d399", fontWeight: 700 }}>💼 Work Experience</p>
              <label style={lbl}>Describe your experience <span style={{ color: "#334155", textTransform: "none" }}>(AI rewrites as ATS bullets)</span></label>
              <textarea style={{ ...inp, height: 140, resize: "vertical" }} value={rawExp} onChange={e => setRawExp(e.target.value)}
                placeholder={`e.g:\nSoftware Engineer at TechCorp (2021-2024)\n- Built ML pipeline for fraud detection\n- Led a team of 4 engineers\n- Improved API response time by 40%`} />
            </div>

            <div style={card}>
              <p style={{ margin: "0 0 16px", fontSize: 14, color: "#f59e0b", fontWeight: 700 }}>🚀 Projects</p>
              <label style={lbl}>Describe your projects <span style={{ color: "#334155", textTransform: "none" }}>(AI formats with tech stack & bullets)</span></label>
              <textarea style={{ ...inp, height: 140, resize: "vertical" }} value={rawProjects} onChange={e => setRawProjects(e.target.value)}
                placeholder={`e.g:\nTalentAI Resume Platform (Python, LangChain, PostgreSQL) - Nov 2025 to Feb 2026\n- Built async AI agent for parsing profiles\n- Served 200+ live testing users\n\nAI Intent Classifier (Python, FastAPI, React) - Sep 2025 to Jan 2026\n- Reduced query latency by 45%`} />
            </div>

            <div style={card}>
              <p style={{ margin: "0 0 16px", fontSize: 14, color: "#a78bfa", fontWeight: 700 }}>🎓 Education & Skills</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={lbl}>Education</label>
                  <textarea style={{ ...inp, height: 90, resize: "vertical" }} value={rawEdu} onChange={e => setRawEdu(e.target.value)}
                    placeholder={"B.Tech Computer Science\nPune University, 2020\nGPA: 8.2/10"} />
                </div>
                <div>
                  <label style={lbl}>Skills <span style={{ color: "#334155", textTransform: "none" }}>(comma separated)</span></label>
                  <textarea style={{ ...inp, height: 90, resize: "vertical" }} value={rawSkills} onChange={e => setRawSkills(e.target.value)}
                    placeholder={"Python, TensorFlow, PyTorch, SQL, React, Docker, AWS, Git"} />
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <label style={lbl}>Certifications</label>
                <input style={inp} value={rawCerts} onChange={e => setRawCerts(e.target.value)}
                  placeholder="AWS Solutions Architect (Amazon, 2023), TensorFlow Developer (Google, 2022)" />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => setStep(0)} style={{ padding: "11px 22px", borderRadius: 10, background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>← Back</button>
              <button onClick={() => { if (!personal.name || !personal.email) { setError("Name and email are required."); return; } setError(""); setStep(2); }}
                style={{ padding: "11px 28px", borderRadius: 10, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                Next: Generate →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 — Generate */}
        {step === 2 && (
          <div>
            <div style={{ ...card, textAlign: "center", padding: "40px 32px" }}>
              {loading ? (
                <>
                  <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto 24px" }}>
                    <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid #1e293b", borderTopColor: "#4f46e5", animation: "spin 0.9s linear infinite" }} />
                    <div style={{ position: "absolute", inset: 8, borderRadius: "50%", border: "3px solid #1e293b", borderTopColor: "#7c3aed", animation: "spin 1.4s linear infinite reverse" }} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📄</div>
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", margin: "0 0 8px" }}>{loadingMsg}</p>
                  <p style={{ fontSize: 13, color: "#475569" }}>Groq AI is crafting your ATS-optimized resume…</p>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 64, marginBottom: 16 }}>🤖</div>
                  <h3 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 800, color: "#f1f5f9" }}>Ready to Generate</h3>
                  <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "16px 20px", marginBottom: 24, textAlign: "left" }}>
                    {[
                      ["🎯 Target Role", `${jobTitle}${company ? ` at ${company}` : ""}`],
                      ["👤 Candidate", personal.name],
                      ["📧 Email", personal.email],
                      ["💼 Experience", rawExp ? "Provided ✓" : "Not provided"],
                      ["🚀 Projects", rawProjects ? "Provided ✓" : "Not provided"],
                      ["🎓 Education", rawEdu ? "Provided ✓" : "Not provided"],
                      ["🛠 Skills", rawSkills ? `${rawSkills.split(",").filter(s => s.trim()).length} skills` : "Not provided"],
                    ].map(([l, v]) => (
                      <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1e293b", fontSize: 13 }}>
                        <span style={{ color: "#64748b" }}>{l}</span>
                        <span style={{ color: "#f1f5f9", fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={generateResume}
                    style={{ padding: "14px 40px", borderRadius: 12, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", border: "none", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 10 }}>
                    ⚡ Generate ATS Resume
                  </button>
                </>
              )}
            </div>
            {!loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <button onClick={() => setStep(1)} style={{ padding: "11px 22px", borderRadius: 10, background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>← Back</button>
              </div>
            )}
          </div>
        )}

        {/* STEP 3 — Preview */}
        {step === 3 && resume && (
          <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, alignItems: "start" }}>
            <div>
              <div style={{ ...card, textAlign: "center" }}>
                <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>ATS Compatibility</p>
                <ScoreRing score={resume.atsScore} />
                <button onClick={improveResume} disabled={loading}
                  style={{ width: "100%", marginTop: 14, padding: "10px", borderRadius: 8, background: loading ? "#1e293b" : "linear-gradient(135deg,#4f46e5,#7c3aed)", border: "none", color: loading ? "#475569" : "#fff", fontWeight: 700, fontSize: 13, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  {loading ? <><Spinner /> Improving…</> : "⚡ AI Improve Score"}
                </button>
              </div>

              {resume.keywordsMatched?.length > 0 && (
                <div style={card}>
                  <p style={{ margin: "0 0 10px", fontSize: 12, color: "#22c55e", fontWeight: 700, textTransform: "uppercase" }}>✓ Keywords Matched</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {resume.keywordsMatched.map((k, i) => (
                      <span key={i} style={{ background: "#14532d", color: "#4ade80", padding: "2px 8px", borderRadius: 4, fontSize: 11, border: "1px solid #166534" }}>{k}</span>
                    ))}
                  </div>
                </div>
              )}

              {resume.keywordsMissing?.length > 0 && (
                <div style={card}>
                  <p style={{ margin: "0 0 10px", fontSize: 12, color: "#f87171", fontWeight: 700, textTransform: "uppercase" }}>✗ Missing Keywords</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {resume.keywordsMissing.map((k, i) => (
                      <span key={i} style={{ background: "#7f1d1d22", color: "#f87171", padding: "2px 8px", borderRadius: 4, fontSize: 11, border: "1px solid #7f1d1d" }}>{k}</span>
                    ))}
                  </div>
                </div>
              )}

              {suggestions.length > 0 && (
                <div style={card}>
                  <p style={{ margin: "0 0 10px", fontSize: 12, color: "#f59e0b", fontWeight: 700, textTransform: "uppercase" }}>💡 Improvements</p>
                  {suggestions.map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
                      <span style={{ color: "#f59e0b", flexShrink: 0 }}>{i + 1}.</span>
                      <span style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>{s}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={card}>
                <p style={{ margin: "0 0 12px", fontSize: 12, color: "#a78bfa", fontWeight: 700, textTransform: "uppercase" }}>📤 Export</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button onClick={printResume} style={{ padding: "10px", borderRadius: 8, background: "#1d4ed8", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>🖨️ Print / Save as PDF</button>
                  <button onClick={copyAsText} style={{ padding: "10px", borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>📋 Copy as Plain Text</button>
                  <button onClick={() => { setStep(2); setResume(null); }} style={{ padding: "10px", borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#64748b", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>🔄 Regenerate</button>
                  <button onClick={() => setStep(1)} style={{ padding: "10px", borderRadius: 8, background: "none", border: "1px solid #1e293b", color: "#475569", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>✏️ Edit Info</button>
                </div>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Resume Preview</span>
                <span style={{ fontSize: 12, color: "#475569" }}>A4 format · ATS-friendly layout</span>
              </div>
              <div style={{ borderRadius: 8, overflow: "hidden", boxShadow: "0 4px 40px rgba(0,0,0,0.5)" }} ref={printRef}>
                <ResumePreview data={resume} />
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}