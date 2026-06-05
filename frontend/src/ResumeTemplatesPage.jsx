// ResumeTemplatesPage.jsx
// Add to App.jsx:
//   import ResumeTemplatesPage from "./ResumeTemplatesPage";
//   {showTemplates && <ResumeTemplatesPage onClose={() => setShowTemplates(false)} />}
//
// Add button anywhere in your UI:
//   <button onClick={() => setShowTemplates(true)}>📋 Resume Templates</button>

import { useState } from "react";

// ── shared input style (dark theme matching your app) ─────────
const inp = {
  width: "100%", background: "#0f172a", border: "1px solid #1e293b",
  borderRadius: 8, color: "#f1f5f9", fontSize: 13, padding: "9px 12px",
  outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};
const lbl = {
  fontSize: 11, color: "#64748b", fontWeight: 600, display: "block",
  marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em",
};
const card = {
  background: "#0c1220", border: "1px solid #1e293b",
  borderRadius: 12, padding: "18px 20px", marginBottom: 14,
};

// ══════════════════════════════════════════════════════════════
//  SAMPLE DATA for preview
// ══════════════════════════════════════════════════════════════
const SAMPLE = {
  personal: {
    name: "Ankita Bansod",
    email: "ankita@email.com",
    phone: "+91 98765 43210",
    location: "Pune, Maharashtra",
    linkedin: "linkedin.com/in/ankita",
    github: "github.com/ankita",
  },
  jobTitle: "AI & Full Stack Engineer",
  summary:
    "Computer Engineering graduate specializing in AI/ML, LLM pipelines, and cloud-native backend systems. Proficient in Python, Node.js, and React with hands-on experience deploying microservices on Azure and AWS.",
  skills: [
    { category: "AI, ML & Python", items: ["Python", "LangChain", "PyTorch", "Pandas", "NumPy"] },
    { category: "Languages", items: ["Java", "JavaScript", "TypeScript", "SQL"] },
    { category: "Cloud & Databases", items: ["Azure AZ-900", "PostgreSQL", "MySQL", "AWS"] },
    { category: "Backend & Frameworks", items: ["FastAPI", "Node.js", "Express.js", "React", "JWT"] },
    { category: "Tools & DevOps", items: ["Docker", "Git", "GitHub Actions", "Linux"] },
  ],
  experience: [
    {
      title: "Cybersecurity Risk Analyst Intern",
      company: "Zetheta",
      location: "Remote (Part-time)",
      duration: "Dec 2025 – Mar 2026",
      bullets: [
        "Evaluated authentication protocols across 5 multi-tier cloud systems, enhancing infrastructure hardiness.",
        "Authored GDPR & ISO 27001 regulatory readiness frameworks across 4 teams, cutting audit timelines by 25%.",
      ],
    },
    {
      title: "Full-Stack & Data AI Intern",
      company: "CodTech Pvt. Ltd",
      location: "Remote",
      duration: "Mar 2025 – Jun 2025",
      bullets: [
        "Designed Python database connectors using Pandas and NumPy to aggregate 50K+ streaming logs, slashing API lookup delay by 30%.",
        "Automated CI/CD pipelines via GitHub Actions, trimming software delivery overhead by 40%.",
      ],
    },
  ],
  projects: [
    {
      name: "TalentAI – GenAI Resume Analytics Platform",
      tech: "Python · LangChain · PostgreSQL · Azure · Gemini API",
      duration: "Nov 2025 – Feb 2026",
      bullets: [
        "Developed async Python intelligent agent workflow for parsing profiles and optimizing ATS scoring via Gemini LLM.",
        "Secured backend routes with JWT tokens; hosted microservice nodes serving 200+ live testing users.",
      ],
    },
    {
      name: "AI Intent Classifier & Air Quality Search Platform",
      tech: "Python · FastAPI · NLP · React.js",
      duration: "Sep 2025 – Jan 2026",
      bullets: [
        "Built semantic intent detection layer reducing query matching latency by 45% across 100+ daily users.",
        "Optimized single-page UI layouts reducing application load latency by 30%.",
      ],
    },
  ],
  education: [
    { degree: "B.E. – Computer Engineering", institution: "SVPM College of Engineering, Baramati", year: "Jun 2023 – Jun 2026", gpa: "7.95/10" },
    { degree: "Diploma – Computer Engineering", institution: "Rajgad Polytechnic, Bhor", year: "Mar 2020 – Apr 2023", gpa: "80.6%" },
  ],
  certifications: [
    { name: "Microsoft Certified: Azure Fundamentals (AZ-900)", issuer: "Microsoft Learn", year: "2024" },
    { name: "LeetCode Portfolio – 150+ problems", issuer: "LeetCode", year: "2025" },
    { name: "Google Cloud Cybersecurity Certificate", issuer: "Google", year: "2023" },
  ],
};

