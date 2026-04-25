import { useState, useEffect } from "react";
import { api } from "./api.js";

// ── Helpers ───────────────────────────────────────────────────
const DEPT = {
  Engineering:    { bg:"#1a2744", text:"#60a5fa", border:"#2563eb33" },
  "AI Research":  { bg:"#1f1a44", text:"#a78bfa", border:"#7c3aed33" },
  Product:        { bg:"#1a2e24", text:"#34d399", border:"#05966933" },
  Infrastructure: { bg:"#2d1f13", text:"#fb923c", border:"#ea580c33" },
};
const sc  = s => s>=85?"#22c55e":s>=70?"#eab308":s>=55?"#f97316":"#ef4444";
const slb = s => s>=85?"Strong Match":s>=70?"Good Match":s>=55?"Partial Match":"Low Match";
const rc  = r => r==="Advance to Interview"?"#22c55e":r==="Hold"?"#eab308":"#ef4444";

// ── Base styles ───────────────────────────────────────────────
const inp = {
  width:"100%", background:"#0f172a", border:"1px solid #1e293b",
  borderRadius:8, color:"#f1f5f9", fontSize:14, padding:"10px 12px",
  outline:"none", boxSizing:"border-box", fontFamily:"inherit",
};

function Spinner() {
  return <span style={{ display:"inline-block", width:14, height:14,
    border:"2px solid #334155", borderTopColor:"#60a5fa", borderRadius:"50%",
    animation:"spin 0.7s linear infinite" }}/>;
}

function Pill({ label, matched }) {
  return <span style={{ fontSize:12, padding:"3px 10px", borderRadius:999,
    background:matched?"#14532d":"#1e293b", color:matched?"#4ade80":"#64748b",
    border:`1px solid ${matched?"#166534":"#334155"}`,
    display:"inline-flex", alignItems:"center", gap:4 }}>
    {matched&&<span style={{ fontSize:10, color:"#22c55e" }}>✓</span>}{label}
  </span>;
}

// ── Big ATS Score Gauge ───────────────────────────────────────
function ATSGauge({ score }) {
  const col   = sc(score);
  const label = slb(score);
  const r = 54, c = 2*Math.PI*r;
  const fill = (score/100)*c;

  return (
    <div style={{ textAlign:"center", padding:"24px 0 16px" }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        {/* Track */}
        <circle cx="70" cy="70" r={r} fill="none" stroke="#1e293b" strokeWidth="10"/>
        {/* Score arc */}
        <circle cx="70" cy="70" r={r} fill="none" stroke={col} strokeWidth="10"
          strokeDasharray={`${fill} ${c}`} strokeLinecap="round"
          transform="rotate(-90 70 70)" style={{ transition:"stroke-dasharray 1s ease" }}/>
        {/* Score number */}
        <text x="70" y="62" textAnchor="middle" fill={col}
          fontSize="30" fontWeight="800" fontFamily="inherit">{score}</text>
        <text x="70" y="80" textAnchor="middle" fill="#64748b"
          fontSize="12" fontFamily="inherit">ATS Score</text>
        <text x="70" y="96" textAnchor="middle" fill="#475569"
          fontSize="10" fontFamily="inherit">out of 100</text>
      </svg>
      <div style={{ marginTop:8, display:"inline-flex", alignItems:"center", gap:8,
        background:`${col}15`, border:`1px solid ${col}44`, borderRadius:999, padding:"6px 18px" }}>
        <span style={{ width:8, height:8, borderRadius:"50%", background:col, display:"inline-block" }}/>
        <span style={{ fontSize:15, fontWeight:700, color:col }}>{label}</span>
      </div>
    </div>
  );
}

// ── Mini score bar ────────────────────────────────────────────
function ScoreBar({ label, value, color }) {
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
        <span style={{ fontSize:12, color:"#94a3b8" }}>{label}</span>
        <span style={{ fontSize:12, fontWeight:700, color: color||sc(value) }}>{value}%</span>
      </div>
      <div style={{ background:"#1e293b", borderRadius:4, height:6, overflow:"hidden" }}>
        <div style={{ width:`${value}%`, height:"100%", background: color||sc(value),
          borderRadius:4, transition:"width 1s ease" }}/>
      </div>
    </div>
  );
}

