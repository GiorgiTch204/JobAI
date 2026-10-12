/**
 * ATS scoring.
 *
 * Deterministic, explainable and entirely local — no external API, no API key.
 * The score is the weighted sum of six checks that real applicant-tracking
 * systems and recruiters actually look at. Every check returns the points it
 * awarded plus a sentence explaining how to earn the rest, so the UI can show
 * the user what to fix instead of a bare number.
 */

const ACTION_VERBS = [
  "built", "led", "shipped", "designed", "implemented", "migrated", "automated",
  "reduced", "increased", "improved", "launched", "architected", "optimized",
  "delivered", "owned", "scaled", "refactored", "integrated", "mentored",
  "introduced", "rebuilt", "created", "developed", "maintained", "tested",
  "deployed", "configured", "analysed", "analyzed", "resolved", "streamlined",
];

const WEAK_OPENERS = [
  "responsible for", "worked on", "helped with", "involved in", "duties included",
  "assisted with", "participated in", "tasked with", "in charge of",
];

const BUZZWORDS = [
  "team player", "hard worker", "go-getter", "think outside the box", "synergy",
  "rockstar", "ninja", "guru", "detail-oriented", "self-starter", "results-driven",
];

const WEIGHTS = {
  contact: 15,
  summary: 15,
  skills: 20,
  experience: 25,
  measurable: 15,
  hygiene: 10,
};

export const ATS_MAX = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);

/* -------------------------------------------------------------------------- */
/* helpers                                                                    */
/* -------------------------------------------------------------------------- */

function bulletsOf(resume) {
  return (resume.experience || []).flatMap((item) =>
    (item.achievements || []).map((text) => String(text || "").trim()).filter(Boolean),
  );
}

function hasNumber(text) {
  return /\d/.test(text);
}

function startsWithActionVerb(text) {
  const first = text.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "");
  return ACTION_VERBS.includes(first);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pct(points, max) {
  return max === 0 ? 0 : Math.round((points / max) * 100);
}

/* -------------------------------------------------------------------------- */
/* checks                                                                     */
/* -------------------------------------------------------------------------- */

function checkContact(resume) {
  const fields = [
    ["fullName", Boolean(resume.fullName?.trim())],
    ["email", /\S+@\S+\.\S+/.test(resume.email || "")],
    ["phone", (resume.phone || "").replace(/\D/g, "").length >= 7],
    ["location", Boolean(resume.location?.trim())],
    ["headline", Boolean(resume.headline?.trim())],
  ];
  const filled = fields.filter(([, pass]) => pass);
  const missing = fields.filter(([, pass]) => !pass).map(([key]) => key);
  const points = Math.round((filled.length / fields.length) * WEIGHTS.contact);

  return {
    id: "contact",
    label: "Contact block",
    points,
    max: WEIGHTS.contact,
    detail: missing.length
      ? `Add your ${missing.join(", ")} so a parser can route your file.`
      : "Name, headline, email, phone and location are all readable.",
  };
}

function checkSummary(resume) {
  const summary = (resume.summary || "").trim();
  const words = summary ? summary.split(/\s+/).length : 0;

  let points = 0;
  let detail = "Write a 2–3 sentence summary naming your role and strongest tools.";

  if (words >= 25 && words <= 90) {
    points = WEIGHTS.summary;
    detail = "Your summary is the length recruiters actually read.";
  } else if (words > 90) {
    points = Math.round(WEIGHTS.summary * 0.6);
    detail = `Your summary runs ${words} words. Trim it to about 60.`;
  } else if (words > 0) {
    points = Math.round(WEIGHTS.summary * (words / 25) * 0.7);
    detail = `Your summary is ${words} words. Aim for 25–90.`;
  }

  const buzz = BUZZWORDS.filter((word) => summary.toLowerCase().includes(word));
  if (buzz.length) {
    points = Math.max(0, points - 4);
    detail = `Replace "${buzz[0]}" with something you can prove.`;
  }

  return { id: "summary", label: "Professional summary", points, max: WEIGHTS.summary, detail };
}