// ══════════════════════════════════════════════════════════════
//  TEMPLATE RENDERERS
// ══════════════════════════════════════════════════════════════

// ── Classic (Black & White, Times New Roman) ──────────────────
function ClassicResume({ d }) {
  const font = "'Times New Roman', Georgia, serif";
  const sec = { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#000", borderBottom: "1.5px solid #000", paddingBottom: 3, marginBottom: 7, marginTop: 14, fontFamily: font };
  return (
    <div style={{ background: "#fff", color: "#000", fontFamily: font, padding: "36px 44px", fontSize: 11, lineHeight: 1.58 }}>
      <div style={{ textAlign: "center", marginBottom: 12, borderBottom: "2px solid #000", paddingBottom: 10 }}>
        <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>{d.personal.name}</div>
        <div style={{ fontSize: 11.5, color: "#333", marginTop: 3, fontStyle: "italic" }}>{d.jobTitle}</div>
        <div style={{ fontSize: 10, marginTop: 5, color: "#222", display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "3px 14px" }}>
          {[d.personal.email, d.personal.phone, d.personal.location, d.personal.linkedin, d.personal.github].filter(Boolean).map((v, i) => <span key={i}>{v}</span>)}
        </div>
      </div>
      {d.summary && <><div style={sec}>Professional Summary</div><p style={{ margin: "0 0 4px", fontSize: 11, lineHeight: 1.7, textAlign: "justify" }}>{d.summary}</p></>}
      {d.skills?.length > 0 && <><div style={sec}>Technical Skills</div>{d.skills.map((c, i) => <div key={i} style={{ marginBottom: 3, fontSize: 11 }}><strong>{c.category}:</strong> {c.items.join(", ")}</div>)}</>}
      {d.experience?.length > 0 && <><div style={sec}>Work Experience</div>{d.experience.map((e, i) => (
        <div key={i} style={{ marginBottom: 9 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div><span style={{ fontWeight: 700 }}>{e.title}</span><span style={{ color: "#333" }}> — {e.company}{e.location ? `, ${e.location}` : ""}</span></div>
            <span style={{ fontSize: 10.5, color: "#444", whiteSpace: "nowrap" }}>{e.duration}</span>
          </div>
          <ul style={{ margin: "3px 0 0", paddingLeft: 15 }}>{e.bullets?.map((b, j) => <li key={j} style={{ marginBottom: 2 }}>{b}</li>)}</ul>
        </div>
      ))}</>}
      {d.projects?.length > 0 && <><div style={sec}>Key Projects</div>{d.projects.map((p, i) => (
        <div key={i} style={{ marginBottom: 9 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div><span style={{ fontWeight: 700 }}>{p.name}</span>{p.tech && <span style={{ fontSize: 10, color: "#555", fontStyle: "italic" }}> | {p.tech}</span>}</div>
            {p.duration && <span style={{ fontSize: 10.5, color: "#444", whiteSpace: "nowrap" }}>{p.duration}</span>}
          </div>
          <ul style={{ margin: "3px 0 0", paddingLeft: 15 }}>{p.bullets?.map((b, j) => <li key={j} style={{ marginBottom: 2 }}>{b}</li>)}</ul>
        </div>
      ))}</>}
      {d.education?.length > 0 && <><div style={sec}>Education</div>{d.education.map((e, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <div><div style={{ fontWeight: 700 }}>{e.degree}</div><div style={{ fontSize: 10.5, color: "#333" }}>{e.institution}{e.gpa ? ` · GPA: ${e.gpa}` : ""}</div></div>
          <div style={{ fontSize: 10.5, color: "#444", whiteSpace: "nowrap" }}>{e.year}</div>
        </div>
      ))}</>}
      {d.certifications?.length > 0 && <><div style={sec}>Certifications & Achievements</div>{d.certifications.map((c, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 11 }}>
          <span>{c.name}</span><span style={{ color: "#555", fontSize: 10.5 }}>{c.issuer}{c.year ? ` · ${c.year}` : ""}</span>
        </div>
      ))}</>}
    </div>
  );
}

// ── Modern Blue (Tech / Startup) ──────────────────────────────
function ModernResume({ d }) {
  const accent = "#1d4ed8";
  const font = "'Calibri', 'Segoe UI', Arial, sans-serif";
  const sec = { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: accent, borderBottom: `2px solid ${accent}`, paddingBottom: 3, marginBottom: 7, marginTop: 13, fontFamily: font };
  return (
    <div style={{ background: "#fff", color: "#1e293b", fontFamily: font, padding: "34px 42px", fontSize: 11, lineHeight: 1.58 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 23, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em" }}>{d.personal.name}</div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: accent, marginTop: 2, marginBottom: 6 }}>{d.jobTitle}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 16px", fontSize: 10.5, color: "#475569", borderTop: `3px solid ${accent}`, paddingTop: 6 }}>
          {[d.personal.email, d.personal.phone, d.personal.location, d.personal.linkedin, d.personal.github].filter(Boolean).map((v, i) => <span key={i}>{v}</span>)}
        </div>
      </div>
      {d.summary && <><div style={sec}>Summary</div><p style={{ margin: 0, fontSize: 11, color: "#374151", lineHeight: 1.7 }}>{d.summary}</p></>}
      {d.skills?.length > 0 && <><div style={sec}>Technical Skills</div>{d.skills.map((c, i) => (
        <div key={i} style={{ marginBottom: 4, fontSize: 11, display: "flex", gap: 6 }}>
          <strong style={{ color: "#0f172a", minWidth: 145, flexShrink: 0 }}>{c.category}:</strong>
          <span style={{ color: "#374151" }}>{c.items.join(", ")}</span>
        </div>
      ))}</>}
      {d.experience?.length > 0 && <><div style={sec}>Work Experience</div>{d.experience.map((e, i) => (
        <div key={i} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div><div style={{ fontWeight: 700, fontSize: 12 }}>{e.title}</div><div style={{ fontSize: 11, color: accent, fontWeight: 600 }}>{e.company}{e.location ? ` · ${e.location}` : ""}</div></div>
            <div style={{ fontSize: 10.5, color: "#64748b", whiteSpace: "nowrap" }}>{e.duration}</div>
          </div>
          <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>{e.bullets?.map((b, j) => <li key={j} style={{ fontSize: 11, marginBottom: 2, color: "#374151" }}>{b}</li>)}</ul>
        </div>
      ))}</>}
      {d.projects?.length > 0 && <><div style={sec}>Key AI & Software Projects</div>{d.projects.map((p, i) => (
        <div key={i} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1, marginRight: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 12 }}>{p.name}</span>
              {p.tech && <span style={{ fontSize: 10, color: "#64748b" }}> | {p.tech}</span>}
            </div>
            {p.duration && <span style={{ fontSize: 10.5, color: "#64748b", whiteSpace: "nowrap" }}>{p.duration}</span>}
          </div>
          <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>{p.bullets?.map((b, j) => <li key={j} style={{ fontSize: 11, marginBottom: 2, color: "#374151" }}>{b}</li>)}</ul>
        </div>
      ))}</>}
      {d.education?.length > 0 && <><div style={sec}>Education</div>{d.education.map((e, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <div><div style={{ fontWeight: 700, fontSize: 12 }}>{e.degree}</div><div style={{ fontSize: 11, color: "#475569" }}>{e.institution}{e.gpa ? ` · GPA: ${e.gpa}` : ""}</div></div>
          <div style={{ fontSize: 10.5, color: "#64748b", whiteSpace: "nowrap" }}>{e.year}</div>
        </div>
      ))}</>}
      {d.certifications?.length > 0 && <><div style={sec}>Certifications & Achievements</div>{d.certifications.map((c, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 11 }}>
          <span style={{ color: "#374151" }}>{c.name}</span>
          <span style={{ color: "#64748b", fontSize: 10.5 }}>{c.issuer}{c.year ? ` · ${c.year}` : ""}</span>
        </div>
      ))}</>}
    </div>
  );
}

