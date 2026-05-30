// ============================================================
//  ai-screener.js  —  Local NLP Resume Screener
//  Zero external API calls. No API key required.
//  Uses keyword extraction, skill matching, and scoring rules.
// ============================================================

// ── Synonym map — expands skill matching ────────────────────
const SKILL_SYNONYMS = {
  'react':          ['reactjs', 'react.js', 'react js'],
  'node.js':        ['nodejs', 'node js', 'express', 'expressjs'],
  'typescript':     ['ts', 'typed javascript'],
  'javascript':     ['js', 'es6', 'es2015', 'ecmascript'],
  'python':         ['py', 'python3', 'python2'],
  'postgresql':     ['postgres', 'psql', 'pg'],
  'mysql':          ['mariadb'],
  'mongodb':        ['mongo', 'mongoose'],
  'kubernetes':     ['k8s', 'kube'],
  'docker':         ['containerization', 'containers'],
  'aws':            ['amazon web services', 'ec2', 's3', 'lambda', 'rds', 'cloudfront'],
  'graphql':        ['gql'],
  'pytorch':        ['torch'],
  'tensorflow':     ['tf', 'keras'],
  'machine learning': ['ml', 'deep learning', 'neural network', 'neural networks'],
  'llms':           ['large language models', 'gpt', 'transformers', 'bert', 'llm'],
  'ci/cd':          ['continuous integration', 'continuous deployment', 'github actions', 'jenkins', 'circleci'],
  'terraform':      ['iac', 'infrastructure as code'],
  'agile':          ['scrum', 'kanban', 'sprint'],
  'sql':            ['mysql', 'postgresql', 'sqlite', 'oracle'],
  'rest':           ['rest api', 'restful', 'http api'],
  'css':            ['scss', 'sass', 'less', 'tailwind', 'styled-components'],
  'java':           ['spring', 'spring boot', 'jvm'],
  'go':             ['golang'],
};

// ── Positive signal keywords ─────────────────────────────────
const SENIORITY_KEYWORDS = {
  senior:  ['senior', 'sr.', 'lead', 'principal', 'staff', 'architect', 'head of'],
  mid:     ['mid', 'intermediate', 'ii', 'iii'],
  junior:  ['junior', 'jr.', 'associate', 'entry', 'intern', 'graduate'],
};

const ACHIEVEMENT_KEYWORDS = [
  'reduced', 'improved', 'increased', 'built', 'architected', 'launched', 'shipped',
  'led', 'managed', 'delivered', 'optimized', 'scaled', 'designed', 'created',
  'developed', 'implemented', 'deployed', 'migrated', 'automated', 'saved',
  '%', 'million', 'billion', 'users', 'revenue', 'cost', 'latency', 'performance',
];

const EDUCATION_KEYWORDS = {
  phd:        ['ph.d', 'phd', 'doctorate', 'doctoral'],
  masters:    ['master', 'm.s.', 'msc', 'm.eng', 'mba'],
  bachelors:  ['bachelor', 'b.s.', 'b.e.', 'b.tech', 'bsc', 'b.sc'],
  relevant:   ['computer science', 'software engineering', 'information technology',
               'electrical engineering', 'mathematics', 'statistics', 'data science',
               'artificial intelligence', 'machine learning'],
};

// ── Normalize text for matching ──────────────────────────────
function normalize(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Extract years of experience ──────────────────────────────
function extractYearsOfExperience(resumeText) {
  const text = normalize(resumeText);

  // Pattern: "X years of experience" or "X+ years"
  const patterns = [
    /(\d+)\+?\s*years?\s+(?:of\s+)?(?:professional\s+)?experience/g,
    /(\d+)\+?\s*years?\s+(?:working|in|as)/g,
    /experience\s+(?:of\s+)?(\d+)\+?\s*years?/g,
  ];

  const found = [];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const n = parseInt(match[1], 10);
      if (n > 0 && n < 50) found.push(n);
    }
  }

  // Fallback: count year ranges (2019 - 2024 = 5 years)
  if (found.length === 0) {
    const yearRanges = text.match(/20(\d{2})\s*[-–]\s*(?:20(\d{2})|present|current|now)/g) || [];
    const currentYear = new Date().getFullYear();
    let totalYears = 0;
    for (const range of yearRanges) {
      const nums = range.match(/\d{4}/g);
      if (nums) {
        const start = parseInt(nums[0], 10);
        const end   = nums[1] ? parseInt(nums[1], 10) : currentYear;
        totalYears += Math.max(0, end - start);
      }
    }
    if (totalYears > 0) found.push(Math.min(totalYears, 40));
  }

  return found.length > 0 ? Math.max(...found) : null;
}