function checkSkills(resume) {
  const skills = (resume.skills || []).map((s) => String(s).trim()).filter(Boolean);
  const unique = [...new Set(skills.map((s) => s.toLowerCase()))];

  let points;
  let detail;

  if (unique.length === 0) {
    points = 0;
    detail = "List the tools you work with. Parsers match keywords from this block first.";
  } else if (unique.length < 6) {
    points = Math.round(WEIGHTS.skills * (unique.length / 6) * 0.8);
    detail = `You listed ${unique.length} skills. Eight to sixteen reads best.`;
  } else if (unique.length <= 18) {
    points = WEIGHTS.skills;
    detail = `${unique.length} distinct skills — a healthy keyword surface.`;
  } else {
    points = Math.round(WEIGHTS.skills * 0.75);
    detail = `${unique.length} skills is a long list. Keep the ones you would be interviewed on.`;
  }

  if (skills.length !== unique.length) {
    points = Math.max(0, points - 3);
    detail = "Remove the duplicated skills.";
  }

  return { id: "skills", label: "Skills keywords", points, max: WEIGHTS.skills, detail };
}

function checkExperience(resume) {
  const roles = resume.experience || [];
  const bullets = bulletsOf(resume);

  if (!roles.length) {
    return {
      id: "experience",
      label: "Experience",
      points: 0,
      max: WEIGHTS.experience,
      detail: "Add at least one role. Internships and freelance work count.",
    };
  }

  const complete = roles.filter((r) => r.role?.trim() && r.company?.trim() && r.startDate?.trim());
  const withBullets = roles.filter((r) => (r.achievements || []).filter(Boolean).length >= 2);
  const strongBullets = bullets.filter(startsWithActionVerb);
  const weak = bullets.filter((b) =>
    WEAK_OPENERS.some((opener) => b.toLowerCase().startsWith(opener)),
  );

  const structure = (complete.length / roles.length) * 0.4;
  const depth = (withBullets.length / roles.length) * 0.3;
  const verbs = bullets.length ? (strongBullets.length / bullets.length) * 0.3 : 0;

  let points = Math.round(WEIGHTS.experience * (structure + depth + verbs));
  let detail = "Each role has dates, a company and at least two achievement lines.";

  if (complete.length < roles.length) {
    detail = "Give every role a title, company and start date.";
  } else if (withBullets.length < roles.length) {
    detail = "Write two or more achievement lines per role.";
  } else if (weak.length) {
    detail = `Rewrite ${weak.length} line${weak.length > 1 ? "s" : ""} that start with "${weak[0]
      .toLowerCase()
      .split(" ")
      .slice(0, 2)
      .join(" ")}" — open with a verb instead.`;
    points = Math.max(0, points - 2);
  } else if (bullets.length && strongBullets.length < bullets.length) {
    detail = "Start more lines with an action verb: built, led, reduced, shipped.";
  }

  return { id: "experience", label: "Experience depth", points, max: WEIGHTS.experience, detail };
}

function checkMeasurable(resume) {
  const bullets = bulletsOf(resume);
  if (!bullets.length) {
    return {
      id: "measurable",
      label: "Measurable results",
      points: 0,
      max: WEIGHTS.measurable,
      detail: "Add achievement lines with a number in them: %, time saved, users, revenue.",
    };
  }

  const quantified = bullets.filter(hasNumber);
  const ratio = quantified.length / bullets.length;
  const points = Math.round(WEIGHTS.measurable * clamp(ratio / 0.5, 0, 1));

  return {
    id: "measurable",
    label: "Measurable results",
    points,
    max: WEIGHTS.measurable,
    detail:
      ratio >= 0.5
        ? `${quantified.length} of ${bullets.length} lines carry a number.`
        : `Only ${quantified.length} of ${bullets.length} lines carry a number. Half is the target.`,
  };
}

function checkHygiene(resume) {
  const issues = [];
  const bullets = bulletsOf(resume);

  const long = bullets.filter((b) => b.split(/\s+/).length > 32);
  if (long.length) issues.push(`${long.length} achievement line${long.length > 1 ? "s run" : " runs"} past 32 words`);

  if (!(resume.education || []).length) issues.push("no education entry");

  const first = (resume.fullName || "").trim();
  if (first && first.split(/\s+/).length < 2) issues.push("name looks incomplete");

  const buzz = BUZZWORDS.filter((word) =>
    [resume.summary || "", ...bullets].join(" ").toLowerCase().includes(word),
  );
  if (buzz.length) issues.push(`filler phrase "${buzz[0]}"`);

  const penalty = Math.min(issues.length * 3, WEIGHTS.hygiene);
  return {
    id: "hygiene",
    label: "Formatting hygiene",
    points: WEIGHTS.hygiene - penalty,
    max: WEIGHTS.hygiene,
    detail: issues.length ? `Fix: ${issues.join("; ")}.` : "No formatting problems found.",
  };
}

