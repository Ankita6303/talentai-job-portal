require('dotenv').config();
const express  = require('express');
const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const cors     = require('cors');
const multer   = require('multer');
const pdfParse = require('pdf-parse');
const notify = require("./notify");
const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const app = express();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.originalname.match(/\.(pdf|txt|md)$/i)) cb(null, true);
    else cb(new Error('Only PDF, TXT, or MD files allowed'), false);
  },
});

app.use(cors({
  origin: function(origin, cb) {
    cb(null, true); // Allow all origins — restrict to your domain in production
  },
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── PostgreSQL ─────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
});

// ── DB Init ────────────────────────────────────────────────────
async function initDB() {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name          TEXT NOT NULL,
      role          TEXT DEFAULT 'student',
      plan          TEXT DEFAULT 'free',
      phone         TEXT,
      whatsapp      TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jobs (
      id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      title        TEXT NOT NULL,
      department   TEXT NOT NULL,
      location     TEXT,
      type         TEXT,
      salary_min   NUMERIC,
      salary_max   NUMERIC,
      description  TEXT NOT NULL,
      skills       JSONB DEFAULT '[]',
      requirements JSONB DEFAULT '[]',
      is_active    BOOLEAN DEFAULT true,
      created_by   UUID REFERENCES users(id),
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      updated_at   TIMESTAMPTZ DEFAULT NOW()
    );`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS applications (
      id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      job_id                 UUID REFERENCES jobs(id),
      user_id                UUID REFERENCES users(id),
      name                   TEXT NOT NULL,
      email                  TEXT NOT NULL,
      phone                  TEXT,
      cover_letter           TEXT,
      resume_text            TEXT,
      ai_score               INTEGER,
      ai_verdict             TEXT,
      ai_summary             TEXT,
      ai_matched_skills      JSONB DEFAULT '[]',
      ai_missing_skills      JSONB DEFAULT '[]',
      ai_experience_years    NUMERIC,
      ai_strengths           JSONB DEFAULT '[]',
      ai_concerns            JSONB DEFAULT '[]',
      ai_recommendation      TEXT,
      ai_interview_questions JSONB DEFAULT '[]',
      ai_skills_gap          JSONB DEFAULT '[]',
      ai_keywords            JSONB DEFAULT '[]',
      ai_resume_tips         TEXT,
      status                 TEXT DEFAULT 'pending',
      recruiter_notes        TEXT,
      created_at             TIMESTAMPTZ DEFAULT NOW(),
      updated_at             TIMESTAMPTZ DEFAULT NOW()
    );`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS whatsapp_subscribers (
      id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      phone      TEXT NOT NULL,
      name       TEXT,
      user_id    UUID REFERENCES users(id),
      active     BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id    UUID REFERENCES users(id),
      plan       TEXT NOT NULL,
      amount     NUMERIC,
      currency   TEXT DEFAULT 'INR',
      status     TEXT DEFAULT 'pending',
      razorpay_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`);
  console.log('✅ Tables created / verified');
}

// ══════════════════════════════════════════════════════════════
//  EMAIL (Resend — free 3000/month)
// ══════════════════════════════════════════════════════════════
async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) return console.log('⚠️ Email skipped — no RESEND_API_KEY');
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || 'TalentAI <noreply@talentai-jobs.com>', to:[to], subject, html }),
    });
    if (r.ok) console.log('📧 Email sent to:', to);
    else console.error('❌ Email failed:', await r.text());
  } catch (e) { console.error('❌ Email error:', e.message); }
}

// ══════════════════════════════════════════════════════════════
//  WHATSAPP (CallMeBot — free)
// ══════════════════════════════════════════════════════════════
async function sendWhatsApp(phone, message) {
  if (!phone) return;
  try {
    // CallMeBot API — student must activate once: https://www.callmebot.com/blog/free-api-whatsapp-messages/
    const apiKey = process.env.CALLMEBOT_KEY || '';
    const encoded = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encoded}&apikey=${apiKey}`;
    await fetch(url);
    console.log('📱 WhatsApp sent to:', phone);
  } catch (e) { console.error('❌ WhatsApp error:', e.message); }
}

// ══════════════════════════════════════════════════════════════
//  AI — GROQ
// ══════════════════════════════════════════════════════════════
async function callGroq(prompt, systemPrompt = 'You are an expert. Return only valid raw JSON.') {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set');
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile', temperature: 0.1, max_tokens: 1500,
      messages: [{ role:'system', content:systemPrompt }, { role:'user', content:prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Groq error ${res.status}: ${(await res.text()).slice(0,200)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

function parseJSON(raw) {
  const cleaned = raw.replace(/```json\s*/gi,'').replace(/```\s*/gi,'').trim();
  const s = cleaned.indexOf('{'), e = cleaned.lastIndexOf('}');
  if (s === -1 || e === -1) throw new Error('No JSON in response');
  return JSON.parse(cleaned.slice(s, e+1));
}

async function screenResume(resumeText, job) {
  const skills       = Array.isArray(job.skills)       ? job.skills       : JSON.parse(job.skills       || '[]');
  const requirements = Array.isArray(job.requirements) ? job.requirements : JSON.parse(job.requirements || '[]');

  // Count how many required skills are actually in the resume
  const resumeLower = resumeText.toLowerCase();
  const matchedCount = skills.filter(s => resumeLower.includes(s.toLowerCase())).length;
  const totalSkills = skills.length || 1;
  const rawMatchPct = Math.round((matchedCount / totalSkills) * 100);

  const raw = await callGroq(`You are a strict ATS resume screening system. Analyze this resume carefully and give an HONEST score.

JOB TITLE: ${job.title}
DEPARTMENT: ${job.department}  
REQUIRED SKILLS: ${skills.join(', ')}
REQUIREMENTS: ${requirements.join(' | ')}
JOB DESCRIPTION: ${job.description}

RESUME TEXT:
${resumeText.slice(0, 6000)}

SCORING RULES — follow these strictly:
- Keyword match rate is ${rawMatchPct}% (${matchedCount} of ${totalSkills} required skills found)
- If keyword match < 30%: ats_score must be between 20-45
- If keyword match 30-50%: ats_score must be between 45-65  
- If keyword match 50-70%: ats_score must be between 60-75
- If keyword match 70-85%: ats_score must be between 72-85
- If keyword match > 85%: ats_score can be 85-97
- Penalize heavily for: no quantified achievements, missing contact info, very short resume, irrelevant experience
- Reward for: metrics in bullets, matching job title, relevant education, certifications matching JD
- NEVER give 85 by default. Calculate based on actual resume content.
- A fresher ITI/diploma resume for a senior ML role should score 15-35
- An experienced ML engineer resume should score 70-92

Return ONLY raw JSON, no markdown:
{"ats_score":<realistic 0-100 based on rules above>,"score":<same>,"verdict":"<Strong Match|Good Match|Partial Match|Low Match>","summary":"<2-3 honest sentences about fit>","matched_skills":[],"missing_skills":[],"experience_years":<number|null>,"education":"<qualification>","strengths":[],"concerns":[],"recommendation":"<Advance to Interview|Hold|Reject>","interview_questions":[],"keyword_match_percent":${rawMatchPct},"formatting_score":<40-95>,"skills_gap":[],"resume_tips":"<3 specific improvements>"}`);
}

async function buildAIResume(userInput) {
  const raw = await callGroq(`You are a professional resume writer. Build an ATS-optimized resume.
User input: ${JSON.stringify(userInput)}
Return JSON: {"resume_text":"<full formatted resume text>","ats_tips":["tip1","tip2","tip3"],"keywords":["kw1","kw2"],"score_estimate":<0-100>}`);
  return parseJSON(raw);
}

async function getMockInterview(resumeText, jobTitle, question_count = 5) {
  const raw = await callGroq(`Generate ${question_count} technical interview questions for: ${jobTitle}
Based on resume: ${resumeText.slice(0,2000)}
Return JSON: {"questions":[{"question":"<q>","type":"<Technical|Behavioral|Situational>","tip":"<answer tip>"}],"overall_advice":"<advice>"}`);
  return parseJSON(raw);
}

async function getSkillsGapAnalysis(resumeText, jobTitle, requiredSkills) {

  const raw = await callGroq(`Analyze skill gaps for ${jobTitle}.
Required skills: ${requiredSkills.join(', ')}
Resume: ${resumeText.slice(0,3000)}
Return JSON: {"gap_score":<0-100>,"present_skills":[],"missing_skills":[],"learning_roadmap":[{"skill":"<skill>","priority":"<High|Medium|Low>","resource":"<free YouTube/course link>","time_to_learn":"<estimate>"}],"summary":"<2 sentences>"}`);
  return parseJSON(raw);
}

// ══════════════════════════════════════════════════════════════
//  AUTH MIDDLEWARE
// ══════════════════════════════════════════════════════════════
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token required' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret'); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    next();
  });
}

function requirePremium(req, res, next) {
  requireAuth(req, res, async () => {
    try {
      const r = await pool.query('SELECT plan FROM users WHERE id=$1', [req.user.id]);
      if (!r.rows[0] || r.rows[0].plan === 'free')
        return res.status(402).json({ error: 'Premium plan required', upgrade: true });
      next();
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
}

async function extractText(file) {
  if (!file) return '';
  if (file.originalname?.toLowerCase().endsWith('.pdf')) {
    const data = await pdfParse(file.buffer);
    const text = data.text?.trim();
    if (!text || text.length < 30) throw new Error('PDF has no readable text.');
    return text;
  }
  return file.buffer.toString('utf-8');
}

// ══════════════════════════════════════════════════════════════
//  EMAIL TEMPLATES
// ══════════════════════════════════════════════════════════════
const emailBase = (body) => `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:20px;">
  <div style="background:#0c1220;border-radius:12px;padding:24px;text-align:center;margin-bottom:16px;">
    <h1 style="color:#f1f5f9;margin:0;font-size:22px;">⚡ TalentAI</h1>
    <p style="color:#60a5fa;margin:4px 0 0;font-size:12px;">AI-Powered Job Portal</p>
  </div>
  <div style="background:white;border-radius:12px;padding:28px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">${body}</div>
  <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:12px;">© 2026 TalentAI</p>
</div>`;

// ══════════════════════════════════════════════════════════════
//  ROUTES
// ══════════════════════════════════════════════════════════════

app.get('/health', (req, res) => res.json({ status:'ok', time:new Date() }));

// ── AI Voice Interview routes ──────────────────────────────
app.post('/ai/interview-questions', async (req, res) => {
  const { jobTitle, skills = [] } = req.body;
  try {
    const result = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 600,
      messages: [
        { role: 'system', content: 'You are an expert HR interviewer. Return ONLY a valid JSON array of 5 question strings. No markdown.' },
        { role: 'user', content: `Generate 5 interview questions for: ${jobTitle}. Skills: ${skills.join(', ')}. Mix: 1 intro, 2 technical, 1 situational, 1 motivation. Return ONLY: ["Q1?","Q2?","Q3?","Q4?","Q5?"]` },
      ],
    });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/ai/evaluate-answer', async (req, res) => {
  const { question, answer, jobTitle } = req.body;
  try {
    const result = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 300,
      messages: [
        { role: 'system', content: 'You are an expert HR interviewer. Return ONLY valid JSON, no markdown.' },
        { role: 'user', content: `Job: ${jobTitle}\nQuestion: ${question}\nAnswer: "${answer}"\nReturn ONLY: {"score":7,"rating":"Good","feedback":"2 sentences.","tip":"1 tip."}` },
      ],
    });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── TEST EMAIL (remove after testing) ──
app.get('/test-email', async (req, res) => {
  const testEmail = req.query.to || process.env.HR_ALERT_EMAIL;
  if (!testEmail) return res.json({ error: 'Add ?to=your@email.com to the URL' });

  await sendEmail({
    to:      testEmail,
    subject: '✅ TalentAI Email Test',
    html:    `<div style="font-family:Arial;padding:20px;background:#f8fafc;">
                <h2 style="color:#4f46e5;">⚡ TalentAI Email Works!</h2>
                <p>If you see this, your Resend integration is working perfectly.</p>
                <p style="color:#64748b;font-size:12px;">Sent at: ${new Date().toLocaleString()}</p>
              </div>`,
  });

  res.json({ success: true, message: `Test email sent to ${testEmail}` });
});

// ── Reset DB ──
app.get('/reset-db', async (req, res) => {
  if (req.query.secret !== (process.env.RESET_SECRET || 'reset-talentai-now'))
    return res.status(403).json({ error:'Wrong secret' });
  try {
    await pool.query('DROP TABLE IF EXISTS payments,whatsapp_subscribers,applications,jobs,users CASCADE;');
    await initDB();
    res.json({ success:true, message:'✅ Reset complete' });
  } catch (e) { res.status(500).json({ error:e.message }); }
});

// ════════════════════ AUTH ════════════════════

// Student register (free, no invite code)
app.post('/auth/student/register', async (req, res) => {
  const { email, password, name, phone, whatsapp } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error:'name, email, password required' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query(
      'INSERT INTO users (email,password_hash,name,role,plan,phone,whatsapp) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id,email,name,role,plan',
      [email.toLowerCase(), hash, name, 'student', 'free', phone||null, whatsapp||null]
    );
    const user  = r.rows[0];
    const token = jwt.sign({ id:user.id, role:user.role, plan:user.plan }, process.env.JWT_SECRET||'dev-secret', { expiresIn:'7d' });
    // Welcome email
    sendEmail({ to:email, subject:'👋 Welcome to TalentAI!', html: emailBase(`
      <h2 style="color:#1e293b;">Welcome, ${name}! 🎉</h2>
      <p style="color:#475569;line-height:1.6;">Your free account is ready. You can now:</p>
      <ul style="color:#475569;line-height:2;">
        <li>Browse and apply for jobs</li>
        <li>Get your free ATS score</li>
        <li>See AI skill summary</li>
      </ul>
      <div style="background:#f1f5f9;border-radius:8px;padding:14px;margin:16px 0;border-left:4px solid #1d4ed8;">
        <p style="margin:0;font-weight:600;color:#1d4ed8;">Upgrade to Premium</p>
        <p style="margin:6px 0 0;color:#475569;font-size:13px;">Unlock full ATS report, AI mock interview, resume builder and more for just ₹2499/month.</p>
      </div>`) });
    res.status(201).json({ token, user });
  } catch (e) {
    if (e.code==='23505') return res.status(409).json({ error:'Email already registered' });
    res.status(500).json({ error:e.message });
  }
});

// Admin register (invite code required)
app.post('/auth/register', async (req, res) => {
  const { email, password, name, invite_code } = req.body;
  if (invite_code !== (process.env.ADMIN_INVITE_CODE||'talentai-admin-2026'))
    return res.status(403).json({ error:'Invalid invite code' });
  if (!email||!password||!name) return res.status(400).json({ error:'All fields required' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query(
      'INSERT INTO users (email,password_hash,name,role,plan) VALUES ($1,$2,$3,$4,$5) RETURNING id,email,name,role',
      [email.toLowerCase(), hash, name, 'admin', 'admin']
    );
    const user  = r.rows[0];
    const token = jwt.sign({ id:user.id, role:user.role }, process.env.JWT_SECRET||'dev-secret', { expiresIn:'7d' });
    res.status(201).json({ token, user });
  } catch (e) {
    if (e.code==='23505') return res.status(409).json({ error:'Email already registered' });
    res.status(500).json({ error:e.message });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email||!password) return res.status(400).json({ error:'email and password required' });
  try {
    const r    = await pool.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase()]);
    const user = r.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error:'Invalid email or password' });
    const token = jwt.sign({ id:user.id, role:user.role, plan:user.plan }, process.env.JWT_SECRET||'dev-secret', { expiresIn:'7d' });
    res.json({ token, user:{ id:user.id, email:user.email, name:user.name, role:user.role, plan:user.plan } });
  } catch (e) { res.status(500).json({ error:e.message }); }
});

