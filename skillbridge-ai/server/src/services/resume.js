import { detectSkills, ROLES, DEFAULT_ROLE, labelOfKey } from "./catalog.js";

const SECTION_PATTERNS = {
  education: /\b(education|academic|qualification)s?\b/i,
  skills: /\b(technical\s+)?skills\b|\btech\s+stack\b/i,
  projects: /\bprojects?\b/i,
  experience: /\b(work\s+)?experience\b|\binternships?\b|\bemployment\b/i,
  certifications: /\bcertifications?\b|\bcertificates?\b|\bcourses\b/i,
  summary: /\b(summary|objective|profile|about\s+me)\b/i,
};
const SECTION_POINTS = { education: 6, skills: 6, projects: 6, experience: 6, certifications: 3, summary: 3 };

const ACTION_VERBS = [
  "built", "developed", "designed", "implemented", "created", "led", "improved", "optimized", "reduced",
  "increased", "deployed", "integrated", "automated", "launched", "managed", "analyzed", "engineered", "architected",
];

/** Rule-based resume scoring: contact 15 + sections 30 + skills 20 + impact 20 + length 15 = 100 */
export function analyzeResume(rawText, roleName) {
  const text = String(rawText || "").replace(/\r/g, "");
  const words = (text.match(/\S+/g) || []).length;
  const role = ROLES[roleName] ? roleName : DEFAULT_ROLE;

  const hasEmail = /[\w.+-]+@[\w-]+\.[\w.-]+/.test(text);
  const hasPhone = /(\+?\d[\d\s().-]{8,}\d)/.test(text);
  const hasLinks = /(linkedin\.com|github\.com)/i.test(text);
  const contact = (hasEmail ? 5 : 0) + (hasPhone ? 5 : 0) + (hasLinks ? 5 : 0);

  const sections = {};
  let sectionScore = 0;
  for (const [name, re] of Object.entries(SECTION_PATTERNS)) {
    sections[name] = re.test(text);
    if (sections[name]) sectionScore += SECTION_POINTS[name];
  }

  const detected = detectSkills(text);
  const skillScore = Math.min(20, detected.length * 2);

  const lower = text.toLowerCase();
  const verbCount = ACTION_VERBS.filter((v) => new RegExp(`\\b${v}\\b`).test(lower)).length;
  const metricCount = (text.match(/\b\d+(\.\d+)?\s?(%|x|\+|k\b|users|ms|seconds)/gi) || []).length;
  const impact = Math.min(10, verbCount * 1.5) + Math.min(10, metricCount * 3);

  let length = 15;
  if (words < 150) length = 3;
  else if (words < 250) length = 9;
  else if (words > 1100) length = 8;
  else if (words > 900) length = 12;

  const score = Math.max(0, Math.min(100, Math.round(contact + sectionScore + skillScore + impact + length)));

  const detectedKeys = new Set(detected.map((d) => d.key));
  const missingSkills = Object.keys(ROLES[role])
    .filter((k) => !detectedKeys.has(k))
    .map((k) => labelOfKey(k));

  const strengths = [];
  const weaknesses = [];
  const suggestions = [];
  if (contact === 15) strengths.push("Complete contact details with professional links");
  else {
    weaknesses.push("Contact section is incomplete");
    if (!hasEmail) suggestions.push("Add a professional email address at the top.");
    if (!hasPhone) suggestions.push("Add a phone number recruiters can reach you on.");
    if (!hasLinks) suggestions.push("Add your GitHub and LinkedIn profile links.");
  }
  const missingSections = Object.entries(sections).filter(([, v]) => !v).map(([k]) => k);
  if (!missingSections.length) strengths.push("All key sections are present");
  else {
    weaknesses.push(`Missing sections: ${missingSections.join(", ")}`);
    suggestions.push(`Add clearly labelled sections for: ${missingSections.join(", ")}.`);
  }
  if (detected.length >= 8) strengths.push(`Good range of technical skills (${detected.length} detected)`);
  else {
    weaknesses.push("Few recognizable technical skills were found");
    suggestions.push("List your tools and technologies explicitly in a Skills section.");
  }
  if (metricCount >= 2) strengths.push("Uses numbers to show impact");
  else {
    weaknesses.push("Little quantified impact");
    suggestions.push('Quantify results, e.g. "reduced page load time by 40%" or "served 500+ users".');
  }
  if (verbCount < 4) suggestions.push('Start bullet points with action verbs such as "Built", "Optimized" or "Deployed".');
  if (words < 250) suggestions.push("Your resume looks short. Add project details and responsibilities.");
  if (words > 900) suggestions.push("Your resume is long. Aim for one page (about 400–700 words) for a fresher.");
  if (missingSkills.length) suggestions.push(`For a ${role}, consider learning and showing: ${missingSkills.slice(0, 4).join(", ")}.`);

  return {
    score,
    role,
    wordCount: words,
    breakdown: {
      contact: Math.round((contact / 15) * 100),
      structure: Math.round((sectionScore / 30) * 100),
      skills: Math.round((skillScore / 20) * 100),
      impact: Math.round((impact / 20) * 100),
      length: Math.round((length / 15) * 100),
    },
    sections,
    detectedSkills: detected.map((d) => d.label),
    missingSkills,
    strengths,
    weaknesses,
    suggestions,
  };
}