// ── Two Column (Sidebar, Teal) ────────────────────────────────
function TwoColResume({ d }) {
  const accent = "#0f766e";
  const font = "'Calibri', 'Segoe UI', Arial, sans-serif";
  const lSec = { fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.25)", paddingBottom: 3, marginBottom: 7, marginTop: 14 };
  const rSec = { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: accent, borderBottom: `1.5px solid ${accent}`, paddingBottom: 3, marginBottom: 7, marginTop: 13 };
  return (
    <div style={{ background: "#fff", fontFamily: font, display: "flex", fontSize: 11, lineHeight: 1.58, minHeight: 900 }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: "#1e293b", color: "#e2e8f0", padding: "28px 18px", flexShrink: 0 }}>
        <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", lineHeight: 1.25 }}>{d.personal.name}</div>
          <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 3, fontStyle: "italic" }}>{d.jobTitle}</div>
        </div>
        <div style={{ fontSize: 9.5, color: "#64748b", marginBottom: 5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Contact</div>
        <div style={{ fontSize: 10, color: "#cbd5e1", lineHeight: 1.9 }}>
          {[d.personal.email, d.personal.phone, d.personal.location, d.personal.linkedin, d.personal.github].filter(Boolean).map((v, i) => <div key={i}>{v}</div>)}
        </div>
        {d.skills?.length > 0 && <><div style={lSec}>Skills</div>{d.skills.map((cat, i) => (
          <div key={i} style={{ marginBottom: 7 }}>
            <div style={{ fontSize: 9.5, color: "#94a3b8", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>{cat.category}</div>
            {cat.items.map((s, j) => (
              <div key={j} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3, fontSize: 10, color: "#cbd5e1" }}>
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: accent, flexShrink: 0 }} />{s}
              </div>
            ))}
          </div>
        ))}</>}
        {d.education?.length > 0 && <><div style={lSec}>Education</div>{d.education.map((e, i) => (
          <div key={i} style={{ marginBottom: 9 }}>
            <div style={{ fontWeight: 700, fontSize: 10.5, color: "#f1f5f9" }}>{e.degree}</div>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>{e.institution}</div>
            {e.gpa && <div style={{ fontSize: 9.5, color: "#64748b" }}>GPA: {e.gpa}</div>}
            <div style={{ fontSize: 9.5, color: "#64748b" }}>{e.year}</div>
          </div>
        ))}</>}
        {d.certifications?.length > 0 && <><div style={lSec}>Certifications</div>{d.certifications.map((c, i) => (
          <div key={i} style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 10, color: "#f1f5f9", fontWeight: 600 }}>{c.name}</div>
            <div style={{ fontSize: 9.5, color: "#94a3b8" }}>{c.issuer}{c.year ? ` · ${c.year}` : ""}</div>
          </div>
        ))}</>}
      </div>
      {/* Main */}
      <div style={{ flex: 1, padding: "28px 26px", color: "#1e293b" }}>
        {d.summary && <><div style={rSec}>Professional Summary</div><p style={{ margin: "0 0 4px", fontSize: 11, color: "#374151", lineHeight: 1.7 }}>{d.summary}</p></>}
        {d.experience?.length > 0 && <><div style={rSec}>Work Experience</div>{d.experience.map((e, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div><div style={{ fontWeight: 700, fontSize: 12 }}>{e.title}</div><div style={{ fontSize: 11, color: accent, fontWeight: 600 }}>{e.company}{e.location ? ` · ${e.location}` : ""}</div></div>
              <div style={{ fontSize: 10.5, color: "#64748b", whiteSpace: "nowrap" }}>{e.duration}</div>
            </div>
            <ul style={{ margin: "4px 0 0", paddingLeft: 15 }}>{e.bullets?.map((b, j) => <li key={j} style={{ fontSize: 11, marginBottom: 2, color: "#374151" }}>{b}</li>)}</ul>
          </div>
        ))}</>}
        {d.projects?.length > 0 && <><div style={rSec}>Key Projects</div>{d.projects.map((p, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1, marginRight: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 12 }}>{p.name}</span>
                {p.tech && <span style={{ fontSize: 9.5, color: "#64748b" }}> | {p.tech}</span>}
              </div>
              {p.duration && <span style={{ fontSize: 10.5, color: "#64748b", whiteSpace: "nowrap" }}>{p.duration}</span>}
            </div>
            <ul style={{ margin: "4px 0 0", paddingLeft: 15 }}>{p.bullets?.map((b, j) => <li key={j} style={{ fontSize: 11, marginBottom: 2, color: "#374151" }}>{b}</li>)}</ul>
          </div>
        ))}</>}
      </div>
    </div>
  );
}