/* -------------------------------------------------------------------------- */
/* public API                                                                 */
/* -------------------------------------------------------------------------- */

export function gradeFor(score) {
  if (score >= 85) return { grade: "Strong", tone: "positive" };
  if (score >= 70) return { grade: "Solid", tone: "mark" };
  if (score >= 50) return { grade: "Needs work", tone: "warning" };
  return { grade: "Early draft", tone: "danger" };
}

/**
 * @param {object} resume  résumé document (builder shape)
 * @returns {{ score: number, grade: string, tone: string, checks: object[], fixes: string[], wordCount: number, keywords: string[] }}
 */
export function scoreResume(resume = {}) {
  const checks = [
    checkContact(resume),
    checkSummary(resume),
    checkSkills(resume),
    checkExperience(resume),
    checkMeasurable(resume),
    checkHygiene(resume),
  ].map((check) => ({ ...check, percent: pct(check.points, check.max) }));

  const total = checks.reduce((sum, check) => sum + check.points, 0);
  const score = clamp(Math.round((total / ATS_MAX) * 100), 0, 100);

  const fixes = checks
    .filter((check) => check.points < check.max)
    .sort((a, b) => b.max - b.points - (a.max - a.points))
    .map((check) => check.detail);

  const text = resumeToText(resume);

  return {
    score,
    ...gradeFor(score),
    checks,
    fixes,
    wordCount: text ? text.split(/\s+/).filter(Boolean).length : 0,
    keywords: indexableKeywords(resume).slice(0, 24),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * The keywords this CV would actually be matched on: the skills block first,
 * because that is what keyword matching reads, then the technical terms found
 * in the achievement lines and projects. The contact block is deliberately
 * excluded — a city name is not a skill.
 */
export function indexableKeywords(resume = {}) {
  const skills = (resume.skills || [])
    .map((skill) => String(skill).trim())
    .filter(Boolean);

  const body = [
    ...(resume.experience || []).flatMap((role) => [role.role, ...(role.achievements || [])]),
    ...(resume.projects || []).flatMap((project) => [project.name, project.description, ...(project.stack || [])]),
    ...(resume.certifications || []).map((item) => item.name),
    resume.headline,
    resume.summary,
  ]
    .filter(Boolean)
    .join(". ");

  const seen = new Set();
  const out = [];

  for (const skill of skills) {
    const key = skill.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(skill);
  }

  for (const word of extractKeywords(body)) {
    if (seen.has(word)) continue;
    seen.add(word);
    out.push(word);
  }

  return out;
}

/** Flattens a résumé document into the plain text an ATS would read. */
export function resumeToText(resume = {}) {
  const parts = [
    resume.fullName,
    resume.headline,
    resume.email,
    resume.phone,
    resume.location,
    resume.website,
    resume.summary,
    (resume.skills || []).join(" "),
  ];

  for (const role of resume.experience || []) {
    parts.push(role.role, role.company, role.location, role.startDate, role.endDate);
    parts.push(...(role.achievements || []));
  }
  for (const edu of resume.education || []) {
    parts.push(edu.degree, edu.school, edu.location, edu.grade);
  }
  for (const project of resume.projects || []) {
    parts.push(project.name, project.description, (project.stack || []).join(" "));
  }
  for (const cert of resume.certifications || []) {
    parts.push(cert.name, cert.issuer);
  }
  for (const lang of resume.languages || []) {
    parts.push(lang.name, lang.level);
  }

  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "your", "you", "our", "are", "was",
  "were", "has", "have", "had", "will", "would", "can", "could", "should", "their", "there", "they",
  "them", "than", "then", "when", "what", "which", "who", "whom", "while", "about", "across",
  "after", "before", "between", "during", "over", "under", "using", "used", "use", "also", "both",
  "each", "more", "most", "other", "some", "such", "only", "own", "same", "very", "all", "any",
  "but", "not", "out", "off", "its", "it's", "per", "via", "etc", "plus", "new", "work", "working",
  "team", "teams", "role", "roles", "year", "years", "experience", "strong", "good", "great",
  "including", "ability", "able", "join", "looking", "help", "like", "well", "within", "every",
  "built", "build", "building", "made", "make", "making", "ran", "run", "running", "set", "sets",
  "basic", "basics", "advanced", "junior", "senior", "lead", "mid", "level", "plus", "must",
  "nice", "bonus", "part", "full", "time", "day", "days", "week", "weeks", "month", "months",
  "company", "companies", "office", "remote", "hybrid", "onsite", "salary", "benefits", "apply",
  "application", "applications", "candidate", "candidates", "people", "person", "person's",
  "project", "projects", "product", "products", "customer", "customers", "user", "users",
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "first", "second",
  "knowledge", "understanding", "familiar", "familiarity", "comfortable", "willing", "willingness",
  "service", "services", "system", "systems", "feature", "features", "support", "supported",
]);

/**
 * Technologies a résumé parser indexes. The list is the difference between a
 * keyword report that reads like a skills list and one that reads like a word
 * cloud: without it, "basic", "contained" and "engine" come back as keywords.
 */
const TECH_TERMS = new Set([
  // languages
  "javascript", "typescript", "python", "java", "kotlin", "swift", "go", "golang", "rust", "ruby",
  "php", "perl", "scala", "elixir", "haskell", "dart", "lua", "matlab", "r", "sql", "plsql",
  "bash", "powershell", "html", "html5", "css", "css3", "sass", "scss", "less", "xml", "json",
  "yaml", "graphql", "solidity", "assembly", "cobol", "fortran", "c", "c#", "c++", "f#", "vb.net",
  // frontend
  "react", "reactjs", "next.js", "nextjs", "vue", "vuejs", "nuxt", "angular", "angularjs",
  "svelte", "sveltekit", "remix", "astro", "jquery", "redux", "zustand", "mobx", "rxjs",
  "tailwind", "tailwindcss", "bootstrap", "material-ui", "mui", "chakra", "styled-components",
  "webpack", "vite", "rollup", "babel", "esbuild", "turbopack", "parcel", "storybook",
  "accessibility", "wcag", "aria", "responsive", "seo", "pwa", "webassembly", "wasm",
  // backend
  "node", "node.js", "nodejs", "express", "nestjs", "fastify", "koa", "django", "flask",
  "fastapi", "rails", "laravel", "symfony", "spring", "springboot", "asp.net", "dotnet",
  ".net", "entity", "hibernate", "grpc", "rest", "soap", "websocket", "websockets", "api",
  "microservices", "serverless", "lambda", "webhooks", "oauth", "jwt", "saml", "ldap",
  // data
  "postgresql", "postgres", "mysql", "mariadb", "sqlite", "mssql", "oracle", "mongodb",
  "redis", "elasticsearch", "cassandra", "dynamodb", "firebase", "supabase", "prisma",
  "sequelize", "typeorm", "knex", "sqlalchemy", "pandas", "numpy", "spark", "hadoop",
  "airflow", "dbt", "snowflake", "bigquery", "tableau", "powerbi", "looker", "etl",
  "chromadb", "pgvector", "pinecone", "weaviate", "vector",
  // cloud + ops
  "aws", "azure", "gcp", "docker", "kubernetes", "k8s", "terraform", "pulumi", "ansible",
  "jenkins", "gitlab", "github", "bitbucket", "circleci", "argocd", "helm", "nginx", "apache",
  "linux", "ubuntu", "debian", "windows", "macos", "unix", "vercel", "netlify", "heroku",
  "cloudflare", "datadog", "grafana", "prometheus", "sentry", "kafka", "rabbitmq", "nats",
  "ci/cd", "devops", "sre", "observability", "monitoring",
  // testing
  "jest", "vitest", "mocha", "chai", "cypress", "playwright", "selenium", "puppeteer",
  "testing", "pytest", "junit", "nunit", "xunit", "tdd", "bdd",
  // ai / ml
  "pytorch", "tensorflow", "keras", "scikit-learn", "sklearn", "huggingface", "transformers",
  "llm", "nlp", "ml", "ai", "embeddings", "bert", "openai", "langchain", "rag",
  // mobile
  "ios", "android", "flutter", "xamarin", "ionic", "cordova",
  // design + process
  "figma", "sketch", "adobe", "photoshop", "illustrator", "invision", "zeplin", "prototyping",
  "wireframing", "agile", "scrum", "kanban", "jira", "confluence", "trello", "asana", "notion",
  "git", "svn", "mercurial", "wordpress", "drupal", "shopify", "magento", "contentful",
  "sap", "salesforce", "hubspot", "excel", "sharepoint", "powerapps",
]);

/** Multi-word tools that must survive tokenisation. */
const PHRASES = [
  "next.js", "node.js", "react native", "rest api", "rest apis", "ci/cd", "unit testing",
  "tailwind css", "sql server", "entity framework", "asp.net", "asp.net mvc", "github actions",
  "machine learning", "data analysis", "design system", "design systems", "code review",
  "active directory", "version control", "object oriented", "test automation", "api design",
  "power bi", "google cloud", "react query", "material ui", "styled components",
];

function isTechnical(token) {
  const key = token.toLowerCase();
  if (TECH_TERMS.has(key)) return true;
  // next.js, c#, c++, ci/cd and friends
  if (/[.#+/]/.test(token) && TECH_TERMS.has(key.replace(/[.#+/].*$/, ""))) return true;
  if (/^[a-z]+\d(\.\d+)?$/.test(key) && TECH_TERMS.has(key.replace(/\d.*$/, ""))) return true;
  // plural of a known tool: "apis" -> "api"
  if (key.endsWith("s") && TECH_TERMS.has(key.slice(0, -1))) return true;
  return false;
}

function singular(token) {
  const key = token.toLowerCase();
  if (TECH_TERMS.has(key)) return key;
  if (key.endsWith("s") && TECH_TERMS.has(key.slice(0, -1))) return key.slice(0, -1);
  return key;
}

/**
 * The keyword tokens an ATS would index.
 *
 * Only technical vocabulary survives: a term from the known tool list, a token
 * carrying technical punctuation (next.js, c#, ci/cd), an acronym, or a
 * capitalised proper noun that is not a sentence opener. Ordinary English is
 * dropped, because "responsible" is not a keyword anyone screens for.
 */
export function extractKeywords(text = "") {
  const raw = String(text);
  const lower = raw.toLowerCase();
  const tally = new Map();

  for (const phrase of PHRASES) {
    const count = lower.split(phrase).length - 1;
    if (count > 0) tally.set(phrase, (tally.get(phrase) || 0) + count * 2);
  }

  const pattern = /[A-Za-z][A-Za-z0-9+#./-]*/g;
  let match;

  while ((match = pattern.exec(raw)) !== null) {
    const token = match[0].replace(/^[.#+/-]+|[.#+/-]+$/g, "");
    if (token.length < 2) continue;

    const key = token.toLowerCase();
    if (STOP_WORDS.has(key) || /^\d+$/.test(key)) continue;

    const technical = isTechnical(token);
    const acronym = token.length >= 2 && token.length <= 6 && /^[A-Z0-9]+$/.test(token);

    // Capitalised, but not simply the first word of a sentence.
    const before = raw.slice(Math.max(0, match.index - 2), match.index);
    const sentenceStart = match.index === 0 || /[.!?\n•·]\s*$/.test(before);
    const properNoun = /^[A-Z][a-z]/.test(token) && !sentenceStart && token.length > 2;

    if (!technical && !acronym && !properNoun) continue;

    const normalised = singular(token);
    tally.set(normalised, (tally.get(normalised) || 0) + (technical ? 2 : 1));
  }

  // "rest apis" and "rest api" are the same keyword.
  for (const key of [...tally.keys()]) {
    if (key.endsWith("s") && tally.has(key.slice(0, -1))) {
      tally.set(key.slice(0, -1), tally.get(key.slice(0, -1)) + tally.get(key));
      tally.delete(key);
    }
  }

  // A phrase already covers its parts: drop "next" when "next.js" is present.
  const keys = [...tally.keys()];
  for (const phrase of keys.filter((key) => key.includes(" ") || key.includes("."))) {
    for (const part of phrase.split(/[\s.]+/)) {
      if (part.length > 2 && tally.has(part) && part !== phrase) tally.delete(part);
    }
  }

  return [...tally.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([word]) => word);
}
