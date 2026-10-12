/**
 * Résumé ↔ job matching.
 *
 * The score answers one question: if this job's keywords were fed to an ATS,
 * how much of them does the CV actually contain? It is built from four
 * signals, and it always returns the hits and misses so the UI can show which
 * words to add rather than only a percentage.
 */

import { extractKeywords, resumeToText } from "./ats.js";

const SENIORITY_RANK = { INTERN: 0, JUNIOR: 1, MID: 2, SENIOR: 3, LEAD: 4 };

const SYNONYMS = {
  js: ["javascript"],
  javascript: ["js"],
  ts: ["typescript"],
  typescript: ["ts"],
  "next.js": ["next", "nextjs"],
  nextjs: ["next.js", "next"],
  react: ["reactjs", "react.js"],
  reactjs: ["react"],
  "node.js": ["node", "nodejs"],
  nodejs: ["node.js", "node"],
  postgres: ["postgresql"],
  postgresql: ["postgres"],
  tailwind: ["tailwindcss", "tailwind css"],
  "tailwind css": ["tailwind", "tailwindcss"],
  "rest api": ["rest", "rest apis", "api"],
  csharp: ["c#"],
  "c#": ["csharp", ".net"],
  dotnet: [".net", "asp.net"],
  k8s: ["kubernetes"],
  kubernetes: ["k8s"],
};

function normalise(value) {
  return String(value || "").trim().toLowerCase();
}

function expand(term) {
  const base = normalise(term);
  return new Set([base, ...(SYNONYMS[base] || [])]);
}

/** The keywords a job post is really screening for, strongest first. */
export function jobKeywords(job = {}) {
  const tagged = (job.tags || []).map(normalise).filter(Boolean);
  // Joined as sentences: otherwise the first word of each requirement line
  // reads as a mid-sentence proper noun and lands in the keyword list.
  const required = (job.requirements || []).join(". ");
  const fromText = extractKeywords(`${job.title || ""}. ${required}. ${job.description || ""}`);

  const seen = new Set();
  const out = [];
  for (const word of [...tagged, ...fromText]) {
    if (!word || seen.has(word)) continue;
    seen.add(word);
    out.push(word);
  }
  return out.slice(0, 28);
}

/**
 * @returns {{ score: number, hits: string[], misses: string[], signals: object[], verdict: string }}
 */
export function matchResumeToJob(resume, job) {
  if (!resume || !job) {
    return { score: 0, hits: [], misses: [], signals: [], verdict: "Add a CV to see your match." };
  }

  const haystackText = normalise(resumeToText(resume));
  const resumeSkills = new Set((resume.skills || []).map(normalise).filter(Boolean));
  const keywords = jobKeywords(job);

  const contains = (term) => {
    for (const variant of expand(term)) {
      if (!variant) continue;
      if (resumeSkills.has(variant)) return true;
      // whole-word-ish test so "go" does not match "google"
      const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(haystackText)) return true;
    }
    return false;
  };

  const hits = [];
  const misses = [];
  for (const keyword of keywords) {
    (contains(keyword) ? hits : misses).push(keyword);
  }

  // 1. keyword coverage (55) — weighted towards the first, most specific terms
  const weighted = keywords.map((kw, index) => ({ kw, weight: index < 10 ? 2 : 1 }));
  const weightTotal = weighted.reduce((sum, item) => sum + item.weight, 0) || 1;
  const weightHit = weighted
    .filter((item) => hits.includes(item.kw))
    .reduce((sum, item) => sum + item.weight, 0);
  const coverage = (weightHit / weightTotal) * 55;

  // 2. title alignment (15)
  const titleWords = extractKeywords(job.title || "");
  const titleHits = titleWords.filter(contains).length;
  const titleScore = titleWords.length ? (titleHits / titleWords.length) * 15 : 7;

  // 3. seniority fit (15)
  const resumeYears = estimateYears(resume);
  const wanted = SENIORITY_RANK[job.seniority] ?? 2;
  const held = yearsToRank(resumeYears);
  const gap = Math.abs(held - wanted);
  const seniorityScore = [15, 11, 6, 3, 1][Math.min(gap, 4)];

  // 4. location / work mode (15)
  let locationScore = 8;
  if (job.workMode === "REMOTE") {
    locationScore = 15;
  } else if (resume.location) {
    const city = normalise(resume.location).split(/[,(]/)[0].trim();
    const jobCity = normalise(job.location).split(/[,(]/)[0].trim();
    if (city && jobCity && (jobCity.includes(city) || city.includes(jobCity))) locationScore = 15;
    else if (job.workMode === "HYBRID") locationScore = 6;
    else locationScore = 4;
  }

  const score = Math.max(
    0,
    Math.min(100, Math.round(coverage + titleScore + seniorityScore + locationScore)),
  );

  const signals = [
    { id: "keywords", label: "Keyword coverage", points: Math.round(coverage), max: 55 },
    { id: "title", label: "Title alignment", points: Math.round(titleScore), max: 15 },
    { id: "seniority", label: "Seniority fit", points: seniorityScore, max: 15 },
    { id: "location", label: "Location and mode", points: locationScore, max: 15 },
  ];

  return { score, hits, misses: misses.slice(0, 12), signals, verdict: verdictFor(score) };
}

function verdictFor(score) {
  if (score >= 80) return "Strong match — apply with this CV.";
  if (score >= 60) return "Good match. Add the missing keywords first.";
  if (score >= 40) return "Partial match. Your CV is missing several requirements.";
  return "Weak match. This role asks for skills your CV does not show.";
}

export function matchTone(score) {
  if (score >= 80) return "positive";
  if (score >= 60) return "mark";
  if (score >= 40) return "warning";
  return "danger";
}

function yearsToRank(years) {
  if (years < 1) return 0;
  if (years < 2) return 1;
  if (years < 5) return 2;
  if (years < 8) return 3;
  return 4;
}

/** Rough total years of experience from the dates on each role. */
export function estimateYears(resume = {}) {
  let months = 0;
  for (const role of resume.experience || []) {
    const start = parseYearMonth(role.startDate);
    const end = role.current ? new Date() : parseYearMonth(role.endDate) || new Date();
    if (!start) continue;
    const diff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (diff > 0) months += diff;
  }
  return Math.round((months / 12) * 10) / 10;
}

function parseYearMonth(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  if (/^(present|current|now)$/i.test(text)) return new Date();

  const iso = text.match(/^(\d{4})-(\d{1,2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, 1);

  const monthName = text.match(
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})$/i,
  );
  if (monthName) {
    const index = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
      .indexOf(monthName[1].toLowerCase());
    return new Date(Number(monthName[2]), index, 1);
  }

  const year = text.match(/(\d{4})/);
  return year ? new Date(Number(year[1]), 0, 1) : null;
}

/** Attaches match data to a list of jobs. Jobs are returned unchanged if no CV. */
export function annotateJobsWithMatch(jobs, resume) {
  if (!resume) return jobs.map((job) => ({ ...job, match: null }));
  return jobs.map((job) => {
    const { score, hits, misses } = matchResumeToJob(resume, job);
    return { ...job, match: { score, hits: hits.slice(0, 8), misses: misses.slice(0, 6) } };
  });
}
