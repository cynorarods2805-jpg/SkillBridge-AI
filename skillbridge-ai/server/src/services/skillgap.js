import { ROLES, DEFAULT_ROLE, skillRef, labelOfKey, resourceFor } from "./catalog.js";
import { buildSkillMap } from "./matching.js";

/** How many open jobs ask for each skill key, as a 0-1 ratio. */
export function demandMap(jobs) {
  const counts = new Map();
  const open = (jobs || []).filter((j) => j.status === "Active");
  for (const j of open) {
    const keys = new Set((j.skills || []).map((n) => skillRef(n).key));
    keys.forEach((k) => counts.set(k, (counts.get(k) || 0) + 1));
  }
  const out = new Map();
  counts.forEach((c, k) => out.set(k, open.length ? c / open.length : 0));
  return out;
}

export function analyzeSkillGap(student, roleName, jobs) {
  const role = ROLES[roleName] ? roleName : DEFAULT_ROLE;
  const required = ROLES[role];
  const skillMap = buildSkillMap(student.skills);
  const demand = demandMap(jobs);

  const matched = [];
  const weak = [];
  const missing = [];
  for (const [key, weight] of Object.entries(required)) {
    const has = skillMap.get(key);
    const base = { key, label: labelOfKey(key), weight, demand: Math.round((demand.get(key) || 0) * 100) };
    if (!has) missing.push({ ...base, priorityScore: weight * 2 + (demand.get(key) || 0) * 3, resource: resourceFor(key) });
    else if (has.score < 70) weak.push({ ...base, level: has.level, score: has.score, priorityScore: weight + (demand.get(key) || 0) * 2, resource: resourceFor(key) });
    else matched.push({ ...base, level: has.level, score: has.score });
  }
  const tag = (list) =>
    list
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .map((x, i, arr) => ({ ...x, priority: x.weight === 3 || x.priorityScore >= 6 ? "High" : x.priorityScore >= 4 ? "Medium" : "Low" }));
  const total = Object.keys(required).length;
  return {
    role,
    coverage: Math.round(((matched.length + weak.length * 0.5) / total) * 100),
    matched: matched.sort((a, b) => b.score - a.score),
    weak: tag(weak),
    missing: tag(missing),
  };
}
