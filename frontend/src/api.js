// api.js — Complete fixed version
const BASE = import.meta.env.VITE_API_URL || 'https://talentai-job-portal.onrender.com';

// Wake Render backend on load (prevents sleep)
setTimeout(() => fetch(`${BASE}/health`).catch(()=>{}), 100);

async function req(path, opts = {}) {
  const token = localStorage.getItem('talentai_token');
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function formReq(path, formData) {
  const token = localStorage.getItem('talentai_token');
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // ── Auth
  login:           (email, password)              => req('/auth/login',            { method:'POST', body:JSON.stringify({ email, password }) }),
  register:        (name, email, password, code)  => req('/auth/register',         { method:'POST', body:JSON.stringify({ name, email, password, invite_code:code }) }),
  studentRegister: (name, email, password, phone) => req('/auth/student/register', { method:'POST', body:JSON.stringify({ name, email, password, phone }) }),
  me:          () => req('/auth/me'),
  saveToken:   (t) => localStorage.setItem('talentai_token', t),
  clearToken:  ()  => localStorage.removeItem('talentai_token'),
  getToken:    ()  => localStorage.getItem('talentai_token'),

  // ── Jobs
  getJobs:   ()         => req('/jobs'),
  getJob:    (id)       => req(`/jobs/${id}`),
  createJob: (data)     => req('/jobs',      { method:'POST',   body:JSON.stringify(data) }),
  updateJob: (id, data) => req(`/jobs/${id}`,{ method:'PUT',    body:JSON.stringify(data) }),
  deleteJob: (id)       => req(`/jobs/${id}`,{ method:'DELETE' }),

  // ── Apply
  apply: ({ job_id, name, email, phone, resumeFile, resume_text }) => {
    const form = new FormData();
    form.append('job_id', job_id);
    form.append('name', name);
    form.append('email', email);
    if (phone)       form.append('phone', phone);
    if (resumeFile)  form.append('resume', resumeFile);
    if (resume_text) form.append('resume_text', resume_text);
    return formReq('/apply', form);
  },

  // ── Applications
  getApplications: (sort='score') => req(`/applications?sort=${sort}`),
  updateStatus: (id, status, notes) => req(`/applications/${id}/status`, {
    method:'PATCH', body:JSON.stringify({ status, recruiter_notes:notes }),
  }),
  getStats: () => req('/stats'),

  // ── Mock Interview (FIXED — was missing, called as api.mockInterview in App.jsx)
  mockInterview: ({ jobTitle, resumeFile, resume_text }) => {
    const form = new FormData();
    if (jobTitle)    form.append('job_title', jobTitle);
    if (resume_text) form.append('resume_text', resume_text);
    if (resumeFile)  form.append('resume', resumeFile);
    return formReq('/mock-interview', form);
  },

  // ── Premium
  getSkillsGap: ({ job_id, resume_text, resumeFile, job_title }) => {
    const form = new FormData();
    if (job_id)      form.append('job_id', job_id);
    if (resume_text) form.append('resume_text', resume_text);
    if (resumeFile)  form.append('resume', resumeFile);
    if (job_title)   form.append('job_title', job_title);
    return formReq('/skills-gap', form);
  },
  buildResume:      (data) => req('/build-resume',        { method:'POST', body:JSON.stringify(data) }),
  createOrder:      (plan) => req('/payment/create-order',{ method:'POST', body:JSON.stringify({ plan }) }),
  verifyPayment:    (data) => req('/payment/verify',      { method:'POST', body:JSON.stringify(data) }),
  subscribeWhatsApp:(phone, name) => req('/subscribe/whatsapp', { method:'POST', body:JSON.stringify({ phone, name }) }),
};