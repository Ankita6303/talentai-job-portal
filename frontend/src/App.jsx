import { useState, useEffect, useRef } from "react";
import { api } from "./api.js";
import AdminPanel from "./AdminPanel.jsx";
import ResumeTemplatesPage from "./ResumeTemplatesPage.jsx"; // ← CHANGE 1
import ResumeBuilder from "./ResumeBuilder.jsx";
import ResumeConverter from "./ResumeConverter.jsx";
import SkillGapMapper from "./Skillgapmapper.jsx";
import PaymentModal from "./PaymentModal.jsx";
const BACKEND = "https://talentai-job-portal.onrender.com";

const DEPT = {
  Engineering:    { bg:"#1a2744", text:"#60a5fa", border:"#2563eb33" },
  "AI Research":  { bg:"#1f1a44", text:"#a78bfa", border:"#7c3aed33" },
  Product:        { bg:"#1a2e24", text:"#34d399", border:"#05966933" },
  Infrastructure: { bg:"#2d1f13", text:"#fb923c", border:"#ea580c33" },
};
const sc  = s => s>=85?"#22c55e":s>=70?"#eab308":s>=55?"#f97316":"#ef4444";
const slb = s => s>=85?"Strong Match":s>=70?"Good Match":s>=55?"Partial Match":"Low Match";
const rc  = r => r==="Advance to Interview"?"#22c55e":r==="Hold"?"#eab308":"#ef4444";
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
    {matched && <span style={{ fontSize:10, color:"#22c55e" }}>✓</span>}{label}
  </span>;
}

// ── speakAndWait ──────────────────────────────────────────────
const speakAndWait = (text) => new Promise((resolve) => {
  if (!window.speechSynthesis) { resolve(); return; }
  window.speechSynthesis.cancel();
  setTimeout(() => {
    const utterance = new SpeechSynthesisUtterance(String(text));
    utterance.lang = "en-US"; utterance.rate = 0.92; utterance.pitch = 1.05; utterance.volume = 1;
    utterance.onend = () => setTimeout(resolve, 600);
    utterance.onerror = () => setTimeout(resolve, 600);
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const eng = voices.find(v => v.lang.startsWith("en-") && v.name.includes("Google"))
               || voices.find(v => v.lang.startsWith("en")) || voices[0];
      if (eng) utterance.voice = eng;
    }
    window.speechSynthesis.speak(utterance);
    setTimeout(resolve, 15000);
  }, 250);
});

// ── listenWithLiveText ────────────────────────────────────────
const listenWithLiveText = (onInterim, timeoutMs = 15000) =>
  new Promise((resolve, reject) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { reject(new Error("Please use Chrome.")); return; }
    const rec = new SR();
    rec.lang = "en-US"; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 1;
    let finalText = "", silenceTimer = null, hardTimer = null, done = false;
    const finish = (text) => {
      if (done) return; done = true;
      clearTimeout(silenceTimer); clearTimeout(hardTimer);
      try { rec.stop(); } catch {}
      resolve(text.trim() || "(no answer detected)");
    };
    const resetSilence = () => { clearTimeout(silenceTimer); silenceTimer = setTimeout(() => finish(finalText), 2500); };
    hardTimer = setTimeout(() => finish(finalText), timeoutMs);
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += " " + t; else interim = t;
      }
      onInterim((finalText + " " + interim).trim()); resetSilence();
    };
    rec.onspeechstart = () => resetSilence();
    rec.onerror = (e) => {
      clearTimeout(hardTimer); clearTimeout(silenceTimer);
      if (e.error === "no-speech" || e.error === "aborted") { finish(finalText); return; }
      if (!done) { done = true; reject(new Error(e.error === "not-allowed" ? "Microphone access denied." : `Mic error: ${e.error}`)); }
    };
    rec.onend = () => { if (!done) finish(finalText); clearTimeout(hardTimer); };
    try { rec.start(); resetSilence(); } catch (err) { reject(new Error("Could not start mic: " + err.message)); }
  });

// ── Groq via backend proxy ────────────────────────────────────
const fetchInterviewQuestions = async (job) => {
  const res = await fetch(`${BACKEND}/ai/interview-questions`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobTitle: job.title, skills: Array.isArray(job.skills) ? job.skills : [] }),
  });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `Server error ${res.status}`); }
  const data = await res.json();
  const raw = (data.choices?.[0]?.message?.content || "[]").replace(/```json|```/g, "").trim();
  let questions;
  try { questions = JSON.parse(raw); }
  catch { const match = raw.match(/\[[\s\S]*\]/); questions = match ? JSON.parse(match[0]) : []; }
  if (!Array.isArray(questions) || questions.length === 0) throw new Error("No questions returned. Check GROQ_API_KEY in Render.");
  return questions;
};

const evaluateAnswer = async (question, answer, jobTitle) => {
  try {
    const res = await fetch(`${BACKEND}/ai/evaluate-answer`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answer, jobTitle }),
    });
    const data = await res.json();
    const raw = (data.choices?.[0]?.message?.content || "{}").replace(/```json|```/g, "").trim();
    return JSON.parse(raw);
  } catch {
    return { score:5, rating:"Average", feedback:"Answer received.", tip:"Use specific examples." };
  }
};

