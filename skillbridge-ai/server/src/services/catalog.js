// Skill catalog, role profiles and learning resources.
// Everything in /services is pure JS (no DB, no network) so it is easy to test.

export const LEVEL_SCORE = { Beginner: 40, Intermediate: 65, Advanced: 85, Expert: 100 };
export const LEVELS = Object.keys(LEVEL_SCORE);

const S = (key, label, names, opts = {}) => ({
  key,
  label,
  names: names || [label],
  detect: opts.detect || names || [label],
  implies: opts.implies || [],
});

export const SKILLS = [
  S("javascript", "JavaScript", ["JavaScript", "JS", "ECMAScript"], { detect: ["JavaScript", "ECMAScript"] }),
  S("typescript", "TypeScript", ["TypeScript", "TS"], { detect: ["TypeScript"], implies: ["javascript"] }),
  S("react", "React", ["React", "React.js", "ReactJS", "React JS"], { detect: ["React", "React.js", "ReactJS"], implies: ["javascript"] }),
  S("nextjs", "Next.js", ["Next.js", "NextJS", "Next JS"], { implies: ["react"] }),
  S("vue", "Vue.js", ["Vue.js", "Vue", "VueJS"]),
  S("angular", "Angular", ["Angular", "AngularJS"]),
  S("html", "HTML", ["HTML", "HTML5"]),
  S("css", "CSS", ["CSS", "CSS3"]),
  S("tailwindcss", "Tailwind CSS", ["Tailwind CSS", "Tailwind", "TailwindCSS"]),
  S("redux", "Redux", ["Redux", "Redux Toolkit"]),
  S("nodejs", "Node.js", ["Node.js", "NodeJS", "Node JS", "Node"], { detect: ["Node.js", "NodeJS", "Node JS"] }),
  S("express", "Express.js", ["Express.js", "ExpressJS", "Express"], { detect: ["Express.js", "ExpressJS"] }),
  S("restapis", "REST APIs", ["REST APIs", "REST API", "RESTful", "RESTful APIs", "REST"], { detect: ["REST APIs", "REST API", "RESTful"] }),
  S("graphql", "GraphQL", ["GraphQL"]),
  S("python", "Python", ["Python"]),
  S("django", "Django", ["Django"], { implies: ["python"] }),
  S("flask", "Flask", ["Flask"], { implies: ["python"] }),
  S("fastapi", "FastAPI", ["FastAPI"], { implies: ["python"] }),
  S("java", "Java", ["Java"]),
  S("springboot", "Spring Boot", ["Spring Boot", "SpringBoot", "Spring"], { detect: ["Spring Boot", "SpringBoot"], implies: ["java"] }),
  S("cpp", "C++", ["C++", "CPP"], { detect: ["C++"] }),
  S("csharp", "C#", ["C#", "CSharp"], { detect: ["C#"] }),
  S("dotnet", ".NET", [".NET", "dotnet", "ASP.NET"]),
  S("php", "PHP", ["PHP"]),
  S("sql", "SQL", ["SQL"]),
  S("mysql", "MySQL", ["MySQL"], { implies: ["sql"] }),
  S("postgresql", "PostgreSQL", ["PostgreSQL", "Postgres", "Postgre SQL"], { detect: ["PostgreSQL", "Postgres"], implies: ["sql"] }),
  S("mongodb", "MongoDB", ["MongoDB", "Mongo"], { detect: ["MongoDB"] }),
  S("redis", "Redis", ["Redis"]),
  S("firebase", "Firebase", ["Firebase"]),
  S("docker", "Docker", ["Docker"]),
  S("kubernetes", "Kubernetes", ["Kubernetes", "K8s"]),
  S("cicd", "CI/CD", ["CI/CD", "CICD", "CI CD", "GitHub Actions", "Jenkins"], { detect: ["CI/CD", "GitHub Actions", "Jenkins"] }),
  S("git", "Git", ["Git", "GitHub", "Version Control"], { detect: ["Git", "GitHub", "Version Control"] }),
  S("aws", "AWS", ["AWS", "Amazon Web Services"]),
  S("linux", "Linux", ["Linux", "Ubuntu"], { detect: ["Linux"] }),
  S("dsa", "Data Structures & Algorithms", ["Data Structures & Algorithms", "Data Structures and Algorithms", "DSA", "Data Structures", "Algorithms"], { detect: ["Data Structures", "DSA", "Algorithms"] }),
  S("systemdesign", "System Design", ["System Design"]),
  S("testing", "Testing", ["Testing", "Jest", "Unit Testing", "Vitest", "Cypress"], { detect: ["Jest", "Unit Testing", "Vitest", "Cypress", "Pytest"] }),
  S("machinelearning", "Machine Learning", ["Machine Learning", "ML"], { detect: ["Machine Learning"] }),
  S("deeplearning", "Deep Learning", ["Deep Learning"]),
  S("tensorflow", "TensorFlow", ["TensorFlow"]),
  S("pytorch", "PyTorch", ["PyTorch"]),
  S("pandas", "Pandas", ["Pandas"]),
  S("numpy", "NumPy", ["NumPy"]),
  S("scikitlearn", "scikit-learn", ["scikit-learn", "sklearn", "Scikit Learn"], { detect: ["scikit-learn", "sklearn"] }),
  S("dataanalysis", "Data Analysis", ["Data Analysis", "Data Analytics"]),
  S("statistics", "Statistics", ["Statistics"]),
  S("powerbi", "Power BI", ["Power BI", "PowerBI"]),
  S("tableau", "Tableau", ["Tableau"]),
  S("excel", "Excel", ["Excel", "MS Excel", "Microsoft Excel"], { detect: ["MS Excel", "Microsoft Excel"] }),
  S("flutter", "Flutter", ["Flutter", "Dart"], { detect: ["Flutter"] }),
  S("reactnative", "React Native", ["React Native"]),
  S("kotlin", "Kotlin", ["Kotlin"]),
];

