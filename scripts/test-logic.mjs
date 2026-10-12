/* Unit checks for the pure scoring / parsing modules. Run: node scripts/test-logic.mjs */
import assert from "node:assert/strict";

import { scoreResume, extractKeywords, resumeToText } from "../lib/ats.js";
import { matchResumeToJob, estimateYears, jobKeywords } from "../lib/match.js";
import { optimizeBullet, draftSummary } from "../lib/optimize.js";
import { parseResumeText } from "../lib/resume-parse.js";
import { parse, registerSchema, loginSchema, jobSchema, resumeSchema } from "../lib/validation.js";

let passed = 0;
const check = (name, fn) => {
  try {
    fn();
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (error) {
    console.error(`  FAIL ${name}\n       ${error.message}`);
    process.exitCode = 1;
  }
};

const strongResume = {
  fullName: "Luka Danelia",
  headline: "Full-stack developer",
  email: "luka@example.com",
  phone: "+995 555 12 34 56",
  location: "Tbilisi, Georgia",
  summary:
    "Full-stack developer building Next.js and ASP.NET applications for public-sector teams. I care about accessible interfaces, measurable performance work and clean API design across the stack.",
  skills: ["React", "Next.js", "JavaScript", "Tailwind CSS", "Node.js", "REST API", "SQL", "C#"],
  experience: [
    {
      id: "1",
      role: "Web developer intern",
      company: "MEPA",
      startDate: "Jun 2024",
      endDate: "Present",
      current: true,
      achievements: [
        "Built an internal intranet in ASP.NET MVC used by 400 staff each week.",
        "Reduced page load time by 38% by removing render-blocking scripts.",
      ],
    },
  ],
  education: [{ id: "1", degree: "BSc Computer Science", school: "IBSU", endDate: "2026" }],
  projects: [],
  languages: [],
  certifications: [],
};

const emptyResume = {
  fullName: "",
  skills: [],
  experience: [],
  education: [],
};

console.log("ATS scoring");
check("a complete CV scores high", () => {
  const report = scoreResume(strongResume);
  assert.ok(report.score >= 80, `expected >= 80, got ${report.score}`);
  assert.equal(report.checks.length, 6);
  // Skills keep the casing the user typed; everything else is normalised.
  assert.ok(report.keywords.map((k) => k.toLowerCase()).includes("next.js"));
});
check("an empty CV scores low and lists fixes", () => {
  const report = scoreResume(emptyResume);
  assert.ok(report.score <= 25, `expected <= 25, got ${report.score}`);
  assert.ok(report.fixes.length >= 4);
});
check("score stays within 0-100 for junk input", () => {
  for (const input of [{}, null, undefined, { skills: ["a"] }]) {
    const report = scoreResume(input || {});
    assert.ok(report.score >= 0 && report.score <= 100);
  }
});
check("resumeToText includes achievements", () => {
  assert.match(resumeToText(strongResume), /render-blocking/);
});
check("extractKeywords keeps technology, drops prose", () => {
  const words = extractKeywords("The team was responsible for the React and Node.js services");
  assert.ok(!words.includes("the"));
  assert.ok(!words.includes("responsible"));
  assert.ok(words.includes("react"));
  assert.ok(words.includes("node.js"));
});

check("extractKeywords rejects generic job-post words", () => {
  const words = extractKeywords("Basic knowledge of our systems. Two years of experience in a team.");
  for (const noise of ["basic", "knowledge", "two", "systems", "team"]) {
    assert.ok(!words.includes(noise), `"${noise}" should not be a keyword`);
  }
});

check("indexable keywords exclude the contact block", () => {
  const report = scoreResume(strongResume);
  const lower = report.keywords.map((k) => k.toLowerCase());
  assert.ok(!lower.includes("tbilisi"), "a city is not a skill");
  assert.ok(!lower.includes("danelia"), "a surname is not a skill");
});

console.log("Job matching");
const job = {
  title: "Frontend developer (React)",
  company: "Acme",
  location: "Tbilisi, Georgia",
  workMode: "HYBRID",
  seniority: "JUNIOR",
  tags: ["React", "Next.js", "Tailwind CSS", "TypeScript"],
  requirements: ["2 years with React", "Experience with REST APIs"],
  description: "You will build interfaces with React, Next.js and Tailwind CSS.",
};
check("matching CV scores well and reports hits", () => {
  const result = matchResumeToJob(strongResume, job);
  assert.ok(result.score >= 60, `expected >= 60, got ${result.score}`);
  assert.ok(result.hits.includes("react"));
  assert.ok(result.misses.includes("typescript"));
});
check("empty CV scores poorly", () => {
  const result = matchResumeToJob(emptyResume, job);
  assert.ok(result.score < 45, `expected < 45, got ${result.score}`);
});
check("synonyms count as a hit (js -> javascript)", () => {
  const result = matchResumeToJob(
    { skills: ["JavaScript"], experience: [], education: [] },
    { title: "JS developer", tags: ["js"], requirements: [], description: "js work" },
  );
  assert.ok(result.hits.includes("js") || result.hits.includes("javascript"));
});
check("missing CV or job is handled", () => {
  assert.equal(matchResumeToJob(null, job).score, 0);
  assert.equal(matchResumeToJob(strongResume, null).score, 0);
});
check("estimateYears reads date ranges", () => {
  const years = estimateYears({
    experience: [{ startDate: "Jan 2022", endDate: "Jan 2024" }],
  });
  assert.ok(years >= 1.9 && years <= 2.1, `got ${years}`);
});
check("jobKeywords puts tags first", () => {
  assert.equal(jobKeywords(job)[0], "react");
});

console.log("Bullet optimiser");
check("rewrites a passive opener", () => {
  const result = optimizeBullet("Responsible for the website redesign", { keywords: ["Figma"] });
  assert.match(result.optimized, /^Owned/);
  assert.ok(result.changed);
  assert.ok(result.notes.some((n) => n.includes("No number")));
});
check("keeps a strong bullet intact", () => {
  const result = optimizeBullet("Reduced build time by 42% by caching dependencies");
  assert.ok(result.hasNumber);
  assert.match(result.optimized, /^Reduced/);
});
check("handles empty input", () => {
  assert.equal(optimizeBullet("").optimized, "");
});
check("draftSummary uses real CV content", () => {
  const summary = draftSummary(strongResume);
  assert.match(summary, /Full-stack developer/);
  assert.match(summary, /React/);
});

console.log("Résumé parsing");
const sample = `Luka Danelia
Full-stack Web Developer
luka.danelia@example.com | +995 555 123 456
Tbilisi, Georgia
https://github.com/lukadanelia

SUMMARY
Fourth-year computer science student building web applications with React and Next.js.

EXPERIENCE
Web Developer Intern at MEPA  Jun 2024 - Present
• Built an ASP.NET MVC intranet used by 400 staff
• Reduced page load time by 38%

Frontend Developer at NRSA  Feb 2023 - May 2024
• Created a JSON-driven form system with 24 government forms

EDUCATION
BSc Computer Science, International Black Sea University  2022 - 2026

SKILLS
React, Next.js, JavaScript, Tailwind CSS, Node.js, SQL, C#

LANGUAGES
Georgian (Native), English (Fluent)
`;
check("extracts the contact block", () => {
  const { resume } = parseResumeText(sample);
  assert.equal(resume.fullName, "Luka Danelia");
  assert.equal(resume.email, "luka.danelia@example.com");
  assert.match(resume.phone, /995/);
  assert.equal(resume.location, "Tbilisi, Georgia");
  assert.match(resume.website, /github\.com/);
});
check("extracts summary, skills and roles", () => {
  const { resume, diagnostics } = parseResumeText(sample);
  assert.match(resume.summary, /Fourth-year/);
  assert.ok(resume.skills.includes("React"));
  assert.ok(resume.skills.includes("Tailwind CSS"));
  assert.equal(resume.experience.length, 2);
  assert.equal(resume.experience[0].company, "MEPA");
  assert.ok(resume.experience[0].current);
  assert.equal(resume.experience[0].achievements.length, 2);
  assert.ok(resume.education.length >= 1);
  assert.ok(diagnostics.detected.includes("skills"));
});
check("parses languages with levels", () => {
  const { resume } = parseResumeText(sample);
  assert.ok(resume.languages.some((l) => l.name.includes("Georgian")));
});
check("empty text does not throw", () => {
  const { resume } = parseResumeText("");
  assert.equal(resume.fullName, "");
  assert.deepEqual(resume.skills, []);
});
check("parsed CV flows into the scorer", () => {
  const { resume } = parseResumeText(sample);
  const report = scoreResume(resume);
  assert.ok(report.score > 50, `got ${report.score}`);
});

console.log("Validation");
check("register rejects a weak password", () => {
  assert.ok(parse(registerSchema, { name: "Ab", email: "a@b.co", password: "short" }).error);
});
check("register accepts a good payload and lowercases email", () => {
  const { data, error } = parse(registerSchema, {
    name: "Luka Danelia",
    email: "LUKA@Example.COM ",
    password: "Password1",
  });
  assert.equal(error, undefined);
  assert.equal(data.email, "luka@example.com");
});
check("login requires both fields", () => {
  assert.ok(parse(loginSchema, { email: "", password: "" }).error);
});
check("job schema coerces salary strings and checks order", () => {
  const good = parse(jobSchema, {
    title: "React developer",
    company: "Acme",
    location: "Tbilisi",
    description: "A".repeat(40),
    salaryMin: "$1,000",
    salaryMax: "2000",
  });
  assert.equal(good.error, undefined);
  assert.equal(good.data.salaryMin, 1000);
  const bad = parse(jobSchema, {
    title: "React developer",
    company: "Acme",
    location: "Tbilisi",
    description: "A".repeat(40),
    salaryMin: 5000,
    salaryMax: 1000,
  });
  assert.ok(bad.error);
});
check("resume schema accepts an empty email", () => {
  assert.equal(parse(resumeSchema, { email: "", skills: [] }).error, undefined);
});

console.log(`\n${passed} checks passed`);
