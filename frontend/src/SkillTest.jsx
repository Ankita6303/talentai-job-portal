// SkillTest.jsx — AI-powered skill verification test
// Drop into frontend/src/
//
// Usage in App.jsx after successful ATS score ≥ 75:
//   import SkillTest from "./SkillTest";
//   {showSkillTest && (
//     <SkillTest
//       applicantName="Ankita"
//       jobTitle="AI Engineer"
//       skills={["Python", "Machine Learning", "TensorFlow"]}
//       atsScore={87}
//       groqKey={import.meta.env.VITE_GROQ_API_KEY || ""}
//       onComplete={(result) => {
//         setSkillTestResult(result);
//         setShowSkillTest(false);
//       }}
//       onClose={() => setShowSkillTest(false)}
//     />
//   )}

import { useState, useEffect, useRef, useCallback } from "react";

const GROQ_MODEL = "llama-3.3-70b-versatile";
const TIME_PER_QUESTION = 90; // seconds per question
const TOTAL_QUESTIONS = 5;

// ── call Groq ─────────────────────────────────────────────────
async function callGroq(userPrompt, systemPrompt, maxTokens = 2000, groqKey) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: maxTokens,
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `Groq error ${res.status}`);
  }
  const d = await res.json();
  return d.choices?.[0]?.message?.content || "";
}

// ── generate questions ────────────────────────────────────────
async function generateQuestions(jobTitle, skills, groqKey) {
  const skillList = skills.slice(0, 4).join(", ");
  const raw = await callGroq(
    `Generate exactly ${TOTAL_QUESTIONS} multiple choice questions to verify if a candidate truly knows: ${skillList}.
Role: ${jobTitle}

Rules:
- Mix difficulty: 2 easy, 2 medium, 1 hard
- Each question tests REAL practical knowledge (not definitions)
- Wrong options must be plausible (not obviously wrong)
- Questions should catch people who just read Wikipedia

Return ONLY valid JSON array, no markdown:
[
  {
    "id": 1,
    "question": "question text here",
    "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
    "correct": "A",
    "explanation": "Why A is correct in 1 sentence",
    "skill": "Python",
    "difficulty": "easy"
  }
]`,
    "You are an expert technical interviewer. Return ONLY a raw JSON array. No markdown, no explanation.",
    2000,
    groqKey
  );
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("Could not parse questions from AI");
  return JSON.parse(match[0]);
}

// ── evaluate final result ─────────────────────────────────────
async function evaluateResult(answers, questions, jobTitle, atsScore, groqKey) {
  const correct = answers.filter((a) => a.isCorrect).length;
  const pct = Math.round((correct / questions.length) * 100);

  const summary = questions.map((q, i) => {
    const ans = answers[i];
    return `Q${i + 1} [${q.skill}/${q.difficulty}]: ${ans?.isCorrect ? "✓" : "✗"} | Time: ${ans?.timeSpent || 0}s`;
  }).join("\n");

  const raw = await callGroq(
    `Candidate applied for: ${jobTitle}
ATS Resume Score: ${atsScore}/100
Skill Test Score: ${correct}/${questions.length} (${pct}%)
Performance per question:
${summary}

Provide a SHORT hiring recommendation. Return ONLY JSON:
{
  "verdict": "Verified" | "Partial" | "Flagged",
  "confidence": "High" | "Medium" | "Low",
  "hire_signal": "Strong Yes" | "Yes" | "Maybe" | "No",
  "summary": "2 sentences for HR",
  "red_flags": ["flag1"] or [],
  "strengths": ["strength1"],
  "interview_tip": "1 specific question HR should ask"
}`,
    "You are a senior HR analyst. Return ONLY raw JSON.",
    600,
    groqKey
  );
  const match = raw.replace(/```json|```/g, "").trim().match(/\{[\s\S]*\}/);
  const analysis = match ? JSON.parse(match[0]) : {
    verdict: pct >= 70 ? "Verified" : pct >= 50 ? "Partial" : "Flagged",
    confidence: "Medium",
    hire_signal: pct >= 70 ? "Yes" : "Maybe",
    summary: `Candidate scored ${pct}% on the skill verification test.`,
    red_flags: [],
    strengths: [],
    interview_tip: "Ask about their most recent project.",
  };

  return { correct, total: questions.length, pct, analysis };
}