app.get('/auth/me', requireAuth, async (req, res) => {
  try {
    const r = await pool.query('SELECT id,email,name,role,plan,phone,whatsapp FROM users WHERE id=$1', [req.user.id]);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error:e.message }); }
});

// ════════════════════ JOBS ════════════════════

app.get('/jobs', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM jobs WHERE is_active=true ORDER BY created_at DESC');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error:e.message }); }
});

app.get('/jobs/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM jobs WHERE id=$1 AND is_active=true', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error:'Job not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error:e.message }); }
});

app.post('/jobs', async (req, res) => {
  try {
    const { title, department, location, type, salary_min, salary_max, description, skills, requirements } = req.body;

    if (!title || !department || !description) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    const r = await pool.query(
      `INSERT INTO jobs (title, department, location, type, salary_min, salary_max, description, skills, requirements, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        title,
        department,
        location,
        type,
        salary_min,
        salary_max,
        description,
        JSON.stringify(skills || []),
        JSON.stringify(requirements || []),
        req.user.id
      ]
    );

    res.json(r.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/jobs/:id', requireAdmin, async (req, res) => {
  const { title,department,location,type,salary_min,salary_max,description,skills,requirements,is_active } = req.body;
  try {
    const r = await pool.query(
      `UPDATE jobs SET title=$1,department=$2,location=$3,type=$4,salary_min=$5,salary_max=$6,
       description=$7,skills=$8,requirements=$9,is_active=$10,updated_at=NOW() WHERE id=$11 RETURNING *`,
      [title,department,location,type,salary_min,salary_max,description,
       JSON.stringify(skills||[]),JSON.stringify(requirements||[]),is_active!==undefined?is_active:true,req.params.id]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error:e.message }); }
});

app.delete('/jobs/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE jobs SET is_active=false WHERE id=$1', [req.params.id]);
    res.json({ message:'Job deactivated' });
  } catch (e) { res.status(500).json({ error:e.message }); }
});

// ════════════════════ APPLY ════════════════════

app.post('/apply', upload.single('resume'), async (req, res) => {
  const { job_id, name, email, phone, cover_letter } = req.body;
  if (!job_id||!name||!email) return res.status(400).json({ error:'job_id, name and email required' });
  if (!req.file&&!req.body.resume_text) return res.status(400).json({ error:'Upload PDF or paste resume' });
  try {
    const resumeText = req.file ? await extractText(req.file) : req.body.resume_text;
    if (!resumeText||resumeText.length<30) return res.status(400).json({ error:'Resume too short' });

    const jRes = await pool.query('SELECT * FROM jobs WHERE id=$1 AND is_active=true', [job_id]);
    if (!jRes.rows[0]) return res.status(404).json({ error:'Job not found' });

    const dup = await pool.query('SELECT id FROM applications WHERE job_id=$1 AND email=$2', [job_id,email.toLowerCase()]);
    if (dup.rows.length) return res.status(409).json({ error:'Already applied for this position' });

   let aiResult;
try { 
  aiResult = await screenResume(resumeText, jRes.rows[0]); 
} catch (e) { 
  console.error('AI screening failed:', e.message);
  // Fallback so application still saves
  aiResult = {
    ats_score: 50, score: 50,
    verdict: "Partial Match",
    summary: "AI screening temporarily unavailable. Please review manually.",
    matched_skills: [], missing_skills: [],
    experience_years: null, strengths: [], concerns: [],
    recommendation: "Hold",
    interview_questions: [],
    keyword_match_percent: 50,
    formatting_score: 60,
    skills_gap: [],
    resume_tips: "Please retry later for full AI analysis."
  };
}
    // Get user plan to decide what to return
    let userPlan = 'free';
    if (req.headers.authorization) {
      try {
        const decoded = jwt.verify(req.headers.authorization.split(' ')[1], process.env.JWT_SECRET||'dev-secret');
        const uRes = await pool.query('SELECT plan,id FROM users WHERE id=$1', [decoded.id]);
        if (uRes.rows[0]) { userPlan = uRes.rows[0].plan; }
      } catch {}
    }

    const aRes = await pool.query(
      `INSERT INTO applications (job_id,name,email,phone,cover_letter,resume_text,
        ai_score,ai_verdict,ai_summary,ai_matched_skills,ai_missing_skills,
        ai_experience_years,ai_strengths,ai_concerns,ai_recommendation,
        ai_interview_questions,ai_skills_gap,ai_resume_tips)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
      [job_id,name,email.toLowerCase(),phone||null,cover_letter||null,resumeText.slice(0,20000),
       aiResult.ats_score,aiResult.verdict,aiResult.summary,
       JSON.stringify(aiResult.matched_skills||[]),JSON.stringify(aiResult.missing_skills||[]),
       aiResult.experience_years||null,JSON.stringify(aiResult.strengths||[]),
       JSON.stringify(aiResult.concerns||[]),aiResult.recommendation,
       JSON.stringify(aiResult.interview_questions||[]),
       JSON.stringify(aiResult.skills_gap||[]),aiResult.resume_tips||'']
    );

    // Email confirmation to candidate
    const job = jRes.rows[0];
    const scoreColor = aiResult.ats_score>=85?'#22c55e':aiResult.ats_score>=70?'#eab308':'#f97316';
    sendEmail({
      to: email,
      subject: `✅ Application Received — ${job.title} | TalentAI`,
      html: emailBase(`
        <h2 style="color:#1e293b;">Hello ${name}! 👋</h2>
        <p style="color:#475569;">Your application for <strong>${job.title}</strong> was received.</p>
        <div style="background:#f1f5f9;border-radius:8px;padding:20px;text-align:center;margin:20px 0;">
          <p style="margin:0 0 4px;color:#64748b;font-size:12px;text-transform:uppercase;">Your ATS Score</p>
          <p style="margin:0;font-size:52px;font-weight:800;color:${scoreColor};">${aiResult.ats_score}</p>
          <p style="margin:4px 0 0;color:${scoreColor};font-weight:600;">${aiResult.verdict}</p>
        </div>
        <p style="color:#475569;line-height:1.6;">${aiResult.summary}</p>
        ${userPlan==='free'?`<div style="background:#1e3a5f;border-radius:8px;padding:14px;margin-top:16px;">
          <p style="margin:0;font-weight:600;color:#60a5fa;">🔒 Upgrade to Premium — ₹2499/month</p>
          <p style="margin:6px 0 0;color:#94a3b8;font-size:13px;">Unlock: Full ATS report • Skills gap roadmap • Mock interview • Resume builder</p>
        </div>`:''}`)
    });

    // WhatsApp confirmation
    if (phone||req.body.whatsapp) {
      sendWhatsApp(phone||req.body.whatsapp,
        `✅ TalentAI\nHello ${name}!\nYour application for *${job.title}* was received.\n🎯 ATS Score: *${aiResult.ats_score}/100*\n📊 ${aiResult.verdict}\n\nHR team will contact you soon.`);
    }

    // Alert HR
    if (process.env.HR_ALERT_EMAIL) {
      sendEmail({ to:process.env.HR_ALERT_EMAIL,
        subject:`🔔 New Applicant: ${name} — ${aiResult.ats_score}% for ${job.title}`,
        html: emailBase(`<h2>New Application</h2>
          <p><b>Candidate:</b> ${name} (${email})</p>
          <p><b>Job:</b> ${job.title}</p>
          <p><b>ATS Score:</b> <span style="color:${scoreColor};font-size:24px;font-weight:800;">${aiResult.ats_score}/100</span></p>
          <p><b>AI Recommendation:</b> ${aiResult.recommendation}</p>
          <a href="${process.env.FRONTEND_URL||'#'}" style="background:#1d4ed8;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:12px;">View Dashboard →</a>`) });
    }

    // Return free vs premium data
    const freeResult = {
      ats_score:      aiResult.ats_score,
      score:          aiResult.ats_score,
      verdict:        aiResult.verdict,
      summary:        aiResult.summary,          // 3 lines only
      recommendation: aiResult.recommendation,
      matched_skills: aiResult.matched_skills?.slice(0,3) || [],  // show only 3
      is_premium:     false,
    };

    const premiumResult = { ...aiResult, is_premium: true };

    res.status(201).json({
      application: aRes.rows[0],
      ai_result:   userPlan === 'free' ? freeResult : premiumResult,
      plan:        userPlan,
    });
  } catch (e) { res.status(500).json({ error:e.message }); }
});

