// ── API Client ────────────────────────────────────────────────
const BASE = import.meta.env.VITE_API_URL || 'https://talentai-job-portal.onrender.com';
async function req(path, opts = {}) {
  const token = localStorage.getItem('talentai_token');
  const res   = await fetch(`${BASE}${path}`, {
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

export const api = {
  // Auth
  login:    (email, password) => req('/auth/login',    { method:'POST', body: JSON.stringify({ email, password }) }),
  register: (name, email, password) => req('/auth/register', { method:'POST', body: JSON.stringify({ name, email, password }) }),
  me:       () => req('/auth/me'),
  saveToken:(t) => localStorage.setItem('talentai_token', t),
  clearToken:()  => localStorage.removeItem('talentai_token'),
  getToken:  ()  => localStorage.getItem('talentai_token'),

  // Jobs
  getJobs:   (filters={}) => req('/jobs?' + new URLSearchParams(filters)),
  getJob:    (id)          => req(`/jobs/${id}`),
  createJob: (data)        => req('/jobs', { method:'POST', body: JSON.stringify(data) }),
  updateJob: (id, data)    => req(`/jobs/${id}`, { method:'PUT', body: JSON.stringify(data) }),
  deleteJob: (id)          => req(`/jobs/${id}`, { method:'DELETE' }),

  // Applications
  apply: async ({ job_id, name, email, phone, cover_letter, resumeFile, resume_text }) => {
    const token = localStorage.getItem('talentai_token');
    const form  = new FormData();
    form.append('job_id', job_id);
    form.append('name', name);
    form.append('email', email);
    if (phone)        form.append('phone', phone);
    if (cover_letter) form.append('cover_letter', cover_letter);
    if (resumeFile)   form.append('resume', resumeFile);
    if (resume_text)  form.append('resume_text', resume_text);
    const res = await fetch(`${BASE}/apply`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Application failed');
    return data;
  },
  getApplications: (filters={}) => req('/applications?' + new URLSearchParams(filters)),
  getApplication:  (id)          => req(`/applications/${id}`),
  updateStatus:    (id, status, notes) => req(`/applications/${id}/status`, {
    method:'PATCH', body: JSON.stringify({ status, recruiter_notes: notes }),
  }),

  // Stats
  getStats: () => req('/stats'),
};
