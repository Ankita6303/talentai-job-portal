// ══════════════════════════════════════════════════════════════
// SmartSkillsInput — Drop-in replacement for the Skills section
// Shows: suggested skills from job + popular skills + custom input
// Usage: <SmartSkillsInput skills={skills} setSkills={setSkills} jobSkills={job.skills} />
// ══════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from "react";

// Popular skills by category — shown as quick suggestions
const POPULAR_SKILLS = {
  "Programming": ["Python", "JavaScript", "Java", "C++", "TypeScript", "Go", "Rust", "Kotlin", "Swift", "C#"],
  "Web": ["React", "Node.js", "Next.js", "Vue.js", "Angular", "HTML/CSS", "Express.js", "Django", "FastAPI", "Spring Boot"],
  "AI/ML": ["TensorFlow", "PyTorch", "Scikit-learn", "Pandas", "NumPy", "Keras", "OpenCV", "NLP", "LLMs", "Hugging Face"],
  "Data": ["SQL", "PostgreSQL", "MongoDB", "MySQL", "Redis", "Spark", "Hadoop", "Tableau", "Power BI", "dbt"],
  "Cloud": ["AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform", "CI/CD", "Linux", "Git", "GitHub Actions"],
  "Soft Skills": ["Communication", "Problem Solving", "Team Player", "Leadership", "Agile", "Scrum", "Project Management"],
};

