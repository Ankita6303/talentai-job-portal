import { useState, useRef } from "react";

// ── shared styles (matches your dark theme) ───────────────────
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
const gradBtn = {
  padding: "12px 28px", borderRadius: 10,
  background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
  border: "none", color: "#fff", fontWeight: 700, fontSize: 14,
  cursor: "pointer", boxShadow: "0 4px 16px #7c3aed44",
};

// ── Spinner ───────────────────────────────────────────────────
function Spinner() {
  return (
    <span style={{
      display: "inline-block", width: 14, height: 14,
      border: "2px solid #334155", borderTopColor: "#a78bfa",
      borderRadius: "50%", animation: "spin 0.7s linear infinite",
    }} />
  );
}

// ── ScoreRing (reused from ResumeBuilder) ─────────────────────
function ScoreRing({ score }) {
  const col = score >= 85 ? "#22c55e" : score >= 70 ? "#eab308" : score >= 55 ? "#f97316" : "#ef4444";
  const r = 38, c = 2 * Math.PI * r, fill = (score / 100) * c;
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={90} height={90} viewBox="0 0 90 90">
        <circle cx={45} cy={45} r={r} fill="none" stroke="#1e293b" strokeWidth={7} />
        <circle cx={45} cy={45} r={r} fill="none" stroke={col} strokeWidth={7}
          strokeDasharray={`${fill} ${c}`} strokeLinecap="round"
          transform="rotate(-90 45 45)"
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

// ── Step Indicator ────────────────────────────────────────────
function Steps({ current }) {
  const steps = ["Input Resume", "Job Target", "AI Convert", "Preview & Export"];
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
              flex: 1, height: 2, margin: "0 8px", marginBottom: 20,
              background: i < current ? "#22c55e" : "#1e293b", transition: "background 0.3s",
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Resume Preview (clean white A4) ───────────────────────────
function ResumePreview({ data }) {
  const { personal, summary, skills, experience, jobTitle, projects, education, certifications } = data;
  const sectionHead = {
    fontSize: 10.5, fontWeight: 700, color: "#1a1a2e",
    textTransform: "uppercase", letterSpacing: "0.12em",
    borderBottom: "1.5px solid #1d4ed8", paddingBottom: 1,
    marginBottom: 3, marginTop: 0, fontFamily: "'Arial', sans-serif",
  };
  const bodyText = { fontSize: 11, color: "#2d2d2d", lineHeight: 1.3, fontFamily: "'Arial', sans-serif" };

  return (
    <>
      <style>{`
        #conv-resume-preview * {
          font-family: 'Arial', 'Helvetica Neue', Helvetica, sans-serif !important;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        @media print {
          @page { size: A4; margin: 8mm; }
          #conv-resume-preview { box-shadow: none !important; padding: 0 !important; }
          .no-break { page-break-inside: avoid; }
        }
      `}</style>
      <div id="conv-resume-preview" style={{
        background: "#fff", color: "#1a1a2e",
        fontFamily: "'Arial', 'Helvetica Neue', Helvetica, sans-serif",
        padding: "10px 14px", maxWidth: 794, margin: "0 auto",
        fontSize: 10.5, lineHeight: 1.35, boxShadow: "0 2px 30px rgba(0,0,0,0.18)",
      }}>
        {/* Header */}
        <div className="no-break" style={{ marginBottom: 8 }}>
          <h1 style={{ margin: "0 0 2px", fontSize: 18, fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>
            {personal?.name || "Your Name"}
          </h1>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1d4ed8", marginBottom: 4 }}>
            {jobTitle || personal?.title || "Professional Title"}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 14px", fontSize: 10.5, color: "#475569" }}>
            {personal?.email    && <span>✉ {personal.email}</span>}
            {personal?.phone    && <span>📱 {personal.phone}</span>}
            {personal?.location && <span>📍 {personal.location}</span>}
            {personal?.linkedin && <span>🔗 {personal.linkedin}</span>}
            {personal?.github   && <span>💻 {personal.github}</span>}
          </div>
        </div>

        {summary && (
          <div className="no-break" style={{ marginBottom: 4 }}>
            <h2 style={sectionHead}>Professional Summary</h2>
            <p style={{ ...bodyText, margin: 0, textAlign: "justify" }}>{summary}</p>
          </div>
        )}

        {skills?.length > 0 && (
          <div className="no-break" style={{ marginBottom: 4 }}>
            <h2 style={sectionHead}>Technical Skills</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {typeof skills[0] === "object"
                ? skills.map((cat, i) => (
                    <div key={i} style={{ display: "flex", gap: 6, ...bodyText }}>
                      <span style={{ fontWeight: 700, color: "#0f172a", minWidth: 110, flexShrink: 0 }}>{cat.category}:</span>
                      <span style={{ color: "#374151" }}>{Array.isArray(cat.items) ? cat.items.join(", ") : cat.items}</span>
                    </div>
                  ))
                : <p style={{ ...bodyText, margin: 0 }}>{skills.join(", ")}</p>
              }
            </div>
          </div>
        )}

        {experience?.length > 0 && (
          <div style={{ marginBottom: 4 }}>
            <h2 style={sectionHead}>Work Experience</h2>
            {experience.map((exp, i) => (
              <div key={i} className="no-break" style={{ marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 1 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "#0f172a" }}>{exp.title}</div>
                    <div style={{ fontSize: 11, color: "#1d4ed8", fontWeight: 600 }}>
                      {exp.company}{exp.location ? ` · ${exp.location}` : ""}
                    </div>
                  </div>
                  <div style={{ fontSize: 10.5, color: "#6b7280", whiteSpace: "nowrap", marginLeft: 10, marginTop: 2 }}>{exp.duration}</div>
                </div>
                {exp.bullets?.length > 0 && (
                  <ul style={{ margin: "2px 0 0", paddingLeft: 16 }}>
                    {exp.bullets.map((b, j) => <li key={j} style={{ ...bodyText, marginBottom: 2 }}>{b}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {projects?.length > 0 && (
          <div style={{ marginBottom: 4 }}>
            <h2 style={sectionHead}>Key Projects</h2>
            {projects.map((proj, i) => (
              <div key={i} className="no-break" style={{ marginBottom: 5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 1 }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 700, fontSize: 11.5, color: "#0f172a" }}>{proj.name}</span>
                    {proj.tech && <span style={{ fontSize: 10.5, color: "#1d4ed8", fontWeight: 600 }}> | {proj.tech}</span>}
                  </div>
                  {proj.duration && <span style={{ fontSize: 10.5, color: "#6b7280", whiteSpace: "nowrap", marginLeft: 10 }}>{proj.duration}</span>}
                </div>
                {proj.bullets?.length > 0 && (
                  <ul style={{ margin: "2px 0 0", paddingLeft: 16 }}>
                    {proj.bullets.map((b, j) => <li key={j} style={{ ...bodyText, marginBottom: 2 }}>{b}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {education?.length > 0 && (
          <div className="no-break" style={{ marginBottom: 5 }}>
            <h2 style={sectionHead}>Education</h2>
            {education.map((ed, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 11.5, color: "#0f172a" }}>{ed.degree}</div>
                  <div style={{ fontSize: 10.5, color: "#4b5563" }}>{ed.institution}{ed.gpa ? ` · GPA: ${ed.gpa}` : ""}</div>
                </div>
                <div style={{ fontSize: 10.5, color: "#6b7280", whiteSpace: "nowrap", marginLeft: 10 }}>{ed.year}</div>
              </div>
            ))}
          </div>
        )}

        {certifications?.length > 0 && (
          <div>
            <h2 style={sectionHead}>Certifications & Achievements</h2>
            {certifications.map((c, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                <span style={{ ...bodyText, fontWeight: 500 }}>▪ {c.name}</span>
                <span style={{ fontSize: 10.5, color: "#6b7280", whiteSpace: "nowrap", marginLeft: 10 }}>
                  {c.issuer}{c.year ? ` · ${c.year}` : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════
//  MAIN RESUME CONVERTER
// ══════════════════════════════════════════════════════════════
export default function ResumeConverter({ onClose, groqKey, onSwitchToBuilder }) {
  const [step, setStep]               = useState(0);
  const [loading, setLoading]         = useState(false);
  const [loadingMsg, setLoadingMsg]   = useState("");
  const [error, setError]             = useState("");

  // Step 0 — input
  const [inputMode, setInputMode]     = useState("paste"); // "paste" | "pdf"
  const [pastedResume, setPastedResume] = useState("");
  const [pdfText, setPdfText]         = useState("");
  const [fileName, setFileName]       = useState("");
  const fileRef = useRef(null);

  // Step 1 — job target
  const [jobTitle, setJobTitle]       = useState("");
  const [company, setCompany]         = useState("");
  const [jobDesc, setJobDesc]         = useState("");

  // Step 3 — output
  const [resume, setResume]           = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [activeTab, setActiveTab]     = useState("preview"); // "preview" | "builder" | "templates"

  // ── Groq call ───────────────────────────────────────────────
  const callGroq = async (userPrompt, systemPrompt = "You are a helpful assistant.", maxTokens = 3000) => {
    const key = groqKey || (typeof import.meta !== "undefined" && import.meta.env?.VITE_GROQ_API_KEY) || "";
    if (!key || key.trim() === "" || key === "YOUR_GROQ_API_KEY_HERE")
      throw new Error("Groq API key not found.");
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
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

  // ── PDF text extraction via PDF.js ───────────────────────────
  const handlePdfUpload = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setLoadingMsg("Reading PDF with PDF.js…");
    setLoading(true);
    try {
      // Dynamically load PDF.js from CDN
      if (!window.pdfjsLib) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      }

      // Read file as ArrayBuffer
      const arrayBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });

      // Load PDF and extract text from all pages
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        // Join items preserving line breaks
        const pageText = textContent.items
          .map(item => item.str)
          .join(" ")
          .replace(/\s{3,}/g, "\n"); // collapse big spaces into newlines
        fullText += pageText + "\n";
      }

      const cleaned = fullText
        .split("\n")
        .map(l => l.trim())
        .filter(l => l.length > 1)
        .join("\n")
        .slice(0, 10000); // limit to 10k chars

      if (!cleaned || cleaned.length < 50) {
        throw new Error("Could not extract text — this may be a scanned/image PDF. Please paste the text manually.");
      }

      setPdfText(cleaned);
    } catch (err) {
      setError(err.message || "PDF extraction failed. Please paste your resume text manually.");
      setPdfText("");
      setFileName("");
    } finally {
      setLoading(false); setLoadingMsg("");
    }
  };

  const sourceText = inputMode === "paste" ? pastedResume : pdfText;

  // ── AI Convert ───────────────────────────────────────────────
  const convertResume = async () => {
    if (!sourceText.trim()) { setError("Please provide your existing resume first."); return; }
    setLoading(true); setError(""); setLoadingMsg("Parsing your existing resume…");
    try {
      setLoadingMsg("Rebuilding as ATS-optimized resume…");
      const prompt = `You are an expert ATS resume writer and career coach.

TASK: Convert the following existing resume into a polished, ATS-optimized resume${jobTitle ? ` tailored for: ${jobTitle}` : ""}.${company ? ` at ${company}` : ""}

${jobDesc ? `TARGET JOB DESCRIPTION:\n${jobDesc}\n` : ""}

EXISTING RESUME TEXT:
${sourceText}

Instructions:
1. Extract all personal info (name, email, phone, location, linkedin, github)
2. Identify job title / professional title
3. Write an ATS-optimized 3-sentence professional summary
4. Parse ALL work experience into structured bullets using STAR format with metrics
5. Parse ALL projects with tech stack and impact bullets
6. Extract education, skills, certifications
7. Score ATS compatibility (0-100)
8. List matched keywords and missing keywords vs job description
9. Give 5 improvement suggestions

Return ONLY raw JSON. No markdown. Start with { end with }.

{
  "personal": {
    "name": "", "email": "", "phone": "",
    "location": "", "linkedin": "", "github": ""
  },
  "jobTitle": "Professional Title",
  "summary": "3-sentence ATS summary",
  "experience": [
    {
      "title": "Job Title", "company": "Company", "location": "City",
      "duration": "Jan 2022 – Present",
      "bullets": ["Achievement with metrics", "Achievement 2"]
    }
  ],
  "projects": [
    {
      "name": "Project Name", "tech": "Python · React",
      "duration": "Jan 2025 – Mar 2025",
      "bullets": ["Built X achieving Y% improvement"]
    }
  ],
  "education": [
    { "degree": "B.Tech CS", "institution": "University", "year": "2020", "gpa": "8.5/10" }
  ],
  "skills": [
    { "category": "AI & ML", "items": ["Python", "TensorFlow"] },
    { "category": "Languages", "items": ["Java", "SQL"] },
    { "category": "Cloud", "items": ["AWS", "Docker"] },
    { "category": "Tools", "items": ["Git", "Linux"] }
  ],
  "certifications": [
    { "name": "Cert Name", "issuer": "Issuer", "year": "2023" }
  ],
  "ats_score": 78,
  "keywords_matched": ["keyword1", "keyword2"],
  "keywords_missing": ["missing1", "missing2"],
  "suggestions": [
    "Add quantified metrics to bullets",
    "Include more JD keywords",
    "Add LinkedIn URL",
    "Expand certifications section",
    "Use stronger action verbs"
  ]
}`;

      const raw = await callGroq(
        prompt,
        "You are an ATS resume expert. Return ONLY raw JSON. No markdown, no fences. Start with { end with }.",
        3500
      );
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("AI returned invalid response. Please try again.");
      const parsed = JSON.parse(match[0]);

      setResume({
        personal:        parsed.personal        || {},
        jobTitle:        parsed.jobTitle        || jobTitle || "",
        summary:         parsed.summary         || "",
        experience:      parsed.experience      || [],
        projects:        parsed.projects        || [],
        education:       parsed.education       || [],
        skills:          parsed.skills          || [],
        certifications:  parsed.certifications  || [],
        atsScore:        parsed.ats_score       || 70,
        keywordsMatched: parsed.keywords_matched|| [],
        keywordsMissing: parsed.keywords_missing|| [],
      });
      setSuggestions(parsed.suggestions || []);
      setStep(3);
    } catch (e) {
      setError("Conversion failed: " + e.message);
    } finally {
      setLoading(false); setLoadingMsg("");
    }
  };

  // ── Improve score ────────────────────────────────────────────
  const improveResume = async () => {
    if (!resume) return;
    setLoading(true); setLoadingMsg("AI improving your score…");
    try {
      const raw = await callGroq(
        `Improve this resume to score 90+ ATS for: ${resume.jobTitle}.
Current score: ${resume.atsScore}/100
Missing keywords: ${resume.keywordsMissing?.join(", ")}
Summary: ${resume.summary}
Return ONLY raw JSON:
{"summary":"improved","skills":[{"category":"AI","items":["Python"]}],"ats_score":92,"suggestions":["tip1"]}`,
        "ATS resume expert. Return ONLY raw JSON starting with {.",
        800
      );
      const m = raw.replace(/```json|```/g, "").trim().match(/\{[\s\S]*\}/);
      if (!m) throw new Error("Invalid AI response");
      const p = JSON.parse(m[0]);
      setResume(r => ({ ...r, summary: p.summary || r.summary, skills: p.skills || r.skills, atsScore: p.ats_score || r.atsScore }));
      if (p.suggestions) setSuggestions(p.suggestions);
    } catch (e) {
      setError("Improvement failed: " + e.message);
    } finally {
      setLoading(false); setLoadingMsg("");
    }
  };

  // ── Print / PDF ──────────────────────────────────────────────
  const printResume = () => {
    const el = document.getElementById("conv-resume-preview");
    if (!el) return;
    const w = window.open("", "_blank");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${resume?.personal?.name || "Resume"}</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Arial','Helvetica Neue',Helvetica,sans-serif;font-size:11px;
       line-height:1.55;color:#1a1a2e;background:#fff;padding:0;margin:0;}
  @page{size:A4;margin:8mm;}
  #conv-resume-preview{width:100%;max-width:100%;margin:0;padding:8px 10px;background:#fff;}
  .no-break{page-break-inside:avoid;}
  h2{page-break-after:avoid;}
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
  #conv-resume-preview{box-shadow:none!important;}
</style></head><body>
${el.outerHTML}
<script>window.onload=function(){setTimeout(function(){window.print();},500);};<\/script>
</body></html>`);
    w.document.close();
  };

  const copyAsText = () => {
    if (!resume) return;
    const skillsText = resume.skills?.map(c =>
      typeof c === "object" ? `${c.category}: ${c.items.join(", ")}` : c
    ).join("\n") || "";
    const text = `${resume.personal?.name}
${[resume.personal?.email, resume.personal?.phone, resume.personal?.location].filter(Boolean).join(" | ")}

PROFESSIONAL SUMMARY
${resume.summary}

EXPERIENCE
${resume.experience.map(e => `${e.title} at ${e.company} (${e.duration})\n${e.bullets.map(b => `• ${b}`).join("\n")}`).join("\n\n")}

KEY PROJECTS
${resume.projects.map(p => `${p.name} | ${p.tech} (${p.duration})\n${p.bullets.map(b => `• ${b}`).join("\n")}`).join("\n\n")}

SKILLS
${skillsText}

EDUCATION
${resume.education.map(e => `${e.degree} — ${e.institution} (${e.year})`).join("\n")}

CERTIFICATIONS
${resume.certifications.map(c => `${c.name} — ${c.issuer}${c.year ? ` (${c.year})` : ""}`).join("\n")}`;
    navigator.clipboard.writeText(text).then(() => alert("✅ Copied to clipboard!"));
  };

  // ════════════════════════════════════════════════════════════
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.93)",
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      zIndex: 500, padding: 16, overflowY: "auto",
    }}>
      <div style={{
        background: "#070d1a", border: "1px solid #1e293b", borderRadius: 20,
        width: "100%", maxWidth: step === 3 ? 1150 : 740,
        margin: "20px auto", padding: 32, boxShadow: "0 30px 80px rgba(0,0,0,0.7)",
      }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>
              🔄 Resume Converter
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
              Paste or upload your old resume → AI rebuilds it ATS-optimized
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {onSwitchToBuilder && (
              <button onClick={onSwitchToBuilder} style={{
                padding: "8px 16px", borderRadius: 8,
                background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                border: "none", color: "#fff", fontSize: 12, fontWeight: 700,
                cursor: "pointer", boxShadow: "0 4px 12px #7c3aed44",
              }}>
                📄 Build from Scratch
              </button>
            )}
            <button onClick={onClose} style={{
              background: "#1e293b", border: "1px solid #334155", color: "#94a3b8",
              width: 36, height: 36, borderRadius: "50%", fontSize: 20,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}>×</button>
          </div>
        </div>

        <Steps current={step} />

        {/* ── Error ── */}
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

        {/* ══════════════════════════════════════════════════════
            STEP 0 — Input: Paste or PDF Upload
        ══════════════════════════════════════════════════════ */}
        {step === 0 && (
          <div>
            {/* Mode toggle */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {[
                { id: "paste", icon: "📝", label: "Paste Resume Text" },
                { id: "pdf",   icon: "📎", label: "Upload PDF" },
              ].map(m => (
                <button key={m.id} onClick={() => setInputMode(m.id)} style={{
                  flex: 1, padding: "14px 16px", borderRadius: 10, cursor: "pointer",
                  border: `2px solid ${inputMode === m.id ? "#7c3aed" : "#1e293b"}`,
                  background: inputMode === m.id ? "#1e1040" : "#0c1220",
                  color: inputMode === m.id ? "#a78bfa" : "#475569",
                  fontWeight: 700, fontSize: 14, transition: "all 0.2s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                  {m.icon} {m.label}
                </button>
              ))}
            </div>

            <div style={card}>
              {inputMode === "paste" ? (
                <>
                  <p style={{ margin: "0 0 10px", fontSize: 13, color: "#a78bfa", fontWeight: 700 }}>
                    📝 Paste Your Existing Resume
                  </p>
                  <p style={{ margin: "0 0 12px", fontSize: 12, color: "#475569" }}>
                    Copy all text from your current resume (Word, PDF, Google Docs) and paste below. Include everything — AI will parse and restructure it.
                  </p>
                  <textarea
                    style={{ ...inp, height: 320, resize: "vertical", lineHeight: 1.6 }}
                    placeholder={`Paste your full resume here…\n\nExample:\nJohn Doe\njohn@email.com | +91 98765 43210 | Pune, Maharashtra\n\nSOFTWARE ENGINEER\nExperience: 3 years in Python, React, AWS...\n\nWORK EXPERIENCE\nSoftware Engineer at TechCorp (2021-2024)\n- Built REST APIs serving 10k+ users\n...\n\nEDUCATION\nB.Tech Computer Science, Pune University, 2020`}
                    value={pastedResume}
                    onChange={e => setPastedResume(e.target.value)}
                  />
                  <div style={{ marginTop: 8, fontSize: 12, color: "#334155", textAlign: "right" }}>
                    {pastedResume.length} characters
                  </div>
                </>
              ) : (
                <>
                  <p style={{ margin: "0 0 10px", fontSize: 13, color: "#a78bfa", fontWeight: 700 }}>
                    📎 Upload Your Resume PDF
                  </p>
                  <p style={{ margin: "0 0 16px", fontSize: 12, color: "#475569" }}>
                    Upload your existing resume PDF. Works best with text-layer PDFs (not scanned images).
                  </p>

                  {/* Drop zone */}
                  <div
                    onClick={() => fileRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); handlePdfUpload(e.dataTransfer.files[0]); }}
                    style={{
                      border: "2px dashed #334155", borderRadius: 12, padding: "40px 24px",
                      textAlign: "center", cursor: "pointer", background: "#080f1e",
                      transition: "border-color 0.2s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "#7c3aed"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "#334155"}
                  >
                    {loading ? (
                      <div style={{ color: "#a78bfa" }}><Spinner /> &nbsp;{loadingMsg}</div>
                    ) : fileName ? (
                      <>
                        <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>{fileName}</div>
                        <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
                          {pdfText.length} characters extracted · Click to replace
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 6 }}>
                          Drop your PDF here
                        </div>
                        <div style={{ fontSize: 13, color: "#475569" }}>or click to browse</div>
                        <div style={{ fontSize: 11, color: "#334155", marginTop: 8 }}>Supports .pdf files</div>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileRef} type="file" accept=".pdf"
                    style={{ display: "none" }}
                    onChange={e => handlePdfUpload(e.target.files[0])}
                  />

                  {/* Extracted text preview */}
                  {pdfText && (
                    <div style={{ marginTop: 16 }}>
                      <label style={lbl}>Extracted Text Preview <span style={{ color: "#334155", textTransform: "none" }}>(you can edit)</span></label>
                      <textarea
                        style={{ ...inp, height: 180, resize: "vertical", fontSize: 12, lineHeight: 1.5 }}
                        value={pdfText}
                        onChange={e => setPdfText(e.target.value)}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  if (!sourceText.trim()) { setError("Please provide your resume first."); return; }
                  setError(""); setStep(1);
                }}
                style={gradBtn}
              >
                Next: Target Job →
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 1 — Job Target (optional)
        ══════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div>
            <div style={card}>
              <p style={{ margin: "0 0 6px", fontSize: 14, color: "#a78bfa", fontWeight: 700 }}>🎯 Target Job <span style={{ fontSize: 12, color: "#334155", fontWeight: 400 }}>(optional — improves ATS matching)</span></p>
              <p style={{ margin: "0 0 16px", fontSize: 12, color: "#475569" }}>
                Adding a job description lets AI tailor keywords, skills, and language specifically for this role.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>Job Title</label>
                  <input style={inp} placeholder="e.g. ML Engineer" value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Company Name</label>
                  <input style={inp} placeholder="e.g. Google" value={company} onChange={e => setCompany(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={lbl}>Job Description <span style={{ color: "#334155", textTransform: "none", letterSpacing: 0 }}>(paste for best results)</span></label>
                <textarea
                  style={{ ...inp, height: 180, resize: "vertical" }}
                  placeholder="Paste the full job description here for maximum ATS optimization…"
                  value={jobDesc}
                  onChange={e => setJobDesc(e.target.value)}
                />
              </div>
            </div>

            {/* Resume source summary */}
            <div style={{ ...card, background: "#080f1e", marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>
                📋 Resume Source
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, background: "#1e1040",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                }}>
                  {inputMode === "pdf" ? "📄" : "📝"}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>
                    {inputMode === "pdf" ? fileName || "PDF Uploaded" : "Pasted Resume Text"}
                  </div>
                  <div style={{ fontSize: 12, color: "#475569" }}>
                    {sourceText.length} characters ready for AI conversion
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => setStep(0)} style={{
                padding: "11px 22px", borderRadius: 10, background: "#1e293b",
                border: "1px solid #334155", color: "#94a3b8", fontWeight: 600, fontSize: 14, cursor: "pointer",
              }}>← Back</button>
              <button onClick={() => setStep(2)} style={gradBtn}>
                Next: Convert →
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 2 — Generate / Loading
        ══════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div>
            <div style={{ ...card, textAlign: "center", padding: "40px 32px" }}>
              {loading ? (
                <>
                  <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto 24px" }}>
                    <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid #1e293b", borderTopColor: "#4f46e5", animation: "spin 0.9s linear infinite" }} />
                    <div style={{ position: "absolute", inset: 8, borderRadius: "50%", border: "3px solid #1e293b", borderTopColor: "#7c3aed", animation: "spin 1.4s linear infinite reverse" }} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🔄</div>
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", margin: "0 0 8px" }}>{loadingMsg}</p>
                  <p style={{ fontSize: 13, color: "#475569" }}>Groq AI is converting and optimizing your resume…</p>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 64, marginBottom: 16 }}>🔄</div>
                  <h3 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 800, color: "#f1f5f9" }}>Ready to Convert</h3>
                  <p style={{ margin: "0 0 24px", fontSize: 13, color: "#64748b" }}>
                    AI will parse your existing resume, restructure it with ATS-optimized bullets, score compatibility, and give improvement suggestions.
                  </p>

                  {/* Summary card */}
                  <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "16px 20px", marginBottom: 24, textAlign: "left" }}>
                    {[
                      ["📄 Source", inputMode === "pdf" ? fileName || "PDF uploaded" : `Pasted text (${sourceText.length} chars)`],
                      ["🎯 Target Role", jobTitle ? `${jobTitle}${company ? ` at ${company}` : ""}` : "General (no JD provided)"],
                      ["📊 JD Matching", jobDesc ? "Job description provided ✓" : "No JD — general ATS optimization"],
                    ].map(([l, v]) => (
                      <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #1e293b", fontSize: 13 }}>
                        <span style={{ color: "#64748b" }}>{l}</span>
                        <span style={{ color: "#f1f5f9", fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                  </div>

                  <button onClick={convertResume} style={{ ...gradBtn, fontSize: 16, padding: "14px 44px" }}>
                    ⚡ Convert My Resume
                  </button>
                </>
              )}
            </div>
            {!loading && (
              <button onClick={() => setStep(1)} style={{
                padding: "11px 22px", borderRadius: 10, background: "#1e293b",
                border: "1px solid #334155", color: "#94a3b8", fontWeight: 600, fontSize: 14, cursor: "pointer",
              }}>← Back</button>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 3 — Preview, Templates, Builder
        ══════════════════════════════════════════════════════ */}
        {step === 3 && resume && (
          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, alignItems: "start" }}>

            {/* ── Left panel ── */}
            <div>
              {/* ATS Score */}
              <div style={{ ...card, textAlign: "center" }}>
                <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>ATS Compatibility</p>
                <ScoreRing score={resume.atsScore} />
                <button onClick={improveResume} disabled={loading} style={{
                  width: "100%", marginTop: 14, padding: "10px",
                  borderRadius: 8,
                  background: loading ? "#1e293b" : "linear-gradient(135deg,#7c3aed,#4f46e5)",
                  border: "none",
                  color: loading ? "#475569" : "#fff",
                  fontWeight: 700, fontSize: 13,
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  boxShadow: loading ? "none" : "0 4px 16px #7c3aed44",
                }}>
                  {loading ? <><Spinner /> Improving…</> : "⚡ AI Improve Score"}
                </button>
              </div>

              {/* Keywords matched */}
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

              {/* Keywords missing */}
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

              {/* Suggestions */}
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

              {/* Export */}
              <div style={card}>
                <p style={{ margin: "0 0 12px", fontSize: 12, color: "#a78bfa", fontWeight: 700, textTransform: "uppercase" }}>📤 Export</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button onClick={printResume} style={{
                    padding: "10px", borderRadius: 8,
                    background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                    border: "none", color: "#fff", fontWeight: 700, fontSize: 13,
                    cursor: "pointer", boxShadow: "0 4px 12px #7c3aed44",
                  }}>🖨️ Print / Save as PDF</button>
                  <button onClick={copyAsText} style={{
                    padding: "10px", borderRadius: 8,
                    background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                    border: "none", color: "#fff", fontWeight: 700, fontSize: 13,
                    cursor: "pointer", boxShadow: "0 4px 12px #7c3aed44",
                  }}>📋 Copy as Plain Text</button>
                  <button onClick={() => { setStep(2); setResume(null); }} style={{
                    padding: "10px", borderRadius: 8,
                    background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                    border: "none", color: "#fff", fontWeight: 700, fontSize: 13,
                    cursor: "pointer", boxShadow: "0 4px 12px #7c3aed44",
                  }}>🔄 Reconvert</button>
                  <button onClick={() => setStep(0)} style={{
                    padding: "10px", borderRadius: 8,
                    background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                    border: "none", color: "#fff", fontWeight: 700, fontSize: 13,
                    cursor: "pointer", boxShadow: "0 4px 12px #7c3aed44",
                  }}>✏️ Edit Source</button>
                </div>
              </div>
            </div>

            {/* ── Right panel with tabs ── */}
            <div>
              {/* Tab bar */}
              <div style={{ display: "flex", gap: 6, marginBottom: 14, background: "#0c1220", border: "1px solid #1e293b", borderRadius: 12, padding: 6 }}>
                {[
                  { id: "preview",   icon: "👁️", label: "Preview" },
                  { id: "builder",   icon: "🛠️", label: "Full Builder" },
                  { id: "templates", icon: "📋", label: "Templates" },
                ].map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                    flex: 1, padding: "9px 6px", borderRadius: 8, border: "none",
                    background: activeTab === t.id ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "transparent",
                    color: activeTab === t.id ? "#fff" : "#475569",
                    fontWeight: activeTab === t.id ? 700 : 500,
                    fontSize: 13, cursor: "pointer", transition: "all 0.2s",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                    boxShadow: activeTab === t.id ? "0 4px 12px #7c3aed44" : "none",
                  }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              {/* ── Tab: Preview ── */}
              {activeTab === "preview" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Resume Preview</span>
                    <span style={{ fontSize: 12, color: "#475569" }}>A4 · ATS-friendly layout</span>
                  </div>
                  <div style={{ borderRadius: 8, overflow: "hidden", boxShadow: "0 4px 40px rgba(0,0,0,0.5)" }}>
                    <ResumePreview data={resume} />
                  </div>
                </div>
              )}

              {/* ── Tab: Full Builder ── */}
              {activeTab === "builder" && (
                <div style={{ ...card, padding: "28px 24px" }}>
                  <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <div style={{ fontSize: 52, marginBottom: 12 }}>🛠️</div>
                    <h3 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 800, color: "#f1f5f9" }}>
                      Continue in Full Builder
                    </h3>
                    <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748b", lineHeight: 1.7 }}>
                      Your converted resume data is ready. Open the ATS Resume Builder to fine-tune every section — edit experience bullets, add missing skills, tweak the summary, and optimize further with AI.
                    </p>
                  </div>

                  {/* Data preview */}
                  <div style={{ background: "#080f1e", border: "1px solid #1e293b", borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
                    <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Converted Data Summary</p>
                    {[
                      ["👤 Name",           resume.personal?.name || "—"],
                      ["💼 Role",            resume.jobTitle || "—"],
                      ["🏢 Experience",      `${resume.experience?.length || 0} position(s)`],
                      ["🚀 Projects",        `${resume.projects?.length || 0} project(s)`],
                      ["🎓 Education",       `${resume.education?.length || 0} entry/entries`],
                      ["🛠 Skill Categories",`${resume.skills?.length || 0} categories`],
                      ["📜 Certifications",  `${resume.certifications?.length || 0} cert(s)`],
                      ["📊 ATS Score",       `${resume.atsScore}/100`],
                    ].map(([l, v]) => (
                      <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #1e293b", fontSize: 13 }}>
                        <span style={{ color: "#64748b" }}>{l}</span>
                        <span style={{ color: "#f1f5f9", fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                  </div>

                  {onSwitchToBuilder ? (
                    <button
                      onClick={() => onSwitchToBuilder(resume)}
                      style={{ ...gradBtn, width: "100%", fontSize: 15, padding: "14px" }}
                    >
                      🚀 Open in Full Resume Builder →
                    </button>
                  ) : (
                    <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 10, padding: "14px 18px", fontSize: 13, color: "#64748b", textAlign: "center" }}>
                      💡 Connect the <strong style={{ color: "#a78bfa" }}>onSwitchToBuilder</strong> prop to enable launching the full builder with pre-filled data.
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: Templates ── */}
              {activeTab === "templates" && (
                <div>
                  <p style={{ margin: "0 0 14px", fontSize: 13, color: "#64748b" }}>
                    Apply your converted resume data to any template style:
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[
                      { id: "modern",  name: "Modern Blue",  tag: "Tech · Startups · AI",      color: "#1d4ed8", icon: "💙" },
                      { id: "classic", name: "Classic",      tag: "Finance · Law · Govt",       color: "#334155", icon: "🖤" },
                      { id: "twocol",  name: "Two Column",   tag: "Design · Product · UX",     color: "#0f766e", icon: "💚" },
                      { id: "minimal", name: "Minimal Dark", tag: "FAANG · Research · Senior",  color: "#7c3aed", icon: "💜" },
                    ].map(t => (
                      <div key={t.id} style={{
                        background: "#0c1220", border: "1px solid #1e293b",
                        borderRadius: 12, padding: "16px", cursor: "default",
                        transition: "border-color 0.2s",
                      }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = t.color}
                        onMouseLeave={e => e.currentTarget.style.borderColor = "#1e293b"}
                      >
                        <div style={{ fontSize: 28, marginBottom: 8 }}>{t.icon}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 3 }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: "#475569", marginBottom: 12 }}>{t.tag}</div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={printResume}
                            style={{
                              flex: 1, padding: "8px 6px", borderRadius: 7,
                              background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                              border: "none", color: "#fff",
                              fontSize: 11, fontWeight: 700, cursor: "pointer",
                              boxShadow: "0 4px 12px #7c3aed44",
                            }}>
                            🖨️ Export
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{
                    marginTop: 14, background: "#0c1220", border: "1px solid #1e293b",
                    borderRadius: 10, padding: "12px 16px", fontSize: 12, color: "#64748b",
                  }}>
                    💡 <strong style={{ color: "#94a3b8" }}>Tip:</strong> Switch to the <strong style={{ color: "#a78bfa" }}>Templates</strong> tab in the main menu for full interactive template previews with live data.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}