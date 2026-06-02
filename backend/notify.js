// ═══════════════════════════════════════════════════════════════
//  TalentAI — Automated Email + WhatsApp Notification Module
//  Drop this file into your backend (same folder as server.js)
//  then add:  const notify = require('./notify');
//  and call:  await notify.onNewApplication(app, job);
//             await notify.onStatusChange(app, job, newStatus);
// ═══════════════════════════════════════════════════════════════

const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

// ── Config (reads from your .env) ────────────────────────────
const CFG = {
  RESEND_API_KEY:   process.env.RESEND_API_KEY,
  HR_ALERT_EMAIL:   process.env.HR_ALERT_EMAIL,
  EMAIL_FROM:       process.env.EMAIL_FROM || 'TalentAI <noreply@yourdomain.com>',
  CALLMEBOT_KEY:    process.env.CALLMEBOT_KEY,
  HR_WHATSAPP:      process.env.HR_WHATSAPP_NUMBER, // e.g. 919876543210 (no + or spaces)
};

// ─────────────────────────────────────────────────────────────
//  SEND EMAIL via Resend
// ─────────────────────────────────────────────────────────────
async function sendEmail({ to, subject, html }) {
  if (!CFG.RESEND_API_KEY) { console.warn('[notify] RESEND_API_KEY not set — skipping email'); return false; }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CFG.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: CFG.EMAIL_FROM, to, subject, html }),
    });
    const d = await res.json();
    if (!res.ok) { console.error('[notify] Resend error:', d); return false; }
    console.log('[notify] Email sent to', to, '| id:', d.id);
    return true;
  } catch (e) { console.error('[notify] Email exception:', e.message); return false; }
}