// ════════════════════ PREMIUM STUDENT FEATURES ════════════════

// Full ATS Report (Premium)
app.get('/applications/:id/full-report', requirePremium, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT a.*,j.title AS job_title FROM applications a JOIN jobs j ON a.job_id=j.id WHERE a.id=$1`,
      [req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error:'Not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error:e.message }); }
});

// Skills Gap Analysis (Premium)
app.post('/skills-gap', requirePremium, upload.single('resume'), async (req, res) => {
  const { job_id, resume_text } = req.body;
  try {
    const resumeText = req.file ? await extractText(req.file) : resume_text;
    if (!resumeText) return res.status(400).json({ error:'Resume required' });
    const job = job_id
      ? (await pool.query('SELECT * FROM jobs WHERE id=$1', [job_id])).rows[0]
      : { title: req.body.job_title||'Software Engineer', skills: JSON.parse(req.body.skills||'[]') };
    if (!job) return res.status(404).json({ error:'Job not found' });
    const skills = Array.isArray(job.skills) ? job.skills : JSON.parse(job.skills||'[]');
    const result = await getSkillsGapAnalysis(resumeText, job.title, skills);
    res.json(result);
  } catch (e) { res.status(500).json({ error:e.message }); }
});

// AI Resume Builder (Premium)
app.post('/build-resume', requirePremium, async (req, res) => {
  try {
    const result = await buildAIResume(req.body);
    res.json(result);
  } catch (e) { res.status(500).json({ error:e.message }); }
});

// Mock Interview Questions (Premium)
// Mock Interview — Real Groq AI (FIXED: was returning dummy hardcoded data)
app.post('/mock-interview', upload.single('resume'), async (req, res) => {
  const { job_title, resume_text } = req.body;
  try {
    const resumeText = req.file ? await extractText(req.file) : (resume_text || '');
    const result = await getMockInterview(resumeText, job_title || 'Software Engineer');
    res.json(result);
  } catch (e) {
    console.error('Mock interview error:', e.message);
    // Fallback questions if Groq fails
    res.json({
      questions: [
        { question: `Tell me about yourself and why you want this ${job_title || 'role'}.`, type:'Behavioral', tip:'Use the STAR method — Situation, Task, Action, Result.' },
        { question: 'What is your greatest technical strength and how have you used it?', type:'Technical', tip:'Give a specific project example with measurable outcome.' },
        { question: 'Describe a challenging project and how you overcame obstacles.', type:'Situational', tip:'Focus on your problem-solving process, not just the result.' },
        { question: 'Where do you see yourself in 3 years?', type:'Behavioral', tip:'Align your goals with the company mission.' },
        { question: 'Do you have any questions for us?', type:'Closing', tip:'Always have 2-3 thoughtful questions ready about the team or role.' },
      ],
      overall_advice: 'Speak clearly, use specific examples, and show enthusiasm for the role.'
    });
  }
});

// Auto Apply (Premium) — apply to multiple jobs at once
app.post('/auto-apply', requirePremium, upload.single('resume'), async (req, res) => {
  const { job_ids, name, email, phone } = req.body;
  if (!job_ids||!name||!email) return res.status(400).json({ error:'job_ids, name, email required' });
  const ids = Array.isArray(job_ids) ? job_ids : JSON.parse(job_ids);
  try {
    const resumeText = req.file ? await extractText(req.file) : req.body.resume_text;
    const results = [];
    for (const job_id of ids.slice(0,5)) { // max 5 at once
      const jRes = await pool.query('SELECT * FROM jobs WHERE id=$1 AND is_active=true', [job_id]);
      if (!jRes.rows[0]) continue;
      const dup = await pool.query('SELECT id FROM applications WHERE job_id=$1 AND email=$2', [job_id,email.toLowerCase()]);
      if (dup.rows.length) { results.push({ job_id, status:'already_applied' }); continue; }
      const aiResult = await screenResume(resumeText, jRes.rows[0]);
      await pool.query(
        `INSERT INTO applications (job_id,name,email,phone,resume_text,ai_score,ai_verdict,ai_summary,
          ai_matched_skills,ai_missing_skills,ai_recommendation,ai_interview_questions)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [job_id,name,email.toLowerCase(),phone||null,resumeText.slice(0,20000),
         aiResult.ats_score,aiResult.verdict,aiResult.summary,
         JSON.stringify(aiResult.matched_skills||[]),JSON.stringify(aiResult.missing_skills||[]),
         aiResult.recommendation,JSON.stringify(aiResult.interview_questions||[])]
      );
      results.push({ job_id, job_title:jRes.rows[0].title, ats_score:aiResult.ats_score, status:'applied' });
    }
    res.json({ results, total_applied: results.filter(r=>r.status==='applied').length });
  } catch (e) { res.status(500).json({ error:e.message }); }
});

