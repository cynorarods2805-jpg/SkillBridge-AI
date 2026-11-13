
import { Router } from "express";
import { db } from "../db.js";
import { bad, HttpError } from "../middleware.js";
import { loadStudent, allStudentIds, listJobs, getJob } from "../data.js";
import { computeMatch } from "../services/matching.js";
import { computeReadiness } from "../services/readiness.js";
import { analyzeSkillGap, demandMap } from "../services/skillgap.js";
import { skillRef, labelOfKey, DEFAULT_ROLE } from "../services/catalog.js";
import multer from "multer";
import pdf from "pdf-parse";
import Groq from "groq-sdk";

const r = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are allowed"));
  },
});

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ---------- PDF job extraction ----------
r.post("/jobs/extract-pdf", upload.single("pdf"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Please upload a PDF file" });
  }

  try {
    const parsedPdf = await pdf(req.file.buffer);
    const pdfText = parsedPdf.text.trim();

    if (!pdfText) {
      return res.status(400).json({
        error: "No readable text found in PDF. Try a text-based PDF.",
      });
    }

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Extract job information from the job description.
Return JSON with these fields:
title, company, type, location, description, eligibility,
skills (array), min_cgpa (number), openings (number), apply_url.
Use empty strings for unavailable text fields, [] for skills,
0 for min_cgpa, and 1 for openings.
type must be Full-time, Internship, Part-time, or Contract.
Do not invent missing information.`,
        },
        {
          role: "user",
          content: pdfText.slice(0, 18000),
        },
      ],
    });

    const extracted = JSON.parse(completion.choices[0].message.content);
    res.json({ extracted });
  } catch (error) {
    console.error("PDF extraction error:", error);
    res.status(500).json({
      error: "Failed to extract job details from PDF",
    });
  }
});

// ---------- helpers ----------
function summaries() {
  return allStudentIds()
    .map((id) => {
      const s = loadStudent(id);

      if (!s) return null;

      const readiness = computeReadiness(s);

      return { s, readiness };
    })
    .filter(Boolean);
}

const brief = ({ s, readiness }) => ({
  id: s.id,
  name: s.name,
  email: s.email,
  roll_no: s.profile.roll_no || null,
  department: s.profile.department || null,
  cgpa: s.profile.cgpa ?? null,
  grad_year: s.profile.grad_year || null,
  readiness: readiness.overall,
  skills: s.skills.map((k) => k.name),
  projectCount: s.projects.length,
  certCount: s.certifications.length,
});

const BUCKETS = [
  ["<60%", (v) => v < 60],
  ["60-70", (v) => v >= 60 && v < 70],
  ["70-80", (v) => v >= 70 && v < 80],
  ["80-90", (v) => v >= 80 && v < 90],
  [">90%", (v) => v >= 90],
];

const distribution = (students) => {
  const validStudents = students.filter(
    (student) =>
      Number.isFinite(student.readiness) &&
      student.readiness >= 0 &&
      student.readiness <= 100
  );

  return BUCKETS.map(([label, test]) => ({
    label,
    count: validStudents.filter((student) =>
      test(student.readiness)
    ).length,
  }));
};

// ---------- analytics ----------
r.get("/analytics", (req, res) => {
  const list = summaries();
  const briefs = list.map(brief);
  const jobs = listJobs(false);
  const active = jobs.filter((j) => j.status === "Active");

  const demand = [...demandMap(jobs).entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k, v]) => ({
      skill: labelOfKey(k),
      percent: Math.round(v * 100),
    }));

  const counts = new Map();

  for (const b of briefs) {
    for (const n of new Set(b.skills.map((x) => skillRef(x).key))) {
      counts.set(n, (counts.get(n) || 0) + 1);
    }
  }

  const skillDistribution = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k, c]) => ({
      skill: labelOfKey(k),
      students: c,
    }));

  const readinessDistribution = distribution(briefs);
  const below60 = briefs.filter((b) => b.readiness < 60);

  res.json({
    totalStudents: briefs.length,
    activeJobs: active.length,

    avgReadiness: briefs.length
      ? Math.round(
          briefs.reduce((a, b) => a + b.readiness, 0) /
            briefs.length
        )
      : 0,

    selections: db
      .prepare(
        "SELECT COUNT(*) c FROM applications WHERE status = 'selected'"
      )
      .get().c,

    applications: db
      .prepare("SELECT COUNT(*) c FROM applications")
      .get().c,

    distribution: readinessDistribution,
    topSkillsInDemand: demand,
    skillDistribution,

    needsPreparation: below60
      .sort((a, b) => a.readiness - b.readiness)
      .slice(0, 8),
  });
});

// ---------- students ----------
r.get("/students", (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  const dept = String(req.query.department || "").trim();
  const skill = String(req.query.skill || "").trim().toLowerCase();

  const minReadinessRaw = String(req.query.minReadiness ?? "").trim();
  const minCgpaRaw = String(req.query.minCgpa ?? "").trim();

  const minReadiness =
    minReadinessRaw === "" ? null : Number(minReadinessRaw);

  const minCgpa =
    minCgpaRaw === "" ? null : Number(minCgpaRaw);

  const all = summaries().map(brief);

  const departments = [
    ...new Set(all.map((b) => b.department).filter(Boolean)),
  ].sort();

  const students = all.filter((b) => {
    // Search: name, email, roll number, or skill
    const searchText = [
      b.name,
      b.email,
      b.roll_no,
      ...b.skills,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (q && !searchText.includes(q)) return false;

    // Department
    if (dept && b.department !== dept) return false;

    // Skill: partial, case-insensitive matching
    if (
      skill &&
      !b.skills.some((name) => {
        const normalizedName = String(name).toLowerCase();
        const normalizedKey = skillRef(name).key.toLowerCase();

        return (
          normalizedName.includes(skill) ||
          normalizedKey.includes(skill)
        );
      })
    ) {
      return false;
    }

    // Minimum CGPA
    if (
      minCgpa !== null &&
      (!Number.isFinite(minCgpa) || (b.cgpa ?? 0) < minCgpa)
    ) {
      return false;
    }

    // Minimum readiness
    if (
      minReadiness !== null &&
      (!Number.isFinite(minReadiness) ||
        b.readiness < minReadiness)
    ) {
      return false;
    }

    return true;
  });

  res.json({ students, departments });
});

// ---------- student detail ----------
r.get("/students/:id", (req, res) => {
  const s = loadStudent(req.params.id);

  if (!s) throw new HttpError(404, "Student not found");

  const jobs = listJobs(false);
  const role = s.profile.target_role || DEFAULT_ROLE;

  const resume = db
    .prepare(
      "SELECT * FROM resume_analyses WHERE user_id = ? ORDER BY id DESC LIMIT 1"
    )
    .get(s.id);

  res.json({
    ...s,
    readiness: computeReadiness(s),
    skillGap: analyzeSkillGap(s, role, jobs),

    resumeAnalysis: resume
      ? {
          filename: resume.filename,
          created_at: resume.created_at,
          ...JSON.parse(resume.result),
        }
      : null,

    applications: db
      .prepare(
        "SELECT a.status, a.match_score, a.created_at, j.title, j.company FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.user_id = ? ORDER BY a.id DESC"
      )
      .all(s.id),
  });
});

// ---------- skill verification ----------
r.put("/students/:id/skills/:skillId/verify", (req, res) => {
  const info = db
    .prepare("UPDATE skills SET verified = ? WHERE id = ? AND user_id = ?")
    .run(
      req.body?.verified ? 1 : 0,
      req.params.skillId,
      req.params.id
    );

  if (!info.changes) throw new HttpError(404, "Skill not found");

  res.json({ ok: true });
});

// ---------- jobs ----------
const text = (v, max, label, required) => {
  const s = v == null ? "" : String(v).trim().slice(0, max);

  if (required && !s) bad(`${label} is required`);

  return s || null;
};

function jobFields(body) {
  const skills = (
    Array.isArray(body.skills)
      ? body.skills
      : String(body.skills || "").split(",")
  )
    .map((x) => String(x).trim())
    .filter(Boolean)
    .slice(0, 20);

  if (!skills.length) bad("Add at least one required skill");

  const minCgpa =
    body.min_cgpa === "" || body.min_cgpa == null
      ? 0
      : Number(body.min_cgpa);

  if (Number.isNaN(minCgpa) || minCgpa < 0 || minCgpa > 10) {
    bad("Minimum CGPA must be between 0 and 10");
  }

  const openings = Number(body.openings ?? 1);

  if (!Number.isInteger(openings) || openings < 1) {
    bad("Openings must be a whole number of at least 1");
  }

  const type = ["Full-time", "Internship", "Part-time", "Contract"].includes(
    body.type
  )
    ? body.type
    : "Full-time";

  const status = ["Active", "Closed"].includes(body.status)
    ? body.status
    : "Active";

  let apply_url = text(body.apply_url, 500);

  if (apply_url && !/^https?:\/\//i.test(apply_url)) {
    bad("Application link must start with http:// or https://");
  }

  return {
    title: text(body.title, 120, "Job title", true),
    company: text(body.company, 120, "Company", true),
    type,
    location: text(body.location, 120),
    description: text(body.description, 2000),
    eligibility: text(body.eligibility, 500),
    skills: JSON.stringify(skills),
    min_cgpa: minCgpa,
    openings,
    apply_url,
    status,
  };
}

r.get("/jobs", (req, res) => {
  const counts = new Map(
    db
      .prepare("SELECT job_id, COUNT(*) c FROM applications GROUP BY job_id")
      .all()
      .map((x) => [x.job_id, x.c])
  );

  res.json(
    listJobs(false).map((j) => ({
      ...j,
      applications: counts.get(j.id) || 0,
    }))
  );
});

r.post("/jobs", (req, res) => {
  const d = jobFields(req.body || {});
  const cols = Object.keys(d);

  const info = db
    .prepare(
      `INSERT INTO jobs (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`
    )
    .run(...cols.map((c) => d[c]));

  res.status(201).json(getJob(info.lastInsertRowid));
});

r.put("/jobs/:id", (req, res) => {
  if (!getJob(req.params.id)) throw new HttpError(404, "Job not found");

  const d = jobFields(req.body || {});
  const cols = Object.keys(d);

  db.prepare(
    `UPDATE jobs SET ${cols.map((c) => `${c} = ?`).join(", ")} WHERE id = ?`
  ).run(...cols.map((c) => d[c]), req.params.id);

  res.json(getJob(req.params.id));
});

r.delete("/jobs/:id", (req, res) => {
  const info = db.prepare("DELETE FROM jobs WHERE id = ?").run(req.params.id);

  if (!info.changes) throw new HttpError(404, "Job not found");

  res.json({ ok: true });
});

// ---------- candidate ranking ----------
r.get("/jobs/:id/ranking", (req, res) => {
  const job = getJob(req.params.id);

  if (!job) throw new HttpError(404, "Job not found");

  const statuses = new Map(
    db
      .prepare("SELECT user_id, status FROM applications WHERE job_id = ?")
      .all(job.id)
      .map((a) => [a.user_id, a.status])
  );

  const candidates = summaries()
    .map(({ s, readiness }) => {
      const match = computeMatch(s, job);

      return {
        student: {
          id: s.id,
          name: s.name,
          department: s.profile.department || null,
          cgpa: s.profile.cgpa ?? null,
          readiness: readiness.overall,
          projects: s.projects.length,
          certifications: s.certifications.length,
        },
        match,
        status: statuses.get(s.id) || null,
      };
    })
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, 25)
    .map((c, i) => ({ rank: i + 1, ...c }));

  res.json({ job, candidates });
});

r.put("/jobs/:jobId/candidates/:studentId/status", (req, res) => {
  const status = req.body?.status;

  if (!["applied", "shortlisted", "selected", "rejected"].includes(status)) {
    bad("Invalid status");
  }

  const job = getJob(req.params.jobId);
  const student = loadStudent(req.params.studentId);

  if (!job || !student) {
    throw new HttpError(404, "Job or student not found");
  }

  const score = computeMatch(student, job).score;

  db.prepare(
    `INSERT INTO applications (user_id, job_id, status, match_score)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, job_id)
     DO UPDATE SET status = excluded.status, match_score = excluded.match_score`
  ).run(student.id, job.id, status, score);

  res.json({ ok: true });
});

// ---------- reports ----------
r.get("/reports", (req, res) => {
  const list = summaries();
  const briefs = list.map(brief);

  const byDept = new Map();

  for (const b of briefs) {
    const k = b.department || "Not set";

    const d = byDept.get(k) || {
      department: k,
      students: 0,
      total: 0,
    };

    d.students++;
    d.total += b.readiness;

    byDept.set(k, d);
  }

  const skillCounts = new Map();

  for (const b of briefs) {
    for (const n of new Set(b.skills.map((x) => skillRef(x).key))) {
      skillCounts.set(n, (skillCounts.get(n) || 0) + 1);
    }
  }

  const demand = demandMap(listJobs(false));

  const skillSupplyDemand = [...demand.entries()]
    .map(([k, d]) => ({
      skill: labelOfKey(k),
      demand: Math.round(d * 100),
      students: briefs.length
        ? Math.round(
            ((skillCounts.get(k) || 0) / briefs.length) * 100
          )
        : 0,
    }))
    .map((x) => ({ ...x, gap: x.demand - x.students }))
    .sort((a, b) => b.gap - a.gap);

  const insights = [];
  const weak = briefs.filter((b) => b.readiness < 60).length;

  if (weak) {
    insights.push(
      `${weak} student${weak > 1 ? "s are" : " is"} below 60% readiness and may need extra preparation.`
    );
  }

  const top = skillSupplyDemand.filter((x) => x.gap > 20).slice(0, 3);

  if (top.length) {
    insights.push(
      `Biggest skill gaps versus open jobs: ${top
        .map((t) => `${t.skill} (${t.demand}% of jobs, ${t.students}% of students)`)
        .join("; ")}.`
    );
  }

  const noResume = list.filter(({ s }) => !s.resume).length;

  if (noResume) {
    insights.push(
      `${noResume} student${noResume > 1 ? "s have" : " has"} not uploaded a resume for analysis.`
    );
  }

  const noProjects = briefs.filter((b) => b.projectCount === 0).length;

  if (noProjects) {
    insights.push(
      `${noProjects} student${noProjects > 1 ? "s have" : " has"} no projects listed.`
    );
  }

  res.json({
    totals: {
      students: briefs.length,
      avgReadiness: briefs.length
        ? Math.round(
            briefs.reduce((a, b) => a + b.readiness, 0) /
              briefs.length
          )
        : 0,
    },

    distribution: distribution(briefs),

    departments: [...byDept.values()].map((d) => ({
      department: d.department,
      students: d.students,
      avgReadiness: Math.round(d.total / d.students),
    })),

    skillSupplyDemand,
    insights,
  });
});

// ---------- CSV export ----------
const csvCell = (v) => {
  let s = v == null ? "" : String(v);

  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;

  return `"${s.replace(/"/g, '""')}"`;
};

r.get("/reports/students.csv", (req, res) => {
  const header = [
    "Name",
    "Email",
    "Roll No",
    "Department",
    "CGPA",
    "Graduation Year",
    "Readiness %",
    "Skills",
    "Projects",
    "Certifications",
  ];

  const rows = summaries()
    .map(brief)
    .map((b) => [
      b.name,
      b.email,
      b.roll_no,
      b.department,
      b.cgpa,
      b.grad_year,
      b.readiness,
      b.skills.join("; "),
      b.projectCount,
      b.certCount,
    ]);

  const csv = [header, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="student-readiness-report.csv"'
  );

  res.send(csv);
});

export default r;