// ── Timer ring ────────────────────────────────────────────────
function TimerRing({ seconds, total }) {
  const pct = seconds / total;
  const r = 22, c = 2 * Math.PI * r;
  const fill = pct * c;
  const col = seconds > total * 0.5 ? "#22c55e" : seconds > total * 0.25 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={56} height={56} viewBox="0 0 56 56">
      <circle cx={28} cy={28} r={r} fill="none" stroke="#1e293b" strokeWidth={4} />
      <circle cx={28} cy={28} r={r} fill="none" stroke={col} strokeWidth={4}
        strokeDasharray={`${fill} ${c}`} strokeLinecap="round"
        transform="rotate(-90 28 28)" style={{ transition: "stroke-dasharray 1s linear, stroke 0.3s" }} />
      <text x={28} y={33} textAnchor="middle" fontSize={14} fontWeight={700} fill={col}>{seconds}</text>
    </svg>
  );
}

// ── Option button ─────────────────────────────────────────────
function OptionBtn({ label, selected, correct, revealed, onClick }) {
  let bg = "#0f172a", border = "rgba(255,255,255,0.08)", color = "#cbd5e1";
  if (revealed) {
    if (correct) { bg = "#14532d22"; border = "#22c55e"; color = "#4ade80"; }
    else if (selected && !correct) { bg = "#7f1d1d22"; border = "#ef4444"; color = "#f87171"; }
  } else if (selected) {
    bg = "#1e3a5f"; border = "#3b82f6"; color = "#93c5fd";
  }
  return (
    <button onClick={onClick} disabled={revealed} style={{
      width: "100%", textAlign: "left", padding: "13px 16px",
      background: bg, border: `1px solid ${border}`,
      borderRadius: 10, color, fontSize: 14, cursor: revealed ? "default" : "pointer",
      marginBottom: 8, transition: "all 0.2s", lineHeight: 1.5,
      display: "flex", alignItems: "flex-start", gap: 10,
    }}>
      <span style={{
        width: 24, height: 24, borderRadius: 6, background: selected || (revealed && correct) ? border : "transparent",
        border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, flexShrink: 0, color,
      }}>
        {label[0]}
      </span>
      <span>{label.slice(3)}</span>
      {revealed && correct && <span style={{ marginLeft: "auto", fontSize: 16 }}>✓</span>}
      {revealed && selected && !correct && <span style={{ marginLeft: "auto", fontSize: 16 }}>✗</span>}
    </button>
  );
}