// ════════════════════ WHATSAPP SUBSCRIPTIONS ════════════════

async function notifyWhatsAppSubscribers(message) {
  try {
    const r = await pool.query('SELECT phone FROM whatsapp_subscribers WHERE active=true');
    for (const row of r.rows) {
      await sendWhatsApp(row.phone, message);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay between sends
    }
  } catch (e) { console.error('WhatsApp broadcast error:', e.message); }
}

app.post('/subscribe/whatsapp', async (req, res) => {
  const { phone, name, user_id } = req.body;
  if (!phone) return res.status(400).json({ error:'Phone number required' });
  try {
    await pool.query(
      `INSERT INTO whatsapp_subscribers (phone,name,user_id) VALUES ($1,$2,$3)
       ON CONFLICT (phone) DO UPDATE SET active=true, name=EXCLUDED.name`,
      [phone, name||null, user_id||null]
    );
    // Send activation instructions
    sendWhatsApp(phone,
      `👋 Hello ${name||''}!\nYou are subscribed to TalentAI job alerts! 🎉\n\nYou will receive:\n✅ New job notifications\n✅ Application updates\n✅ Interview reminders\n\nPowered by TalentAI ⚡`);
    res.json({ success:true, message:'Subscribed! Check WhatsApp for confirmation.' });
  } catch (e) { res.status(500).json({ error:e.message }); }
});

