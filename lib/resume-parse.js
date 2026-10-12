/**
 * Résumé parsing.
 *
 * Text is extracted from the uploaded file (PDF, DOCX or plain text) and then
 * read with heuristics modelled on how résumés are actually laid out: a
 * contact block at the top, then titled sections. Nothing here is invented —
 * if a field cannot be found it comes back empty so the user can fill it in,
 * which is the honest behaviour and keeps the CV builder truthful.
 */

const SECTION_PATTERNS = [
  { key: "summary", re: /^(professional\s+)?(summary|profile|objective|about\s+me|about)\b/i },
  { key: "experience", re: /^(work\s+)?(experience|employment|work\s+history|professional\s+experience|career)\b/i },
  { key: "education", re: /^(education|academic|qualifications|studies)\b/i },
  { key: "skills", re: /^(technical\s+)?(skills|technologies|tech\s+stack|competencies|expertise|tools)\b/i },
  { key: "projects", re: /^(projects|selected\s+projects|side\s+projects|portfolio)\b/i },
  { key: "certifications", re: /^(certifications?|licenses?|courses|training)\b/i },
  { key: "languages", re: /^(languages)\b/i },
  { key: "interests", re: /^(interests|hobbies|volunteering|references)\b/i },
];

const BULLET_RE = /^[\s]*([•·▪●‣◦*\-–—]|\d+[.)])\s+/;
const DATE_RANGE_RE =
  /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{4}|\d{1,2}\/\d{4}|\d{4}-\d{2}|\d{4})\s*(?:–|-|—|to|until)\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{4}|\d{1,2}\/\d{4}|\d{4}-\d{2}|\d{4}|present|current|now)/i;

/* -------------------------------------------------------------------------- */
/* text extraction                                                            */
/* -------------------------------------------------------------------------- */

export const SUPPORTED_UPLOAD_TYPES = [".pdf", ".docx", ".txt", ".md"];
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

export function extensionOf(name = "") {
  const match = String(name).toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : "";
}

/**
 * @param {Buffer} buffer
 * @param {string} filename
 * @returns {Promise<{ text: string, pages: number|null, engine: string }>}
 */
export async function extractText(buffer, filename) {
  const ext = extensionOf(filename);

  if (ext === ".txt" || ext === ".md") {
    return { text: buffer.toString("utf8"), pages: null, engine: "text" };
  }

  if (ext === ".docx") {
    const mammoth = await import("mammoth");
    const api = mammoth.default || mammoth;
    const result = await api.extractRawText({ buffer });
    return { text: result.value || "", pages: null, engine: "docx" };
  }

  if (ext === ".pdf") {
    const mod = await import("pdf-parse");
    const PDFParse = mod.PDFParse || mod.default?.PDFParse;
    if (!PDFParse) throw new Error("PDF reader unavailable");

    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      return {
        text: result?.text || "",
        pages: result?.total ?? result?.pages?.length ?? null,
        engine: "pdf",
      };
    } finally {
      await parser.destroy?.();
    }
  }

  throw new Error(`Unsupported file type "${ext || "unknown"}"`);
}

/* -------------------------------------------------------------------------- */
/* line helpers                                                               */
/* -------------------------------------------------------------------------- */

function toLines(text) {
  return String(text || "")
    .replace(/\r\n?/g, "\n")
    .replace(/ /g, " ")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0);
}

function sectionKeyFor(line) {
  if (line.length > 48) return null;
  const clean = line.replace(/[:_|]+$/g, "").trim();
  for (const { key, re } of SECTION_PATTERNS) {
    if (re.test(clean)) return key;
  }
  return null;
}