// ── ATS Result Modal ──────────────────────────────────────────
function ATSModal({ result, name, jobTitle, onClose }) {
  const recColor = rc(result.recommendation);
  const score    = result.ats_score ?? result.score ?? 0;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:20 }}>
      <div style={{ background:"#0c1220", border:"1px solid #1e293b", borderRadius:18,
        width:"100%", maxWidth:600, maxHeight:"92vh", overflow:"auto", padding:28,
        animation:"fadeIn 0.2s ease" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
          <div>
            <p style={{ margin:0, fontSize:11, color:"#60a5fa", fontWeight:700,
              textTransform:"uppercase", letterSpacing:"0.08em" }}>ATS Screening Report</p>
            <p style={{ margin:"4px 0 0", fontSize:17, fontWeight:700, color:"#f1f5f9" }}>{name}</p>
            <p style={{ margin:"2px 0 0", fontSize:13, color:"#64748b" }}>{jobTitle}</p>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none",
            color:"#64748b", fontSize:24, cursor:"pointer", lineHeight:1 }}>×</button>
        </div>

        {/* Big ATS Gauge */}
        <ATSGauge score={score}/>

        {/* Recommendation banner */}
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <span style={{ fontSize:13, fontWeight:700, padding:"7px 20px", borderRadius:8,
            background:`${recColor}20`, color:recColor, border:`1px solid ${recColor}50` }}>
            {result.recommendation === "Advance to Interview" ? "✅ " : result.recommendation === "Hold" ? "⏸ " : "❌ "}
            {result.recommendation}
          </span>
        </div>

        {/* Summary */}
        {result.summary && (
          <div style={{ background:"#0f172a", borderRadius:10, padding:"14px 16px",
            border:"1px solid #1e293b", marginBottom:16 }}>
            <p style={{ margin:0, fontSize:13, color:"#94a3b8", lineHeight:1.65 }}>{result.summary}</p>
          </div>
        )}

        {/* Score breakdown bars */}
        <div style={{ background:"#0f172a", borderRadius:10, padding:"14px 16px",
          border:"1px solid #1e293b", marginBottom:16 }}>
          <p style={{ margin:"0 0 12px", fontSize:11, color:"#60a5fa", fontWeight:700,
            textTransform:"uppercase", letterSpacing:"0.05em" }}>Score Breakdown</p>
          <ScoreBar label="Overall ATS Score"     value={score} />
          {result.keyword_match_percent != null &&
            <ScoreBar label="Keyword Match"        value={result.keyword_match_percent} color="#a78bfa"/>}
          {result.formatting_score != null &&
            <ScoreBar label="Resume Formatting"    value={result.formatting_score}      color="#34d399"/>}
        </div>

        {/* Skills matched / missing */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
          <div style={{ background:"#0f172a", borderRadius:10, padding:"12px 14px", border:"1px solid #14532d" }}>
            <p style={{ margin:"0 0 8px", fontSize:11, color:"#4ade80", fontWeight:700,
              textTransform:"uppercase", letterSpacing:"0.05em" }}>✓ Matched Skills</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
              {(result.matched_skills||[]).map(s=><Pill key={s} label={s} matched/>)}
              {!result.matched_skills?.length && <span style={{ color:"#475569", fontSize:12 }}>None detected</span>}
            </div>
          </div>
          <div style={{ background:"#0f172a", borderRadius:10, padding:"12px 14px", border:"1px solid #7f1d1d" }}>
            <p style={{ margin:"0 0 8px", fontSize:11, color:"#f87171", fontWeight:700,
              textTransform:"uppercase", letterSpacing:"0.05em" }}>✗ Skill Gaps</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
              {(result.missing_skills||[]).map(s=><Pill key={s} label={s}/>)}
              {!result.missing_skills?.length && <span style={{ color:"#475569", fontSize:12 }}>None</span>}
            </div>
          </div>
        </div>

        {/* Extra info row */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
          {[
            { label:"Experience", val: result.experience_years ? `${result.experience_years} yrs` : "—", col:"#60a5fa" },
            { label:"Education",  val: result.education || "—", col:"#a78bfa" },
            { label:"Keyword %",  val: result.keyword_match_percent != null ? `${result.keyword_match_percent}%` : "—", col:"#34d399" },
          ].map(i=>(
            <div key={i.label} style={{ background:"#0f172a", borderRadius:8, padding:"10px 12px", border:"1px solid #1e293b", textAlign:"center" }}>
              <p style={{ margin:"0 0 3px", fontSize:10, color:"#475569", textTransform:"uppercase", letterSpacing:"0.05em" }}>{i.label}</p>
              <p style={{ margin:0, fontSize:14, fontWeight:700, color:i.col }}>{i.val}</p>
            </div>
          ))}
        </div>

        {/* Strengths */}
        {result.strengths?.length>0 && (
          <div style={{ marginBottom:14 }}>
            <p style={{ margin:"0 0 8px", fontSize:11, color:"#22c55e", fontWeight:700,
              textTransform:"uppercase", letterSpacing:"0.05em" }}>Strengths</p>
            {result.strengths.map((s,i)=>(
              <div key={i} style={{ display:"flex", gap:8, marginBottom:5, alignItems:"flex-start" }}>
                <span style={{ color:"#22c55e", fontSize:14, lineHeight:1.4 }}>↑</span>
                <span style={{ fontSize:13, color:"#94a3b8", lineHeight:1.5 }}>{s}</span>
              </div>
            ))}
          </div>
        )}

        {/* Concerns */}
        {result.concerns?.length>0 && (
          <div style={{ marginBottom:14 }}>
            <p style={{ margin:"0 0 8px", fontSize:11, color:"#fb923c", fontWeight:700,
              textTransform:"uppercase", letterSpacing:"0.05em" }}>Concerns</p>
            {result.concerns.map((c,i)=>(
              <div key={i} style={{ display:"flex", gap:8, marginBottom:5, alignItems:"flex-start" }}>
                <span style={{ color:"#fb923c", fontSize:14, lineHeight:1.4 }}>!</span>
                <span style={{ fontSize:13, color:"#94a3b8", lineHeight:1.5 }}>{c}</span>
              </div>
            ))}
          </div>
        )}

        {/* Interview questions */}
        {result.interview_questions?.length>0 && (
          <div style={{ background:"#0f172a", borderRadius:10, padding:"14px 16px",
            border:"1px solid #312e81", marginBottom:16 }}>
            <p style={{ margin:"0 0 10px", fontSize:11, color:"#a78bfa", fontWeight:700,
              textTransform:"uppercase", letterSpacing:"0.05em" }}>Suggested Interview Questions</p>
            {result.interview_questions.map((q,i)=>(
              <p key={i} style={{ margin:"0 0 8px", fontSize:13, color:"#94a3b8" }}>
                <span style={{ color:"#7c3aed", fontWeight:700 }}>Q{i+1}.</span> {q}
              </p>
            ))}
          </div>
        )}

        <button onClick={onClose} style={{ width:"100%", padding:"12px", borderRadius:8,
          background:"#1d4ed8", border:"none", color:"#eff6ff", fontSize:14,
          fontWeight:700, cursor:"pointer" }}>Close Report</button>
      </div>
    </div>
  );
}