app.delete('/subscribe/whatsapp', async (req, res) => {
  const { phone } = req.body;
  try {
    await pool.query('UPDATE whatsapp_subscribers SET active=false WHERE phone=$1', [phone]);
    res.json({ success:true });
  } catch (e) { res.status(500).json({ error:e.message }); }
});

// ════════════════════ PAYMENT (Razorpay) ════════════════════

const Razorpay = require('razorpay');

app.post('/payment/create-order', requireAuth, async (req, res) => {
  const { plan } = req.body;
  const plans = { 
    premium_monthly: 249900,  // ₹2499 in paise
    premium_yearly: 1499900   // ₹14999 in paise
  };
  if (!plans[plan]) return res.status(400).json({ error: 'Invalid plan' });

  try {
    // 1. Save to DB
    const dbRow = await pool.query(
      'INSERT INTO payments (user_id,plan,amount,status) VALUES ($1,$2,$3,$4) RETURNING id',
      [req.user.id, plan, plans[plan], 'pending']
    );

    // 2. Create real Razorpay order
    const instance = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await instance.orders.create({
      amount:   plans[plan],
      currency: 'INR',
      receipt:  dbRow.rows[0].id,
    });

    console.log('✅ Razorpay order created:', order.id, 'amount:', order.amount);

    // 3. Return order_id to frontend
    res.json({
      payment_id:   dbRow.rows[0].id,
      order_id:     order.id,        // e.g. order_XXXXXXXXXXXXXXX
      amount:       order.amount,    // in paise
      currency:     'INR',
      plan,
      razorpay_key: process.env.RAZORPAY_KEY_ID,
    });

  } catch (e) {
    console.error('❌ Razorpay order error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/payment/verify', requireAuth, async (req, res) => {
  const { payment_id, razorpay_payment_id, plan } = req.body;
  try {
    // In production: verify razorpay signature here
    await pool.query('UPDATE payments SET status=$1,razorpay_id=$2 WHERE id=$3', ['completed',razorpay_payment_id,payment_id]);
    await pool.query('UPDATE users SET plan=$1 WHERE id=$2', [plan.includes('yearly')?'premium_yearly':'premium', req.user.id]);
    // Send confirmation
    const u = await pool.query('SELECT email,name FROM users WHERE id=$1', [req.user.id]);
    if (u.rows[0]) {
      sendEmail({ to:u.rows[0].email, subject:'🎉 Premium Activated — TalentAI', html:emailBase(`
        <h2 style="color:#1e293b;">Premium Activated! 🎉</h2>
        <p style="color:#475569;">Hi ${u.rows[0].name}, your premium plan is now active.</p>
        <div style="background:#f0fdf4;border-radius:8px;padding:16px;border-left:4px solid #22c55e;">
          <p style="margin:0;font-weight:600;color:#22c55e;">You now have access to:</p>
          <ul style="color:#475569;margin:8px 0 0;line-height:2;">
            <li>Full ATS Report with detailed analysis</li>
            <li>AI Skills Gap + Learning Roadmap</li>
            <li>AI Resume Builder</li>
            <li>Mock Interview + AI Feedback</li>
            <li>Auto Apply to multiple jobs</li>
            <li>Premium internship & referral alerts</li>
          </ul>
        </div>`) });
    }
    res.json({ success:true, message:'Premium activated!' });
  } catch (e) { res.status(500).json({ error:e.message }); }
});

// ════════════════════ APPLICATIONS (ADMIN) ════════════════════

app.get('/applications', requireAdmin, async (req, res) => {
  try {
    const { sort='score' } = req.query;
    const orders = { score:'a.ai_score DESC', date:'a.created_at DESC', name:'a.name ASC' };
    const r = await pool.query(
      `SELECT a.*,j.title AS job_title,j.department FROM applications a
       JOIN jobs j ON a.job_id=j.id ORDER BY ${orders[sort]||'a.ai_score DESC'}`
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error:e.message }); }
});

app.get('/applications/:id', requireAdmin, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT a.*,j.title AS job_title,j.department FROM applications a JOIN jobs j ON a.job_id=j.id WHERE a.id=$1',
      [req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error:'Not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error:e.message }); }
});

// Status update with auto email + WhatsApp to candidate
app.patch('/applications/:id/status', requireAdmin, async (req, res) => {
  notify.onStatusChange(application, job, status).catch(err =>
  console.error("[notify]", err)
);
  const { status, recruiter_notes } = req.body;
  try {
    const r = await pool.query(
      'UPDATE applications SET status=COALESCE($1,status),recruiter_notes=COALESCE($2,recruiter_notes),updated_at=NOW() WHERE id=$3 RETURNING *',
      [status||null, recruiter_notes||null, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error:'Not found' });
    const appl = r.rows[0];

    if (status) {
      const jobRes = await pool.query('SELECT title FROM jobs WHERE id=$1', [appl.job_id]);
      const jobTitle = jobRes.rows[0]?.title || 'the position';
      const isApproved = ['approved','Interview Scheduled','Hired'].includes(status);
      const emoji  = isApproved ? '🎉' : '📋';
      const color  = isApproved ? '#22c55e' : '#ef4444';
      const msgText = isApproved
        ? `Congratulations! You have been shortlisted for ${jobTitle}. HR will contact you soon.`
        : status==='Hired'
        ? `Congratulations! You have been selected for ${jobTitle}!`
        : `Thank you for applying. After careful review, we have decided to move forward with other candidates for ${jobTitle}.`;

      // Email
      sendEmail({ to:appl.email, subject:`${emoji} Application Update — ${jobTitle} | TalentAI`,
        html: emailBase(`
          <h2 style="color:#1e293b;">${emoji} Application Update</h2>
          <p>Hello <b>${appl.name}</b>,</p>
          <div style="border-left:4px solid ${color};padding:12px 16px;background:#f8fafc;border-radius:0 8px 8px 0;margin:16px 0;">
            <p style="margin:0;font-weight:700;color:${color};text-transform:uppercase;">${status}</p>
            <p style="margin:8px 0 0;color:#475569;">${msgText}</p>
            ${recruiter_notes?`<p style="margin:8px 0 0;color:#64748b;font-style:italic;">Note: "${recruiter_notes}"</p>`:''}
          </div>`) });

      // WhatsApp
      if (appl.phone) {
        sendWhatsApp(appl.phone,
          `${emoji} *TalentAI Update*\nHello ${appl.name}!\n\n*${status.toUpperCase()}*\n${msgText}${recruiter_notes?`\n\nNote: ${recruiter_notes}`:''}`);
      }
    }
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error:e.message }); }
});