// ── Skill matching with synonyms ─────────────────────────────
function matchSkills(requiredSkills, resumeText) {
  const text = normalize(resumeText);
  const matched = [];
  const missing = [];

  for (const skill of requiredSkills) {
    const skillLower   = skill.toLowerCase();
    const allVariants  = [skillLower, ...(SKILL_SYNONYMS[skillLower] || [])];
    const found        = allVariants.some(v => text.includes(v));
    (found ? matched : missing).push(skill);
  }

  return { matched, missing };
}

// ── Extract achievement bullets ──────────────────────────────
function extractAchievements(resumeText) {
  const text     = normalize(resumeText);
  const achieved = ACHIEVEMENT_KEYWORDS.filter(kw => text.includes(kw));
  return achieved.length;
}

// ── Detect education level ────────────────────────────────────
function detectEducation(resumeText) {
  const text = normalize(resumeText);
  if (EDUCATION_KEYWORDS.phd.some(k => text.includes(k)))       return 'PhD';
  if (EDUCATION_KEYWORDS.masters.some(k => text.includes(k)))   return 'Masters';
  if (EDUCATION_KEYWORDS.bachelors.some(k => text.includes(k))) return 'Bachelors';
  return 'Not specified';
}

// ── Detect seniority level ────────────────────────────────────
function detectSeniority(resumeText) {
  const text = normalize(resumeText);
  if (SENIORITY_KEYWORDS.senior.some(k => text.includes(k))) return 'senior';
  if (SENIORITY_KEYWORDS.junior.some(k => text.includes(k))) return 'junior';
  return 'mid';
}

// ── Extract strengths ─────────────────────────────────────────
function extractStrengths(resumeText, matchedSkills, yearsExp, education, achievementCount) {
  const strengths = [];

  if (matchedSkills.length >= 3)
    strengths.push(`Strong skill alignment — matches ${matchedSkills.length} of the required technologies`);

  if (yearsExp && yearsExp >= 5)
    strengths.push(`${yearsExp}+ years of experience demonstrates deep industry knowledge`);
  else if (yearsExp && yearsExp >= 2)
    strengths.push(`${yearsExp} years of hands-on experience in the field`);

  if (achievementCount >= 4)
    strengths.push('Resume shows strong results-driven approach with quantified achievements');
  else if (achievementCount >= 2)
    strengths.push('Demonstrates impact through measurable outcomes');

  if (education === 'PhD')
    strengths.push('PhD-level academic background adds strong research capability');
  else if (education === 'Masters')
    strengths.push('Masters degree shows advanced academic grounding');

  const text = normalize(resumeText);
  if (text.includes('open source') || text.includes('github') || text.includes('contributor'))
    strengths.push('Open-source contributions indicate community engagement and coding initiative');

  if (text.includes('team') || text.includes('mentor') || text.includes('collaborat'))
    strengths.push('Shows team-oriented mindset and collaborative working style');

  return strengths.slice(0, 4);
}

// ── Extract concerns ──────────────────────────────────────────
function extractConcerns(missingSkills, yearsExp, requiredSkills) {
  const concerns = [];

  if (missingSkills.length > 0)
    concerns.push(`Missing key skills: ${missingSkills.slice(0, 3).join(', ')}`);

  if (yearsExp !== null && yearsExp < 2)
    concerns.push('Limited years of experience — may need closer mentoring');

  if (yearsExp === null)
    concerns.push('Years of experience not clearly stated in the resume');

  const matchRate = (requiredSkills.length - missingSkills.length) / requiredSkills.length;
  if (matchRate < 0.5)
    concerns.push('Skill overlap with requirements is below 50% — significant gaps present');

  return concerns.slice(0, 3);
}

