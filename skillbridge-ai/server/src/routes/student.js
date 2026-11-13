import { Router } from "express";
import multer from "multer";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { db } from "../db.js";
import { bad, HttpError } from "../middleware.js";
import { loadStudent, listJobs, getJob, ensureProfile, hydrateProject, hydrateSkill } from "../data.js";
import { LEVELS, ROLE_NAMES, DEFAULT_ROLE, skillRef } from "../services/catalog.js";
import { computeMatch } from "../services/matching.js";
import { computeReadiness } from "../services/readiness.js";
import { analyzeSkillGap } from "../services/skillgap.js";
import { generateRoadmap } from "../services/roadmap.js";
import { analyzeResume } from "../services/resume.js";

const r = Router();

// ---------- input sanitizers ----------
const str = (max = 500) => (v) => {
  if (v == null) return null;
  const s = String(v).trim().slice(0, max);
  return s || null;
};
const url = (v) => {
  const s = str(500)(v);
  if (!s) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    if (!["http:", "https:"].includes(u.protocol)) throw new Error();
    return u.toString();
  } catch {
    return bad(`"${s}" is not a valid link`);
  }
};
const num = (min, max, label) => (v) => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  if (Number.isNaN(n) || n < min || n > max) return bad(`${label} must be a number between ${min} and ${max}`);
  return n;
};
const level = (v) => (LEVELS.includes(v) ? v : bad(`Level must be one of: ${LEVELS.join(", ")}`));
const date = (v) => {
  const s = str(20)(v);
  if (s && !/^\d{4}-\d{2}-\d{2}$/.test(s)) return bad("Dates must look like YYYY-MM-DD");
  return s;
};
const techs = (v) => {
  const arr = Array.isArray(v) ? v : String(v || "").split(",");
  return JSON.stringify(arr.map((t) => String(t).trim()).filter(Boolean).slice(0, 15));
};

function clean(fields, body, partial) {
  const out = {};
  for (const [col, fn] of Object.entries(fields)) {
    if (partial && !(col in body)) continue;
    out[col] = fn(body[col]);
  }
  return out;
}

// ---------- profile ----------
const PROFILE_FIELDS = {
  phone: str(30), bio: str(600), roll_no: str(40), department: str(80),
  grad_year: num(2000, 2100, "Graduation year"), cgpa: num(0, 10, "CGPA"),
  college: str(150), github: url, linkedin: url, portfolio: url, target_role: (v) => (ROLE_NAMES.includes(v) ? v : DEFAULT_ROLE),
};

r.get("/profile", (req, res) => {
  ensureProfile(req.user.id);
  res.json(loadStudent(req.user.id));
});

r.put("/profile", (req, res) => {
  ensureProfile(req.user.id);
  const body = req.body || {};
  if ("name" in body) {
    const name = str(100)(body.name);
    if (!name) bad("Name cannot be empty");
    db.prepare(`UPDATE "user" SET name = ?, updatedAt = ? WHERE id = ?`).run(name, new Date().toISOString(), req.user.id);
  }
  const data = clean(PROFILE_FIELDS, body, true);
  const cols = Object.keys(data);
  if (cols.length) {
    db.prepare(`UPDATE student_profiles SET ${cols.map((c) => `${c} = ?`).join(", ")}, updated_at = datetime('now') WHERE user_id = ?`).run(
      ...cols.map((c) => data[c]),
      req.user.id
    );
  }
  res.json(loadStudent(req.user.id));
});