app.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [total, byRec, avg, byJob] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM applications'),
      pool.query('SELECT ai_recommendation,COUNT(*) FROM applications GROUP BY ai_recommendation'),
      pool.query('SELECT ROUND(AVG(ai_score),1) AS avg FROM applications'),
      pool.query(`SELECT j.title,j.department,COUNT(*) AS total,ROUND(AVG(a.ai_score),1) AS avg_score
                  FROM applications a JOIN jobs j ON a.job_id=j.id GROUP BY j.id,j.title,j.department ORDER BY total DESC`),
    ]);
    res.json({
      total: Number(total.rows[0].count),
      average_score: Number(avg.rows[0].avg)||0,
      by_recommendation: Object.fromEntries(byRec.rows.map(r=>[r.ai_recommendation,Number(r.count)])),
      by_job: byJob.rows,
    });
  } catch (e) {
  console.error('AI screening error:', e.message);
  aiResult = {
    ats_score: 50, score: 50,
    verdict: "Partial Match",
    summary: "Resume received. AI analysis unavailable temporarily.",
    matched_skills: [], missing_skills: [],
    experience_years: null, strengths: [], concerns: [],
    recommendation: "Hold",
    interview_questions: [],
    keyword_match_percent: 50,
    formatting_score: 60,
    skills_gap: [], resume_tips: ""
  };
}
});

// ════════════════════ START ════════════════════
const PORT = process.env.PORT || 4000;
initDB()
  .then(() => app.listen(PORT, () => {
    console.log(`\n🚀  TalentAI  →  http://localhost:${PORT}`);
    console.log(`🤖  AI:      ${process.env.GROQ_API_KEY    ? '✅ Groq'          : '❌ Missing'}`);
    console.log(`📧  Email:   ${process.env.RESEND_API_KEY  ? '✅ Resend'        : '⚠️  Disabled'}`);
    console.log(`📱  WA:      ${process.env.CALLMEBOT_KEY   ? '✅ CallMeBot'     : '⚠️  Disabled'}`);
    console.log(`💳  Pay:     ${process.env.RAZORPAY_KEY_ID ? '✅ Razorpay'      : '⚠️  Test mode'}\n`);
  }))
  .catch(err => { console.error('❌ DB init failed:', err.message); process.exit(1); });
  app.get("/", (req, res) => {
  res.send("🚀 TalentAI Backend is running successfully!");
});