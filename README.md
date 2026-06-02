# ⚡ TalentAI — AI-Powered Job Portal

A full-stack job portal with AI resume screening using Claude AI.

---

## 📁 Project Structure

```
talentai/
├── backend/               ← Node.js + Express + PostgreSQL
│   ├── server.js          ← Main API server (all routes)
│   ├── schema.sql         ← Database tables + seed jobs
│   ├── scripts/
│   │   └── setupDb.js     ← Auto DB setup script
│   ├── package.json
│   └── .env.example       ← Copy to .env and fill values
│
└── frontend/              ← React + Vite
    ├── src/
    │   ├── App.jsx        ← Main React app
    │   ├── api.js         ← API client (talks to backend)
    │   ├── main.jsx       ← React entry point
    │   └── index.css      ← Global styles
    ├── index.html
    ├── vite.config.js
    └── .env.example       ← Copy to .env and fill values
```

---

## 🚀 STEP-BY-STEP SETUP

### Prerequisites
- [Node.js v18+](https://nodejs.org)
- [PostgreSQL 16+](https://www.postgresql.org/download/)

---

### STEP 1 — Install PostgreSQL

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu / Linux:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download from https://www.postgresql.org/download/windows/ and install.

---

### STEP 2 — Create Database

Open terminal and run:

```bash
# Open PostgreSQL shell
psql -U postgres

# Run these 3 commands inside psql:
CREATE USER talentai_user WITH PASSWORD 'TalentAI@2025';
CREATE DATABASE talentai OWNER talentai_user;
GRANT ALL PRIVILEGES ON DATABASE talentai TO talentai_user;

# Exit psql
\q
```

---

### STEP 3 — Set Up Backend

```bash
# Go to backend folder
cd talentai/backend

# Install dependencies
npm install

# Copy env file
cp .env.example .env
```

Now open `.env` in any text editor and fill in:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=talentai
DB_USER=talentai_user
DB_PASSWORD=TalentAI@2025

# Generate a JWT secret (run this and paste output):
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your_generated_secret_here

# Get from: https://console.anthropic.com
GROQ_API_KEY=your-key-here

FRONTEND_URL=http://localhost:5173
```

---

### STEP 4 — Run Database Schema

```bash
# Still in backend/ folder
# This creates tables and adds 4 sample jobs:
psql -h localhost -U talentai_user -d talentai -f schema.sql

# When prompted: enter password TalentAI@2025
# You should see: "Schema created and seed data inserted!"
```

---

### STEP 5 — Start Backend

```bash
# In backend/ folder
npm start

# You should see:
# ✅  PostgreSQL connected
# 🚀  TalentAI backend running at http://localhost:4000
```

**Test it:**
```bash
curl http://localhost:4000/health
# Should return: {"status":"ok","time":"..."}

curl http://localhost:4000/jobs
# Should return array of 4 jobs
```

---

### STEP 6 — Set Up Frontend

Open a NEW terminal window:

```bash
# Go to frontend folder
cd talentai/frontend

# Install dependencies
npm install

# Copy env file
cp .env.example .env
# .env contains: VITE_API_URL=http://localhost:4000
# (no changes needed for local development)
```

---

### STEP 7 — Start Frontend

```bash
# In frontend/ folder
npm run dev

# Opens at: http://localhost:5173
```

---

### STEP 8 — Create Admin Account

In the browser:
1. Click **"Admin Login"** in the top-right corner
2. Click **"Create Account"** tab
3. Fill name, email, password → click Submit
4. You're now logged into the Admin Dashboard

---

### STEP 9 — Test the Full Flow

1. Go to **Browse Jobs** tab
2. Click any job → click **"Apply with AI Screening"**
3. Fill your name, email
4. **Upload a .txt resume** OR paste resume text
5. Click Submit → AI screens it in ~5 seconds
6. See your score, matched skills, recommendation
7. Go to **Admin Dashboard** to see ranked candidates

---

## 🌐 API Endpoints Reference

| Method | Endpoint                       | Auth   | Description             |
|--------|--------------------------------|--------|-------------------------|
| GET    | /health                        | No     | Health check            |
| POST   | /auth/register                 | No     | Create admin account    |
| POST   | /auth/login                    | No     | Login → get JWT token   |
| GET    | /auth/me                       | Admin  | Get current user        |
| GET    | /jobs                          | No     | List all active jobs    |
| GET    | /jobs/:id                      | No     | Get one job             |
| POST   | /jobs                          | Admin  | Create new job          |
| PUT    | /jobs/:id                      | Admin  | Update job              |
| DELETE | /jobs/:id                      | Admin  | Deactivate job          |
| POST   | /apply                         | No     | Submit + AI screen      |
| GET    | /applications                  | Admin  | List all candidates     |
| GET    | /applications/:id              | Admin  | Get one candidate       |
| PATCH  | /applications/:id/status       | Admin  | Update candidate status |
| GET    | /stats                         | Admin  | Dashboard statistics    |

---

## 🗄️ Database Tables

| Table        | What it stores                                      |
|-------------|-----------------------------------------------------|
| users        | Admin accounts (email, hashed password, role)       |
| jobs         | Job listings (title, skills, requirements, salary)  |
| applications | Candidate submissions + full AI screening results   |

---

## ☁️ AWS Deployment (Quick Reference)

| What          | AWS Service        | Steps                                      |
|---------------|--------------------|--------------------------------------------|
| Database      | RDS (PostgreSQL)   | Create → get endpoint → run schema.sql     |
| Backend API   | EC2 t3.small       | Upload files → npm install → pm2 start     |
| Frontend      | S3 + CloudFront    | npm run build → aws s3 sync dist/ s3://... |

Update `.env` on EC2 with RDS endpoint. Update `VITE_API_URL` to EC2 IP before building frontend.

---

## 🔑 Environment Variables Summary

### Backend (.env)
| Variable          | Description                          |
|-------------------|--------------------------------------|
| PORT              | Server port (default: 4000)          |
| DB_HOST           | PostgreSQL host (localhost or RDS)   |
| DB_PORT           | PostgreSQL port (5432)               |
| DB_NAME           | Database name (talentai)             |
| DB_USER           | Database user                        |
| DB_PASSWORD       | Database password                    |
| JWT_SECRET        | Secret for signing JWT tokens        |
| GROQ_API_KEY      | Your Groq API key                    |
| FRONTEND_URL      | Frontend URL for CORS                |

### Frontend (.env)
| Variable      | Description                           |
|---------------|---------------------------------------|
| VITE_API_URL  | Backend URL (http://localhost:4000)   |

---

## ❓ Troubleshooting

**"PostgreSQL connected" error?**
→ Make sure PostgreSQL is running: `brew services start postgresql@15` (mac) or `sudo systemctl start postgresql` (linux)
→ Verify DB_PASSWORD in .env matches what you set

**"Cannot find module" error?**
→ Run `npm install` in the backend/ folder

**AI screening returns error?**
→ Check GROQ_API_KEY in .env is valid
→ Get key from https://console.groq.com

**Frontend can't reach backend?**
→ Make sure backend is running on port 4000
→ Check VITE_API_URL in frontend/.env = http://localhost:4000