// ─────────────────────────────────────────────────────────────
//  SEND WHATSAPP via CallMeBot
// ─────────────────────────────────────────────────────────────
async function sendWhatsApp(phone, message) {
  if (!CFG.CALLMEBOT_KEY) { console.warn('[notify] CALLMEBOT_KEY not set — skipping WhatsApp'); return false; }
  if (!phone) { console.warn('[notify] No phone number — skipping WhatsApp'); return false; }
  // Clean phone: remove +, spaces, dashes
  const cleanPhone = String(phone).replace(/[^0-9]/g, '');
  const encoded = encodeURIComponent(message);
  const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${encoded}&apikey=${CFG.CALLMEBOT_KEY}`;
  try {
    const res = await fetch(url);
    const text = await res.text();
    if (text.toLowerCase().includes('message queued') || res.ok) {
      console.log('[notify] WhatsApp sent to', cleanPhone);
      return true;
    }
    console.warn('[notify] WhatsApp response:', text);
    return false;
  } catch (e) { console.error('[notify] WhatsApp exception:', e.message); return false; }
}

// ─────────────────────────────────────────────────────────────
//  EMAIL TEMPLATES
// ─────────────────────────────────────────────────────────────
const templates = {

  // ── To HR: New application arrived ──
  hrNewApplication: (app, job) => ({
    subject: `🆕 New Application: ${app.name} → ${job.title}`,
    html: `
<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;border-radius:12px;overflow:hidden">
  <div style="background:#1e1b4b;padding:24px 28px">
    <h1 style="margin:0;color:#fff;font-size:20px">⚡ TalentAI — New Application</h1>
  </div>
  <div style="padding:28px">
    <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb">
      <tr style="background:#f3f4f6"><td colspan="2" style="padding:12px 16px;font-weight:700;font-size:15px;color:#111827">${app.name}</td></tr>
      <tr><td style="padding:10px 16px;color:#6b7280;width:140px;border-bottom:1px solid #f3f4f6">Job Applied</td><td style="padding:10px 16px;font-weight:600;border-bottom:1px solid #f3f4f6">${job.title} — ${job.department}</td></tr>
      <tr><td style="padding:10px 16px;color:#6b7280;border-bottom:1px solid #f3f4f6">Email</td><td style="padding:10px 16px;border-bottom:1px solid #f3f4f6">${app.email}</td></tr>
      <tr><td style="padding:10px 16px;color:#6b7280;border-bottom:1px solid #f3f4f6">Phone</td><td style="padding:10px 16px;border-bottom:1px solid #f3f4f6">${app.phone || '—'}</td></tr>
      <tr><td style="padding:10px 16px;color:#6b7280;border-bottom:1px solid #f3f4f6">AI Score</td><td style="padding:10px 16px;border-bottom:1px solid #f3f4f6"><span style="font-size:20px;font-weight:800;color:${app.ai_score>=70?'#10b981':app.ai_score>=45?'#f59e0b':'#ef4444'}">${app.ai_score ?? '—'}</span>/100</td></tr>
      <tr><td style="padding:10px 16px;color:#6b7280;border-bottom:1px solid #f3f4f6">AI Verdict</td><td style="padding:10px 16px;border-bottom:1px solid #f3f4f6">${app.ai_verdict || '—'}</td></tr>
      <tr><td style="padding:10px 16px;color:#6b7280">Recommendation</td><td style="padding:10px 16px"><strong style="color:${app.ai_recommendation==='Advance to Interview'?'#10b981':app.ai_recommendation==='Hold'?'#f59e0b':'#ef4444'}">${app.ai_recommendation || '—'}</strong></td></tr>
    </table>
    ${app.ai_summary ? `<div style="margin-top:16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px 16px;font-size:14px;color:#1e40af;line-height:1.6">${app.ai_summary}</div>` : ''}
    <div style="margin-top:20px;text-align:center">
      <a href="${process.env.ADMIN_URL || 'https://talentai-job-portal.onrender.com'}/admin" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">View in Admin Panel →</a>
    </div>
  </div>
  <div style="padding:14px 28px;background:#f3f4f6;font-size:12px;color:#9ca3af;text-align:center">TalentAI Automated Alert · ${new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</div>
</div>`,
  }),

  // ── To Candidate: Application received ──
  candidateReceived: (app, job) => ({
    subject: `✅ Application Received — ${job.title} at TalentAI`,
    html: `
<div style="font-family:system-ui,sans-serif;max-width:580px;margin:0 auto;background:#f9fafb;border-radius:12px;overflow:hidden">
  <div style="background:#1e1b4b;padding:24px 28px">
    <h1 style="margin:0;color:#fff;font-size:20px">⚡ TalentAI</h1>
    <p style="margin:6px 0 0;color:#a5b4fc;font-size:14px">Application Confirmation</p>
  </div>
  <div style="padding:28px">
    <p style="font-size:16px;color:#111827">Hi <strong>${app.name}</strong>,</p>
    <p style="color:#374151;line-height:1.6">We've received your application for <strong>${job.title}</strong> (${job.department}). Our AI has already screened your resume.</p>
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:18px;margin:20px 0;text-align:center">
      <div style="font-size:42px;font-weight:800;color:${app.ai_score>=70?'#10b981':app.ai_score>=45?'#f59e0b':'#ef4444'}">${app.ai_score ?? '—'}</div>
      <div style="font-size:13px;color:#6b7280;margin-top:4px">Your ATS Score / 100</div>
      <div style="margin-top:10px;display:inline-block;background:${app.ai_verdict==='Strong Match'?'#d1fae5':app.ai_verdict==='Good Match'?'#dbeafe':'#fef9c3'};color:${app.ai_verdict==='Strong Match'?'#065f46':app.ai_verdict==='Good Match'?'#1e40af':'#854d0e'};padding:4px 14px;border-radius:999px;font-size:13px;font-weight:700">${app.ai_verdict || 'Screened'}</div>
    </div>
    <p style="color:#374151;line-height:1.6">Our team will review your application and get back to you shortly. You can expect to hear from us within <strong>3–5 business days</strong>.</p>
    <p style="color:#6b7280;font-size:13px">Best regards,<br>The TalentAI Hiring Team</p>
  </div>
  <div style="padding:14px 28px;background:#f3f4f6;font-size:12px;color:#9ca3af;text-align:center">This is an automated message from TalentAI</div>
</div>`,
  }),

  // ── To Candidate: Shortlisted ──
  candidateShortlisted: (app, job) => ({
    subject: `🎉 Congratulations! You're shortlisted — ${job.title}`,
    html: `
<div style="font-family:system-ui,sans-serif;max-width:580px;margin:0 auto;background:#f9fafb;border-radius:12px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#10b981,#059669);padding:24px 28px">
    <h1 style="margin:0;color:#fff;font-size:20px">🎉 Great News!</h1>
    <p style="margin:6px 0 0;color:#d1fae5;font-size:14px">You've been shortlisted</p>
  </div>
  <div style="padding:28px">
    <p style="font-size:16px;color:#111827">Hi <strong>${app.name}</strong>,</p>
    <p style="color:#374151;line-height:1.6">We're thrilled to inform you that you've been <strong>shortlisted</strong> for the <strong>${job.title}</strong> position at TalentAI!</p>
    <div style="background:#d1fae5;border:1px solid #6ee7b7;border-radius:10px;padding:16px;margin:20px 0;text-align:center">
      <p style="margin:0;font-size:15px;color:#065f46;font-weight:600">✅ Status: Shortlisted</p>
      <p style="margin:6px 0 0;font-size:13px;color:#047857">Role: ${job.title} — ${job.department || ''}</p>
    </div>
    <p style="color:#374151;line-height:1.6">Our hiring team will reach out soon to schedule the next steps. Please keep an eye on your email and phone.</p>
    <p style="color:#6b7280;font-size:13px">Best regards,<br>The TalentAI Hiring Team</p>
  </div>
  <div style="padding:14px 28px;background:#f3f4f6;font-size:12px;color:#9ca3af;text-align:center">TalentAI · Automated Notification</div>
</div>`,
  }),

  // ── To Candidate: Rejected ──
  candidateRejected: (app, job) => ({
    subject: `Update on your application — ${job.title}`,
    html: `
<div style="font-family:system-ui,sans-serif;max-width:580px;margin:0 auto;background:#f9fafb;border-radius:12px;overflow:hidden">
  <div style="background:#1e1b4b;padding:24px 28px">
    <h1 style="margin:0;color:#fff;font-size:20px">⚡ TalentAI</h1>
  </div>
  <div style="padding:28px">
    <p style="font-size:16px;color:#111827">Hi <strong>${app.name}</strong>,</p>
    <p style="color:#374151;line-height:1.6">Thank you for applying for <strong>${job.title}</strong> at TalentAI and for the time you invested in your application.</p>
    <p style="color:#374151;line-height:1.6">After careful review, we've decided to move forward with other candidates whose experience more closely matches our current requirements.</p>
    <p style="color:#374151;line-height:1.6">We encourage you to apply for future openings and wish you all the best in your career journey.</p>
    <p style="color:#6b7280;font-size:13px;margin-top:24px">Warm regards,<br>The TalentAI Hiring Team</p>
  </div>
  <div style="padding:14px 28px;background:#f3f4f6;font-size:12px;color:#9ca3af;text-align:center">TalentAI · Automated Notification</div>
</div>`,
  }),

  // ── To Candidate: Hired ──
  candidateHired: (app, job) => ({
    subject: `🎊 Welcome to the team! — ${job.title} Offer`,
    html: `
<div style="font-family:system-ui,sans-serif;max-width:580px;margin:0 auto;background:#f9fafb;border-radius:12px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:24px 28px">
    <h1 style="margin:0;color:#fff;font-size:22px">🎊 Welcome to TalentAI!</h1>
    <p style="margin:6px 0 0;color:#ddd6fe;font-size:14px">You've been selected!</p>
  </div>
  <div style="padding:28px">
    <p style="font-size:16px;color:#111827">Hi <strong>${app.name}</strong>,</p>
    <p style="color:#374151;line-height:1.6">We are absolutely delighted to offer you the position of <strong>${job.title}</strong>! You stood out among all our candidates and we can't wait to have you on board.</p>
    <div style="background:#ede9fe;border:1px solid #ddd6fe;border-radius:10px;padding:16px;margin:20px 0;text-align:center">
      <p style="margin:0;font-size:16px;color:#4c1d95;font-weight:700">🎉 Status: HIRED</p>
      <p style="margin:6px 0 0;font-size:13px;color:#6d28d9">Role: ${job.title} — ${job.department || ''}</p>
    </div>
    <p style="color:#374151;line-height:1.6">HR will be in touch very soon with your offer letter and onboarding details. Please confirm your availability at your earliest convenience.</p>
    <p style="color:#6b7280;font-size:13px;margin-top:24px">Congratulations and welcome!<br>The TalentAI Hiring Team</p>
  </div>
  <div style="padding:14px 28px;background:#f3f4f6;font-size:12px;color:#9ca3af;text-align:center">TalentAI · Automated Notification</div>
</div>`,
  }),
};

