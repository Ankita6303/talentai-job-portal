require('dotenv').config();
const express  = require('express');
const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const cors     = require('cors');
const multer   = require('multer');
const pdfParse = require('pdf-parse');

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
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "https://talentai-job-portal-2026.netlify.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'talentai',
  user:     process.env.DB_USER     || 'talentai_user',
  password: String(process.env.DB_PASSWORD || ''),
  ssl:      process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max:      10,
});

async function initDB() {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name          TEXT NOT NULL,
      role          TEXT DEFAULT 'admin',
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `);
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
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS applications (
      id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      job_id                 UUID REFERENCES jobs(id),
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
      status                 TEXT DEFAULT 'pending',
      recruiter_notes        TEXT,
      created_at             TIMESTAMPTZ DEFAULT NOW(),
      updated_at             TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅ Tables created / verified');
}

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token required' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

async function extractText(file) {
  if (!file) return '';
  if (file.originalname?.toLowerCase().endsWith('.pdf')) {
    const data = await pdfParse(file.buffer);
    const text = data.text?.trim();
    if (!text || text.length < 30)
      throw new Error('PDF has no readable text. Please use a text-based PDF, not a scanned image.');
    return text;
  }
  return file.buffer.toString('utf-8');
}

async function screenResume(resumeText, job) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set');

  const skills       = Array.isArray(job.skills)       ? job.skills       : JSON.parse(job.skills       || '[]');
  const requirements = Array.isArray(job.requirements) ? job.requirements : JSON.parse(job.requirements || '[]');

  const prompt = `You are an expert ATS and technical recruiter.
Analyze the resume against the job description. Return ONLY raw JSON.

JOB TITLE: ${job.title}
DEPARTMENT: ${job.department}
REQUIRED SKILLS: ${skills.join(', ')}
REQUIREMENTS: ${requirements.join(' | ')}
JOB DESCRIPTION: ${job.description}

RESUME:
${resumeText.slice(0, 5000)}

Return ONLY this JSON:
{
  "ats_score": <0-100>,
  "score": <same>,
  "verdict": "<Strong Match|Good Match|Partial Match|Low Match>",
  "summary": "<2-3 sentence assessment>",
  "matched_skills": [],
  "missing_skills": [],
  "experience_years": <number or null>,
  "education": "<qualification>",
  "strengths": [],
  "concerns": [],
  "recommendation": "<Advance to Interview|Hold|Reject>",
  "interview_questions": [],
  "keyword_match_percent": <0-100>,
  "formatting_score": <0-100>
}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant', temperature: 0.1, max_tokens: 1024,
      messages: [
        { role: 'system', content: 'You are an ATS expert. Respond with only valid raw JSON.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Groq API error ${res.status}: ${(await res.text()).slice(0, 300)}`);

  const data    = await res.json();
  const raw     = data.choices?.[0]?.message?.content || '';
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  const s = cleaned.indexOf('{'), e = cleaned.lastIndexOf('}');
  if (s === -1 || e === -1) throw new Error('AI did not return valid JSON');
  const parsed = JSON.parse(cleaned.slice(s, e + 1));
  parsed.ats_score = parsed.ats_score || parsed.score || 0;
  parsed.score = parsed.ats_score;
  return parsed;
}

// ═══════════════ ROUTES ═══════════════

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ── Reset DB (one-time use, then remove) ──
app.get('/reset-db', async (req, res) => {
  const secret = process.env.RESET_SECRET || 'reset-talentai-now';
  if (req.query.secret !== secret) return res.status(403).json({ error: 'Wrong secret' });
  try {
    await pool.query('DROP TABLE IF EXISTS applications CASCADE;');
    await pool.query('DROP TABLE IF EXISTS jobs CASCADE;');
    await pool.query('DROP TABLE IF EXISTS users CASCADE;');
    await initDB();
    res.json({ success: true, message: '✅ All tables dropped and recreated!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Auth ──
app.post('/auth/register', async (req, res) => {
  const { email, password, name, invite_code } = req.body;

  // 🔒 Require invite code to create admin account
  const validCode = process.env.ADMIN_INVITE_CODE || 'talentai-admin-2026';
  if (invite_code !== validCode)
    return res.status(403).json({ error: 'Invalid invite code. Contact the administrator.' });

  if (!email || !password || !name)
    return res.status(400).json({ error: 'name, email and password required' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const r    = await pool.query(
      'INSERT INTO users (email,password_hash,name,role) VALUES ($1,$2,$3,$4) RETURNING id,email,name,role',
      [email.toLowerCase(), hash, name, 'admin']
    );
    const user  = r.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
    res.status(201).json({ token, user });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: err.message });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  try {
    const r    = await pool.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase()]);
    const user = r.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/auth/me', requireAuth, async (req, res) => {
  try {
    const r = await pool.query('SELECT id,email,name,role FROM users WHERE id=$1', [req.user.id]);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Jobs ──
app.get('/jobs', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM jobs WHERE is_active=true ORDER BY created_at DESC');
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/jobs/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM jobs WHERE id=$1 AND is_active=true', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Job not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/jobs', requireAuth, async (req, res) => {
  const { title, department, location, type, salary_min, salary_max, description, skills, requirements } = req.body;
  if (!title || !department || !description)
    return res.status(400).json({ error: 'title, department and description required' });
  try {
    const r = await pool.query(
      `INSERT INTO jobs (title,department,location,type,salary_min,salary_max,description,skills,requirements,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [title, department, location, type, salary_min, salary_max, description,
       JSON.stringify(skills || []), JSON.stringify(requirements || []), req.user.id]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/jobs/:id', requireAuth, async (req, res) => {
  const { title, department, location, type, salary_min, salary_max, description, skills, requirements, is_active } = req.body;
  try {
    const r = await pool.query(
      `UPDATE jobs SET title=$1,department=$2,location=$3,type=$4,salary_min=$5,salary_max=$6,
       description=$7,skills=$8,requirements=$9,is_active=$10,updated_at=NOW() WHERE id=$11 RETURNING *`,
      [title, department, location, type, salary_min, salary_max, description,
       JSON.stringify(skills || []), JSON.stringify(requirements || []),
       is_active !== undefined ? is_active : true, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Job not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/jobs/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('UPDATE jobs SET is_active=false WHERE id=$1', [req.params.id]);
    res.json({ message: 'Job deactivated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Apply ──
app.post('/apply', upload.single('resume'), async (req, res) => {
  const { job_id, name, email, phone, cover_letter } = req.body;
  if (!job_id || !name || !email)
    return res.status(400).json({ error: 'job_id, name and email are required' });
  if (!req.file && !req.body.resume_text)
    return res.status(400).json({ error: 'Upload a PDF or paste resume text' });
  try {
    const resumeText = req.file ? await extractText(req.file) : req.body.resume_text;
    if (!resumeText || resumeText.length < 30)
      return res.status(400).json({ error: 'Resume too short or unreadable.' });

    const jRes = await pool.query('SELECT * FROM jobs WHERE id=$1 AND is_active=true', [job_id]);
    if (!jRes.rows[0]) return res.status(404).json({ error: 'Job not found' });

    const dup = await pool.query('SELECT id FROM applications WHERE job_id=$1 AND email=$2', [job_id, email.toLowerCase()]);
    if (dup.rows.length) return res.status(409).json({ error: 'You already applied for this position' });

    let aiResult;
    try { aiResult = await screenResume(resumeText, jRes.rows[0]); }
    catch (aiErr) { return res.status(500).json({ error: 'AI screening failed: ' + aiErr.message }); }

    const aRes = await pool.query(
      `INSERT INTO applications
       (job_id,name,email,phone,cover_letter,resume_text,ai_score,ai_verdict,ai_summary,
        ai_matched_skills,ai_missing_skills,ai_experience_years,ai_strengths,ai_concerns,
        ai_recommendation,ai_interview_questions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [job_id, name, email.toLowerCase(), phone||null, cover_letter||null,
       resumeText.slice(0,20000), aiResult.ats_score, aiResult.verdict, aiResult.summary,
       JSON.stringify(aiResult.matched_skills||[]), JSON.stringify(aiResult.missing_skills||[]),
       aiResult.experience_years||null, JSON.stringify(aiResult.strengths||[]),
       JSON.stringify(aiResult.concerns||[]), aiResult.recommendation,
       JSON.stringify(aiResult.interview_questions||[])]
    );
    res.status(201).json({ application: aRes.rows[0], ai_result: aiResult });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Applications ──
app.get('/applications', requireAuth, async (req, res) => {
  try {
    const { sort = 'score' } = req.query;
    const orders = { score:'a.ai_score DESC', date:'a.created_at DESC', name:'a.name ASC' };
    const r = await pool.query(
      `SELECT a.*,j.title AS job_title,j.department FROM applications a
       JOIN jobs j ON a.job_id=j.id ORDER BY ${orders[sort]||'a.ai_score DESC'}`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/applications/:id', requireAuth, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT a.*,j.title AS job_title,j.department FROM applications a JOIN jobs j ON a.job_id=j.id WHERE a.id=$1',
      [req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/applications/:id/status', requireAuth, async (req, res) => {
  const { status, recruiter_notes } = req.body;
  try {
    const r = await pool.query(
      'UPDATE applications SET status=COALESCE($1,status),recruiter_notes=COALESCE($2,recruiter_notes),updated_at=NOW() WHERE id=$3 RETURNING *',
      [status||null, recruiter_notes||null, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/stats', requireAuth, async (req, res) => {
  try {
    const [total, byRec, avg, byJob] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM applications'),
      pool.query('SELECT ai_recommendation,COUNT(*) FROM applications GROUP BY ai_recommendation'),
      pool.query('SELECT ROUND(AVG(ai_score),1) AS avg FROM applications'),
      pool.query(`SELECT j.title,j.department,COUNT(*) AS total,ROUND(AVG(a.ai_score),1) AS avg_score
                  FROM applications a JOIN jobs j ON a.job_id=j.id
                  GROUP BY j.id,j.title,j.department ORDER BY total DESC`),
    ]);
    res.json({
      total: Number(total.rows[0].count),
      average_score: Number(avg.rows[0].avg)||0,
      by_recommendation: Object.fromEntries(byRec.rows.map(r=>[r.ai_recommendation,Number(r.count)])),
      by_job: byJob.rows,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════ START ═══════════
const PORT = process.env.PORT || 4000;
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀  TalentAI  →  http://localhost:${PORT}`);
      console.log(`🤖  AI: ${process.env.GROQ_API_KEY ? '✅ Groq' : '❌ GROQ_API_KEY missing!'}`);
      console.log(`🔒  Invite code protection: ✅ enabled\n`);
    });
  })
  .catch(err => { console.error('❌ DB init failed:', err.message); process.exit(1); });
