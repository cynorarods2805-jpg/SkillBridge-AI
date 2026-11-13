import test from "node:test";
import assert from "node:assert/strict";
import { skillRef, detectSkills } from "../src/services/catalog.js";
import { computeMatch } from "../src/services/matching.js";
import { computeReadiness } from "../src/services/readiness.js";
import { analyzeSkillGap } from "../src/services/skillgap.js";
import { generateRoadmap } from "../src/services/roadmap.js";
import { analyzeResume } from "../src/services/resume.js";

const student = {
  name: "Ananya R",
  profile: { cgpa: 8.7, phone: "999", bio: "x", roll_no: "1", department: "CSE", grad_year: 2025, college: "A", github: "g" },
  skills: [
    { name: "React", level: "Advanced", years: 2, verified: 1 },
    { name: "Node.js", level: "Advanced", years: 1 },
    { name: "PostgreSQL", level: "Intermediate", years: 1 },
    { name: "REST APIs", level: "Advanced", years: 1 },
    { name: "JavaScript", level: "Advanced", years: 2 },
  ],
  projects: [
    { title: "A", description: "Full stack project with a long enough description here", github_url: "x", live_url: "y", technologies: ["React", "Node.js", "PostgreSQL"] },
    { title: "B", description: "", technologies: ["REST APIs"] },
  ],
  certifications: [{ name: "React Developer Certificate", issuer: "Meta" }],
  achievements: [],
  resume: null,
};
const job = { title: "Full Stack Developer", status: "Active", min_cgpa: 7.5, skills: ["React", "Node.js", "PostgreSQL", "Docker", "REST APIs"] };

test("skill aliases normalize", () => {
  assert.equal(skillRef("node.js").key, "nodejs");
  assert.equal(skillRef("Postgres").key, "postgresql");
  assert.equal(skillRef("Rust").label, "Rust");
});

test("job match is explainable and flags missing skills", () => {
  const m = computeMatch(student, job);
  assert.ok(m.score >= 70 && m.score <= 100, `score ${m.score}`);
  assert.deepEqual(m.gaps, ["Docker"]);
  assert.equal(m.eligible, true);
  assert.ok(m.explanation.length >= 3);
});

test("CGPA below the minimum makes the student ineligible", () => {
  const m = computeMatch({ ...student, profile: { ...student.profile, cgpa: 6.5 } }, job);
  assert.equal(m.eligible, false);
});

test("readiness is bounded and an empty student scores low", () => {
  const r = computeReadiness(student);
  assert.ok(r.overall > 40 && r.overall <= 100);
  const empty = computeReadiness({ name: "", profile: {}, skills: [], projects: [], certifications: [] });
  assert.ok(empty.overall < 10);
});

test("skill gap and roadmap", () => {
  const gap = analyzeSkillGap(student, "Full Stack Developer", [job]);
  assert.ok(gap.missing.some((m) => m.label === "Docker"));
  const rm = generateRoadmap(student, "Full Stack Developer", [job], computeReadiness(student));
  assert.ok(rm.steps.length >= 2);
  assert.ok(rm.estimatedReadiness >= rm.currentReadiness && rm.estimatedReadiness <= 98);
});

test("resume analyzer detects skills and sections", () => {
  const text = `Ananya R\nananya@college.edu +91 98765 43210 github.com/ananya linkedin.com/in/ananya
Summary\nFull stack developer.\nEducation\nB.Tech CSE 2025\nSkills\nReact, Node.js, PostgreSQL, JavaScript, Docker, Git, REST APIs, Tailwind CSS
Projects\nBuilt a job portal with React and Node.js serving 500+ users. Reduced load time by 40%. Deployed with Docker.
Experience\nIntern at TechNova. Developed REST APIs and optimized queries by 30%.\nCertifications\nReact Developer Certificate\n${"filler words ".repeat(120)}`;
  const r = analyzeResume(text, "Full Stack Developer");
  assert.ok(r.score >= 60, `score ${r.score}`);
  assert.ok(r.detectedSkills.includes("Node.js"));
  assert.ok(r.sections.projects && r.sections.education);
  assert.ok(detectSkills("Experience with Java and JavaScript").map((s) => s.key).includes("java"));
  assert.ok(!detectSkills("excellent communicator").length);
});
