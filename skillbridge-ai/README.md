# SkillBridge AI

AI-powered placement preparation and career guidance platform with two modules: **Student** and **Training & Placement Officer (TPO)**. Built from the 12 UI screens and the feature breakdown.

**Stack:** React 19 + Vite + React Router · Express 5 · Better Auth (email/password, sessions) · SQLite (better-sqlite3)

## Quick start

Requires Node.js 20+ (developed on Node 22).

```bash
# 1. API server
cd server
npm install
cp .env.example .env        # then set BETTER_AUTH_SECRET to a long random string
npm run seed                # creates demo TPO, 12 students, 9 jobs
npm run dev                 # http://localhost:3001

# 2. Web app (new terminal)
cd client
npm install
npm run dev                 # http://localhost:5173
```

Open http://localhost:5173. The Vite dev server proxies `/api` to the Express server, so no CORS setup is needed.

### Demo accounts (password for all: `Password@123`)

| Role | Email | Login page |
|---|---|---|
| Student (strong profile) | `ananya@college.edu` | `/login` |
| Student (weak profile) | `pooja@college.edu` | `/login` |
| Placement Officer | `tpo@skillbridge.test` | `/tpo/login` |

New students can also self-register at `/signup`. `npm run seed:reset` wipes and re-seeds.

### Production build
```bash
cd client && npm run build
cd ../server && npm start    # serves the API and the built client on :3001
```
Set `BETTER_AUTH_URL` to your public URL and use a strong `BETTER_AUTH_SECRET`.

## Screens → routes

| # | Screen | Route |
|---|---|---|
| 1 | Landing page | `/` |
| 2 | Login / Signup | `/login`, `/signup`, `/tpo/login` |
| 3 | Student dashboard | `/student` |
| 4 | Student profile (skills, projects, certs, achievements) | `/student/profile` |
| 5 | Resume analyzer | `/student/resume` |
| 6 | Job opportunities | `/student/jobs` |
| 7 | Job match analysis (explainable) | `/student/jobs/:id` |
| 8 | AI career roadmap + skill gap + goals | `/student/roadmap` |
| 9 | Placement officer dashboard | `/tpo` |
| 10 | Student management (+ detail, skill verification) | `/tpo/students`, `/tpo/students/:id` |
| 11 | Job management (add / edit / delete) | `/tpo/jobs` |
| 12 | AI candidate ranking | `/tpo/ranking` |
| + | Placement reports + CSV export | `/tpo/reports` |

## How the "AI" works

All AI features are **rule-based and explainable**, in `server/src/services/` (pure JS, no external API, no cost, works offline). That is deliberate: every score can be traced to a reason shown in the UI.

- **Job match** (`matching.js`): 60% skills + 15% CGPA + 15% projects + 10% certifications. Per-skill score comes from proficiency level, years, verification, and whether the skill appears in a project. Returns an explanation list, gaps and recommendations.
- **Readiness** (`readiness.js`): 40% technical + 25% projects + 15% certifications + 20% profile completeness.
- **Skill gap** (`skillgap.js`): compares the student's skills with a role profile, prioritised by role weight and how many open jobs ask for the skill.
- **Roadmap** (`roadmap.js`): staged plan (strengthen → learn → portfolio project → interview prep) with an estimated readiness after completion. "Start Roadmap" saves the steps as trackable goals.
- **Resume analyzer** (`resume.js`): extracts text from PDF/TXT, detects skills against a catalog, checks sections/contact details/impact wording and scores out of 100.
- **Candidate ranking**: runs the same match function over every student for a chosen job.

Skill names are normalised through an alias catalog (`catalog.js`), so "node.js", "NodeJS" and "Node JS" are the same skill. Add new skills and roles there.

To make any of these LLM-powered later, replace the function body in the matching service file; the API contracts and UI do not need to change.

## Project structure

```
server/src/
  index.js        Express app (Better Auth mounted first)
  auth.js         Better Auth config (role field cannot be set by clients)
  db.js           SQLite schema (auth tables + app tables)
  data.js         shared DB loaders
  middleware.js   requireAuth / requireRole
  routes/         student.js, tpo.js
  services/       catalog, matching, readiness, skillgap, roadmap, resume
  seed.js         demo data
server/test/      unit tests for the AI services (npm test)
client/src/
  App.jsx         routes + role-protected layouts
  api.js          fetch wrapper, useFetch hook, Better Auth client
  components/     Layout, Ui (Donut, Bar, Modal, charts…)
  pages/          Landing, Login, Signup, student/*, tpo/*
```

## Security notes

- Roles are enforced on the server for every `/api/student/*` and `/api/tpo/*` route; the client guard is only for UX.
- Users cannot choose their own role at signup (`input: false`). TPO accounts are created by the seed script. For a real deployment, create officer accounts the same way (or add an admin invite flow).
- Students can only read and modify their own records (every query is scoped by `user_id`).
- Inputs are validated server-side; uploads are limited to 5 MB PDF/TXT with a PDF header check; CSV export neutralises spreadsheet formula injection.

## Known limitations

- Resume parsing needs text-based PDFs (scanned images are rejected with a clear message). DOCX is not supported.
- Learning-resource links in `catalog.js` point to well-known official docs; review them before a public launch.
- "Skill verified" is set by the TPO manually.
- No email verification or password reset (Better Auth supports both once you configure an email sender).
- SQLite is perfect for a demo or a single college; move to Postgres for multi-institution scale.