// ── Minimal Dark Header ───────────────────────────────────────
function MinimalResume({ d }) {
  const font = "'Georgia', 'Garamond', serif";
  const mono = "'Courier New', monospace";
  const sec = { fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#111", borderBottom: "0.5px solid #aaa", paddingBottom: 3, marginBottom: 7, marginTop: 14 };
  return (
    <div style={{ background: "#fff", color: "#111", fontFamily: font, fontSize: 11, lineHeight: 1.6 }}>
      <div style={{ background: "#111", color: "#fff", padding: "26px 42px 20px" }}>
        <div style={{ fontSize: 24, fontWeight: 400, letterSpacing: "0.04em" }}>{d.personal.name}</div>
        <div style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic", marginTop: 2, marginBottom: 8 }}>{d.jobTitle}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 18px", fontSize: 10, color: "#d1d5db", fontFamily: mono }}>
          {[d.personal.email, d.personal.phone, d.personal.location, d.personal.linkedin, d.personal.github].filter(Boolean).map((v, i) => <span key={i}>{v}</span>)}
        </div>
      </div>
      <div style={{ padding: "2px 42px 36px" }}>
        {d.summary && <><div style={sec}>Summary</div><p style={{ margin: 0, fontSize: 11.5, color: "#222", lineHeight: 1.75, fontStyle: "italic" }}>{d.summary}</p></>}
        {d.skills?.length > 0 && <><div style={sec}>Technical Skills</div>{d.skills.map((c, i) => (
          <div key={i} style={{ marginBottom: 4, fontSize: 11, display: "flex", gap: 8 }}>
            <strong style={{ minWidth: 155, flexShrink: 0 }}>{c.category}</strong>
            <span style={{ color: "#333" }}>{c.items.join("  ·  ")}</span>
          </div>
        ))}</>}
        {d.experience?.length > 0 && <><div style={sec}>Experience</div>{d.experience.map((e, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div><span style={{ fontWeight: 700, fontSize: 12 }}>{e.title}</span><span style={{ fontSize: 11, color: "#555" }}>,  {e.company}{e.location ? `, ${e.location}` : ""}</span></div>
              <span style={{ fontSize: 10.5, color: "#777", fontFamily: mono, whiteSpace: "nowrap" }}>{e.duration}</span>
            </div>
            <ul style={{ margin: "4px 0 0", paddingLeft: 17 }}>{e.bullets?.map((b, j) => <li key={j} style={{ fontSize: 11, marginBottom: 2, color: "#333" }}>{b}</li>)}</ul>
          </div>
        ))}</>}
        {d.projects?.length > 0 && <><div style={sec}>Projects</div>{d.projects.map((p, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ flex: 1, marginRight: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 12 }}>{p.name}</span>
                {p.tech && <span style={{ fontSize: 10, color: "#666", fontFamily: mono }}> [{p.tech}]</span>}
              </div>
              {p.duration && <span style={{ fontSize: 10.5, color: "#777", fontFamily: mono, whiteSpace: "nowrap" }}>{p.duration}</span>}
            </div>
            <ul style={{ margin: "4px 0 0", paddingLeft: 17 }}>{p.bullets?.map((b, j) => <li key={j} style={{ fontSize: 11, marginBottom: 2, color: "#333" }}>{b}</li>)}</ul>
          </div>
        ))}</>}
        {d.education?.length > 0 && <><div style={sec}>Education</div>{d.education.map((e, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <div><span style={{ fontWeight: 700, fontSize: 12 }}>{e.degree}</span><span style={{ fontSize: 11, color: "#555" }}>,  {e.institution}{e.gpa ? `  ·  GPA: ${e.gpa}` : ""}</span></div>
            <span style={{ fontSize: 10.5, color: "#777", fontFamily: mono, whiteSpace: "nowrap" }}>{e.year}</span>
          </div>
        ))}</>}
        {d.certifications?.length > 0 && <><div style={sec}>Certifications & Achievements</div>{d.certifications.map((c, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 11 }}>
            <span>{c.name}</span>
            <span style={{ color: "#666", fontSize: 10.5, fontFamily: mono }}>{c.issuer}{c.year ? ` · ${c.year}` : ""}</span>
          </div>
        ))}</>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  TEMPLATE DEFINITIONS
