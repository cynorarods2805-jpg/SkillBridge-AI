import { ROLES, DEFAULT_ROLE, labelOfKey, resourceFor } from "./catalog.js";
import { analyzeSkillGap } from "./skillgap.js";
import { projectTechKeys } from "./matching.js";

/** Builds a staged learning plan from the student's skill gap for a target role. */
export function generateRoadmap(student, roleName, jobs, readiness) {
  const gap = analyzeSkillGap(student, roleName, jobs);
  const required = Object.keys(ROLES[gap.role]);
  const steps = [];
  const names = (list) => list.map((x) => x.label);

  if (gap.weak.length) {
    const top = gap.weak.slice(0, 4);
    steps.push({
      type: "strengthen",
      title: "Strengthen core skills",
      skills: names(top),
      weeks: Math.min(3, Math.max(1, Math.ceil(top.length / 2))),
      description: `Move ${names(top).join(", ")} from beginner level to job-ready by building small features with them.`,
      resources: top.map((s) => resourceFor(s.key)),
    });
  }
  if (gap.missing.length) {
    const top = gap.missing.slice(0, 4);
    steps.push({
      type: "learn",
      title: "Learn missing skills",
      skills: names(top),
      weeks: Math.min(6, Math.max(1, top.length)),
      description: `Cover ${names(top).join(", ")}: the highest-priority skills for a ${gap.role} that are missing from your profile.`,
      resources: top.map((s) => resourceFor(s.key)),
    });
  }
  const projKeys = projectTechKeys(student.projects);
  const usedInProjects = required.filter((k) => projKeys.has(k)).length;
  if ((student.projects || []).length < 3 || usedInProjects < Math.ceil(required.length / 2)) {
    const stack = names([...gap.missing, ...gap.weak, ...gap.matched].slice(0, 5));
    steps.push({
      type: "project",
      title: "Build a portfolio project",
      skills: stack,
      weeks: 3,
      description: `Build and deploy one end-to-end project using ${stack.join(", ")}. Add a GitHub repo, README and live link.`,
      resources: [],
    });
  }
  steps.push({
    type: "interview",
    title: "Be interview ready",
    skills: ["Data Structures & Algorithms", "Mock interviews", "Resume polish"],
    weeks: 2,
    description: "Practice DSA problems, do 2–3 mock interviews and update your resume with the new skills and projects.",
    resources: [resourceFor("dsa")],
  });

  steps.forEach((s, i) => (s.order = i + 1));
  const current = readiness.overall;
  const gain = gap.weak.length * 3 + gap.missing.length * 4 + (steps.some((s) => s.type === "project") ? 5 : 0) + 4;
  return {
    role: gap.role,
    steps,
    totalWeeks: steps.reduce((a, s) => a + s.weeks, 0),
    currentReadiness: current,
    estimatedReadiness: Math.max(current, Math.min(98, current + gain)),
    gap,
  };
}