function looksLikeName(line) {
  if (!line || line.length > 48) return false;
  if (/[@\d]/.test(line)) return false;
  if (/(curriculum vitae|resume|cv)$/i.test(line)) return false;
  const words = line.split(/\s+/);
  if (words.length < 2 || words.length > 5) return false;
  return words.every((word) => /^[\p{L}][\p{L}'.-]*$/u.test(word));
}

/* -------------------------------------------------------------------------- */
/* contact block                                                              */
/* -------------------------------------------------------------------------- */

function findContact(lines) {
  const head = lines.slice(0, 14).join(" • ");
  const all = lines.join(" • ");

  const email = (all.match(/[\w.+-]+@[\w-]+\.[\w.]{2,}/) || [])[0] || "";

  const phoneMatch =
    head.match(/(\+?\d[\d\s().-]{7,18}\d)/) || all.match(/(\+?\d[\d\s().-]{8,18}\d)/);
  const phone = phoneMatch ? phoneMatch[1].replace(/\s{2,}/g, " ").trim() : "";

  const site =
    (all.match(/\b(?:https?:\/\/)?(?:www\.)?(?:github\.com|gitlab\.com|linkedin\.com)\/[\w./-]+/i) ||
      all.match(/\b(?:https?:\/\/)[\w.-]+\.[a-z]{2,}[\w./-]*/i) ||
      [])[0] || "";

  let location = "";
  for (const line of lines.slice(0, 12)) {
    if (/@|https?:\/\//.test(line)) continue;
    if (/^[\p{L}\s.'-]+,\s*[\p{L}\s.'-]+$/u.test(line) && line.length <= 60) {
      location = line;
      break;
    }
    const cityCountry = line.match(/([\p{L}\s.'-]{2,30},\s*[\p{L}\s.'-]{2,30})/u);
    if (cityCountry && /(remote|hybrid|on[- ]?site)|,/i.test(cityCountry[1])) {
      location = cityCountry[1].trim();
      break;
    }
  }

  return { email, phone, website: site.replace(/[),.]+$/, ""), location };
}

/* -------------------------------------------------------------------------- */
/* sections                                                                   */
/* -------------------------------------------------------------------------- */

function splitSections(lines) {
  const sections = { header: [] };
  let current = "header";

  for (const line of lines) {
    const key = sectionKeyFor(line);
    if (key) {
      current = key;
      if (!sections[current]) sections[current] = [];
      continue;
    }
    if (!sections[current]) sections[current] = [];
    sections[current].push(line);
  }
  return sections;
}

const SKILL_SPLIT_RE = /[,;|•·▪●/]|\s{2,}|\s+•\s+/;

function parseSkills(lines = []) {
  const out = [];
  for (const line of lines) {
    const body = line.replace(/^[a-z\s]{3,24}:\s*/i, "").replace(BULLET_RE, "");
    for (const piece of body.split(SKILL_SPLIT_RE)) {
      const skill = piece.trim().replace(/\.$/, "");
      if (!skill || skill.length < 2 || skill.length > 32) continue;
      if (/^(and|or|etc|others?)$/i.test(skill)) continue;
      if (skill.split(/\s+/).length > 4) continue;
      out.push(skill);
    }
  }

  const seen = new Set();
  return out.filter((skill) => {
    const key = skill.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 40);
}

function parseExperience(lines = []) {
  const entries = [];
  let current = null;

  const push = () => {
    if (current && (current.role || current.company || current.achievements.length)) {
      entries.push(current);
    }
  };

  for (const line of lines) {
    const dates = line.match(DATE_RANGE_RE);
    const isBullet = BULLET_RE.test(line);

    if (dates && !isBullet) {
      push();
      const withoutDates = line.replace(DATE_RANGE_RE, "").replace(/[|•·,–—-]+\s*$/, "").trim();
      const [left, right] = splitRoleCompany(withoutDates);
      current = {
        id: `exp_${entries.length + 1}`,
        role: left,
        company: right,
        location: "",
        startDate: normaliseDate(dates[1]),
        endDate: /present|current|now/i.test(dates[2]) ? "Present" : normaliseDate(dates[2]),
        current: /present|current|now/i.test(dates[2]),
        achievements: [],
      };
      continue;
    }

    if (!current) {
      // A role heading without a parsable date range.
      if (!isBullet && /\b(at|@|—|–|\|)\b/.test(line) && line.length < 90) {
        const [left, right] = splitRoleCompany(line);
        current = {
          id: `exp_${entries.length + 1}`,
          role: left,
          company: right,
          location: "",
          startDate: "",
          endDate: "",
          current: false,
          achievements: [],
        };
      }
      continue;
    }

    if (isBullet) {
      const text = line.replace(BULLET_RE, "").trim();
      if (text.length > 3) current.achievements.push(text);
      continue;
    }

    if (!current.company && line.length < 60 && !/[.!?]$/.test(line)) {
      current.company = line;
      continue;
    }

    if (line.length > 25) current.achievements.push(line);
  }
  push();

  return entries.slice(0, 12).map((entry, index) => ({
    ...entry,
    id: `exp_${index + 1}`,
    achievements: entry.achievements.slice(0, 8),
  }));
}

function splitRoleCompany(text) {
  const parts = text.split(/\s+(?:at|@)\s+|\s*[|—–]\s*|\s*,\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return ["", ""];
  if (parts.length === 1) return [parts[0], ""];
  return [parts[0], parts.slice(1).join(", ")];
}

function normaliseDate(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const monthYear = text.match(/^([a-z]{3,})\.?\s*(\d{4})$/i);
  if (monthYear) {
    const month = monthYear[1].slice(0, 3);
    return `${month.charAt(0).toUpperCase()}${month.slice(1).toLowerCase()} ${monthYear[2]}`;
  }
  const slash = text.match(/^(\d{1,2})\/(\d{4})$/);
  if (slash) return `${slash[2]}-${slash[1].padStart(2, "0")}`;
  return text;
}

function parseEducation(lines = []) {
  const entries = [];
  let current = null;

  for (const line of lines) {
    const dates = line.match(DATE_RANGE_RE);
    const year = line.match(/\b(19|20)\d{2}\b/);
    const isDegree = /\b(bachelor|master|b\.?s\.?c?|m\.?s\.?c?|ph\.?d|diploma|degree|mba|associate)\b/i.test(
      line,
    );

    if (isDegree || (dates && !current)) {
      if (current) entries.push(current);
      const withoutDates = line.replace(DATE_RANGE_RE, "").trim();
      const [degree, school] = splitRoleCompany(withoutDates);
      current = {
        id: `edu_${entries.length + 1}`,
        degree: degree || withoutDates,
        school: school || "",
        location: "",
        startDate: dates ? normaliseDate(dates[1]) : "",
        endDate: dates ? normaliseDate(dates[2]) : year ? year[0] : "",
        grade: "",
      };
      continue;
    }

    if (current && !current.school && line.length < 80) {
      current.school = line.replace(DATE_RANGE_RE, "").trim();
      if (!current.endDate && year) current.endDate = year[0];
    }
  }
  if (current) entries.push(current);

  return entries.slice(0, 6).map((entry, index) => ({ ...entry, id: `edu_${index + 1}` }));
}

function parseProjects(lines = []) {
  const entries = [];
  let current = null;

  for (const line of lines) {
    const isBullet = BULLET_RE.test(line);
    const text = line.replace(BULLET_RE, "").trim();

    if (!isBullet && text.length < 70 && !/[.!?]$/.test(text)) {
      if (current) entries.push(current);
      const url = (text.match(/\bhttps?:\/\/\S+/) || [])[0] || "";
      current = {
        id: `prj_${entries.length + 1}`,
        name: text.replace(/\s*[—–-]\s*https?:\/\/\S+$/, "").trim(),
        url,
        description: "",
        stack: [],
      };
      continue;
    }
    if (current) {
      current.description = current.description ? `${current.description} ${text}` : text;
    }
  }
  if (current) entries.push(current);

  return entries.slice(0, 8).map((entry, index) => ({
    ...entry,
    id: `prj_${index + 1}`,
    description: entry.description.slice(0, 400),
  }));
}

function parseLanguages(lines = []) {
  const out = [];
  for (const line of lines) {
    for (const piece of line.replace(BULLET_RE, "").split(SKILL_SPLIT_RE)) {
      const text = piece.trim();
      if (!text || text.length > 40) continue;
      const withLevel = text.match(/^([\p{L}\s]+)[\s(:-]+(native|fluent|advanced|intermediate|basic|beginner|[abc][12])\)?$/iu);
      if (withLevel) {
        out.push({ id: `lang_${out.length + 1}`, name: withLevel[1].trim(), level: titleCase(withLevel[2]) });
      } else if (/^[\p{L}\s]{3,20}$/u.test(text)) {
        out.push({ id: `lang_${out.length + 1}`, name: text, level: "" });
      }
    }
  }
  return out.slice(0, 8);
}

function parseCertifications(lines = []) {
  return lines
    .map((line) => line.replace(BULLET_RE, "").trim())
    .filter((line) => line.length > 3 && line.length < 140)
    .slice(0, 8)
    .map((line, index) => {
      const year = (line.match(/\b(19|20)\d{2}\b/) || [])[0] || "";
      const [name, issuer] = splitRoleCompany(line.replace(/[,—–-]?\s*\b(19|20)\d{2}\b/, "").trim());
      return { id: `cert_${index + 1}`, name: name || line, issuer: issuer || "", year };
    });
}

function titleCase(value = "") {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

/* -------------------------------------------------------------------------- */
/* public API                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Turns raw résumé text into the builder's document shape.
 * @returns {{ resume: object, diagnostics: object }}
 */
export function parseResumeText(text) {
  const lines = toLines(text);
  const sections = splitSections(lines);
  const contact = findContact(lines);

  const header = sections.header || [];
  const name = header.find(looksLikeName) || "";
  const nameIndex = name ? header.indexOf(name) : -1;

  let headline = "";
  for (let i = nameIndex + 1; i < Math.min(header.length, nameIndex + 5); i += 1) {
    const line = header[i];
    if (!line || /@|https?:\/\/|\d{3}/.test(line)) continue;
    if (line === contact.location) continue;
    if (line.length > 4 && line.length < 70) {
      headline = line;
      break;
    }
  }

  const summaryLines = sections.summary || [];
  let summary = summaryLines.join(" ").trim();
  if (!summary) {
    // Some résumés put the profile paragraph directly under the contact block.
    const paragraph = header.find((line) => line.length > 120);
    if (paragraph) summary = paragraph;
  }

  const resume = {
    fullName: name,
    headline,
    email: contact.email,
    phone: contact.phone,
    location: contact.location,
    website: contact.website,
    summary: summary.slice(0, 1200),
    skills: parseSkills(sections.skills),
    experience: parseExperience(sections.experience),
    education: parseEducation(sections.education),
    projects: parseProjects(sections.projects),
    languages: parseLanguages(sections.languages),
    certifications: parseCertifications(sections.certifications),
  };

  const found = Object.entries({
    name: Boolean(resume.fullName),
    email: Boolean(resume.email),
    phone: Boolean(resume.phone),
    location: Boolean(resume.location),
    summary: Boolean(resume.summary),
    skills: resume.skills.length > 0,
    experience: resume.experience.length > 0,
    education: resume.education.length > 0,
  });

  const diagnostics = {
    lines: lines.length,
    words: lines.join(" ").split(/\s+/).filter(Boolean).length,
    sectionsFound: Object.keys(sections).filter((key) => key !== "header"),
    detected: found.filter(([, ok]) => ok).map(([key]) => key),
    missing: found.filter(([, ok]) => !ok).map(([key]) => key),
    bullets: resume.experience.reduce((sum, role) => sum + role.achievements.length, 0),
  };

  return { resume, diagnostics };
}

/** Full pipeline: file bytes in, résumé document out. */
export async function parseResumeFile(buffer, filename) {
  const { text, pages, engine } = await extractText(buffer, filename);
  const trimmed = String(text || "").trim();

  if (trimmed.length < 40) {
    const error = new Error(
      "We could not read any text from that file. If it is a scanned image, export a text-based PDF and try again.",
    );
    error.code = "EMPTY_DOCUMENT";
    throw error;
  }

  const { resume, diagnostics } = parseResumeText(trimmed);
  return {
    resume,
    diagnostics: { ...diagnostics, pages, engine, characters: trimmed.length },
    text: trimmed,
  };
}