// ── Generate interview questions ─────────────────────────────
function generateInterviewQuestions(matchedSkills, missingSkills, jobTitle) {
  const questions = [];

  if (matchedSkills[0])
    questions.push(`Walk me through a complex project where you used ${matchedSkills[0]} in production — what challenges did you face?`);

  if (matchedSkills[1])
    questions.push(`How have you used ${matchedSkills[1]} to solve a real business problem? What was the outcome?`);

  if (missingSkills[0])
    questions.push(`We use ${missingSkills[0]} heavily in this role. How quickly do you pick up new technologies, and what's your plan to get up to speed?`);

  questions.push(`What attracted you to this ${jobTitle} role, and what makes you a strong fit for our team?`);

  return questions.slice(0, 3);
}

// ── MAIN SCREENING FUNCTION ───────────────────────────────────
// Drop-in replacement for the Anthropic API call
// Same input/output format — no API key needed
function screenResume(resumeText, job) {
  const requiredSkills = job.skills || [];
  const yearsExp       = extractYearsOfExperience(resumeText);
  const education      = detectEducation(resumeText);
  const seniority      = detectSeniority(resumeText);
  const achievementCnt = extractAchievements(resumeText);

  const { matched: matchedSkills, missing: missingSkills } = matchSkills(requiredSkills, resumeText);

  // ── Scoring ────────────────────────────────────────────────
  let score = 0;

  // 1. Skill match (50 points max)
  const skillRate = requiredSkills.length > 0 ? matchedSkills.length / requiredSkills.length : 0;
  score += Math.round(skillRate * 50);

  // 2. Experience (20 points max)
  if (yearsExp !== null) {
    if (yearsExp >= 7)      score += 20;
    else if (yearsExp >= 5) score += 16;
    else if (yearsExp >= 3) score += 12;
    else if (yearsExp >= 1) score += 7;
    else                    score += 3;
  }

  // 3. Achievements (15 points max)
  score += Math.min(achievementCnt * 3, 15);

  // 4. Education (10 points max)
  if      (education === 'PhD')       score += 10;
  else if (education === 'Masters')   score += 8;
  else if (education === 'Bachelors') score += 6;
  else                                score += 2;

  // 5. Seniority match bonus (5 points)
  if (seniority === 'senior' && (job.title || '').toLowerCase().includes('senior')) score += 5;
  else if (seniority === 'mid')  score += 3;
  else                           score += 1;

  score = Math.min(100, Math.max(0, score));

  // ── Verdict & Recommendation ───────────────────────────────
  let verdict, recommendation;
  if (score >= 80) { verdict = 'Strong Match'; recommendation = 'Advance to Interview'; }
  else if (score >= 65) { verdict = 'Good Match'; recommendation = 'Advance to Interview'; }
  else if (score >= 45) { verdict = 'Partial Match'; recommendation = 'Hold'; }
  else                  { verdict = 'Low Match'; recommendation = 'Reject'; }

  // ── Summary ────────────────────────────────────────────────
  const expStr  = yearsExp ? `${yearsExp} years of experience` : 'experience level unclear';
  const skillStr = matchedSkills.length > 0
    ? `demonstrates proficiency in ${matchedSkills.slice(0, 3).join(', ')}`
    : 'does not clearly demonstrate the required technical skills';

  const summary = `Candidate ${skillStr} and has ${expStr}. ` +
    `Education: ${education}. ` +
    (missingSkills.length > 0
      ? `Key gaps include ${missingSkills.slice(0, 2).join(' and ')}.`
      : 'All required skills appear to be covered.');

  const strengths       = extractStrengths(resumeText, matchedSkills, yearsExp, education, achievementCnt);
  const concerns        = extractConcerns(missingSkills, yearsExp, requiredSkills);
  const interviewQuestions = generateInterviewQuestions(matchedSkills, missingSkills, job.title);

  return {
    score,
    verdict,
    summary,
    matched_skills:       matchedSkills,
    missing_skills:       missingSkills,
    experience_years:     yearsExp,
    strengths,
    concerns,
    recommendation,
    interview_questions:  interviewQuestions,
  };
}

module.exports = { screenResume };