export default function SmartSkillsInput({ skills = [], setSkills, jobSkills = [], jobTitle = "" }) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const inputRef = useRef(null);

  // Flatten all popular skills
  const allPopular = Object.values(POPULAR_SKILLS).flat();

  // Smart suggestions: job skills first, then matching popular skills
  useEffect(() => {
    if (!input.trim()) { setSuggestions([]); return; }
    const q = input.toLowerCase();
    const matches = [
      ...jobSkills.filter(s => s.toLowerCase().includes(q) && !skills.includes(s)),
      ...allPopular.filter(s => s.toLowerCase().includes(q) && !skills.includes(s) && !jobSkills.includes(s)),
    ].slice(0, 8);
    setSuggestions(matches);
  }, [input, skills, jobSkills]);

  const addSkill = (skill) => {
    const s = skill.trim();
    if (!s || skills.includes(s)) return;
    setSkills([...skills, s]);
    setInput("");
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const removeSkill = (skill) => setSkills(skills.filter(s => s !== skill));

  const handleKey = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (suggestions.length > 0) addSkill(suggestions[0]);
      else if (input.trim()) addSkill(input);
    }
    if (e.key === "Backspace" && !input && skills.length > 0) {
      removeSkill(skills[skills.length - 1]);
    }
    if (e.key === "Escape") { setSuggestions([]); setShowSuggest(false); }
  };

  // Get skills to show in quick-pick section
  const getQuickSkills = () => {
    if (activeCategory === "All") {
      // Job skills first, then popular
      const jobNotAdded = jobSkills.filter(s => !skills.includes(s));
      const popularNotAdded = allPopular.filter(s => !skills.includes(s) && !jobSkills.includes(s)).slice(0, 20);
      return [...jobNotAdded, ...popularNotAdded];
    }
    if (activeCategory === "From Job") return jobSkills.filter(s => !skills.includes(s));
    return (POPULAR_SKILLS[activeCategory] || []).filter(s => !skills.includes(s));
  };

  const categories = ["All", ...(jobSkills.length > 0 ? ["From Job"] : []), ...Object.keys(POPULAR_SKILLS)];

  return (
    <div style={{ fontFamily: "inherit" }}>

      {/* Added skills chips */}
      {skills.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
          {skills.map(skill => (
            <span key={skill} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "#1e3a5f", color: "#60a5fa",
              border: "1px solid #2563eb55", borderRadius: 999,
              padding: "5px 12px", fontSize: 13, fontWeight: 600,
            }}>
              {skill}
              <button onClick={() => removeSkill(skill)} style={{
                background: "none", border: "none", color: "#60a5fa", cursor: "pointer",
                fontSize: 15, lineHeight: 1, padding: 0, opacity: 0.7,
              }}>×</button>
            </span>
          ))}
        </div>
      )}

      {/* Input with autocomplete */}
      <div style={{ position: "relative" }}>
        <div style={{
          display: "flex", gap: 8, alignItems: "center",
          background: "#0f172a", border: "1px solid #1e293b",
          borderRadius: 8, padding: "6px 12px",
        }}>
          <span style={{ fontSize: 15 }}>🔍</span>
          <input
            ref={inputRef}
            value={input}
            onChange={e => { setInput(e.target.value); setShowSuggest(true); }}
            onKeyDown={handleKey}
            onFocus={() => setShowSuggest(true)}
            onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
            placeholder="Type a skill and press Enter, or pick below…"
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              color: "#f1f5f9", fontSize: 14, fontFamily: "inherit",
            }}
          />
          {input && (
            <button onClick={() => addSkill(input)}
              style={{ padding: "5px 14px", borderRadius: 6, background: "#4f46e5", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
              + Add
            </button>
          )}
        </div>

        {/* Autocomplete dropdown */}
        {showSuggest && suggestions.length > 0 && (
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
            background: "#0c1220", border: "1px solid #1e293b", borderRadius: 10,
            zIndex: 100, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}>
            {suggestions.map((s, i) => {
              const isJobSkill = jobSkills.includes(s);
              return (
                <div key={s} onMouseDown={() => addSkill(s)}
                  style={{
                    padding: "10px 14px", cursor: "pointer", fontSize: 13,
                    color: "#f1f5f9", display: "flex", alignItems: "center", gap: 8,
                    background: i % 2 === 0 ? "#0c1220" : "#0f172a",
                    borderBottom: "1px solid #1e293b11",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#1e293b"}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#0c1220" : "#0f172a"}>
                  {isJobSkill && <span style={{ fontSize: 10, background: "#22c55e22", color: "#22c55e", padding: "1px 6px", borderRadius: 999, border: "1px solid #22c55e44", fontWeight: 700 }}>JOB</span>}
                  {s}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Job skills banner */}
      {jobSkills.length > 0 && (
        <div style={{ marginTop: 14, padding: "10px 14px", background: "#14532d22", border: "1px solid #166534", borderRadius: 8, fontSize: 12, color: "#4ade80" }}>
          💼 <strong>Skills from this job posting:</strong> {jobSkills.filter(s => !skills.includes(s)).join(", ") || "✅ All job skills added!"}
        </div>
      )}

      {/* Quick-pick categories */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 12, color: "#475569", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Quick Add — click to add instantly
        </div>

        {/* Category tabs */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              style={{
                padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: "pointer",
                border: `1px solid ${activeCategory === cat ? "#4f46e5" : "#1e293b"}`,
                background: activeCategory === cat ? "#4f46e522" : "transparent",
                color: activeCategory === cat ? "#a78bfa" : "#475569",
              }}>
              {cat === "From Job" ? `💼 ${cat}` : cat}
            </button>
          ))}
        </div>

        {/* Skill chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {getQuickSkills().slice(0, 30).map(skill => {
            const isJobSkill = jobSkills.includes(skill);
            return (
              <button key={skill} onClick={() => addSkill(skill)}
                style={{
                  padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                  cursor: "pointer", transition: "all 0.15s",
                  border: `1px solid ${isJobSkill ? "#166534" : "#1e293b"}`,
                  background: isJobSkill ? "#14532d22" : "#0f172a",
                  color: isJobSkill ? "#4ade80" : "#64748b",
                  display: "flex", alignItems: "center", gap: 5,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#4f46e5"; e.currentTarget.style.color = "#a78bfa"; e.currentTarget.style.background = "#4f46e511"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = isJobSkill ? "#166534" : "#1e293b"; e.currentTarget.style.color = isJobSkill ? "#4ade80" : "#64748b"; e.currentTarget.style.background = isJobSkill ? "#14532d22" : "#0f172a"; }}>
                + {skill}
                {isJobSkill && <span style={{ fontSize: 9, opacity: 0.7 }}>★</span>}
              </button>
            );
          })}
          {getQuickSkills().length === 0 && (
            <span style={{ fontSize: 12, color: "#334155", fontStyle: "italic" }}>All skills in this category already added ✓</span>
          )}
        </div>
      </div>

      {/* Skills count */}
      {skills.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: "#475569" }}>
          {skills.length} skill{skills.length !== 1 ? "s" : ""} added
          {jobSkills.length > 0 && ` · ${skills.filter(s => jobSkills.includes(s)).length}/${jobSkills.length} job skills matched`}
        </div>
      )}
    </div>
  );
}