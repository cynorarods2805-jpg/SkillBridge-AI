// Creates demo data: 1 placement officer, 12 students and 8 jobs.
//   npm run seed          (skips if data already exists)
//   npm run seed:reset    (wipes everything first)
import "dotenv/config";
import { db } from "./db.js";
import { auth } from "./auth.js";

const PASSWORD = "Password@123";
const reset = process.argv.includes("--reset");

if (reset) {
  for (const t of ["applications", "goals", "resume_analyses", "achievements", "certifications", "projects", "skills", "student_profiles", "jobs", "session", "account", "verification", "user"]) {
    db.prepare(`DELETE FROM "${t}"`).run();
  }
  console.log("Cleared existing data.");
} else if (db.prepare(`SELECT COUNT(*) c FROM "user"`).get().c > 0) {
  console.log("Database already has users. Run `npm run seed:reset` to wipe and re-seed.");
  process.exit(0);
}

const L = { B: "Beginner", I: "Intermediate", A: "Advanced", E: "Expert" };
const students = [
  { name: "Ananya R", email: "ananya@college.edu", roll: "21CS001", dept: "CSE", cgpa: 8.7, year: 2025, role: "Full Stack Developer",
    skills: [["React", "A", 2, 1], ["Node.js", "A", 1.5, 1], ["PostgreSQL", "A", 1], ["REST APIs", "A", 1.5], ["JavaScript", "A", 2, 1], ["Git", "A", 2], ["TypeScript", "I", 1], ["HTML", "A", 2], ["CSS", "A", 2]],
    projects: [["Placement Portal", "Full stack placement portal with role-based dashboards and analytics.", ["React", "Node.js", "PostgreSQL", "REST APIs"]], ["Expense Tracker", "Expense tracker with charts and CSV export for personal finance.", ["React", "JavaScript", "CSS"]]],
    certs: [["Meta Front-End Developer Certificate", "Coursera"]] },
  { name: "Rohan S", email: "rohan@college.edu", roll: "21CS014", dept: "CSE", cgpa: 8.3, year: 2025, role: "Software Engineer",
    skills: [["Java", "A", 2, 1], ["Spring Boot", "I", 1], ["MySQL", "A", 1.5], ["Data Structures & Algorithms", "A", 2], ["Git", "I", 1.5], ["REST APIs", "I", 1]],
    projects: [["Library Management", "Spring Boot library system with MySQL and REST APIs for borrowing.", ["Java", "Spring Boot", "MySQL"]]],
    certs: [] },
  { name: "Meera K", email: "meera@college.edu", roll: "21CS022", dept: "CSE", cgpa: 8.9, year: 2025, role: "Full Stack Developer",
    skills: [["React", "E", 3, 1], ["Node.js", "A", 2, 1], ["PostgreSQL", "A", 2], ["Docker", "I", 1], ["TypeScript", "A", 2], ["REST APIs", "E", 2], ["JavaScript", "E", 3], ["Git", "A", 3], ["CSS", "A", 2], ["HTML", "A", 3]],
    projects: [["SaaS Dashboard", "Multi-tenant analytics dashboard deployed with Docker on a cloud VM.", ["React", "TypeScript", "Node.js", "PostgreSQL", "Docker"]], ["Chat App", "Realtime chat with websockets and message history stored in a database.", ["Node.js", "React"]], ["Portfolio", "Personal portfolio website with blog and project showcase pages.", ["HTML", "CSS", "JavaScript"]]],
    certs: [["AWS Cloud Practitioner", "Amazon"], ["Meta Back-End Developer", "Coursera"]] },
  { name: "Arjun P", email: "arjun@college.edu", roll: "21IT008", dept: "IT", cgpa: 8.1, year: 2025, role: "Frontend Developer",
    skills: [["HTML", "A", 2], ["CSS", "A", 2], ["JavaScript", "I", 1], ["React", "I", 1], ["Git", "I", 1]],
    projects: [["Weather App", "Weather forecast app using a public API with search and favourites.", ["React", "JavaScript", "CSS"]]],
    certs: [] },
  { name: "Kavya M", email: "kavya@college.edu", roll: "21CS031", dept: "CSE", cgpa: 8.0, year: 2025, role: "Full Stack Developer",
    skills: [["React", "A", 1.5], ["JavaScript", "A", 1.5], ["Node.js", "I", 1], ["MongoDB", "I", 1], ["Git", "I", 1]],
    projects: [["Recipe Share", "Recipe sharing platform with auth and image uploads for users.", ["React", "Node.js", "MongoDB"]]],
    certs: [["JavaScript Algorithms Certificate", "freeCodeCamp"]] },
  { name: "Sneha D", email: "sneha@college.edu", roll: "21AI005", dept: "AI&DS", cgpa: 9.1, year: 2025, role: "Machine Learning Engineer",
    skills: [["Python", "E", 3, 1], ["Machine Learning", "A", 2], ["Pandas", "A", 2], ["NumPy", "A", 2], ["scikit-learn", "A", 1.5], ["Statistics", "I", 1], ["SQL", "I", 1], ["TensorFlow", "I", 1]],
    projects: [["Churn Predictor", "Customer churn prediction model with feature engineering and evaluation report.", ["Python", "Pandas", "scikit-learn"]], ["Image Classifier", "CNN-based image classifier trained on a custom dataset with TensorFlow.", ["Python", "TensorFlow"]]],
    certs: [["Machine Learning Specialization", "Coursera"]] },
  { name: "Vikram N", email: "vikram@college.edu", roll: "21EC012", dept: "ECE", cgpa: 7.2, year: 2025, role: "Backend Developer",
    skills: [["Python", "I", 1], ["SQL", "B", 0.5], ["Git", "B", 0.5]], projects: [], certs: [] },
  { name: "Divya L", email: "divya@college.edu", roll: "21IT019", dept: "IT", cgpa: 8.4, year: 2025, role: "Data Analyst",
    skills: [["SQL", "A", 1.5], ["Python", "I", 1], ["Excel", "A", 2], ["Power BI", "I", 1], ["Data Analysis", "I", 1], ["Statistics", "I", 1]],
    projects: [["Sales Dashboard", "Power BI sales dashboard with SQL data pipeline and monthly KPI reports.", ["Power BI", "SQL", "Excel"]]],
    certs: [["Google Data Analytics", "Coursera"]] },
  { name: "Karthik B", email: "karthik@college.edu", roll: "21CS040", dept: "CSE", cgpa: 7.6, year: 2025, role: "DevOps Engineer",
    skills: [["Linux", "A", 2], ["Docker", "I", 1], ["Git", "A", 2], ["Python", "B", 1], ["CI/CD", "B", 0.5]],
    projects: [["CI Pipeline", "GitHub Actions pipeline that builds and deploys a Dockerized app on Linux.", ["Docker", "CI/CD", "Linux"]]],
    certs: [] },
  { name: "Pooja T", email: "pooja@college.edu", roll: "21CS052", dept: "CSE", cgpa: 6.8, year: 2025, role: "Frontend Developer",
    skills: [["HTML", "I", 1], ["CSS", "I", 1]], projects: [], certs: [] },
  { name: "Imran Q", email: "imran@college.edu", roll: "21IT027", dept: "IT", cgpa: 8.2, year: 2025, role: "Backend Developer",
    skills: [["Node.js", "A", 1.5], ["Express.js", "A", 1.5], ["MongoDB", "A", 1], ["REST APIs", "A", 1.5], ["Git", "I", 1], ["SQL", "I", 1], ["Redis", "B", 0.5]],
    projects: [["URL Shortener", "URL shortener API with analytics and rate limiting using Redis cache.", ["Node.js", "Express.js", "Redis", "REST APIs"]]],
    certs: [] },
  { name: "Lakshmi V", email: "lakshmi@college.edu", roll: "21CS060", dept: "CSE", cgpa: 9.3, year: 2025, role: "Software Engineer",
    skills: [["Java", "E", 3, 1], ["Data Structures & Algorithms", "E", 3, 1], ["Spring Boot", "A", 1.5], ["MySQL", "A", 1.5], ["Git", "A", 2], ["System Design", "I", 1], ["REST APIs", "A", 1.5]],
    projects: [["Banking Microservices", "Microservice-based banking backend with Spring Boot and MySQL, with tests.", ["Java", "Spring Boot", "MySQL", "REST APIs"]], ["Competitive Programming Tracker", "Tracks coding contest ratings across platforms using public APIs.", ["Java", "REST APIs"]]],
    certs: [["Oracle Java SE Certification", "Oracle"]] },
];

