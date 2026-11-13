// Database access helpers shared by the student and TPO routes.
import { db } from "./db.js";

const parseJson = (s, fallback = []) => {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
};

export const hydrateProject = (p) => ({ ...p, technologies: parseJson(p.technologies) });
export const hydrateJob = (j) => ({ ...j, skills: parseJson(j.skills) });
export const hydrateSkill = (s) => ({ ...s, verified: !!s.verified });

export function loadStudent(id) {
  const u = db.prepare(`SELECT id, name, email FROM "user" WHERE id = ? AND role = 'student'`).get(id);
  if (!u) return null;
  const q = (sql) => db.prepare(sql).all(id);
  const resume = db
    .prepare("SELECT id, filename, score, created_at FROM resume_analyses WHERE user_id = ? ORDER BY id DESC LIMIT 1")
    .get(id);
  return {
    ...u,
    profile: db.prepare("SELECT * FROM student_profiles WHERE user_id = ?").get(id) || {},
    skills: q("SELECT * FROM skills WHERE user_id = ? ORDER BY id").map(hydrateSkill),
    projects: q("SELECT * FROM projects WHERE user_id = ? ORDER BY id").map(hydrateProject),
    certifications: q("SELECT * FROM certifications WHERE user_id = ? ORDER BY id"),
    achievements: q("SELECT * FROM achievements WHERE user_id = ? ORDER BY id"),
    resume: resume || null,
  };
}

export function allStudentIds() {
  return db.prepare(`SELECT id FROM "user" WHERE role = 'student' ORDER BY name`).all().map((r) => r.id);
}

export const listJobs = (onlyActive = false) =>
  db
    .prepare(`SELECT * FROM jobs ${onlyActive ? "WHERE status = 'Active'" : ""} ORDER BY id DESC`)
    .all()
    .map(hydrateJob);

export const getJob = (id) => {
  const j = db.prepare("SELECT * FROM jobs WHERE id = ?").get(id);
  return j ? hydrateJob(j) : null;
};

export function ensureProfile(userId) {
  db.prepare("INSERT OR IGNORE INTO student_profiles (user_id) VALUES (?)").run(userId);
}