// ---------- generic CRUD for skills / projects / certifications / achievements ----------
function crud(path, table, fields, required, hydrate = (x) => x) {
  const own = (id, uid) => db.prepare(`SELECT * FROM ${table} WHERE id = ? AND user_id = ?`).get(id, uid);
  r.get(`/${path}`, (req, res) => res.json(db.prepare(`SELECT * FROM ${table} WHERE user_id = ? ORDER BY id`).all(req.user.id).map(hydrate)));
  r.post(`/${path}`, (req, res) => {
    const data = clean(fields, req.body || {}, false);
    if (!data[required]) bad(`${required[0].toUpperCase() + required.slice(1)} is required`);
    const cols = Object.keys(data);
    const info = db
      .prepare(`INSERT INTO ${table} (user_id, ${cols.join(", ")}) VALUES (?, ${cols.map(() => "?").join(", ")})`)
      .run(req.user.id, ...cols.map((c) => data[c]));
    res.status(201).json(hydrate(own(info.lastInsertRowid, req.user.id)));
  });
  r.put(`/${path}/:id`, (req, res) => {
    const existing = own(req.params.id, req.user.id);
    if (!existing) throw new HttpError(404, "Item not found");
    const data = clean(fields, req.body || {}, true);
    if (required in data && !data[required]) bad(`${required[0].toUpperCase() + required.slice(1)} cannot be empty`);
    // Changing a skill's name drops its verified badge: the TPO verified a different skill.
    if (table === "skills" && data.name && data.name !== existing.name) data.verified = 0;
    const cols = Object.keys(data);
    if (cols.length) db.prepare(`UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(", ")} WHERE id = ? AND user_id = ?`).run(...cols.map((c) => data[c]), req.params.id, req.user.id);
    res.json(hydrate(own(req.params.id, req.user.id)));
  });
  r.delete(`/${path}/:id`, (req, res) => {
    const info = db.prepare(`DELETE FROM ${table} WHERE id = ? AND user_id = ?`).run(req.params.id, req.user.id);
    if (!info.changes) throw new HttpError(404, "Item not found");
    res.json({ ok: true });
  });
}
crud("skills", "skills", { name: str(60), level, years: num(0, 40, "Years of experience") }, "name", hydrateSkill);
crud("projects", "projects", { title: str(120), description: str(1000), github_url: url, live_url: url, technologies: techs }, "title", hydrateProject);
crud("certifications", "certifications", { name: str(150), issuer: str(120), credential_url: url, issue_date: date, expiry_date: date }, "name");
crud("achievements", "achievements", { title: str(150), description: str(500), date }, "title");

// ---------- shared computations ----------
function context(userId) {
  const student = loadStudent(userId);
  const jobs = listJobs(false);
  const readiness = computeReadiness(student);
  return { student, jobs, readiness, role: student.profile.target_role || DEFAULT_ROLE };
}

// ---------- dashboard ----------
r.get("/dashboard", (req, res) => {
  ensureProfile(req.user.id);
  const { student, jobs, readiness, role } = context(req.user.id);
  const active = jobs.filter((j) => j.status === "Active");
  const matches = active.map((j) => computeMatch(student, j).score);
  const gap = analyzeSkillGap(student, role, jobs);
  const goals = db.prepare("SELECT * FROM goals WHERE user_id = ? ORDER BY status DESC, id DESC").all(req.user.id);

  const actions = [];
  const topMissing = gap.missing[0] || gap.weak[0];
  if (topMissing) actions.push({ label: `Learn ${topMissing.label} (Recommended)`, to: "/student/roadmap" });
  if (student.projects.length < 3) actions.push({ label: "Complete a project", to: "/student/profile" });
  if (!student.resume || student.resume.score < 75) actions.push({ label: "Update your resume", to: "/student/resume" });
  if (!student.certifications.length) actions.push({ label: "Add a certification", to: "/student/profile" });
  if (!actions.length) actions.push({ label: "Browse matched jobs", to: "/student/jobs" });

  res.json({
    name: student.name,
    role,
    readiness,
    jobMatches: matches.filter((s) => s >= 70).length,
    skillGaps: gap.missing.length + gap.weak.length,
    ongoingGoals: goals.filter((g) => g.status === "pending").length,
    goals: goals.slice(0, 5),
    actions: actions.slice(0, 4),
  });
});

// ---------- resume analyzer ----------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => (/\.(pdf|txt)$/i.test(file.originalname) ? cb(null, true) : cb(new HttpError(400, "Only PDF or TXT resumes are supported."))),
});