const jobs = [
  ["Full Stack Developer", "TechNova", "Full-time", "Bengaluru", ["React", "Node.js", "PostgreSQL", "Docker", "REST APIs"], 7.5, 3, "Build and ship full stack features for our SaaS platform."],
  ["Software Engineer", "CodeSphere", "Full-time", "Pune", ["Java", "Spring Boot", "MySQL", "Data Structures & Algorithms"], 7.5, 5, "Work on backend services for enterprise clients."],
  ["Frontend Developer", "Webly Labs", "Internship", "Remote", ["React", "TypeScript", "Tailwind CSS"], 7.0, 4, "Build responsive UIs with React and TypeScript."],
  ["Backend Developer", "DevWorks", "Full-time", "Hyderabad", ["Node.js", "SQL", "REST APIs", "Docker", "Redis"], 7.0, 2, "Design and maintain scalable APIs."],
  ["Data Analyst", "InsightIQ", "Full-time", "Chennai", ["SQL", "Python", "Power BI", "Excel", "Statistics"], 7.0, 3, "Turn business data into dashboards and insights."],
  ["Machine Learning Engineer", "NeuralWorks", "Full-time", "Bengaluru", ["Python", "Machine Learning", "Pandas", "scikit-learn", "TensorFlow"], 8.0, 2, "Train and deploy ML models for recommendation systems."],
  ["DevOps Engineer", "CloudNest", "Internship", "Remote", ["Linux", "Docker", "CI/CD", "Kubernetes", "AWS"], 7.0, 2, "Automate builds and deployments."],
  ["Junior Web Developer", "PixelForge", "Full-time", "Mumbai", ["HTML", "CSS", "JavaScript", "React", "Git"], 6.5, 6, "Build marketing sites and web apps."],
];