// ── Apply / Upload Modal ──────────────────────────────────────
function ApplyModal({ job, onClose, onSuccess }) {
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [phone, setPhone]     = useState("");
  const [file, setFile]       = useState(null);
  const [pasteText, setPaste] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [step, setStep]       = useState("form"); // form | analyzing

  const handleFile = e => {
    const f = e.target.files[0];
    if (!f) return;
    // Validate on client side too
    const ok = f.type === "application/pdf"
      || f.name.endsWith(".pdf")
      || f.name.endsWith(".txt")
      || f.name.endsWith(".md");
    if (!ok) { setError("Please upload a PDF, TXT, or MD file."); return; }
    setFile(f);
    setError("");
  };

  const submit = async () => {
    if (!name.trim() || !email.trim()) return setError("Name and email are required");
    if (!file && !pasteText.trim())    return setError("Please upload a PDF or paste your resume text");
    setLoading(true);
    setStep("analyzing");
    setError("");
    try {
      const res = await api.apply({
        job_id: job.id, name, email, phone,
        resumeFile: file || undefined,
        resume_text: !file ? pasteText : undefined,
      });
      onSuccess(res);
    } catch(e) {
      setError(e.message);
      setStep("form");
    }
    setLoading(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.82)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:20 }}>
      <div style={{ background:"#0c1220", border:"1px solid #1e293b", borderRadius:16,
        width:"100%", maxWidth:520, maxHeight:"92vh", overflow:"auto", padding:28 }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
          <div>
            <p style={{ margin:0, fontSize:18, fontWeight:700, color:"#f1f5f9" }}>Apply — {job.title}</p>
            <p style={{ margin:"3px 0 0", fontSize:13, color:"#64748b" }}>{job.department} · {job.location}</p>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none",
            color:"#64748b", fontSize:24, cursor:"pointer", lineHeight:1 }}>×</button>
        </div>

        {/* Analyzing overlay */}
        {step === "analyzing" && (
          <div style={{ textAlign:"center", padding:"40px 20px" }}>
            <div style={{ width:64, height:64, border:"4px solid #1e293b", borderTopColor:"#2563eb",
              borderRadius:"50%", animation:"spin 1s linear infinite", margin:"0 auto 20px" }}/>
            <p style={{ fontSize:16, fontWeight:600, color:"#f1f5f9", margin:"0 0 6px" }}>
              Analyzing your resume with AI…</p>
            <p style={{ fontSize:13, color:"#64748b", margin:0 }}>
              Extracting text, matching skills, computing ATS score</p>
          </div>
        )}

        {step === "form" && (
          <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
            <input style={inp} placeholder="Full Name *" value={name} onChange={e=>setName(e.target.value)}/>
            <input style={inp} type="email" placeholder="Email Address *" value={email} onChange={e=>setEmail(e.target.value)}/>
            <input style={inp} placeholder="Phone (optional)" value={phone} onChange={e=>setPhone(e.target.value)}/>

            {/* PDF Upload drop zone */}
            <div>
              <label style={{ fontSize:12, color:"#64748b", fontWeight:600,
                letterSpacing:"0.05em", textTransform:"uppercase", display:"block", marginBottom:6 }}>
                Upload Resume (PDF recommended)
              </label>
              <label style={{ display:"flex", flexDirection:"column", alignItems:"center",
                justifyContent:"center", gap:8, border:"2px dashed #1e3a5f", borderRadius:10,
                padding:"24px 16px", cursor:"pointer", transition:"border-color 0.15s",
                background: file ? "#0f2744" : "transparent",
                borderColor: file ? "#2563eb" : "#1e3a5f" }}>
                <input type="file" accept=".pdf,.txt,.md" style={{ display:"none" }} onChange={handleFile}/>
                <span style={{ fontSize:28 }}>{file ? "📄" : "⬆️"}</span>
                {file
                  ? <span style={{ fontSize:13, color:"#60a5fa", fontWeight:600 }}>{file.name}</span>
                  : <>
                      <span style={{ fontSize:13, color:"#475569", fontWeight:600 }}>
                        Click to upload PDF, TXT, or MD</span>
                      <span style={{ fontSize:11, color:"#334155" }}>Max 10 MB</span>
                    </>}
              </label>
            </div>

            {/* Divider */}
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ flex:1, height:1, background:"#1e293b" }}/>
              <span style={{ fontSize:11, color:"#475569" }}>OR PASTE TEXT</span>
              <div style={{ flex:1, height:1, background:"#1e293b" }}/>
            </div>

            <textarea style={{ ...inp, height:110, resize:"vertical", fontSize:13 }}
              placeholder="Paste your resume text here…"
              value={pasteText}
              onChange={e=>{ setPaste(e.target.value); if(e.target.value) setFile(null); }}/>

            {error && (
              <div style={{ fontSize:13, color:"#f87171", padding:"10px 12px",
                background:"#7f1d1d22", borderRadius:8, border:"1px solid #7f1d1d44" }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display:"flex", gap:8 }}>
              <button onClick={onClose}
                style={{ flex:1, padding:"10px", borderRadius:8, background:"none",
                  border:"1px solid #1e293b", color:"#94a3b8", fontSize:14, cursor:"pointer" }}>
                Cancel
              </button>
              <button onClick={submit} disabled={loading}
                style={{ flex:2, padding:"11px", borderRadius:8, background:"#1d4ed8",
                  border:"none", color:"#eff6ff", fontSize:14, fontWeight:700,
                  cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                  opacity: loading ? 0.7 : 1 }}>
                {loading && <Spinner/>}
                {loading ? "Screening…" : "Submit & Get ATS Score →"}
              </button>
            </div>

            <p style={{ margin:0, fontSize:11, color:"#334155", textAlign:"center" }}>
              🔒 PDF text is extracted securely and analyzed by AI
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Login Screen ──────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [mode, setMode]   = useState("login");
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass]   = useState("");
  const [load, setLoad]   = useState(false);
  const [err, setErr]     = useState("");

  const submit = async () => {
    setLoad(true); setErr("");
    try {
      const res = mode === "login"
        ? await api.login(email, pass)
        : await api.register(name, email, pass);
      api.saveToken(res.token);
      onLogin(res.user);
    } catch(e) { setErr(e.message); }
    setLoad(false);
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center",
      justifyContent:"center", background:"#070d1a" }}>
      <div style={{ width:380, background:"#0c1220", border:"1px solid #1e293b",
        borderRadius:16, padding:32 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24 }}>
          <div style={{ width:32, height:32, background:"#1d4ed8", borderRadius:8,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>⚡</div>
          <span style={{ fontWeight:700, fontSize:18, color:"#f1f5f9" }}>TalentAI Admin</span>
        </div>
        <div style={{ display:"flex", gap:6, marginBottom:20, background:"#0f172a", borderRadius:8, padding:4 }}>
          {["login","register"].map(m=>(
            <button key={m} onClick={()=>setMode(m)}
              style={{ flex:1, padding:"7px", borderRadius:6, border:"none", fontSize:13,
                fontWeight:600, cursor:"pointer",
                background: mode===m?"#1d4ed8":"transparent",
                color: mode===m?"#eff6ff":"#64748b" }}>
              {m==="login"?"Sign In":"Create Account"}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {mode==="register" && <input style={inp} placeholder="Full name" value={name} onChange={e=>setName(e.target.value)}/>}
          <input style={inp} type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/>
          <input style={inp} type="password" placeholder="Password" value={pass} onChange={e=>setPass(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&submit()}/>
          {err && <p style={{ fontSize:13, color:"#f87171", padding:"8px 12px", background:"#7f1d1d22", borderRadius:6 }}>{err}</p>}
          <button onClick={submit} disabled={load}
            style={{ padding:"11px", borderRadius:8, background:"#1d4ed8", border:"none",
              color:"#eff6ff", fontSize:14, fontWeight:700, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8, opacity:load?0.7:1 }}>
            {load&&<Spinner/>}{mode==="login"?"Sign In →":"Create Account →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Jobs View ─────────────────────────────────────────────────
function JobsView() {
  const [jobs, setJobs]         = useState([]);
  const [selected, setSelected] = useState(null);
  const [applying, setApplying] = useState(null);
  const [result, setResult]     = useState(null);
  const [search, setSearch]     = useState("");
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState("");

  useEffect(()=>{
    api.getJobs()
      .then(j=>{ setJobs(j); setSelected(j[0]||null); })
      .catch(e=>setErr(e.message))
      .finally(()=>setLoading(false));
  }, []);

  const filtered = jobs.filter(j =>
    j.title?.toLowerCase().includes(search.toLowerCase()) ||
    j.department?.toLowerCase().includes(search.toLowerCase()) ||
    (j.skills||[]).some(s=>s.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <div style={{ textAlign:"center", padding:60, color:"#475569" }}><Spinner/><p style={{ marginTop:12, fontSize:14 }}>Loading jobs…</p></div>;
  if (err)     return <div style={{ textAlign:"center", padding:60, color:"#f87171" }}><p>⚠️ {err}</p><p style={{ fontSize:12, marginTop:6, color:"#64748b" }}>Is the backend running on port 4000?</p></div>;

  return (
    <div style={{ display:"grid", gridTemplateColumns:"360px 1fr", gap:22, alignItems:"start" }}>
      {/* Left: job list */}
      <div>
        <input style={{ ...inp, marginBottom:12 }} placeholder="🔍  Search jobs, skills…"
          value={search} onChange={e=>setSearch(e.target.value)}/>
        <p style={{ margin:"0 0 10px", fontSize:12, color:"#475569" }}>
          {filtered.length} open position{filtered.length!==1?"s":""}
        </p>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map(j=>{
            const col = DEPT[j.department];
            const isSel = selected?.id===j.id;
            return (
              <div key={j.id} onClick={()=>setSelected(j)}
                style={{ background:isSel?"#0f172a":"#0c1220",
                  border:`1px solid ${isSel?"#2563eb":"#1e293b"}`,
                  borderRadius:12, padding:"18px 20px", cursor:"pointer",
                  position:"relative", transition:"border-color 0.15s" }}>
                {isSel && <div style={{ position:"absolute", left:0, top:0, bottom:0, width:3,
                  borderRadius:"12px 0 0 12px", background:"#2563eb" }}/>}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                  <div>
                    <p style={{ margin:0, fontSize:15, fontWeight:600, color:"#f1f5f9" }}>{j.title}</p>
                    <p style={{ margin:"2px 0 0", fontSize:12, color:"#64748b" }}>{j.location} · {j.type}</p>
                  </div>
                  {col && <span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:4,
                    background:col.bg, color:col.text, border:`1px solid ${col.border}`,
                    letterSpacing:"0.04em", textTransform:"uppercase" }}>{j.department}</span>}
                </div>
                <p style={{ margin:"0 0 10px", fontSize:12, color:"#94a3b8", lineHeight:1.5 }}>
                  {j.description?.slice(0,90)}…</p>
                <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:12 }}>
                  {(j.skills||[]).slice(0,4).map(s=><Pill key={s} label={s}/>)}
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:13, color:"#22c55e", fontWeight:600 }}>
                    {j.salary_min&&j.salary_max
                      ?`$${(j.salary_min/1000).toFixed(0)}k–$${(j.salary_max/1000).toFixed(0)}k`
                      :"Competitive"}
                  </span>
                  <button onClick={e=>{e.stopPropagation();setApplying(j)}}
                    style={{ fontSize:12, fontWeight:600, padding:"5px 14px", borderRadius:6,
                      background:"#1d4ed8", color:"#eff6ff", border:"none", cursor:"pointer" }}>
                    Apply →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: job detail */}
      {selected && (
        <div style={{ background:"#0c1220", border:"1px solid #1e293b", borderRadius:14,
          padding:"24px 26px", position:"sticky", top:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
            <div>
              <p style={{ margin:"0 0 4px", fontSize:22, fontWeight:700, color:"#f1f5f9" }}>{selected.title}</p>
              <p style={{ margin:0, fontSize:13, color:"#64748b" }}>{selected.location} · {selected.type}</p>
            </div>
          </div>
          {selected.salary_min && (
            <p style={{ margin:"0 0 12px", fontSize:14, fontWeight:600, color:"#22c55e" }}>
              ${(selected.salary_min/1000).toFixed(0)}k – ${(selected.salary_max/1000).toFixed(0)}k / yr
            </p>
          )}
          <p style={{ margin:"0 0 18px", fontSize:14, color:"#94a3b8", lineHeight:1.65 }}>{selected.description}</p>
          <p style={{ margin:"0 0 8px", fontSize:11, color:"#475569", fontWeight:700,
            textTransform:"uppercase", letterSpacing:"0.05em" }}>Core Skills</p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:18 }}>
            {(selected.skills||[]).map(s=><Pill key={s} label={s}/>)}
          </div>
          {selected.requirements?.length>0 && <>
            <p style={{ margin:"0 0 8px", fontSize:11, color:"#475569", fontWeight:700,
              textTransform:"uppercase", letterSpacing:"0.05em" }}>Requirements</p>
            <ul style={{ margin:"0 0 22px", paddingLeft:18 }}>
              {selected.requirements.map((r,i)=>(
                <li key={i} style={{ fontSize:13, color:"#94a3b8", marginBottom:5 }}>{r}</li>
              ))}
            </ul>
          </>}
          <button onClick={()=>setApplying(selected)}
            style={{ width:"100%", padding:"12px", borderRadius:8, background:"#1d4ed8",
              border:"none", color:"#eff6ff", fontSize:15, fontWeight:700, cursor:"pointer" }}>
            Upload PDF & Get ATS Score →
          </button>
          <p style={{ margin:"8px 0 0", fontSize:11, color:"#334155", textAlign:"center" }}>
            📄 PDF resume analyzed instantly — score shown in seconds
          </p>
        </div>
      )}

      {applying && (
        <ApplyModal job={applying} onClose={()=>setApplying(null)}
          onSuccess={res=>{
            setApplying(null);
            setResult({ data: res.ai_result, name: res.application.name, jobTitle: applying.title });
          }}/>
      )}
      {result && (
        <ATSModal result={result.data} name={result.name} jobTitle={result.jobTitle}
          onClose={()=>setResult(null)}/>
      )}
    </div>
  );
}

// ── Admin Dashboard ───────────────────────────────────────────
function AdminView() {
  const [apps, setApps]         = useState([]);
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [filterRec, setFilter]  = useState("all");
  const [sortBy, setSort]       = useState("score");

  useEffect(()=>{
    Promise.all([api.getApplications(), api.getStats()])
      .then(([a,s])=>{ setApps(a); setStats(s); })
      .catch(console.error)
      .finally(()=>setLoading(false));
  }, []);

  const filtered = apps
    .filter(a=>filterRec==="all"||a.ai_recommendation===filterRec)
    .sort((a,b)=>sortBy==="score"?(b.ai_score||0)-(a.ai_score||0)
      :sortBy==="date"?new Date(b.created_at)-new Date(a.created_at)
      :a.name.localeCompare(b.name));

  const sel2 = { background:"#0f172a", border:"1px solid #1e293b", color:"#94a3b8",
    fontSize:12, padding:"6px 10px", borderRadius:6, fontFamily:"inherit", outline:"none" };

  if (loading) return <div style={{ textAlign:"center", padding:60 }}><Spinner/></div>;

  return (
    <div>
      {stats && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:22 }}>
          {[
            { label:"Total Applicants",      val: stats.total,                                              col:"#60a5fa" },
            { label:"Advance to Interview",  val: stats.by_recommendation?.["Advance to Interview"]||0,    col:"#22c55e" },
            { label:"On Hold",               val: stats.by_recommendation?.["Hold"]||0,                    col:"#eab308" },
            { label:"Avg ATS Score",         val: stats.average_score ? `${stats.average_score}/100` : "—", col: sc(stats.average_score||0) },
          ].map(s=>(
            <div key={s.label} style={{ background:"#0c1220", borderRadius:10, padding:"14px 16px", border:"1px solid #1e293b" }}>
              <p style={{ margin:"0 0 4px", fontSize:11, color:"#475569", fontWeight:600,
                textTransform:"uppercase", letterSpacing:"0.05em" }}>{s.label}</p>
              <p style={{ margin:0, fontSize:26, fontWeight:700, color:s.col }}>{s.val}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <select style={sel2} value={filterRec} onChange={e=>setFilter(e.target.value)}>
          <option value="all">All Recommendations</option>
          <option value="Advance to Interview">Advance to Interview</option>
          <option value="Hold">Hold</option>
          <option value="Reject">Reject</option>
        </select>
        <select style={sel2} value={sortBy} onChange={e=>setSort(e.target.value)}>
          <option value="score">Sort: ATS Score ↓</option>
          <option value="date">Sort: Latest First</option>
          <option value="name">Sort: Name A–Z</option>
        </select>
      </div>

      {filtered.length===0
        ? <div style={{ textAlign:"center", padding:"50px 20px", color:"#475569" }}>
            <p style={{ fontSize:36, margin:"0 0 10px" }}>📋</p>
            <p style={{ fontSize:14 }}>No applications yet. Candidates upload PDF via the Jobs tab.</p>
          </div>
        : <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {filtered.map((app,i)=>{
              const color = rc(app.ai_recommendation);
              return (
                <div key={app.id||i} onClick={()=>setSelected(app)}
                  style={{ background:"#0c1220", border:"1px solid #1e293b", borderRadius:10,
                    padding:"12px 16px", cursor:"pointer", display:"flex",
                    alignItems:"center", gap:14, transition:"border-color 0.15s" }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor="#334155"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor="#1e293b"}>
                  {/* Avatar */}
                  <div style={{ width:40, height:40, borderRadius:"50%", background:"#1e293b",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:15, fontWeight:700, color:"#60a5fa", flexShrink:0 }}>
                    {app.name?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ margin:"0 0 2px", fontSize:14, fontWeight:600, color:"#f1f5f9" }}>{app.name}</p>
                    <p style={{ margin:0, fontSize:12, color:"#64748b" }}>{app.job_title} · {app.email}</p>
                  </div>
                  {/* ATS Score badge */}
                  <div style={{ textAlign:"center", flexShrink:0 }}>
                    <div style={{ width:48, height:48, borderRadius:"50%",
                      border:`3px solid ${sc(app.ai_score||0)}`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      background:"#0f172a" }}>
                      <span style={{ fontSize:14, fontWeight:800, color:sc(app.ai_score||0) }}>
                        {app.ai_score||0}
                      </span>
                    </div>
                    <p style={{ margin:"3px 0 0", fontSize:10, color:"#475569" }}>ATS</p>
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px",
                    borderRadius:5, background:`${color}22`, color, border:`1px solid ${color}44`,
                    whiteSpace:"nowrap", flexShrink:0 }}>
                    {app.ai_recommendation==="Advance to Interview"?"✓ Advance":app.ai_recommendation}
                  </span>
                </div>
              );
            })}
          </div>
      }

      {selected && (
        <ATSModal
          result={{
            ats_score: selected.ai_score, score: selected.ai_score,
            verdict: selected.ai_verdict, summary: selected.ai_summary,
            matched_skills: selected.ai_matched_skills,
            missing_skills: selected.ai_missing_skills,
            strengths: selected.ai_strengths, concerns: selected.ai_concerns,
            recommendation: selected.ai_recommendation,
            interview_questions: selected.ai_interview_questions,
          }}
          name={selected.name}
          jobTitle={selected.job_title}
          onClose={()=>setSelected(null)}
        />
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]     = useState(null);
  const [view, setView]     = useState("jobs");
  const [checking, setCheck]= useState(true);

  useEffect(()=>{
    if (api.getToken()) {
      api.me().then(setUser).catch(()=>api.clearToken()).finally(()=>setCheck(false));
    } else { setCheck(false); }
  }, []);

  if (checking) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center",
      justifyContent:"center", background:"#070d1a" }}>
      <Spinner/>
    </div>
  );

  if (view==="login") return <LoginScreen onLogin={u=>{ setUser(u); setView("admin"); }}/>;

  return (
    <div style={{ minHeight:"100vh", background:"#070d1a", color:"#f1f5f9",
      fontFamily:"'IBM Plex Sans',system-ui,sans-serif" }}>
      {/* Navbar */}
      <div style={{ background:"#0c1220", borderBottom:"1px solid #1e293b", padding:"0 28px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", display:"flex", alignItems:"center", height:56, gap:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:28, height:28, background:"#1d4ed8", borderRadius:6,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>⚡</div>
            <span style={{ fontWeight:700, fontSize:16, color:"#f1f5f9" }}>TalentAI</span>
            <span style={{ fontSize:10, fontWeight:700, padding:"2px 6px", borderRadius:4,
              background:"#1e3a5f", color:"#60a5fa" }}>AI-POWERED</span>
          </div>
          <div style={{ display:"flex", gap:2, marginLeft:8 }}>
            {[
              { id:"jobs",  icon:"💼", label:"Browse Jobs" },
              ...(user ? [{ id:"admin", icon:"📊", label:"Admin Dashboard" }] : []),
            ].map(t=>(
              <button key={t.id} onClick={()=>setView(t.id)}
                style={{ background:view===t.id?"#1e293b":"none", border:"none",
                  color:view===t.id?"#f1f5f9":"#64748b", padding:"6px 14px",
                  borderRadius:6, fontSize:13, fontWeight:view===t.id?600:400, cursor:"pointer" }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          <div style={{ marginLeft:"auto" }}>
            {user
              ? <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:13, color:"#64748b" }}>{user.name}</span>
                  <button onClick={()=>{ api.clearToken(); setUser(null); setView("jobs"); }}
                    style={{ fontSize:12, padding:"5px 12px", borderRadius:6, background:"none",
                      border:"1px solid #1e293b", color:"#94a3b8", cursor:"pointer" }}>Sign out</button>
                </div>
              : <button onClick={()=>setView("login")}
                  style={{ fontSize:13, fontWeight:600, padding:"6px 16px", borderRadius:6,
                    background:"#1d4ed8", color:"#eff6ff", border:"none", cursor:"pointer" }}>
                  Admin Login
                </button>
            }
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"26px 28px" }}>
        {view==="jobs"  && <JobsView/>}
        {view==="admin" && user && <AdminView/>}
      </div>
    </div>
  );
}