// ─────────────────────────────────────────────────────────────
//  WHATSAPP MESSAGE BUILDERS
// ─────────────────────────────────────────────────────────────
const waMessages = {
  hrNewApplication: (app, job) =>
    `🆕 *New TalentAI Application*\n\n` +
    `👤 *${app.name}*\n` +
    `💼 ${job.title} — ${job.department || ''}\n` +
    `📧 ${app.email}\n` +
    `📱 ${app.phone || '—'}\n` +
    `🤖 AI Score: *${app.ai_score ?? '—'}/100*\n` +
    `✅ ${app.ai_recommendation || '—'}\n\n` +
    `Check admin panel for full details.`,

  candidateReceived: (app, job) =>
    `Hi ${app.name}! 👋\n\n` +
    `Your application for *${job.title}* at TalentAI has been received.\n\n` +
    `🤖 Your AI Score: *${app.ai_score ?? '—'}/100*\n` +
    `📋 Verdict: ${app.ai_verdict || 'Screened'}\n\n` +
    `We'll be in touch within 3–5 business days. Good luck! ⚡`,

  candidateShortlisted: (app, job) =>
    `🎉 Congratulations ${app.name}!\n\n` +
    `You've been *shortlisted* for *${job.title}* at TalentAI!\n\n` +
    `Our team will contact you soon to schedule the next steps.\n\n` +
    `Keep an eye on your email and phone. Best of luck! 🚀`,

  candidateRejected: (app, job) =>
    `Hi ${app.name},\n\n` +
    `Thank you for applying for *${job.title}* at TalentAI.\n\n` +
    `After careful review, we've decided to move forward with other candidates at this time.\n\n` +
    `We wish you the very best in your search! 🙏`,

  candidateHired: (app, job) =>
    `🎊 *Welcome to TalentAI, ${app.name}!*\n\n` +
    `You've been selected for *${job.title}*!\n\n` +
    `HR will contact you shortly with your offer letter and onboarding details.\n\n` +
    `Congratulations and welcome to the team! 🚀⚡`,
};