// Build lookup maps once.
const compact = (s) => String(s).toLowerCase().replace(/[\s.\-_/]/g, "");
const KEY_BY_NAME = new Map();
const BY_KEY = new Map();
for (const s of SKILLS) {
  BY_KEY.set(s.key, s);
  KEY_BY_NAME.set(compact(s.label), s.key);
  for (const n of s.names) KEY_BY_NAME.set(compact(n), s.key);
}

/** Turn any free-text skill name into { key, label }. Unknown skills keep their own name. */
export function skillRef(name) {
  const raw = String(name || "").trim();
  const key = KEY_BY_NAME.get(compact(raw)) || compact(raw);
  const known = BY_KEY.get(key);
  return { key, label: known ? known.label : raw };
}
export const keyOf = (name) => skillRef(name).key;
export const labelOfKey = (key) => (BY_KEY.get(key) ? BY_KEY.get(key).label : key);
export const impliedBy = (key) => (BY_KEY.get(key) ? BY_KEY.get(key).implies : []);

const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const DETECTORS = SKILLS.map((s) => ({
  key: s.key,
  label: s.label,
  re: new RegExp(`(?<![A-Za-z0-9+#])(?:${s.detect.map(esc).join("|")})(?![A-Za-z0-9+#])`, "i"),
}));

/** Find catalog skills mentioned in free text (used by the resume analyzer). */
export function detectSkills(text) {
  return DETECTORS.filter((d) => d.re.test(text)).map((d) => ({ key: d.key, label: d.label }));
}

// Required skills (with importance weight 1-3) per target role.
export const ROLES = {
  "Full Stack Developer": { javascript: 3, react: 3, nodejs: 3, restapis: 3, postgresql: 2, git: 2, typescript: 2, docker: 2, html: 1, css: 1 },
  "Frontend Developer": { html: 2, css: 2, javascript: 3, react: 3, typescript: 2, tailwindcss: 1, git: 2, restapis: 1, testing: 1 },
  "Backend Developer": { nodejs: 2, sql: 3, restapis: 3, git: 2, docker: 2, postgresql: 2, redis: 1, systemdesign: 1, dsa: 2 },
  "Software Engineer": { dsa: 3, java: 3, springboot: 2, mysql: 2, git: 2, restapis: 2, systemdesign: 1 },
  "Data Analyst": { sql: 3, python: 3, dataanalysis: 3, excel: 2, powerbi: 2, statistics: 2, pandas: 2, tableau: 1 },
  "Machine Learning Engineer": { python: 3, machinelearning: 3, pandas: 2, numpy: 2, scikitlearn: 2, tensorflow: 2, statistics: 2, sql: 1, git: 1 },
  "DevOps Engineer": { linux: 3, docker: 3, cicd: 3, kubernetes: 2, aws: 2, git: 2, python: 1 },
};
export const ROLE_NAMES = Object.keys(ROLES);
export const DEFAULT_ROLE = "Full Stack Developer";

const RES = {
  javascript: ["JavaScript.info – The Modern JavaScript Tutorial", "https://javascript.info"],
  typescript: ["TypeScript Handbook", "https://www.typescriptlang.org/docs/"],
  react: ["React – Learn (official docs)", "https://react.dev/learn"],
  nodejs: ["Node.js – Learn (official)", "https://nodejs.org/en/learn"],
  express: ["Express.js Guide", "https://expressjs.com/en/starter/installing.html"],
  postgresql: ["PostgreSQL Official Tutorial", "https://www.postgresql.org/docs/current/tutorial.html"],
  sql: ["SQLBolt – Interactive SQL lessons", "https://sqlbolt.com"],
  docker: ["Docker – Get Started", "https://docs.docker.com/get-started/"],
  git: ["Git Documentation", "https://git-scm.com/doc"],
  kubernetes: ["Kubernetes Tutorials", "https://kubernetes.io/docs/tutorials/"],
  python: ["The Python Tutorial", "https://docs.python.org/3/tutorial/"],
  html: ["MDN – Learn web development", "https://developer.mozilla.org/en-US/docs/Learn"],
  css: ["MDN – Learn web development", "https://developer.mozilla.org/en-US/docs/Learn"],
  tailwindcss: ["Tailwind CSS Docs", "https://tailwindcss.com/docs"],
  mongodb: ["MongoDB University", "https://learn.mongodb.com"],
  dsa: ["NeetCode Roadmap", "https://neetcode.io/roadmap"],
  systemdesign: ["System Design Primer", "https://github.com/donnemartin/system-design-primer"],
  restapis: ["MDN – Server-side web development", "https://developer.mozilla.org/en-US/docs/Learn/Server-side"],
};
export function resourceFor(key) {
  const r = RES[key];
  return r ? { title: r[0], url: r[1] } : { title: `Find a learning path for ${labelOfKey(key)} on roadmap.sh`, url: "https://roadmap.sh" };
}
