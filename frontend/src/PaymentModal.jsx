// PaymentModal.jsx — drop into frontend/src/
//
// Usage in AdminPanel.jsx:
//   import PaymentModal from "./PaymentModal";
//
//   Add state:
//   const [showPayment, setShowPayment] = useState(false);
//   const [isPremium, setIsPremium] = useState(false);
//
//   Replace every openRazorpay(p) call with:
//   setShowPayment(true);
//
//   Add at bottom of AdminPanel return:
//   {showPayment && (
//     <PaymentModal
//       onClose={() => setShowPayment(false)}
//       onSuccess={() => { setIsPremium(true); setShowPayment(false); show("🎉 HR Pro activated!", "success"); }}
//       userEmail={user.email || ""}
//       userName={user.name || ""}
//     />
//   )}

import { useState, useEffect } from "react";

const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_xxxx";
const API = import.meta.env.VITE_API_URL || "https://talentai-job-portal.onrender.com";

const PLANS = [
  {
    id: "premium_monthly",
    name: "HR Pro Monthly",
    price: 2499,
    period: "month",
    badge: "MOST POPULAR",
    color: "#4f46e5",
    features: [
      "Unlimited job postings",
      "Full candidate contact info",
      "AI Interview Simulator",
      "Auto email & WhatsApp alerts",
      "Automation rules engine",
      "Bulk actions & CSV export",
      "Priority support",
    ],
  },
  {
    id: "premium_yearly",
    name: "HR Pro Yearly",
    price: 14999,
    period: "year",
    badge: "SAVE 50%",
    color: "#059669",
    features: [
      "Everything in Monthly",
      "Save ₹14,989 vs monthly",
      "Dedicated account manager",
      "Custom onboarding session",
      "Early access to new features",
    ],
  },
];

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PaymentModal({ onClose, onSuccess, userEmail = "", userName = "" }) {
  const [selected, setSelected] = useState("premium_monthly");
  const [step, setStep] = useState("plans"); // plans | processing | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [paymentId, setPaymentId] = useState("");

  const plan = PLANS.find(p => p.id === selected);

  useEffect(() => {
    loadRazorpayScript().then(ok => setScriptLoaded(ok));
  }, []);

 const startPayment = async () => {
  console.log("🔑 KEY:", RAZORPAY_KEY);
  console.log("🌐 API:", API);
  setStep("processing");
  try {
    const token = localStorage.getItem("talentai_token");
    console.log("🎫 TOKEN:", token ? "exists" : "MISSING!");
    
    const orderRes = await fetch(`${API}/payment/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ plan: selected }),
    });
    const orderData = await orderRes.json();
    console.log("📦 ORDER RESPONSE:", orderData); // ← THIS SHOWS THE PROBLEM
    if (!orderRes.ok) throw new Error(orderData.error || "Failed to create order");

      // Step 2 — open Razorpay popup
      const options = {
  key:      orderData.razorpay_key,
  amount:   orderData.amount,
  order_id: orderData.order_id,   // ← THIS is the critical missing piece
  currency: "INR",
  name: "TalentAI",
  description: plan.name,
  prefill: { name: userName, email: userEmail },
  theme: { color: "#4f46e5" },
  modal: { ondismiss: () => setStep("plans") },

        handler: async (response) => {
          // Step 3 — verify on backend
          setStep("processing");
          try {
            const verifyRes = await fetch(`${API}/payment/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                payment_id:           orderData.payment_id,
                razorpay_payment_id:  response.razorpay_payment_id,
                razorpay_order_id:    response.razorpay_order_id,
                razorpay_signature:   response.razorpay_signature,
                plan: selected,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || "Verification failed");
            setPaymentId(response.razorpay_payment_id);
            setStep("success");
          } catch (e) {
            setErrorMsg(e.message);
            setStep("error");
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (r) => {
        setErrorMsg(r.error?.description || "Payment was declined");
        setStep("error");
      });
      rzp.open();

    } catch (e) {
      setErrorMsg(e.message);
      setStep("error");
    }
  };

  // ── shared close button ──────────────────────────────────────
  const CloseBtn = () => (
    <button onClick={onClose} style={{
      position: "absolute", top: 16, right: 16,
      background: "rgba(255,255,255,0.15)", border: "none", color: "#fff",
      width: 30, height: 30, borderRadius: "50%", fontSize: 18,
      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    }}>×</button>
  );

  return (
    <>
      <style>{`
        @keyframes rzpSpin { to { transform: rotate(360deg); } }
        @keyframes rzpPop  { from { opacity:0; transform:scale(0.94) translateY(10px); } to { opacity:1; transform:none; } }
      `}</style>

      <div style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
        zIndex: 3000, display: "flex", alignItems: "center",
        justifyContent: "center", padding: 16,
      }}>
        <div style={{
          background: "#fff", borderRadius: 20, width: "100%",
          maxWidth: step === "plans" ? 680 : 460,
          maxHeight: "92vh", overflowY: "auto",
          boxShadow: "0 30px 90px rgba(0,0,0,0.3)",
          animation: "rzpPop 0.25s ease",
          position: "relative",
        }}>

          {/* ══ PLAN SELECTION ══════════════════════════════════ */}
          {step === "plans" && (
            <>
              {/* Purple header */}
              <div style={{
                background: "linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)",
                borderRadius: "20px 20px 0 0", padding: "28px 28px 22px",
                position: "relative",
              }}>
                <CloseBtn />
                <div style={{ fontSize: 12, color: "#c7d2fe", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                  ⚡ TalentAI
                </div>
                <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800, color: "#fff" }}>
                  Upgrade to HR Pro
                </h2>
                <p style={{ margin: 0, color: "#c7d2fe", fontSize: 14 }}>
                  AI screening · Auto alerts · Unlimited jobs · Instant activation
                </p>
              </div>

              <div style={{ padding: "24px 28px 28px" }}>
                {/* Plan cards */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 22 }}>
                  {PLANS.map(p => (
                    <div key={p.id} onClick={() => setSelected(p.id)} style={{
                      border: `2px solid ${selected === p.id ? p.color : "#e5e7eb"}`,
                      borderRadius: 14, padding: "18px 18px", cursor: "pointer",
                      background: selected === p.id ? `${p.color}0a` : "#fafafa",
                      position: "relative", transition: "all 0.15s",
                      boxShadow: selected === p.id ? `0 0 0 3px ${p.color}22` : "none",
                    }}>
                      {p.badge && (
                        <div style={{
                          position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)",
                          background: p.color, color: "#fff", fontSize: 10, fontWeight: 800,
                          padding: "3px 12px", borderRadius: 999, whiteSpace: "nowrap",
                        }}>{p.badge}</div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{p.name}</div>
                        <div style={{
                          width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                          border: `2px solid ${selected === p.id ? p.color : "#d1d5db"}`,
                          background: selected === p.id ? p.color : "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {selected === p.id && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff" }} />}
                        </div>
                      </div>
                      <div style={{ fontSize: 26, fontWeight: 800, color: p.color, marginBottom: 10 }}>
                        ₹{p.price.toLocaleString("en-IN")}
                        <span style={{ fontSize: 12, fontWeight: 400, color: "#9ca3af" }}>/{p.period}</span>
                      </div>
                      {p.features.map((f, i) => (
                        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 5, alignItems: "flex-start", fontSize: 12, color: "#374151" }}>
                          <span style={{ color: p.color, flexShrink: 0, marginTop: 1 }}>✓</span>{f}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* What's unlocked */}
                <div style={{
                  background: "#f9fafb", borderRadius: 12, padding: "14px 18px",
                  marginBottom: 20, border: "1px solid #e5e7eb",
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>
                    🎯 Unlocked immediately after payment:
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 16px" }}>
                    {[
                      "Full applicant contact info",
                      "AI Interview Simulator",
                      "Auto email on shortlist",
                      "WhatsApp notifications",
                      "Automation rules engine",
                      "Bulk status updates",
                      "CSV export",
                      "Unlimited job postings",
                    ].map((f, i) => (
                      <div key={i} style={{ display: "flex", gap: 5, alignItems: "center", fontSize: 12, color: "#374151" }}>
                        <span style={{ color: "#10b981", flexShrink: 0 }}>✓</span>{f}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pay button */}
                <button onClick={startPayment} disabled={!scriptLoaded} style={{
                  width: "100%", padding: "15px", border: "none", borderRadius: 12,
                  background: !scriptLoaded
                    ? "#9ca3af"
                    : `linear-gradient(135deg,${plan.color},#7c3aed)`,
                  color: "#fff", fontSize: 16, fontWeight: 800,
                  cursor: scriptLoaded ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  boxShadow: scriptLoaded ? `0 4px 24px ${plan.color}55` : "none",
                  marginBottom: 14, transition: "transform 0.1s",
                }}>
                  {!scriptLoaded
                    ? "⏳ Loading payment gateway…"
                    : `🔒 Pay ₹${plan.price.toLocaleString("en-IN")} — Activate HR Pro`}
                </button>

                {/* Trust row */}
                <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 6 }}>
                  {["🔒 SSL Encrypted", "💳 Razorpay Secure", "🔄 Cancel Anytime", "⚡ Instant Access"].map((b, i) => (
                    <span key={i} style={{ fontSize: 11, color: "#9ca3af" }}>{b}</span>
                  ))}
                </div>
                <div style={{ textAlign: "center", fontSize: 11, color: "#d1d5db" }}>
                  UPI · Debit/Credit Cards · Net Banking · EMI · Wallets
                </div>
              </div>
            </>
          )}

          {/* ══ PROCESSING ══════════════════════════════════════ */}
          {step === "processing" && (
            <div style={{ padding: "64px 40px", textAlign: "center" }}>
              <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto 24px" }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid #e5e7eb", borderTopColor: "#4f46e5", animation: "rzpSpin 0.9s linear infinite" }} />
                <div style={{ position: "absolute", inset: 8, borderRadius: "50%", border: "3px solid #e5e7eb", borderTopColor: "#7c3aed", animation: "rzpSpin 1.4s linear infinite reverse" }} />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>💳</div>
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "#111827" }}>Processing Payment…</h3>
              <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>Please do not close this window</p>
            </div>
          )}

          {/* ══ SUCCESS ═════════════════════════════════════════ */}
          {step === "success" && (
            <div style={{ padding: "52px 36px", textAlign: "center" }}>
              <div style={{
                width: 84, height: 84, borderRadius: "50%",
                background: "linear-gradient(135deg,#10b981,#059669)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 22px", fontSize: 38, color: "#fff",
                boxShadow: "0 8px 32px rgba(16,185,129,0.45)",
              }}>✓</div>

              <h2 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, color: "#111827" }}>
                Payment Successful! 🎉
              </h2>
              <p style={{ margin: "0 0 20px", color: "#6b7280", fontSize: 15 }}>
                HR Pro is now active on your account
              </p>

              {paymentId && (
                <div style={{
                  background: "#f0fdf4", border: "1px solid #bbf7d0",
                  borderRadius: 10, padding: "10px 16px", marginBottom: 20,
                  fontSize: 12, color: "#166534",
                }}>
                  Payment ID: <strong>{paymentId}</strong><br />
                  <span style={{ color: "#6b7280" }}>Keep this for your records</span>
                </div>
              )}

              <div style={{
                background: "#eff6ff", border: "1px solid #bfdbfe",
                borderRadius: 12, padding: "16px 20px", marginBottom: 24, textAlign: "left",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1e40af", marginBottom: 8 }}>✅ Now unlocked:</div>
                {["Full applicant contact info", "AI Interview Simulator", "Auto email & WhatsApp", "Automation rules", "Unlimited jobs & CSV export"].map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 7, marginBottom: 5, fontSize: 13, color: "#1e3a8a" }}>
                    <span style={{ color: "#3b82f6", flexShrink: 0 }}>→</span>{f}
                  </div>
                ))}
              </div>

              <button onClick={onSuccess} style={{
                width: "100%", padding: "13px", border: "none", borderRadius: 12,
                background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
                color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", marginBottom: 10,
              }}>
                Go to Dashboard →
              </button>
              <button onClick={onClose} style={{
                width: "100%", padding: "10px", border: "1px solid #e5e7eb",
                borderRadius: 10, background: "#fff", color: "#6b7280", fontSize: 14, cursor: "pointer",
              }}>
                Close
              </button>
            </div>
          )}

          {/* ══ ERROR ═══════════════════════════════════════════ */}
          {step === "error" && (
            <div style={{ padding: "52px 36px", textAlign: "center" }}>
              <div style={{
                width: 84, height: 84, borderRadius: "50%",
                background: "linear-gradient(135deg,#ef4444,#dc2626)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 22px", fontSize: 38, color: "#fff",
                boxShadow: "0 8px 32px rgba(239,68,68,0.35)",
              }}>✗</div>

              <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: "#111827" }}>Payment Failed</h2>
              <p style={{ margin: "0 0 16px", color: "#6b7280", fontSize: 14 }}>{errorMsg}</p>

              <div style={{
                background: "#fef2f2", border: "1px solid #fecaca",
                borderRadius: 10, padding: "14px 18px", marginBottom: 24, textAlign: "left",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#991b1b", marginBottom: 8 }}>Common fixes:</div>
                {[
                  "Check your card or UPI balance",
                  "Try a different payment method",
                  "Disable VPN if active",
                  "Contact your bank if the issue persists",
                ].map((f, i) => (
                  <div key={i} style={{ fontSize: 13, color: "#b91c1c", marginBottom: 4 }}>• {f}</div>
                ))}
              </div>

              <button onClick={() => setStep("plans")} style={{
                width: "100%", padding: "12px", border: "none", borderRadius: 10,
                background: "#4f46e5", color: "#fff", fontSize: 14, fontWeight: 700,
                cursor: "pointer", marginBottom: 10,
              }}>
                Try Again
              </button>
              <button onClick={onClose} style={{
                width: "100%", padding: "10px", border: "1px solid #e5e7eb",
                borderRadius: 10, background: "#fff", color: "#6b7280", fontSize: 14, cursor: "pointer",
              }}>
                Cancel
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}