// ── VoiceInterviewModal ───────────────────────────────────────
function VoiceInterviewModal({ job, onClose }) {
  const [phase, setPhase]           = useState("idle");
  const [questions, setQuestions]   = useState([]);
  const [currentQ, setCurrentQ]     = useState(0);
  const [transcript, setTranscript] = useState([]);
  const [liveText, setLiveText]     = useState("");
  const [errorMsg, setErrorMsg]     = useState("");
  const [isMuted, setIsMuted]       = useState(false);
  const [overallScore, setOverall]  = useState(null);
  const abortRef = useRef(false);
  const chatRef  = useRef(null);
  const isMutedRef = useRef(false);
  isMutedRef.current = isMuted;

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [transcript, liveText, phase]);
  useEffect(() => () => { abortRef.current = true; window.speechSynthesis?.cancel(); }, []);

  const runInterview = async () => {
    abortRef.current = false; setTranscript([]); setCurrentQ(0); setOverall(null); setErrorMsg("");
    let qs = [];
    setPhase("loading");
    try { qs = await fetchInterviewQuestions(job); }
    catch (e) { setErrorMsg(e.message); setPhase("error"); return; }
    if (abortRef.current) return;
    setQuestions(qs);
    if (!isMutedRef.current) { setPhase("speaking"); await speakAndWait(`Hello! I'm your AI interviewer for the ${job.title} position. I'll ask you ${qs.length} questions. Let's begin.`); }
    if (abortRef.current) return;
    const results = [];
    for (let i = 0; i < qs.length; i++) {
      if (abortRef.current) break;
      setCurrentQ(i); setLiveText("");
      setPhase("speaking");
      if (!isMutedRef.current) await speakAndWait(`Question ${i + 1}: ${qs[i]}`);
      if (abortRef.current) break;
      setPhase("listening"); setLiveText("🎤 Listening…");
      let answer = "(no answer)";
      try { answer = await listenWithLiveText((interim) => setLiveText(interim || "🎤 Listening…"), 15000); }
      catch (e) { if (abortRef.current) break; answer = e.message.includes("denied") ? "(mic denied)" : `(mic error: ${e.message})`; }
      if (abortRef.current) break;
      setLiveText("");
      setPhase("evaluating");
      if (!isMutedRef.current) speakAndWait("Got it. Evaluating your answer.");
      const evaluation = await evaluateAnswer(qs[i], answer, job.title);
      if (abortRef.current) break;
      if (!isMutedRef.current) await speakAndWait(`${evaluation.feedback} ${evaluation.tip || ""}`);
      const entry = { q: qs[i], a: answer, eval: evaluation };
      results.push(entry); setTranscript(t => [...t, entry]);
    }
    if (!abortRef.current) {
      const avg = results.length ? Math.round(results.reduce((s,r) => s+(r.eval?.score||5), 0)/results.length*10) : 0;
      setOverall(avg); setPhase("done");
      if (!isMutedRef.current) await speakAndWait(`Interview complete! Your overall score is ${avg} out of 100. Thank you!`);
    }
  };

  const stopInterview = () => { abortRef.current = true; window.speechSynthesis?.cancel(); setPhase("done"); };
  const phaseInfo = {
    idle:{color:"#64748b",label:"Ready to start",dot:false},
    loading:{color:"#f59e0b",label:"Generating questions with Groq AI…",dot:true},
    speaking:{color:"#60a5fa",label:`AI speaking — Q${currentQ+1} of ${questions.length||"?"}`,dot:true},
    listening:{color:"#22c55e",label:"🎤 Mic open — speak your answer now",dot:true},
    evaluating:{color:"#a78bfa",label:"Groq AI evaluating your answer…",dot:true},
    done:{color:"#a78bfa",label:"Interview complete!",dot:false},
    error:{color:"#ef4444",label:"Error — see below",dot:false},
  };
  const pi = phaseInfo[phase]||phaseInfo.idle;
  const ratingColor = r => r==="Excellent"?"#22c55e":r==="Good"?"#4ade80":r==="Average"?"#eab308":r==="Needs Improvement"?"#f97316":"#ef4444";

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.93)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:16 }}>
      <div style={{ background:"#0c1220",border:"1px solid #1e293b",borderRadius:20,width:"100%",maxWidth:620,maxHeight:"95vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 30px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ padding:"18px 22px",borderBottom:"1px solid #1e293b",display:"flex",justifyContent:"space-between",alignItems:"center",background:"linear-gradient(135deg,#1a0a2e,#0c1220)" }}>
          <div>
            <p style={{ margin:0,fontSize:11,color:"#a78bfa",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em" }}>🎤 AI Voice Interview · Powered by Groq</p>
            <p style={{ margin:"3px 0 0",fontSize:15,fontWeight:700,color:"#f1f5f9" }}>{job.title}</p>
          </div>
          <button onClick={()=>{stopInterview();onClose();}} style={{ background:"#1e293b",border:"1px solid #334155",color:"#94a3b8",width:32,height:32,borderRadius:"50%",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>×</button>
        </div>
        <div style={{ padding:"10px 22px",background:"#0a0f1a",borderBottom:"1px solid #1e293b",display:"flex",alignItems:"center",gap:10,minHeight:42 }}>
          {pi.dot&&<div style={{ position:"relative",width:12,height:12,flexShrink:0 }}><div style={{ position:"absolute",inset:0,borderRadius:"50%",background:pi.color,animation:phase==="listening"?"ripple 1.2s ease-out infinite":"pulse 1.4s ease-in-out infinite" }}/><div style={{ position:"absolute",inset:2,borderRadius:"50%",background:pi.color }}/></div>}
          <span style={{ fontSize:13,color:pi.color,fontWeight:600,flex:1 }}>{pi.label}</span>
          {questions.length>0&&!["idle","loading","done","error"].includes(phase)&&(
            <div style={{ display:"flex",gap:5,alignItems:"center" }}>
              {questions.map((_,i)=><div key={i} style={{ width:i===currentQ?20:8,height:8,borderRadius:4,background:i<currentQ?"#22c55e":i===currentQ?pi.color:"#1e293b",transition:"all 0.3s ease" }}/>)}
            </div>
          )}
        </div>
        {phase==="listening"&&(
          <div style={{ background:"#0d2218",borderBottom:"1px solid #166534",padding:"10px 22px",display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ display:"flex",gap:3,alignItems:"flex-end",height:24 }}>
              {[1,2,3,4,5,6,7,8].map((_,i)=><div key={i} style={{ width:4,borderRadius:2,background:"#22c55e",animation:`bar${i%4} 0.${4+i}s ease-in-out infinite alternate`,opacity:liveText&&liveText!=="🎤 Listening…"?1:0.4 }}/>)}
            </div>
            <span style={{ fontSize:13,color:"#4ade80",fontStyle:liveText==="🎤 Listening…"?"italic":"normal",flex:1,lineHeight:1.4 }}>{liveText||"🎤 Speak now…"}</span>
          </div>
        )}
        <div ref={chatRef} style={{ flex:1,overflowY:"auto",padding:"18px 22px",display:"flex",flexDirection:"column",gap:16 }}>
          {phase==="idle"&&(
            <div style={{ textAlign:"center",padding:"28px 16px" }}>
              <div style={{ fontSize:52,marginBottom:14 }}>🎤</div>
              <p style={{ fontSize:15,fontWeight:700,color:"#f1f5f9",margin:"0 0 8px" }}>AI Voice Interview — Powered by Groq</p>
              <p style={{ fontSize:13,color:"#64748b",margin:"0 0 16px" }}>Groq AI speaks each question. Answer verbally. Real-time transcription + instant feedback.</p>
              <div style={{ background:"#1e293b",borderRadius:10,padding:"12px 16px",border:"1px solid #334155",textAlign:"left" }}>
                <p style={{ margin:"0 0 8px",fontSize:12,color:"#a78bfa",fontWeight:700 }}>⚠️ Before you start:</p>
                <p style={{ margin:"0 0 4px",fontSize:12,color:"#64748b" }}>• Use <strong style={{color:"#f1f5f9"}}>Chrome</strong> browser</p>
                <p style={{ margin:"0 0 4px",fontSize:12,color:"#64748b" }}>• Click <strong style={{color:"#f1f5f9"}}>Allow</strong> when Chrome asks for mic</p>
                <p style={{ margin:0,fontSize:12,color:"#64748b" }}>• 2.5 seconds of silence ends your answer</p>
              </div>
            </div>
          )}
          {phase==="loading"&&<div style={{ textAlign:"center",padding:"40px 0" }}><Spinner/><p style={{ marginTop:14,color:"#f59e0b",fontSize:14,fontWeight:600 }}>Generating {job.title} questions with Groq…</p><p style={{ color:"#475569",fontSize:12,marginTop:6 }}>Usually 1–2 seconds</p></div>}
          {transcript.map((item,i)=>(
            <div key={i} style={{ display:"flex",flexDirection:"column",gap:8 }}>
              <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-start" }}>
                <span style={{ fontSize:11,color:"#60a5fa",fontWeight:700,marginBottom:4 }}>🤖 AI — Q{i+1}</span>
                <div style={{ background:"#1e293b",border:"1px solid #2d3f5e",borderRadius:"4px 14px 14px 14px",padding:"11px 14px",maxWidth:"88%",fontSize:14,color:"#e2e8f0",lineHeight:1.65 }}>{item.q}</div>
              </div>
              <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end" }}>
                <span style={{ fontSize:11,color:"#34d399",fontWeight:700,marginBottom:4 }}>🎤 You</span>
                <div style={{ background:"#14532d22",border:"1px solid #166534",borderRadius:"14px 4px 14px 14px",padding:"11px 14px",maxWidth:"88%",fontSize:14,color:"#86efac",lineHeight:1.65 }}>
                  {(!item.a||item.a==="(no answer)")?<em style={{color:"#475569"}}>No response detected</em>:item.a}
                </div>
              </div>
              {item.eval&&(
                <div style={{ background:"#0f172a",border:`1px solid ${ratingColor(item.eval.rating)}44`,borderRadius:12,padding:"12px 14px",marginLeft:8,borderLeft:`3px solid ${ratingColor(item.eval.rating)}` }}>
                  <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
                    <span style={{ fontSize:11,fontWeight:700,color:"#475569",textTransform:"uppercase",letterSpacing:"0.06em" }}>AI Feedback</span>
                    <span style={{ background:`${ratingColor(item.eval.rating)}22`,color:ratingColor(item.eval.rating),fontSize:12,fontWeight:700,padding:"2px 10px",borderRadius:999,border:`1px solid ${ratingColor(item.eval.rating)}44` }}>{item.eval.rating}</span>
                    <span style={{ marginLeft:"auto",fontSize:18,fontWeight:800,color:ratingColor(item.eval.rating) }}>{item.eval.score}/10</span>
                  </div>
                  <p style={{ margin:"0 0 6px",fontSize:13,color:"#94a3b8",lineHeight:1.55 }}>{item.eval.feedback}</p>
                  {item.eval.tip&&<p style={{ margin:0,fontSize:12,color:"#60a5fa",background:"#1e293b",borderRadius:6,padding:"6px 10px",display:"flex",gap:6,alignItems:"flex-start" }}><span>💡</span><span>{item.eval.tip}</span></p>}
                </div>
              )}
            </div>
          ))}
          {phase==="speaking"&&questions[currentQ]&&(
            <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-start" }}>
              <span style={{ fontSize:11,color:"#60a5fa",fontWeight:700,marginBottom:4 }}>🤖 AI — Q{currentQ+1}</span>
              <div style={{ background:"#1e293b",border:"1px solid #2563eb55",borderRadius:"4px 14px 14px 14px",padding:"11px 14px",maxWidth:"88%",fontSize:14,color:"#e2e8f0",lineHeight:1.65 }}>
                {questions[currentQ]}<span style={{ display:"inline-block",width:2,height:16,background:"#60a5fa",borderRadius:1,marginLeft:6,animation:"blink 0.9s step-end infinite",verticalAlign:"middle" }}/>
              </div>
            </div>
          )}
          {phase==="evaluating"&&<div style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 0",color:"#a78bfa",fontSize:13 }}><Spinner/> Groq AI evaluating…</div>}
          {phase==="done"&&overallScore!==null&&(
            <div style={{ background:"linear-gradient(135deg,#1a0a2e,#0f172a)",border:"1px solid #7c3aed55",borderRadius:14,padding:"20px",marginTop:8 }}>
              <div style={{ textAlign:"center",marginBottom:16 }}>
                <div style={{ fontSize:48,fontWeight:800,color:overallScore>=70?"#22c55e":overallScore>=50?"#eab308":"#ef4444" }}>{overallScore}<span style={{fontSize:18,color:"#475569"}}>/100</span></div>
                <div style={{ fontSize:13,color:"#64748b",marginTop:4 }}>Overall Interview Score</div>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14 }}>
                {[["Questions",transcript.length],["Answered",transcript.filter(t=>t.a&&!t.a.startsWith("(")).length],["Avg",transcript.length?(transcript.reduce((s,t)=>s+(t.eval?.score||0),0)/transcript.length).toFixed(1)+"/10":"—"],["Best",transcript.length?Math.max(...transcript.map(t=>t.eval?.score||0))+"/10":"—"]].map(([l,v])=>(
                  <div key={l} style={{ background:"#0f172a",borderRadius:8,padding:"8px 12px",border:"1px solid #1e293b",textAlign:"center" }}>
                    <div style={{ fontSize:11,color:"#475569",marginBottom:2 }}>{l}</div>
                    <div style={{ fontSize:15,fontWeight:700,color:"#f1f5f9" }}>{v}</div>
                  </div>
                ))}
              </div>
              <p style={{ margin:0,fontSize:12,color:"#64748b",textAlign:"center" }}>↑ Scroll up to review Q&As and feedback</p>
            </div>
          )}
          {phase==="done"&&overallScore===null&&<div style={{ textAlign:"center",padding:"20px 0",color:"#64748b" }}>Interview ended early.</div>}
          {phase==="error"&&(
            <div style={{ background:"#7f1d1d22",border:"1px solid #7f1d1d55",borderRadius:10,padding:"14px 16px",color:"#f87171",fontSize:14 }}>
              <strong>⚠️ Error:</strong> {errorMsg}
              <div style={{ marginTop:10,background:"#0f172a",borderRadius:8,padding:"10px 12px",border:"1px solid #1e293b",fontSize:13,color:"#94a3b8",lineHeight:1.7 }}>
                ✓ Add <code style={{color:"#a78bfa"}}>GROQ_API_KEY</code> in Render → Environment<br/>
                ✓ Add routes from server-groq-routes.js to server.js<br/>
                ✓ Redeploy on Render<br/>
                ✓ Use Chrome browser
              </div>
            </div>
          )}
        </div>
        <div style={{ padding:"14px 22px",borderTop:"1px solid #1e293b",background:"#080d18",display:"flex",gap:10,alignItems:"center" }}>
          {phase==="idle"&&<button onClick={runInterview} style={{ flex:1,padding:"13px",borderRadius:10,background:"linear-gradient(135deg,#7c3aed,#4f46e5)",border:"none",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:"0 4px 20px #7c3aed55" }}>🎤 Start AI Voice Interview</button>}
          {["speaking","listening","loading","evaluating"].includes(phase)&&(<>
            <button onClick={()=>setIsMuted(m=>!m)} style={{ padding:"11px 16px",borderRadius:10,fontWeight:600,fontSize:13,cursor:"pointer",background:isMuted?"#7f1d1d44":"#1e293b",border:`1px solid ${isMuted?"#ef444466":"#334155"}`,color:isMuted?"#f87171":"#94a3b8" }}>{isMuted?"🔇 Unmute AI":"🔊 Mute AI"}</button>
            <button onClick={stopInterview} style={{ flex:1,padding:"11px",borderRadius:10,cursor:"pointer",background:"#7f1d1d44",border:"1px solid #7f1d1d66",color:"#f87171",fontSize:14,fontWeight:700 }}>⏹ End Interview</button>
          </>)}
          {phase==="done"&&<button onClick={onClose} style={{ flex:1,padding:"13px",borderRadius:10,background:"#4f46e5",border:"none",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer" }}>Close & Return →</button>}
          {phase==="error"&&<button onClick={()=>{setPhase("idle");setErrorMsg("");setQuestions([]);}} style={{ flex:1,padding:"13px",borderRadius:10,background:"#1e293b",border:"1px solid #334155",color:"#94a3b8",fontSize:14,cursor:"pointer" }}>↩ Try Again</button>}
        </div>
      </div>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes pulse   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.85)} }
        @keyframes ripple  { 0%{transform:scale(1);opacity:0.8} 100%{transform:scale(2.5);opacity:0} }
        @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes bar0    { from{height:4px}  to{height:20px} }
        @keyframes bar1    { from{height:8px}  to{height:16px} }
        @keyframes bar2    { from{height:12px} to{height:24px} }
        @keyframes bar3    { from{height:6px}  to{height:18px} }
      `}</style>
    </div>
  );
}

// ── ATS helpers ───────────────────────────────────────────────
function ATSGauge({ score }) {
  const col=sc(score),label=slb(score),r=54,c=2*Math.PI*r,fill=(score/100)*c;
  return (
    <div style={{ textAlign:"center",padding:"24px 0 16px" }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#1e293b" strokeWidth="10"/>
        <circle cx="70" cy="70" r={r} fill="none" stroke={col} strokeWidth="10" strokeDasharray={`${fill} ${c}`} strokeLinecap="round" transform="rotate(-90 70 70)" style={{ transition:"stroke-dasharray 1s ease" }}/>
        <text x="70" y="62" textAnchor="middle" fill={col} fontSize="30" fontWeight="800" fontFamily="inherit">{score}</text>
        <text x="70" y="80" textAnchor="middle" fill="#64748b" fontSize="12" fontFamily="inherit">ATS Score</text>
        <text x="70" y="96" textAnchor="middle" fill="#475569" fontSize="10" fontFamily="inherit">out of 100</text>
      </svg>
      <div style={{ marginTop:8,display:"inline-flex",alignItems:"center",gap:8,background:`${col}15`,border:`1px solid ${col}44`,borderRadius:999,padding:"6px 18px" }}>
        <span style={{ width:8,height:8,borderRadius:"50%",background:col,display:"inline-block" }}/>
        <span style={{ fontSize:15,fontWeight:700,color:col }}>{label}</span>
      </div>
    </div>
  );
}
function ScoreBar({ label, value, color }) {
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
        <span style={{ fontSize:12,color:"#94a3b8" }}>{label}</span>
        <span style={{ fontSize:12,fontWeight:700,color:color||sc(value) }}>{value}%</span>
      </div>
      <div style={{ background:"#1e293b",borderRadius:4,height:6,overflow:"hidden" }}>
        <div style={{ width:`${value}%`,height:"100%",background:color||sc(value),borderRadius:4,transition:"width 1s ease" }}/>
      </div>
    </div>
  );
}
function ATSModal({ result, name, jobTitle, onClose }) {
  if (!result) return null;
  const safeResult = result || {};
  const recColor = rc(safeResult.recommendation) || "#64748b";
  const score = safeResult.ats_score ?? safeResult.score ?? 0;
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20 }}>
      <div style={{ background:"#0c1220",border:"1px solid #1e293b",borderRadius:18,width:"100%",maxWidth:600,maxHeight:"92vh",overflow:"auto",padding:28 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4 }}>
          <div>
            <p style={{ margin:0,fontSize:11,color:"#60a5fa",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em" }}>ATS Screening Report</p>
            <p style={{ margin:"4px 0 0",fontSize:17,fontWeight:700,color:"#f1f5f9" }}>{name}</p>
            <p style={{ margin:"2px 0 0",fontSize:13,color:"#64748b" }}>{jobTitle}</p>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"#64748b",fontSize:24,cursor:"pointer" }}>×</button>
        </div>
        <ATSGauge score={score}/>
        <div style={{ textAlign:"center",marginBottom:20 }}>
          <span style={{ fontSize:13,fontWeight:700,padding:"7px 20px",borderRadius:8,background:`${recColor}20`,color:recColor,border:`1px solid ${recColor}50` }}>
            {result.recommendation==="Advance to Interview"?"✅ ":result.recommendation==="Hold"?"⏸ ":"❌ "}{result.recommendation}
          </span>
        </div>
        {result.summary&&<div style={{ background:"#0f172a",borderRadius:10,padding:"14px 16px",border:"1px solid #1e293b",marginBottom:16 }}><p style={{ margin:0,fontSize:13,color:"#94a3b8",lineHeight:1.65 }}>{result.summary}</p></div>}
        <div style={{ background:"#0f172a",borderRadius:10,padding:"14px 16px",border:"1px solid #1e293b",marginBottom:16 }}>
          <p style={{ margin:"0 0 12px",fontSize:11,color:"#60a5fa",fontWeight:700,textTransform:"uppercase" }}>Score Breakdown</p>
          <ScoreBar label="Overall ATS Score" value={score}/>
          {result.keyword_match_percent!=null&&<ScoreBar label="Keyword Match" value={result.keyword_match_percent} color="#a78bfa"/>}
          {result.formatting_score!=null&&<ScoreBar label="Resume Formatting" value={result.formatting_score} color="#34d399"/>}
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16 }}>
          <div style={{ background:"#0f172a",borderRadius:10,padding:"12px 14px",border:"1px solid #14532d" }}>
            <p style={{ margin:"0 0 8px",fontSize:11,color:"#4ade80",fontWeight:700,textTransform:"uppercase" }}>✓ Matched</p>
            <div style={{ display:"flex",flexWrap:"wrap",gap:4 }}>{(result.matched_skills||[]).map(s=><Pill key={s} label={s} matched/>)}</div>
          </div>
          <div style={{ background:"#0f172a",borderRadius:10,padding:"12px 14px",border:"1px solid #7f1d1d" }}>
            <p style={{ margin:"0 0 8px",fontSize:11,color:"#f87171",fontWeight:700,textTransform:"uppercase" }}>✗ Gaps</p>
            <div style={{ display:"flex",flexWrap:"wrap",gap:4 }}>{(result.missing_skills||[]).map(s=><Pill key={s} label={s}/>)}</div>
          </div>
        </div>
        <button onClick={onClose} style={{ width:"100%",padding:"12px",borderRadius:8,background:"#1d4ed8",border:"none",color:"#eff6ff",fontSize:14,fontWeight:700,cursor:"pointer" }}>Close Report</button>
      </div>
    </div>
  );
}

function ApplyModal({ job, onClose, onSuccess }) {
  const [name,setName]=useState("");const [email,setEmail]=useState("");const [phone,setPhone]=useState("");
  const [file,setFile]=useState(null);const [paste,setPaste]=useState("");
  const [loading,setLoading]=useState(false);const [error,setError]=useState("");const [step,setStep]=useState("form");
  const handleFile=e=>{const f=e.target.files[0];if(!f)return;if(!f.type.includes("pdf")&&!f.name.match(/\.(pdf|txt|md)$/)){setError("PDF, TXT, or MD only");return;}setFile(f);setError("");};
  const submit=async()=>{
    if(!name.trim()||!email.trim())return setError("Name and email required");
    if(!file&&!paste.trim())return setError("Upload PDF or paste resume");
    setLoading(true);setStep("analyzing");setError("");
    try{const res=await api.apply({job_id:job.id,name,email,phone,resumeFile:file||undefined,resume_text:!file?paste:undefined});onSuccess(res);}
    catch(e){setError(e.message);setStep("form");}setLoading(false);
  };
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:20 }}>
      <div style={{ background:"#0c1220",border:"1px solid #1e293b",borderRadius:16,width:"100%",maxWidth:520,maxHeight:"92vh",overflow:"auto",padding:28 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20 }}>
          <div><p style={{ margin:0,fontSize:18,fontWeight:700,color:"#f1f5f9" }}>Apply — {job.title}</p><p style={{ margin:"3px 0 0",fontSize:13,color:"#64748b" }}>{job.department} · {job.location}</p></div>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"#64748b",fontSize:24,cursor:"pointer" }}>×</button>
        </div>
        {step==="analyzing"&&<div style={{ textAlign:"center",padding:"40px 20px" }}><div style={{ width:64,height:64,border:"4px solid #1e293b",borderTopColor:"#2563eb",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 20px" }}/><p style={{ fontSize:16,fontWeight:600,color:"#f1f5f9",margin:"0 0 6px" }}>Analyzing resume with AI…</p></div>}
        {step==="form"&&<div style={{ display:"flex",flexDirection:"column",gap:13 }}>
          <input style={inp} placeholder="Full Name *" value={name} onChange={e=>setName(e.target.value)}/>
          <input style={inp} type="email" placeholder="Email *" value={email} onChange={e=>setEmail(e.target.value)}/>
          <input style={inp} placeholder="Phone (optional)" value={phone} onChange={e=>setPhone(e.target.value)}/>
          <label style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,border:`2px dashed ${file?"#2563eb":"#1e3a5f"}`,borderRadius:10,padding:"24px 16px",cursor:"pointer",background:file?"#0f2744":"transparent" }}>
            <input type="file" accept=".pdf,.txt,.md" style={{ display:"none" }} onChange={handleFile}/>
            <span style={{ fontSize:28 }}>{file?"📄":"⬆️"}</span>
            {file?<span style={{ fontSize:13,color:"#60a5fa",fontWeight:600 }}>{file.name}</span>:<><span style={{ fontSize:13,color:"#475569",fontWeight:600 }}>Click to upload PDF, TXT, or MD</span><span style={{ fontSize:11,color:"#334155" }}>Max 10 MB</span></>}
          </label>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}><div style={{ flex:1,height:1,background:"#1e293b" }}/><span style={{ fontSize:11,color:"#475569" }}>OR PASTE TEXT</span><div style={{ flex:1,height:1,background:"#1e293b" }}/></div>
          <textarea style={{ ...inp,height:110,resize:"vertical",fontSize:13 }} placeholder="Paste resume text…" value={paste} onChange={e=>{setPaste(e.target.value);if(e.target.value)setFile(null);}}/>
          {error&&<div style={{ fontSize:13,color:"#f87171",padding:"10px 12px",background:"#7f1d1d22",borderRadius:8 }}>⚠️ {error}</div>}
          <div style={{ display:"flex",gap:8 }}>
            <button onClick={onClose} style={{ flex:1,padding:"10px",borderRadius:8,background:"none",border:"1px solid #1e293b",color:"#94a3b8",fontSize:14,cursor:"pointer" }}>Cancel</button>
            <button onClick={submit} disabled={loading} style={{ flex:2,padding:"11px",borderRadius:8,background:"#1d4ed8",border:"none",color:"#eff6ff",fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:loading?0.7:1 }}>
              {loading&&<Spinner/>}{loading?"Screening…":"Submit & Get ATS Score →"}
            </button>
          </div>
        </div>}
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [mode,setMode]=useState("login");const [name,setName]=useState("");
  const [email,setEmail]=useState("");const [pass,setPass]=useState("");
  const [load,setLoad]=useState(false);const [err,setErr]=useState("");
  const submit=async()=>{setLoad(true);setErr("");
    try{const res=mode==="login"?await api.login(email,pass):await api.register(name,email,pass);api.saveToken(res.token);onLogin(res.user);}catch(e){setErr(e.message);}setLoad(false);};
  return (
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#070d1a" }}>
      <div style={{ width:380,background:"#0c1220",border:"1px solid #1e293b",borderRadius:16,padding:32 }}>
        <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:24 }}>
          <div style={{ width:32,height:32,background:"#1d4ed8",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16 }}>⚡</div>
          <span style={{ fontWeight:700,fontSize:18,color:"#f1f5f9" }}>TalentAI Admin</span>
        </div>
        <div style={{ display:"flex",gap:6,marginBottom:20,background:"#0f172a",borderRadius:8,padding:4 }}>
          {["login","register"].map(m=>(
            <button key={m} onClick={()=>setMode(m)} style={{ flex:1,padding:"7px",borderRadius:6,border:"none",fontSize:13,fontWeight:600,cursor:"pointer",background:mode===m?"#1d4ed8":"transparent",color:mode===m?"#eff6ff":"#64748b" }}>{m==="login"?"Sign In":"Create Account"}</button>
          ))}
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          {mode==="register"&&<input style={inp} placeholder="Full name" value={name} onChange={e=>setName(e.target.value)}/>}
          <input style={inp} type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/>
          <input style={inp} type="password" placeholder="Password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/>
          {err&&<p style={{ fontSize:13,color:"#f87171",padding:"8px 12px",background:"#7f1d1d22",borderRadius:6 }}>{err}</p>}
          <button onClick={submit} disabled={load} style={{ padding:"11px",borderRadius:8,background:"#1d4ed8",border:"none",color:"#eff6ff",fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:load?0.7:1 }}>
            {load&&<Spinner/>}{mode==="login"?"Sign In →":"Create Account →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CHANGE: JobsView now accepts onOpenTemplates prop ─────────
function JobsView({ onOpenTemplates, onOpenResume, onOpenConverter, onOpenSkillGap }) {    // ← CHANGE 4a
  const [jobs,setJobs]=useState([]);const [selected,setSelected]=useState(null);
  const [applying,setApplying]=useState(null);const [result,setResult]=useState(null);
  const [voiceJob,setVoiceJob]=useState(null);const [search,setSearch]=useState("");
  const [loading,setLoading]=useState(true);const [err,setErr]=useState("");
  useEffect(()=>{api.getJobs().then(j=>{setJobs(j);setSelected(j[0]||null);}).catch(e=>setErr(e.message)).finally(()=>setLoading(false));},[]);
  const filtered=jobs.filter(j=>j.title?.toLowerCase().includes(search.toLowerCase())||j.department?.toLowerCase().includes(search.toLowerCase())||(j.skills||[]).some(s=>s.toLowerCase().includes(search.toLowerCase())));
  if(loading)return <div style={{ textAlign:"center",padding:60,color:"#475569" }}><Spinner/><p style={{ marginTop:12,fontSize:14 }}>Loading jobs…</p></div>;
  if(err)return <div style={{ textAlign:"center",padding:60,color:"#f87171" }}><p>⚠️ {err}</p></div>;
  return (
    <div style={{ display:"grid",gridTemplateColumns:"360px 1fr",gap:22,alignItems:"start" }}>
      <div>
        <input style={{ ...inp,marginBottom:12 }} placeholder="🔍  Search jobs, skills…" value={search} onChange={e=>setSearch(e.target.value)}/>
        <p style={{ margin:"0 0 10px",fontSize:12,color:"#475569" }}>{filtered.length} open position{filtered.length!==1?"s":""}</p>
        <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
          {filtered.length===0&&<div style={{ textAlign:"center",padding:"40px 20px",color:"#475569" }}><p style={{ fontSize:36,margin:"0 0 10px" }}>💼</p><p style={{ fontSize:14 }}>No jobs posted yet.</p></div>}
          {filtered.map(j=>{
            const col=DEPT[j.department],isSel=selected?.id===j.id,skills=Array.isArray(j.skills)?j.skills:[];
            return (
              <div key={j.id} onClick={()=>setSelected(j)} style={{ background:isSel?"#0f172a":"#0c1220",border:`1px solid ${isSel?"#2563eb":"#1e293b"}`,borderRadius:12,padding:"18px 20px",cursor:"pointer",position:"relative",transition:"border-color 0.15s" }}>
                {isSel&&<div style={{ position:"absolute",left:0,top:0,bottom:0,width:3,borderRadius:"12px 0 0 12px",background:"#2563eb" }}/>}
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
                  <div><p style={{ margin:0,fontSize:15,fontWeight:600,color:"#f1f5f9" }}>{j.title}</p><p style={{ margin:"2px 0 0",fontSize:12,color:"#64748b" }}>{j.location} · {j.type}</p></div>
                  {col&&<span style={{ fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:4,background:col.bg,color:col.text,border:`1px solid ${col.border}`,letterSpacing:"0.04em",textTransform:"uppercase" }}>{j.department}</span>}
                </div>
                <p style={{ margin:"0 0 10px",fontSize:12,color:"#94a3b8",lineHeight:1.5 }}>{j.description?.slice(0,90)}…</p>
                <div style={{ display:"flex",flexWrap:"wrap",gap:5,marginBottom:12 }}>{skills.slice(0,4).map(s=><Pill key={s} label={s}/>)}</div>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                  <span style={{ fontSize:13,color:"#22c55e",fontWeight:600 }}>{j.salary_min&&j.salary_max?`₹${(j.salary_min/100000).toFixed(1)}L – ₹${(j.salary_max/100000).toFixed(1)}L`:"Competitive"}</span>
                  <button onClick={e=>{e.stopPropagation();setApplying(j);}} style={{ fontSize:12,fontWeight:600,padding:"5px 14px",borderRadius:6,background:"#1d4ed8",color:"#eff6ff",border:"none",cursor:"pointer" }}>Apply →</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {selected&&(
        <div style={{ background:"#0c1220",border:"1px solid #1e293b",borderRadius:14,padding:"24px 26px",position:"sticky",top:20 }}>
          <p style={{ margin:"0 0 4px",fontSize:22,fontWeight:700,color:"#f1f5f9" }}>{selected.title}</p>
          <p style={{ margin:"0 0 12px",fontSize:13,color:"#64748b" }}>{selected.location} · {selected.type}</p>
          {selected.salary_min&&<p style={{ margin:"0 0 12px",fontSize:14,fontWeight:600,color:"#22c55e" }}>₹{(selected.salary_min/100000).toFixed(1)}L – ₹{(selected.salary_max/100000).toFixed(1)}L / yr</p>}
          <p style={{ margin:"0 0 18px",fontSize:14,color:"#94a3b8",lineHeight:1.65 }}>{selected.description}</p>
          {(Array.isArray(selected.skills)?selected.skills:[]).length>0&&<><p style={{ margin:"0 0 8px",fontSize:11,color:"#475569",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em" }}>Core Skills</p><div style={{ display:"flex",flexWrap:"wrap",gap:6,marginBottom:18 }}>{(Array.isArray(selected.skills)?selected.skills:[]).map(s=><Pill key={s} label={s}/>)}</div></>}
          {(Array.isArray(selected.requirements)?selected.requirements:[]).length>0&&<><p style={{ margin:"0 0 8px",fontSize:11,color:"#475569",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em" }}>Requirements</p><ul style={{ margin:"0 0 22px",paddingLeft:18 }}>{(Array.isArray(selected.requirements)?selected.requirements:[]).map((r,i)=><li key={i} style={{ fontSize:13,color:"#94a3b8",marginBottom:5 }}>{r}</li>)}</ul></>}

          {/* 2x2 button grid */}
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
  <button onClick={() => { setResult(null); setApplying(selected); }} style={{ padding: "12px 8px", borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "center", lineHeight: 1.3, boxShadow: "0 4px 16px #7c3aed44" }}>
    📄 Upload PDF<br/>
     <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.85 }}>Get ATS Score →</span>
</button>
  <button onClick={() => setVoiceJob(selected)} style={{ padding: "12px 8px", borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "center", lineHeight: 1.3, boxShadow: "0 4px 16px #7c3aed44" }}>
    🎤 AI Voice<br/>
    <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.85 }}>Interview</span>
  </button>
  <button onClick={onOpenResume} style={{ padding: "12px 8px", borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "center", lineHeight: 1.3, boxShadow: "0 4px 16px #7c3aed44" }}>
    🤖 Build Resume<br/>
    <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.85 }}>AI-Powered</span>
  </button>
  <button onClick={onOpenTemplates} style={{ padding: "12px 8px", borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "center", lineHeight: 1.3, boxShadow: "0 4px 16px #7c3aed44" }}>
    📋 Templates<br/>
    <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.85 }}>Browse Styles</span>
  </button>
</div>

{/* Convert Resume - full width */}
<button onClick={onOpenConverter} style={{ width: "100%", marginTop: 10, padding: "12px 8px", borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "center", lineHeight: 1.3, boxShadow: "0 4px 16px #7c3aed44", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
  🔄 Convert Resume
  <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.85 }}>— Old Resume → ATS Optimized</span>
</button>

{/* Skill Gap - full width */}
<button onClick={onOpenSkillGap} style={{ width: "100%", padding: "12px", borderRadius: 8, marginTop: 10, background: "linear-gradient(135deg,#1e3a5f,#1d4ed8)", border: "1px solid #2563eb55", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 16px #7c3aed44" }}>
  🗺️ AI Skill Gap Mapper
  <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.8 }}>— Free Course Roadmap</span>
</button>

<p style={{ margin: "10px 0 0", fontSize: 11, color: "#334155", textAlign: "center" }}>
  🎤 Powered by Groq AI · Chrome only for mic
</p>
        </div>
      )}
      {applying && <ApplyModal job={applying} onClose={()=>setApplying(null)} onSuccess={res=>{
        setApplying(null);
        try {
          const aiResult = res?.ai_result || res?.data;
          const appName = res?.application?.name || res?.name || "Applicant";
          if (aiResult) setResult({ data: aiResult, name: appName, jobTitle: applying.title });
        } catch(e) { console.error("Apply error:", e, res); }
      }}/>}
      {result && <ATSModal result={result.data} name={result.name} jobTitle={result.jobTitle} onClose={()=>setResult(null)}/>}
      {voiceJob && <VoiceInterviewModal job={voiceJob} onClose={()=>setVoiceJob(null)}/>}
    </div>
  );
}

// ── ROOT APP ──────────────────────────────────────────────────
export default function App() {
  const [user,setUser]             = useState(null);
  const [view,setView]             = useState("jobs");
  const [checking,setCheck]        = useState(true);
  const [showTemplates,setShowTemplates] = useState(false);
  const [showResume, setShowResume] = useState(false);
const [showConverter, setShowConverter] = useState(false);
const [showSkillGap, setShowSkillGap] = useState(false); // ← CHANGE 2

  useEffect(()=>{
    if(api.getToken()){api.me().then(setUser).catch(()=>api.clearToken()).finally(()=>setCheck(false));}
    else{setCheck(false);}
  },[]);

  if(checking)return <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#070d1a" }}><Spinner/></div>;
  if(view==="login")return <AdminPanel onLogin={u=>{setUser(u);setView("admin");}}/>;

  return (
    <div style={{ minHeight:"100vh",background:"#070d1a",color:"#f1f5f9",fontFamily:"'IBM Plex Sans',system-ui,sans-serif" }}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        @keyframes pulse   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.8)} }
        @keyframes ripple  { 0%{transform:scale(1);opacity:0.8} 100%{transform:scale(2.8);opacity:0} }
        @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes bar0    { from{height:4px} to{height:20px} }
        @keyframes bar1    { from{height:8px} to{height:16px} }
        @keyframes bar2    { from{height:12px} to{height:24px} }
        @keyframes bar3    { from{height:6px} to{height:18px} }
      `}</style>

      {/* Navbar */}
      <div style={{ background:"#0c1220",borderBottom:"1px solid #1e293b",padding:"0 28px" }}>
        <div style={{ maxWidth:1100,margin:"0 auto",display:"flex",alignItems:"center",height:56,gap:20 }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ width:28,height:28,background:"#1d4ed8",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14 }}>⚡</div>
            <span style={{ fontWeight:700,fontSize:16,color:"#f1f5f9" }}>TalentAI</span>
            <span style={{ fontSize:10,fontWeight:700,padding:"2px 6px",borderRadius:4,background:"#1e3a5f",color:"#60a5fa" }}>AI-POWERED</span>
          </div>
          <div style={{ display:"flex",gap:2,marginLeft:8 }}>
            {[{id:"jobs",icon:"💼",label:"Browse Jobs"},...(user?[{id:"admin",icon:"📊",label:"Admin Dashboard"}]:[])].map(t=>(
              <button key={t.id} onClick={()=>setView(t.id)} style={{ background:view===t.id?"#1e293b":"none",border:"none",color:view===t.id?"#f1f5f9":"#64748b",padding:"6px 14px",borderRadius:6,fontSize:13,fontWeight:view===t.id?600:400,cursor:"pointer" }}>
                {t.icon} {t.label}
              </button>
            ))}

           
           
          </div>
          <div style={{ marginLeft:"auto" }}>
            {user
              ?<div style={{ display:"flex",alignItems:"center",gap:10 }}>
                <span style={{ fontSize:13,color:"#64748b" }}>{user.name}</span>
                <button onClick={()=>{api.clearToken();setUser(null);setView("jobs");}} style={{ fontSize:12,padding:"5px 12px",borderRadius:6,background:"none",border:"1px solid #1e293b",color:"#94a3b8",cursor:"pointer" }}>Sign out</button>
              </div>
              :<button onClick={()=>setView("login")} style={{ fontSize:13,fontWeight:600,padding:"6px 16px",borderRadius:6,background:"#1d4ed8",color:"#eff6ff",border:"none",cursor:"pointer" }}>Admin Login</button>
            }
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth:1100,margin:"0 auto",padding:"26px 28px" }}>
        {/* CHANGE 3a: pass prop to JobsView */}
        {view==="jobs" && <JobsView
  onOpenTemplates={()=>setShowTemplates(true)}
  onOpenResume={()=>setShowResume(true)}
  onOpenConverter={()=>setShowConverter(true)}
  onOpenSkillGap={()=>setShowSkillGap(true)}
/>}
        {view==="admin" && <AdminPanel/>}
      </div>

      {/* CHANGE 3b: mount ResumeTemplatesPage overlay */}
      {/* CHANGE 3b: mount ResumeTemplatesPage overlay */}
{showTemplates && (
  <ResumeTemplatesPage
    onClose={() => setShowTemplates(false)}
  />
)}

{showResume && (
  <ResumeBuilder
    onClose={() => setShowResume(false)}
    groqKey={import.meta.env.VITE_GROQ_API_KEY || ""}
  />
)}

{showConverter && (
  <ResumeConverter
    onClose={() => setShowConverter(false)}
  />
)}

{showSkillGap && (
  <SkillGapMapper
    onClose={() => setShowSkillGap(false)}
  />
)}
</div>
);
}