r.post("/resume", upload.single("resume"), async (req, res) => {
  if (!req.file) bad("Please choose a PDF or TXT file (max 5 MB).");
  const isPdf = /\.pdf$/i.test(req.file.originalname);
  let text;
  if (isPdf) {
    if (req.file.buffer.subarray(0, 5).toString() !== "%PDF-") bad("That file does not look like a valid PDF.");
    try {
      text = (await pdfParse(req.file.buffer)).text;
    } catch {
      bad("We could not read this PDF. Try exporting it again, or upload a TXT version.");
    }
  } else text = req.file.buffer.toString("utf8");
  if (!text || text.trim().length < 100) bad("We could not find enough text. If your resume is a scanned image, upload a text-based PDF instead.");

  const role = loadStudent(req.user.id)?.profile?.target_role || DEFAULT_ROLE;
  const result = analyzeResume(text, role);
  const info = db
    .prepare("INSERT INTO resume_analyses (user_id, filename, score, result) VALUES (?, ?, ?, ?)")
    .run(req.user.id, req.file.originalname.slice(0, 200), result.score, JSON.stringify(result));
  res.status(201).json({ id: info.lastInsertRowid, filename: req.file.originalname, ...result });
});

r.get("/resume", (req, res) => {
  const row = db.prepare("SELECT * FROM resume_analyses WHERE user_id = ? ORDER BY id DESC LIMIT 1").get(req.user.id);
  res.json(row ? { id: row.id, filename: row.filename, created_at: row.created_at, ...JSON.parse(row.result) } : null);
});

// Adds skills found in the resume to the profile at Beginner level (the student can then adjust levels).
r.post("/resume/apply-skills", (req, res) => {
  const incoming = Array.isArray(req.body?.skills) ? req.body.skills.slice(0, 40) : [];
  const have = new Set(db.prepare("SELECT name FROM skills WHERE user_id = ?").all(req.user.id).map((s) => skillRef(s.name).key));
  const ins = db.prepare("INSERT INTO skills (user_id, name, level, years) VALUES (?, ?, 'Beginner', 0)");
  let added = 0;
  for (const name of incoming) {
    const { key, label } = skillRef(name);
    if (!key || have.has(key)) continue;
    ins.run(req.user.id, label.slice(0, 60));
    have.add(key);
    added++;
  }
  res.json({ added });
});

// ---------- jobs & matching ----------
r.get("/jobs", (req, res) => {
  const student = loadStudent(req.user.id);
  const q = String(req.query.q || "").toLowerCase();
  const role = String(req.query.role || "");
  const type = String(req.query.type || "");
  const applied = new Set(db.prepare("SELECT job_id FROM applications WHERE user_id = ?").all(req.user.id).map((a) => a.job_id));
  const all = listJobs(true);
  const roles = [...new Set(all.map((j) => j.title))].sort();
  const items = all
    .filter((j) => !role || j.title === role)
    .filter((j) => !type || j.type === type)
    .filter((j) => !q || `${j.title} ${j.company} ${j.skills.join(" ")}`.toLowerCase().includes(q))
    .map((j) => {
      const m = computeMatch(student, j);
      return { ...j, match: m.score, verdict: m.verdict, eligible: m.eligible, applied: applied.has(j.id) };
    })
    .sort((a, b) => b.match - a.match);
  res.json({ jobs: items, roles });
});

r.get("/jobs/:id", (req, res) => {
  const job = getJob(req.params.id);
  if (!job) throw new HttpError(404, "Job not found");
  const student = loadStudent(req.user.id);
  const applied = !!db.prepare("SELECT 1 FROM applications WHERE user_id = ? AND job_id = ?").get(req.user.id, job.id);
  res.json({ job, match: computeMatch(student, job), applied });
});

