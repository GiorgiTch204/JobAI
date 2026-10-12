/**
 * Bullet-point optimiser.
 *
 * Rewrites a weak achievement line into the shape recruiters scan for:
 * strong verb → what you did → the tool → the measured result. It works on
 * the words the user actually wrote rather than inventing a result, and when
 * a number is missing it says so instead of fabricating one.
 */

const VERB_MAP = {
  // weak opener -> stronger replacements, in order of preference
  "responsible for": ["Owned", "Led", "Ran"],
  "was responsible for": ["Owned", "Led"],
  "worked on": ["Built", "Developed", "Shipped"],
  "worked with": ["Partnered with", "Collaborated with"],
  "helped with": ["Supported", "Contributed to"],
  "helped to": ["Supported"],
  "helped": ["Supported"],
  "involved in": ["Contributed to"],
  "participated in": ["Contributed to"],
  "assisted with": ["Supported"],
  "assisted in": ["Supported"],
  "duties included": ["Delivered"],
  "tasked with": ["Owned"],
  "in charge of": ["Led"],
  "made": ["Built"],
  "did": ["Delivered"],
  "used": ["Applied"],
  "using": ["with"],
  "created": ["Built", "Designed"],
  "wrote": ["Authored"],
  "fixed": ["Resolved"],
  "handled": ["Managed"],
  "took care of": ["Managed"],
  "started": ["Launched"],
  "set up": ["Configured"],
  "put together": ["Assembled"],
};

const FILLER = [
  "very", "really", "just", "basically", "actually", "quite", "a lot of", "lots of",
  "some", "various", "several different", "in order to", "successfully", "effectively",
];

const RESULT_HINTS = [
  { re: /\b(page ?load|load ?time|latency|speed|performance)\b/i, hint: "cutting load time by X%" },
  { re: /\b(bug|error|crash|defect)\b/i, hint: "reducing reported defects by X%" },
  { re: /\b(test|coverage|qa)\b/i, hint: "lifting coverage from X% to Y%" },
  { re: /\b(deploy|release|ci|pipeline)\b/i, hint: "shortening releases from X to Y" },
  { re: /\b(user|customer|client|visitor)s?\b/i, hint: "serving X users" },
  { re: /\b(revenue|sales|conversion|signup)\b/i, hint: "lifting conversion by X%" },
  { re: /\b(api|endpoint|service|backend)\b/i, hint: "handling X requests per day" },
  { re: /\b(team|mentor|onboard|intern)\b/i, hint: "across a team of X" },
  { re: /\b(report|dashboard|data|analytics)\b/i, hint: "replacing X hours of manual work each week" },
];

function titleCase(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function stripFiller(text) {
  let out = text;
  for (const word of FILLER) {
    out = out.replace(new RegExp(`\\b${word}\\b\\s*`, "gi"), "");
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

function replaceOpener(text) {
  const lower = text.toLowerCase();
  const openers = Object.keys(VERB_MAP).sort((a, b) => b.length - a.length);

  for (const opener of openers) {
    if (lower.startsWith(opener)) {
      const verb = VERB_MAP[opener][0];
      let rest = text.slice(opener.length).trim();
      rest = rest.replace(/^(the|a|an|to|for|of|in|on|with)\s+/i, "");
      // "Owned building the API" reads badly — prefer "Owned the API".
      rest = rest.replace(/^(building|creating|making|developing|writing)\s+/i, "");
      return { text: `${verb} ${rest}`, changed: true, verb };
    }
  }

  const firstWord = text.split(/\s+/)[0] || "";
  const mapped = VERB_MAP[firstWord.toLowerCase()];
  if (mapped && /^[a-z]/i.test(firstWord)) {
    const verb = mapped[0];
    return {
      text: `${verb} ${text.slice(firstWord.length).trim()}`,
      changed: true,
      verb,
    };
  }

  return { text: titleCase(text), changed: false, verb: firstWord };
}

function tightenTense(text) {
  return text
    .replace(/\bI\s+(?:was\s+|am\s+|have\s+)?/g, "")
    .replace(/\bmy\b/gi, "the")
    .replace(/\bwe\s+(?:were\s+|are\s+)?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function suggestResult(text) {
  for (const { re, hint } of RESULT_HINTS) {
    if (re.test(text)) return hint;
  }
  return "with the result you measured (%, time, users or revenue)";
}

/**
 * @param {string} input     the original bullet
 * @param {object} options   { targetRole, keywords }
 */
export function optimizeBullet(input, { targetRole = "", keywords = [] } = {}) {
  const original = String(input || "").trim();
  if (!original) {
    return { original, optimized: "", notes: [], changed: false };
  }

  const notes = [];
  let working = original.replace(/^[•·▪●‣◦*\-–—\s]+/, "").replace(/\s+/g, " ").trim();

  const beforeFiller = working;
  working = stripFiller(working);
  if (working !== beforeFiller) notes.push("Removed filler words.");

  working = tightenTense(working);

  const opener = replaceOpener(working);
  working = opener.text;
  if (opener.changed) notes.push(`Opened with "${opener.verb}" instead of a passive phrase.`);

  working = working.replace(/\.$/, "");

  const hasNumber = /\d/.test(working);
  if (!hasNumber) {
    notes.push("No number found — add the measured outcome.");
  }

  const missingKeyword = keywords
    .map((kw) => String(kw).trim())
    .filter(Boolean)
    .find((kw) => !working.toLowerCase().includes(kw.toLowerCase()));

  const suggestions = [];
  if (!hasNumber) {
    suggestions.push(`${working}, ${suggestResult(working)}`);
  }
  if (missingKeyword) {
    suggestions.push(`${working} using ${missingKeyword}`);
    notes.push(`"${missingKeyword}" appears in the job post but not in this line.`);
  }
  if (targetRole && !working.toLowerCase().includes(targetRole.toLowerCase().split(" ")[0])) {
    notes.push(`Frame it the way a ${targetRole} would be judged.`);
  }

  const optimized = `${working}${hasNumber ? "." : ""}`;
  const wordCount = optimized.split(/\s+/).filter(Boolean).length;
  if (wordCount > 32) notes.push(`This line is ${wordCount} words. Aim for under 28.`);

  return {
    original,
    optimized,
    suggestions: suggestions.slice(0, 2),
    notes,
    changed: optimized.toLowerCase() !== original.toLowerCase(),
    wordCount,
    hasNumber,
  };
}

/** Summary-line generator used by the builder's "draft a summary" action. */
export function draftSummary(resume = {}) {
  const role = resume.headline || resume.experience?.[0]?.role || "developer";
  const skills = (resume.skills || []).slice(0, 4);
  const years = (resume.experience || []).length;
  const company = resume.experience?.[0]?.company;

  const parts = [];
  parts.push(
    years > 1
      ? `${role} with experience across ${years} roles`
      : `${role}${company ? ` at ${company}` : ""}`,
  );
  if (skills.length) parts.push(`working mainly with ${skills.join(", ")}`);

  const achievement = (resume.experience || [])
    .flatMap((item) => item.achievements || [])
    .find((line) => /\d/.test(line));

  const sentences = [`${parts.join(", ")}.`];
  if (achievement) sentences.push(`Recent work: ${achievement.replace(/\.$/, "")}.`);
  sentences.push("Looking for a role where I can own features end to end.");

  return sentences.join(" ");
}