// ══════════════════════════════════════════════════════════════
const TEMPLATES = [
  { id: "classic",  name: "Classic",       tag: "Finance · Law · Govt",     accent: "#000000", component: ClassicResume },
  { id: "modern",   name: "Modern Blue",   tag: "Tech · Startups · AI",     accent: "#1d4ed8", component: ModernResume },
  { id: "twocol",   name: "Two Column",    tag: "Design · Product · UX",    accent: "#0f766e", component: TwoColResume },
  { id: "minimal",  name: "Minimal Dark",  tag: "FAANG · Research · Senior", accent: "#111111", component: MinimalResume },
];

// ══════════════════════════════════════════════════════════════
//  FILL FORM — student fills in their info per template
// ══════════════════════════════════════════════════════════════
function FillForm({ template, onBack, onPreview }) {
  const [p, setP] = useState({ name: "", email: "", phone: "", location: "", linkedin: "", github: "" });
  const [jobTitle, setJobTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [rawSkills, setRawSkills] = useState("");
  const [rawExp, setRawExp] = useState("");
  const [rawProjects, setRawProjects] = useState("");
  const [rawEdu, setRawEdu] = useState("");
  const [rawCerts, setRawCerts] = useState("");

  const parseSkills = (raw) => {
    const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
    if (!lines.length) return [];
    const cats = [];
    let current = null;
    for (const line of lines) {
      if (line.includes(":")) {
        const [cat, ...rest] = line.split(":");
        current = { category: cat.trim(), items: rest.join(":").split(",").map(s => s.trim()).filter(Boolean) };
        cats.push(current);
      } else if (current) {
        current.items.push(...line.split(",").map(s => s.trim()).filter(Boolean));
      }
    }
    if (!cats.length) return [{ category: "Skills", items: raw.split(",").map(s => s.trim()).filter(Boolean) }];
    return cats;
  };

  const parseExp = (raw) => {
    const blocks = raw.split(/\n\n+/).filter(Boolean);
    return blocks.map(block => {
      const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
      const header = lines[0] || "";
      const bullets = lines.slice(1).map(l => l.replace(/^[-•]\s*/, ""));
      const durationMatch = header.match(/\(([^)]+)\)/);
      const atMatch = header.replace(/\([^)]*\)/, "").match(/^(.+?)\s+at\s+(.+)$/i);
      return {
        title: atMatch?.[1]?.trim() || header,
        company: atMatch?.[2]?.trim() || "",
        location: "",
        duration: durationMatch?.[1] || "",
        bullets,
      };
    });
  };

  const parseProjects = (raw) => {
    const blocks = raw.split(/\n\n+/).filter(Boolean);
    return blocks.map(block => {
      const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
      const header = lines[0] || "";
      const bullets = lines.slice(1).map(l => l.replace(/^[-•]\s*/, ""));
      const techMatch = header.match(/\(([^)]+)\)/);
      const durMatch = header.match(/[-–]\s*(\w+ \d{4}\s*[-–]\s*\w+ \d{4})/i);
      return {
        name: header.replace(/\([^)]*\)/, "").replace(/[-–].*$/, "").trim(),
        tech: techMatch?.[1] || "",
        duration: durMatch?.[1] || "",
        bullets,
      };
    });
  };

  const parseEdu = (raw) => {
    const blocks = raw.split(/\n\n+/).filter(Boolean);
    return blocks.map(block => {
      const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
      const gpaMatch = block.match(/gpa[:\s]+([0-9./]+)/i);
      const yearMatch = block.match(/\b(19|20)\d{2}\b/g);
      return {
        degree: lines[0] || "",
        institution: lines[1] || "",
        gpa: gpaMatch?.[1] || "",
        year: yearMatch ? yearMatch.join(" – ") : "",
      };
    });
  };

  const parseCerts = (raw) =>
    raw.split("\n").map(l => l.trim()).filter(Boolean).map(l => {
      const parts = l.split(/[,–-]/).map(s => s.trim());
      return { name: parts[0] || l, issuer: parts[1] || "", year: parts[2] || "" };
    });

  const handlePreview = () => {
    onPreview({
      personal: p,
      jobTitle,
      summary,
      skills: parseSkills(rawSkills),
      experience: parseExp(rawExp),
      projects: parseProjects(rawProjects),
      education: parseEdu(rawEdu),
      certifications: parseCerts(rawCerts),
    });
  };

  const field = (label, key, ph, multi = false) => (
    <div style={{ marginBottom: 12 }}>
      <label style={lbl}>{label}</label>
      {multi
        ? <textarea style={{ ...inp, height: 90, resize: "vertical" }} placeholder={ph} value={key === "summary" ? summary : key === "rawSkills" ? rawSkills : key === "rawExp" ? rawExp : key === "rawProjects" ? rawProjects : key === "rawEdu" ? rawEdu : rawCerts}
            onChange={e => { const v = e.target.value; if (key === "summary") setSummary(v); else if (key === "rawSkills") setRawSkills(v); else if (key === "rawExp") setRawExp(v); else if (key === "rawProjects") setRawProjects(v); else if (key === "rawEdu") setRawEdu(v); else setRawCerts(v); }} />
        : <input style={inp} placeholder={ph} value={p[key] || (key === "jobTitle" ? jobTitle : "")}
            onChange={e => { if (key === "jobTitle") setJobTitle(e.target.value); else setP(prev => ({ ...prev, [key]: e.target.value })); }} />
      }
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
        <button onClick={onBack} style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", padding: "7px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>← Back</button>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f1f5f9" }}>Fill Your Details — {template.name}</h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>Enter your info below, then preview and download</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[["Full Name", "name", "Ankita Bansod"], ["Job Title", "jobTitle", "AI & Full Stack Engineer"], ["Email", "email", "ankita@email.com"], ["Phone", "phone", "+91 98765 43210"], ["Location", "location", "Pune, Maharashtra"], ["LinkedIn", "linkedin", "linkedin.com/in/ankita"]].map(([l, k, ph]) => (
          <div key={k}>{field(l, k, ph)}</div>
        ))}
      </div>
      {field("GitHub / Portfolio", "github", "github.com/ankita")}
      {field("Professional Summary", "summary", "3 sentences describing your expertise, skills and goals…", true)}

      <label style={{ ...lbl, marginTop: 4 }}>Technical Skills</label>
      <div style={{ fontSize: 11, color: "#475569", marginBottom: 4 }}>Format: <code style={{ background: "#1e293b", padding: "1px 6px", borderRadius: 3, fontSize: 11 }}>Category: Skill1, Skill2</code> — one category per line</div>
      <textarea style={{ ...inp, height: 110, resize: "vertical", marginBottom: 12 }} value={rawSkills} onChange={e => setRawSkills(e.target.value)}
        placeholder={"AI, ML & Python: Python, LangChain, PyTorch, Pandas\nLanguages: Java, JavaScript, SQL\nCloud & Databases: Azure, PostgreSQL, AWS\nTools & DevOps: Docker, Git, GitHub Actions"} />

      <label style={lbl}>Work Experience</label>
      <div style={{ fontSize: 11, color: "#475569", marginBottom: 4 }}>Format: <code style={{ background: "#1e293b", padding: "1px 6px", borderRadius: 3, fontSize: 11 }}>Title at Company (Duration)</code> then bullet points</div>
      <textarea style={{ ...inp, height: 120, resize: "vertical", marginBottom: 12 }} value={rawExp} onChange={e => setRawExp(e.target.value)}
        placeholder={"Software Engineer at TechCorp (Mar 2024 – Present)\n- Built ML pipeline for fraud detection improving accuracy by 35%\n- Led team of 4 engineers\n\nIntern at Startup (Jun 2023 – Feb 2024)\n- Built React dashboard reducing support tickets by 20%"} />

      <label style={lbl}>Projects</label>
      <div style={{ fontSize: 11, color: "#475569", marginBottom: 4 }}>Format: <code style={{ background: "#1e293b", padding: "1px 6px", borderRadius: 3, fontSize: 11 }}>Project Name (Tech Stack) – Duration</code> then bullet points</div>
      <textarea style={{ ...inp, height: 120, resize: "vertical", marginBottom: 12 }} value={rawProjects} onChange={e => setRawProjects(e.target.value)}
        placeholder={"TalentAI Platform (Python, LangChain, PostgreSQL) – Nov 2025 to Feb 2026\n- Built async AI agent workflow for parsing profiles\n- Served 200+ live testing users\n\nAI Classifier (Python, FastAPI, React) – Sep 2025 to Jan 2026\n- Reduced query latency by 45%"} />

      <label style={lbl}>Education</label>
      <textarea style={{ ...inp, height: 90, resize: "vertical", marginBottom: 12 }} value={rawEdu} onChange={e => setRawEdu(e.target.value)}
        placeholder={"B.E. Computer Engineering\nSVPM College of Engineering, Baramati\nGPA: 7.95/10  2023-2026\n\nDiploma Computer Engineering\nRajgad Polytechnic, Bhor\nGPA: 80.6%  2020-2023"} />

      <label style={lbl}>Certifications</label>
      <textarea style={{ ...inp, height: 80, resize: "vertical", marginBottom: 20 }} value={rawCerts} onChange={e => setRawCerts(e.target.value)}
        placeholder={"Azure Fundamentals AZ-900, Microsoft Learn, 2024\nGoogle Cloud Cybersecurity Certificate, Google, 2023\nLeetCode 150+ Problems, LeetCode, 2025"} />

      <button onClick={handlePreview} style={{ width: "100%", padding: "13px", borderRadius: 10, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", border: "none", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
        Preview My Resume →
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  MAIN PAGE
// ══════════════════════════════════════════════════════════════
export default function ResumeTemplatesPage({ onClose }) {
  const [view, setView] = useState("grid");        // grid | fill | preview
  const [selected, setSelected] = useState(null);  // template object
  const [resumeData, setResumeData] = useState(null);

  const printResume = () => {
    const el = document.getElementById("tpl-preview");
    if (!el) return;
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>Resume</title>
      <style>body{margin:0;padding:0;font-family:inherit;}
      @media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style>
      </head><body>${el.outerHTML}</body></html>`);
    w.document.close(); w.focus();
    setTimeout(() => { w.print(); }, 400);
  };

  const Comp = selected?.component;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.93)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 500, padding: 16, overflowY: "auto" }}>
      <div style={{ background: "#070d1a", border: "1px solid #1e293b", borderRadius: 20, width: "100%", maxWidth: view === "preview" ? 1050 : 780, margin: "20px auto", padding: 32, boxShadow: "0 30px 80px rgba(0,0,0,0.7)" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>📋 Resume Templates</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
              {view === "grid" ? "Choose a template, fill your details, download as PDF" : view === "fill" ? `Filling: ${selected?.name} template` : "Preview your resume"}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", width: 36, height: 36, borderRadius: "50%", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        {/* ── GRID VIEW ── */}
        {view === "grid" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 24 }}>
              {TEMPLATES.map((t) => {
                const C = t.component;
                return (
                  <div key={t.id} style={{ border: "1px solid #1e293b", borderRadius: 14, overflow: "hidden", background: "#0c1220", cursor: "pointer", transition: "border-color 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = t.accent}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "#1e293b"}>
                    {/* Scaled preview */}
                    <div style={{ height: 280, overflow: "hidden", position: "relative", background: "#fff" }}>
                      <div style={{ transform: "scale(0.52)", transformOrigin: "top left", width: "192%", pointerEvents: "none" }}>
                        <C d={SAMPLE} />
                      </div>
                    </div>
                    {/* Footer */}
                    <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{t.tag}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => { setSelected(t); setResumeData(SAMPLE); setView("preview"); }}
                          style={{ padding: "7px 12px", borderRadius: 7, background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                          Preview
                        </button>
                        <button
                          onClick={() => { setSelected(t); setView("fill"); }}
                          style={{ padding: "7px 14px", borderRadius: 7, background: t.accent, border: "none", color: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>
                          Use This →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ background: "#0c1220", border: "1px solid #1e293b", borderRadius: 10, padding: "14px 18px", fontSize: 12, color: "#64748b" }}>
              💡 <strong style={{ color: "#94a3b8" }}>Tip:</strong> Use <strong style={{ color: "#94a3b8" }}>AI Resume Builder</strong> to auto-generate content from your job description, then pick a template here to style it.
            </div>
          </div>
        )}

        {/* ── FILL VIEW ── */}
        {view === "fill" && selected && (
          <FillForm
            template={selected}
            onBack={() => setView("grid")}
            onPreview={(data) => { setResumeData(data); setView("preview"); }}
          />
        )}

        {/* ── PREVIEW VIEW ── */}
        {view === "preview" && selected && resumeData && Comp && (
          <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20, alignItems: "start" }}>
            {/* Sidebar controls */}
            <div>
              <button onClick={() => setView(resumeData === SAMPLE ? "grid" : "fill")}
                style={{ width: "100%", marginBottom: 10, padding: "10px", borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                ← Back
              </button>
              <button onClick={printResume}
                style={{ width: "100%", marginBottom: 10, padding: "11px", borderRadius: 8, background: "#1d4ed8", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                🖨️ Download PDF
              </button>
              {/* Switch template */}
              <div style={{ background: "#0c1220", border: "1px solid #1e293b", borderRadius: 10, padding: "12px 14px" }}>
                <p style={{ margin: "0 0 10px", fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Switch Template</p>
                {TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => setSelected(t)}
                    style={{ width: "100%", marginBottom: 6, padding: "8px 10px", borderRadius: 7, background: selected.id === t.id ? "#1e3a5f" : "#0f172a", border: `1px solid ${selected.id === t.id ? t.accent : "#1e293b"}`, color: selected.id === t.id ? "#f1f5f9" : "#64748b", fontSize: 12, cursor: "pointer", textAlign: "left", fontWeight: selected.id === t.id ? 700 : 400 }}>
                    {t.name}
                    <span style={{ display: "block", fontSize: 10, color: "#475569", fontWeight: 400 }}>{t.tag}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* Resume preview */}
            <div>
              <div style={{ fontSize: 12, color: "#475569", marginBottom: 10, textAlign: "right" }}>A4 · Print-ready</div>
              <div id="tpl-preview" style={{ borderRadius: 6, overflow: "hidden", boxShadow: "0 4px 40px rgba(0,0,0,0.5)" }}>
                <Comp d={resumeData} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}