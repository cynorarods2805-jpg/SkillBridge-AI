import { LEVEL_SCORE, skillRef, impliedBy, labelOfKey } from "./catalog.js";

/** key -> { label, score, level, verified } for everything the student knows (incl. implied skills). */
export function buildSkillMap(skills) {
  const map = new Map();
  const put = (key, label, entry) => {
    const prev = map.get(key);
    if (!prev || entry.score > prev.score) map.set(key, { label, ...entry });
  };
  for (const s of skills || []) {
    const { key, label } = skillRef(s.name);
    const score = Math.min(100, (LEVEL_SCORE[s.level] || 40) + Math.min(10, (Number(s.years) || 0) * 3));
    const entry = { score, level: s.level, verified: !!s.verified, years: Number(s.years) || 0 };
    put(key, label, entry);
    for (const imp of impliedBy(key)) put(imp, labelOfKey(imp), { ...entry, score: Math.max(30, entry.score - 15) });
  }
  return map;
}

export function projectTechKeys(projects) {
  const set = new Set();
  for (const p of projects || []) {
    for (const t of p.technologies || []) {
      const { key } = skillRef(t);
      set.add(key);
      impliedBy(key).forEach((k) => set.add(k));
    }
  }
  return set;
}

const verdictFor = (score) =>
  score >= 85 ? "Highly Compatible" : score >= 70 ? "Good Match" : score >= 50 ? "Partial Match" : "Low Match";

/**
 * Explainable job match.
 * overall = 60% skills + 15% CGPA + 15% projects + 10% certifications
 */
export function computeMatch(student, job) {
  const profile = student.profile || {};
  const skillMap = buildSkillMap(student.skills);
  const projKeys = projectTechKeys(student.projects);
  const required = [];
  const seen = new Set();
  for (const name of job.skills || []) {
    const ref = skillRef(name);
    if (!seen.has(ref.key)) {
      seen.add(ref.key);
      required.push(ref);
    }
  }

  const perSkill = required.map(({ key, label }) => {
    const has = skillMap.get(key);
    const inProject = projKeys.has(key);
    let score = 0;
    if (has) score = Math.min(100, has.score + (inProject ? 10 : 0) + (has.verified ? 5 : 0));
    else if (inProject) score = 35;
    return { key, label, score, status: score >= 70 ? "strong" : score > 0 ? "partial" : "missing", inProject };
  });

  const skills = perSkill.length ? Math.round(perSkill.reduce((a, s) => a + s.score, 0) / perSkill.length) : 100;

  const cgpa = Number(profile.cgpa) || 0;
  const minCgpa = Number(job.min_cgpa) || 0;
  const eligible = !minCgpa || cgpa >= minCgpa;
  const cgpaScore = !minCgpa ? 100 : cgpa >= minCgpa ? 100 : Math.max(0, Math.round(100 - (minCgpa - cgpa) * 40));

  const covered = perSkill.filter((s) => s.inProject).length;
  const projectsScore = Math.min(
    100,
    Math.round((perSkill.length ? (covered / perSkill.length) * 70 : 70) + (Math.min((student.projects || []).length, 3) / 3) * 30)
  );

  const certText = (student.certifications || []).map((c) => `${c.name} ${c.issuer || ""}`.toLowerCase());
  const relevantCerts = certText.filter((t) => perSkill.some((s) => t.includes(s.label.toLowerCase()))).length;
  const certsScore = relevantCerts ? Math.min(100, relevantCerts * 50 + 30) : certText.length ? 30 : 0;

  const score = Math.round(skills * 0.6 + cgpaScore * 0.15 + projectsScore * 0.15 + certsScore * 0.1);

  const strong = perSkill.filter((s) => s.status === "strong");
  const missing = perSkill.filter((s) => s.status === "missing");
  const partial = perSkill.filter((s) => s.status === "partial");

  const explanation = [];
  if (strong.length) explanation.push(`Strong in ${strong.map((s) => s.label).join(", ")}`);
  if (partial.length) explanation.push(`Some knowledge of ${partial.map((s) => s.label).join(", ")} but needs strengthening`);
  if (missing.length) explanation.push(`Missing ${missing.map((s) => s.label).join(", ")}`);
  if (minCgpa) explanation.push(eligible ? `Meets the CGPA requirement (${cgpa} ≥ ${minCgpa})` : `Below the CGPA requirement (${cgpa} < ${minCgpa})`);
  else if (cgpa) explanation.push(`Good academic record (CGPA: ${cgpa})`);
  explanation.push(
    covered
      ? `Relevant project experience (${covered} of ${perSkill.length} required skills used in projects)`
      : "No projects yet that use this job's required skills"
  );
  if (relevantCerts) explanation.push(`${relevantCerts} relevant certification${relevantCerts > 1 ? "s" : ""}`);

  const recommendations = [];
  for (const m of missing.slice(0, 3)) recommendations.push(`Learn ${m.label} – it is required for this role and missing from your profile.`);
  for (const p of partial.slice(0, 2)) recommendations.push(`Strengthen ${p.label} with a hands-on project.`);
  if (!eligible) recommendations.push(`This job asks for CGPA ${minCgpa}+. Check with your TPO whether exceptions apply.`);
  if (!relevantCerts) recommendations.push("Add a certification related to this job's tech stack.");
  if (!recommendations.length) recommendations.push("Your profile is a strong fit. Keep your resume and projects up to date and apply.");

  return {
    score,
    verdict: verdictFor(score),
    eligible,
    breakdown: { skills, cgpa: cgpaScore, projects: projectsScore, certifications: certsScore },
    skills: perSkill,
    strengths: strong.map((s) => s.label),
    gaps: missing.map((s) => s.label),
    explanation,
    recommendations,
  };
}