// ══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function SkillTest({
  applicantName, jobTitle, skills, atsScore,
  groqKey, onComplete, onClose,
}) {
  const [phase, setPhase] = useState("intro"); // intro|loading|test|evaluating|result
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [qStartTime, setQStartTime] = useState(Date.now());
  const timerRef = useRef(null);

  // ── Timer ────────────────────────────────────────────────────
  const clearTimer = () => { if (timerRef.current) clearInterval(timerRef.current); };

  const startTimer = useCallback(() => {
    clearTimer();
    setTimeLeft(TIME_PER_QUESTION);
    setQStartTime(Date.now());
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearTimer();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, []);

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeLeft === 0 && phase === "test" && !revealed) {
      handleSubmit(true);
    }
  }, [timeLeft, phase, revealed]);

  useEffect(() => () => clearTimer(), []);

  // ── Start test ───────────────────────────────────────────────
  const startTest = async () => {
    setPhase("loading");
    setError("");
    try {
      const qs = await generateQuestions(jobTitle, skills, groqKey);
      setQuestions(qs);
      setCurrentQ(0);
      setAnswers([]);
      setSelected(null);
      setRevealed(false);
      setPhase("test");
      startTimer();
    } catch (e) {
      setError(e.message);
      setPhase("intro");
    }
  };

  // ── Submit answer ─────────────────────────────────────────────
  const handleSubmit = (timedOut = false) => {
    clearTimer();
    const q = questions[currentQ];
    const timeSpent = Math.round((Date.now() - qStartTime) / 1000);
    const chosenOption = timedOut ? null : selected;
    const isCorrect = chosenOption
      ? chosenOption.startsWith(q.correct + ")")
      : false;

    setRevealed(true);
    const newAnswer = { selected: chosenOption, isCorrect, timedOut, timeSpent };

    setTimeout(() => {
      const newAnswers = [...answers, newAnswer];
      setAnswers(newAnswers);

      if (currentQ + 1 < questions.length) {
        setCurrentQ(i => i + 1);
        setSelected(null);
        setRevealed(false);
        startTimer();
      } else {
        // All done — evaluate
        setPhase("evaluating");
        evaluateResult(newAnswers, questions, jobTitle, atsScore, groqKey)
          .then(r => { setResult(r); setPhase("result"); })
          .catch(() => {
            const correct = newAnswers.filter(a => a.isCorrect).length;
            const pct = Math.round((correct / questions.length) * 100);
            setResult({
              correct, total: questions.length, pct,
              analysis: {
                verdict: pct >= 70 ? "Verified" : pct >= 50 ? "Partial" : "Flagged",
                confidence: "Medium",
                hire_signal: pct >= 70 ? "Yes" : "Maybe",
                summary: `Scored ${pct}% on skill verification.`,
                red_flags: [], strengths: [],
                interview_tip: "Ask about their most recent project.",
              },
            });
            setPhase("result");
          });
      }
    }, 1600);
  };

  // ── Verdict colors ────────────────────────────────────────────
  const verdictStyle = {
    Verified: { color: "#22c55e", bg: "#14532d22", border: "#166534" },
    Partial:  { color: "#f59e0b", bg: "#78350f22", border: "#92400e" },
    Flagged:  { color: "#ef4444", bg: "#7f1d1d22", border: "#991b1b" },
  };
  const signalStyle = {
    "Strong Yes": "#22c55e", "Yes": "#4ade80", "Maybe": "#f59e0b", "No": "#ef4444",
  };

  const q = questions[currentQ];
  const progress = ((currentQ) / TOTAL_QUESTIONS) * 100;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: "#0a0e1a", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20, width: "100%", maxWidth: 620,
        maxHeight: "95vh", overflow: "hidden", display: "flex",
        flexDirection: "column", boxShadow: "0 40px 100px rgba(0,0,0,0.7)",
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "linear-gradient(135deg,#0f0524,#0a0e1a)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 11, color: "#818cf8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>
              🛡️ Skill Verification Test
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>{jobTitle}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              {applicantName} · ATS Score: <span style={{ color: "#818cf8" }}>{atsScore}/100</span>
            </div>
          </div>
          {phase !== "test" && (
            <button onClick={onClose} style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              color: "#94a3b8", width: 32, height: 32, borderRadius: "50%",
              fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}>×</button>
          )}
        </div>

        {/* ── Progress bar (test phase) ── */}
        {phase === "test" && (
          <div style={{ height: 3, background: "#1e293b" }}>
            <div style={{
              height: "100%", background: "linear-gradient(90deg,#4f46e5,#818cf8)",
              width: `${progress}%`, transition: "width 0.4s ease",
            }} />
          </div>
        )}

        {/* ── Content ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

          {/* INTRO */}
          {phase === "intro" && (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{
                width: 72, height: 72, borderRadius: 20,
                background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 32, margin: "0 auto 20px",
                boxShadow: "0 8px 32px rgba(79,70,229,0.3)",
              }}>🛡️</div>
              <h2 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 800, color: "#f1f5f9" }}>
                Skill Verification Required
              </h2>
              <p style={{ margin: "0 0 6px", fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>
                Your ATS score qualifies you for this role. To confirm your skills are genuine,
                please complete this <strong style={{ color: "#f1f5f9" }}>5-question skill test</strong>.
              </p>
              <p style={{ margin: "0 0 24px", fontSize: 13, color: "#64748b" }}>
                HR will see your result alongside your ATS score.
              </p>

              {/* Rules */}
              <div style={{
                background: "#0f172a", border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 12, padding: "16px 20px", marginBottom: 24, textAlign: "left",
              }}>
                <div style={{ fontSize: 12, color: "#818cf8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
                  Test Rules
                </div>
                {[
                  [`⏱️`, `${TIME_PER_QUESTION} seconds per question — auto-submits when time runs out`],
                  [`🎯`, `${TOTAL_QUESTIONS} questions based on: ${skills.slice(0, 3).join(", ")}`],
                  [`🔒`, `Cannot pause or go back to previous questions`],
                  [`📊`, `Result visible to HR — be honest, it helps you too`],
                ].map(([icon, text]) => (
                  <div key={text} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 13, color: "#94a3b8" }}>
                    <span style={{ flexShrink: 0 }}>{icon}</span><span>{text}</span>
                  </div>
                ))}
              </div>

              {error && (
                <div style={{ background: "#7f1d1d22", border: "1px solid #7f1d1d", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#f87171", fontSize: 13 }}>
                  ⚠️ {error}
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={onClose} style={{
                  flex: 1, padding: "12px", borderRadius: 10, background: "transparent",
                  border: "1px solid rgba(255,255,255,0.08)", color: "#64748b", fontSize: 14, cursor: "pointer",
                }}>
                  Skip for now
                </button>
                <button onClick={startTest} style={{
                  flex: 2, padding: "12px", borderRadius: 10,
                  background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
                  border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(79,70,229,0.4)",
                }}>
                  Start Test — {TOTAL_QUESTIONS} Questions →
                </button>
              </div>
            </div>
          )}

          {/* LOADING */}
          {phase === "loading" && (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <div style={{ position: "relative", width: 64, height: 64, margin: "0 auto 20px" }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid #1e293b", borderTopColor: "#4f46e5", animation: "spn 0.9s linear infinite" }} />
                <div style={{ position: "absolute", inset: 8, borderRadius: "50%", border: "3px solid #1e293b", borderTopColor: "#7c3aed", animation: "spn 1.4s linear infinite reverse" }} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", margin: "0 0 6px" }}>
                Generating questions with AI…
              </p>
              <p style={{ fontSize: 13, color: "#475569" }}>
                Groq AI is creating questions tailored to {skills.slice(0, 2).join(" & ")}
              </p>
            </div>
          )}

          {/* TEST */}
          {phase === "test" && q && (
            <div>
              {/* Q header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, background: "#1e293b", color: "#818cf8", padding: "3px 10px", borderRadius: 999, fontWeight: 600 }}>
                      Q{currentQ + 1} of {questions.length}
                    </span>
                    <span style={{ fontSize: 11, background: "#1e293b", color: "#94a3b8", padding: "3px 10px", borderRadius: 999 }}>
                      {q.skill}
                    </span>
                    <span style={{ fontSize: 11, background: q.difficulty === "hard" ? "#7f1d1d22" : q.difficulty === "medium" ? "#78350f22" : "#14532d22", color: q.difficulty === "hard" ? "#f87171" : q.difficulty === "medium" ? "#fbbf24" : "#4ade80", padding: "3px 10px", borderRadius: 999 }}>
                      {q.difficulty}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#f1f5f9", lineHeight: 1.6 }}>
                    {q.question}
                  </p>
                </div>
                <div style={{ flexShrink: 0, marginLeft: 16 }}>
                  <TimerRing seconds={timeLeft} total={TIME_PER_QUESTION} />
                </div>
              </div>

              {/* Options */}
              <div style={{ marginBottom: 16 }}>
                {q.options.map((opt) => (
                  <OptionBtn
                    key={opt}
                    label={opt}
                    selected={selected === opt}
                    correct={opt.startsWith(q.correct + ")")}
                    revealed={revealed}
                    onClick={() => !revealed && setSelected(opt)}
                  />
                ))}
              </div>

              {/* Explanation after reveal */}
              {revealed && q.explanation && (
                <div style={{
                  background: "#0f172a", border: "1px solid rgba(99,102,241,0.3)",
                  borderRadius: 10, padding: "12px 14px", marginBottom: 16,
                  borderLeft: "3px solid #4f46e5",
                }}>
                  <span style={{ fontSize: 12, color: "#818cf8", fontWeight: 700 }}>💡 Explanation: </span>
                  <span style={{ fontSize: 13, color: "#94a3b8" }}>{q.explanation}</span>
                </div>
              )}

              {/* Submit button */}
              {!revealed && (
                <button onClick={() => handleSubmit(false)} disabled={!selected} style={{
                  width: "100%", padding: "13px", borderRadius: 10,
                  background: selected ? "linear-gradient(135deg,#4f46e5,#7c3aed)" : "#1e293b",
                  border: "none", color: selected ? "#fff" : "#475569",
                  fontSize: 14, fontWeight: 700,
                  cursor: selected ? "pointer" : "not-allowed",
                  transition: "all 0.2s",
                }}>
                  {selected ? "Confirm Answer →" : "Select an answer"}
                </button>
              )}
              {revealed && (
                <div style={{ textAlign: "center", color: "#64748b", fontSize: 13, padding: "8px 0" }}>
                  {currentQ + 1 < questions.length ? "Loading next question…" : "Calculating your result…"}
                </div>
              )}
            </div>
          )}

          {/* EVALUATING */}
          {phase === "evaluating" && (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", margin: "0 0 6px" }}>
                AI is evaluating your performance…
              </p>
              <p style={{ fontSize: 13, color: "#475569" }}>Generating HR report</p>
            </div>
          )}

          {/* RESULT */}
          {phase === "result" && result && (() => {
            const vs = verdictStyle[result.analysis.verdict] || verdictStyle.Partial;
            return (
              <div>
                {/* Score ring */}
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                  {(() => {
                    const col = result.pct >= 70 ? "#22c55e" : result.pct >= 50 ? "#f59e0b" : "#ef4444";
                    const r = 52, c2 = 2 * Math.PI * r;
                    return (
                      <svg width={130} height={130} viewBox="0 0 130 130" style={{ margin: "0 auto", display: "block" }}>
                        <circle cx={65} cy={65} r={r} fill="none" stroke="#1e293b" strokeWidth={8} />
                        <circle cx={65} cy={65} r={r} fill="none" stroke={col} strokeWidth={8}
                          strokeDasharray={`${(result.pct / 100) * c2} ${c2}`}
                          strokeLinecap="round" transform="rotate(-90 65 65)" />
                        <text x={65} y={58} textAnchor="middle" fontSize={26} fontWeight={800} fill={col}>{result.pct}%</text>
                        <text x={65} y={74} textAnchor="middle" fontSize={11} fill="#64748b">Skill Score</text>
                        <text x={65} y={88} textAnchor="middle" fontSize={10} fill="#475569">{result.correct}/{result.total} correct</text>
                      </svg>
                    );
                  })()}

                  {/* Verdict badge */}
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: vs.bg, border: `1px solid ${vs.border}`, borderRadius: 999, padding: "6px 20px", marginTop: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: vs.color }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: vs.color }}>
                      {result.analysis.verdict === "Verified" ? "✅ Skill Verified" : result.analysis.verdict === "Partial" ? "⚠️ Partially Verified" : "🚩 Verification Failed"}
                    </span>
                  </div>
                </div>

                {/* HR Summary */}
                <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "16px", marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: "#818cf8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>HR Report</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                    {[
                      ["ATS Score", `${atsScore}/100`],
                      ["Skill Test", `${result.pct}%`],
                      ["Hire Signal", result.analysis.hire_signal],
                      ["Confidence", result.analysis.confidence],
                    ].map(([l, v]) => (
                      <div key={l} style={{ background: "#080d18", borderRadius: 8, padding: "10px 12px", border: "1px solid rgba(255,255,255,0.04)" }}>
                        <div style={{ fontSize: 11, color: "#475569", marginBottom: 3 }}>{l}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: l === "Hire Signal" ? (signalStyle[v] || "#f1f5f9") : "#f1f5f9" }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>{result.analysis.summary}</p>
                </div>

                {/* Strengths */}
                {result.analysis.strengths?.length > 0 && (
                  <div style={{ background: "#14532d22", border: "1px solid #166534", borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: "#4ade80", fontWeight: 700, marginBottom: 6 }}>✓ Strengths</div>
                    {result.analysis.strengths.map((s, i) => (
                      <div key={i} style={{ fontSize: 13, color: "#86efac", marginBottom: 3 }}>• {s}</div>
                    ))}
                  </div>
                )}

                {/* Red flags */}
                {result.analysis.red_flags?.length > 0 && (
                  <div style={{ background: "#7f1d1d22", border: "1px solid #991b1b", borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: "#f87171", fontWeight: 700, marginBottom: 6 }}>🚩 Red Flags for HR</div>
                    {result.analysis.red_flags.map((f, i) => (
                      <div key={i} style={{ fontSize: 13, color: "#fca5a5", marginBottom: 3 }}>• {f}</div>
                    ))}
                  </div>
                )}

                {/* Interview tip */}
                {result.analysis.interview_tip && (
                  <div style={{ background: "#1e1b4b22", border: "1px solid #312e81", borderRadius: 10, padding: "12px 14px", marginBottom: 20 }}>
                    <div style={{ fontSize: 11, color: "#818cf8", fontWeight: 700, marginBottom: 4 }}>💡 Suggested Interview Question</div>
                    <div style={{ fontSize: 13, color: "#c7d2fe" }}>"{result.analysis.interview_tip}"</div>
                  </div>
                )}

                <button onClick={() => onComplete({ ...result, jobTitle, applicantName, atsScore })} style={{
                  width: "100%", padding: "13px", borderRadius: 10,
                  background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
                  border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(79,70,229,0.35)",
                }}>
                  Submit Result to HR →
                </button>
              </div>
            );
          })()}
        </div>
      </div>
      <style>{`@keyframes spn { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}