r.post("/jobs/:id/apply", (req, res) => {
  const job = getJob(req.params.id);
  if (!job) throw new HttpError(404, "Job not found");
  if (job.status !== "Active") bad("This job is no longer accepting applications.");
  const match = computeMatch(loadStudent(req.user.id), job);
  if (!match.eligible) bad(`This job requires a CGPA of ${job.min_cgpa} or above.`);
  db.prepare("INSERT OR IGNORE INTO applications (user_id, job_id, match_score) VALUES (?, ?, ?)").run(req.user.id, job.id, match.score);
  res.status(201).json({ ok: true, apply_url: job.apply_url || null });
});

// ---------- skill gap, roadmap, readiness ----------
r.get("/roles", (req, res) => res.json(ROLE_NAMES));

r.get("/readiness", (req, res) => res.json(computeReadiness(loadStudent(req.user.id))));

r.get("/skill-gap", (req, res) => {
  const { student, jobs, role } = context(req.user.id);
  res.json(analyzeSkillGap(student, ROLE_NAMES.includes(req.query.role) ? req.query.role : role, jobs));
});

r.get("/roadmap", (req, res) => {
  const { student, jobs, readiness, role } = context(req.user.id);
  const roadmap = generateRoadmap(student, ROLE_NAMES.includes(req.query.role) ? req.query.role : role, jobs, readiness);
  const goals = db.prepare("SELECT title, status FROM goals WHERE user_id = ? AND source = 'roadmap'").all(req.user.id);
  const byTitle = new Map(goals.map((g) => [g.title, g.status]));
  roadmap.steps = roadmap.steps.map((s) => ({ ...s, status: byTitle.get(`${s.order}. ${s.title}`) || null }));
  roadmap.started = goals.length > 0;
  res.json(roadmap);
});

r.post("/roadmap/start", (req, res) => {
  const { student, jobs, readiness, role } = context(req.user.id);
  const target = ROLE_NAMES.includes(req.body?.role) ? req.body.role : role;
  const roadmap = generateRoadmap(student, target, jobs, readiness);
  db.prepare("UPDATE student_profiles SET target_role = ? WHERE user_id = ?").run(target, req.user.id);
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM goals WHERE user_id = ? AND source = 'roadmap' AND status = 'pending'").run(req.user.id);
    const ins = db.prepare("INSERT INTO goals (user_id, title, description, source, weeks) VALUES (?, ?, ?, 'roadmap', ?)");
    for (const s of roadmap.steps) {
      const title = `${s.order}. ${s.title}`;
      const exists = db.prepare("SELECT 1 FROM goals WHERE user_id = ? AND title = ? AND source = 'roadmap'").get(req.user.id, title);
      if (!exists) ins.run(req.user.id, title, s.description, s.weeks);
    }
  });
  tx();
  res.status(201).json({ ok: true });
});

// ---------- learning goals ----------
r.get("/goals", (req, res) => res.json(db.prepare("SELECT * FROM goals WHERE user_id = ? ORDER BY status DESC, id DESC").all(req.user.id)));

r.post("/goals", (req, res) => {
  const title = str(150)(req.body?.title);
  if (!title) bad("Goal title is required");
  const info = db.prepare("INSERT INTO goals (user_id, title, description) VALUES (?, ?, ?)").run(req.user.id, title, str(400)(req.body?.description));
  res.status(201).json(db.prepare("SELECT * FROM goals WHERE id = ?").get(info.lastInsertRowid));
});

r.put("/goals/:id", (req, res) => {
  const status = req.body?.status;
  if (!["pending", "done"].includes(status)) bad('Status must be "pending" or "done"');
  const info = db
    .prepare("UPDATE goals SET status = ?, completed_at = CASE WHEN ? = 'done' THEN datetime('now') ELSE NULL END WHERE id = ? AND user_id = ?")
    .run(status, status, req.params.id, req.user.id);
  if (!info.changes) throw new HttpError(404, "Goal not found");
  res.json(db.prepare("SELECT * FROM goals WHERE id = ?").get(req.params.id));
});

r.delete("/goals/:id", (req, res) => {
  const info = db.prepare("DELETE FROM goals WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
  if (!info.changes) throw new HttpError(404, "Goal not found");
  res.json({ ok: true });
});

export default r;