async function createUser(name, email) {
  const res = await auth.api.signUpEmail({ body: { name, email, password: PASSWORD } });
  return res.user.id;
}

const ins = {
  profile: db.prepare(`INSERT INTO student_profiles (user_id, phone, bio, roll_no, department, grad_year, cgpa, college, github, linkedin, target_role) VALUES (?,?,?,?,?,?,?,?,?,?,?)`),
  skill: db.prepare("INSERT INTO skills (user_id, name, level, years, verified) VALUES (?,?,?,?,?)"),
  project: db.prepare("INSERT INTO projects (user_id, title, description, github_url, live_url, technologies) VALUES (?,?,?,?,?,?)"),
  cert: db.prepare("INSERT INTO certifications (user_id, name, issuer, issue_date) VALUES (?,?,?,?)"),
  job: db.prepare("INSERT INTO jobs (title, company, type, location, description, eligibility, skills, min_cgpa, openings, status) VALUES (?,?,?,?,?,?,?,?,?,?)"),
};

const tpoId = await createUser("Placement Officer", "tpo@skillbridge.test");
db.prepare(`UPDATE "user" SET role = 'tpo' WHERE id = ?`).run(tpoId);

let n = 0;
for (const s of students) {
  const id = await createUser(s.name, s.email);
  const handle = s.name.split(" ")[0].toLowerCase();
  const strong = s.skills.length >= 5;
  ins.profile.run(id, `98${String(10000000 + n * 1111111).slice(0, 8)}`, strong ? `Final-year ${s.dept} student interested in ${s.role} roles.` : null, s.roll, s.dept, s.year, s.cgpa, "Avinovate Institute", strong ? `https://github.com/${handle}` : null, strong ? `https://linkedin.com/in/${handle}` : null, s.role);
  for (const [name, lvl, years, verified] of s.skills) ins.skill.run(id, name, L[lvl], years, verified ? 1 : 0);
  for (const [title, desc, tech] of s.projects) ins.project.run(id, title, desc, `https://github.com/${handle}/${title.toLowerCase().replace(/\W+/g, "-")}`, tech.length > 3 ? `https://${handle}-${title.toLowerCase().replace(/\W+/g, "")}.example.com` : null, JSON.stringify(tech));
  for (const [name, issuer] of s.certs) ins.cert.run(id, name, issuer, "2025-03-01");
  n++;
}

for (const [title, company, type, location, skills, minCgpa, openings, desc] of jobs) {
  ins.job.run(title, company, type, location, desc, `CGPA ${minCgpa}+ with no active backlogs`, JSON.stringify(skills), minCgpa, openings, "Active");
}
// One closed posting so the status filter has something to show.
ins.job.run("Backend Developer", "LegacySoft", "Full-time", "Kolkata", "Maintain internal APIs.", "CGPA 7.0+", JSON.stringify(["Java", "SQL"]), 7.0, 1, "Closed");

console.log(`Seeded 1 TPO, ${students.length} students and ${jobs.length + 1} jobs.`);
console.log("\nDemo logins (password for all: " + PASSWORD + ")");
console.log("  TPO:     tpo@skillbridge.test   → /tpo/login");
console.log("  Student: ananya@college.edu     → /login");
process.exit(0);