// ─────────────────────────────────────────────────────────────
//  PUBLIC API — call these from your server.js
// ─────────────────────────────────────────────────────────────

/**
 * Call when a NEW application is submitted.
 * Sends: HR alert email + HR WhatsApp + candidate confirmation email + candidate WhatsApp
 */
async function onNewApplication(app, job) {
  console.log(`[notify] New application: ${app.name} → ${job.title}`);
  const results = await Promise.allSettled([
    // HR notifications
    sendEmail({ to: CFG.HR_ALERT_EMAIL, ...templates.hrNewApplication(app, job) }),
    sendWhatsApp(CFG.HR_WHATSAPP, waMessages.hrNewApplication(app, job)),
    // Candidate confirmation
    sendEmail({ to: app.email, ...templates.candidateReceived(app, job) }),
    sendWhatsApp(app.phone, waMessages.candidateReceived(app, job)),
  ]);
  logResults(results, ['HR email', 'HR WhatsApp', 'Candidate email', 'Candidate WhatsApp']);
}

/**
 * Call when status is changed via admin panel.
 * Sends candidate-specific email + WhatsApp based on new status.
 */
async function onStatusChange(app, job, newStatus) {
  console.log(`[notify] Status change: ${app.name} → ${newStatus}`);
  let tpl = null, waMsg = null;

  if (newStatus === 'shortlisted') {
    tpl   = templates.candidateShortlisted(app, job);
    waMsg = waMessages.candidateShortlisted(app, job);
  } else if (newStatus === 'rejected') {
    tpl   = templates.candidateRejected(app, job);
    waMsg = waMessages.candidateRejected(app, job);
  } else if (newStatus === 'hired') {
    tpl   = templates.candidateHired(app, job);
    waMsg = waMessages.candidateHired(app, job);
  } else {
    console.log(`[notify] No notification configured for status: ${newStatus}`);
    return;
  }

  const results = await Promise.allSettled([
    sendEmail({ to: app.email, ...tpl }),
    sendWhatsApp(app.phone, waMsg),
  ]);
  logResults(results, ['Candidate email', 'Candidate WhatsApp']);
}

/**
 * Send a manual one-off email to a candidate
 */
async function sendManualEmail(app, job, customSubject, customMessage) {
  return sendEmail({
    to: app.email,
    subject: customSubject || `Update on your ${job.title} application`,
    html: `
<div style="font-family:system-ui,sans-serif;max-width:580px;margin:0 auto;padding:28px">
  <p>Hi <strong>${app.name}</strong>,</p>
  <p style="line-height:1.6;color:#374151">${customMessage}</p>
  <p style="color:#6b7280;margin-top:24px;font-size:13px">Regards,<br>TalentAI Hiring Team</p>
</div>`,
  });
}

/**
 * Send a manual WhatsApp to a candidate
 */
async function sendManualWhatsApp(app, message) {
  return sendWhatsApp(app.phone, message);
}

function logResults(results, labels) {
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') console.log(`[notify] ✅ ${labels[i]}: ${r.value ? 'sent' : 'failed'}`);
    else console.error(`[notify] ❌ ${labels[i]}:`, r.reason?.message);
  });
}

module.exports = { onNewApplication, onStatusChange, sendManualEmail, sendManualWhatsApp, sendEmail, sendWhatsApp };