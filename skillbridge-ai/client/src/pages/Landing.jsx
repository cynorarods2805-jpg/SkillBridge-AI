import { Link } from "react-router-dom";
import { Donut } from "../components/Ui.jsx";

const FEATURES = [
  ["✦", "AI job matching", "Every job gets a compatibility score based on your skills, CGPA, projects and certifications."],
  ["?", "Explainable results", "See exactly why you match, and which missing skills are holding your score back."],
  ["▤", "Resume analyzer", "Upload a PDF resume and get a score, detected skills and concrete fixes."],
  ["➤", "Career roadmap", "A staged learning plan with estimated readiness after you complete it."],
  ["▦", "Readiness tracking", "One placement-readiness score across skills, projects, certifications and profile."],
  ["★", "Candidate ranking", "Placement officers can rank students for any job and see the reasons behind each rank."],
];

export default function Landing() {
  return (
    <div>
      <header className="l-nav">
        <div className="brand" style={{ padding: 0 }}>
          <span className="logo">S</span> SkillBridge AI
        </div>
        <nav>
          <a className="hide-m" href="#features">Features</a>
          <a className="hide-m" href="#students">For Students</a>
          <a className="hide-m" href="#colleges">For Colleges</a>
          <a className="hide-m" href="#how">How it works</a>
          <Link className="btn small" to="/signup">Get Started</Link>
        </nav>
      </header>

      <section className="hero">
        <div>
          <span className="badge">AI-Powered Placement Platform</span>
          <h1>Bridge Skills to Career Opportunities with AI</h1>
          <p>An intelligent placement ecosystem that analyzes skills, matches students with the right jobs, and provides personalized upskilling paths.</p>
          <div className="row" style={{ marginTop: 22 }}>
            <Link className="btn" to="/signup">Get Started →</Link>
            <a className="btn ghost" href="#how">See how it works</a>
          </div>
        </div>
        <div className="mock row" style={{ justifyContent: "space-around" }} aria-hidden="true">
          <div style={{ textAlign: "center" }}>
            <Donut value={92} size={130} label="Match Score" />
          </div>
          <ul className="checks">
            <li>Skill Analysis</li><li>Job Matching</li><li>Skill Gap</li><li>Career Roadmap</li>
          </ul>
        </div>
      </section>

      <section className="section" id="features">
        <h2>Everything for placement season</h2>
        <p className="section-sub">Students understand where they stand. Placement officers see the whole picture.</p>
        <div className="grid g3">
          {FEATURES.map(([icon, title, text]) => (
            <div className="card feature" key={title}>
              <div className="stat-icon purple">{icon}</div>
              <h3>{title}</h3>
              <p className="muted small">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section alt" id="students">
        <h2>For students</h2>
        <p className="section-sub">Build your profile once. SkillBridge tells you which jobs fit, what you are missing and what to learn next.</p>
        <div className="row"><Link className="btn" to="/signup">Create student account</Link><Link className="btn ghost" to="/login">Student login</Link></div>
      </section>

      <section className="section" id="colleges">
        <h2>For colleges</h2>
        <p className="section-sub">Track readiness across departments, manage job postings and shortlist the best-matched candidates.</p>
        <Link className="btn ghost" to="/tpo/login">Placement officer login</Link>
      </section>

      <section className="section alt" id="how">
        <h2>How it works</h2>
        <div className="grid g4" style={{ marginTop: 18 }}>
          {["Create your profile with skills, projects and certifications", "Upload your resume for AI analysis", "See matched jobs and why you match", "Follow your roadmap and watch readiness grow"].map((t, i) => (
            <div className="card" key={t}>
              <div className="step-num" style={{ marginBottom: 10 }}>{i + 1}</div>
              <p style={{ margin: 0 }}>{t}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="footer">© {new Date().getFullYear()} SkillBridge AI · Built for hackathon demo</footer>
    </div>
  );
}
