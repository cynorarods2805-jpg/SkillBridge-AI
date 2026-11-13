import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api, authClient } from "../api.js";
import { ErrorBox } from "../components/Ui.jsx";

const DEPARTMENTS = ["CSE", "IT", "AI&DS", "ECE", "EEE", "MECH", "CIVIL", "Other"];

export default function Signup() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const [f, setF] = useState({ name: "", email: "", password: "", roll_no: "", department: "CSE", grad_year: new Date().getFullYear() + 1, cgpa: "", college: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  if (session && !busy) return <Navigate to={session.user.role === "tpo" ? "/tpo" : "/student"} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!f.name.trim()) return setError("Please enter your full name.");
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setError("Please enter a valid email address.");
    if (f.password.length < 8) return setError("Password must be at least 8 characters.");
    if (f.cgpa !== "" && (Number(f.cgpa) < 0 || Number(f.cgpa) > 10)) return setError("CGPA must be between 0 and 10.");
    setBusy(true);
    const { error: err } = await authClient.signUp.email({ name: f.name.trim(), email: f.email.trim(), password: f.password });
    if (err) {
      setBusy(false);
      return setError(err.message || "Could not create your account.");
    }
    try {
      await api("/student/profile", { method: "PUT", body: { roll_no: f.roll_no, department: f.department, grad_year: f.grad_year, cgpa: f.cgpa, college: f.college } });
    } catch {
      /* The account exists; the student can finish the profile later. */
    }
    navigate("/student");
  };

  return (
    <div className="auth">
      <form className="auth-form" onSubmit={submit} noValidate style={{ maxWidth: 560 }}>
        <Link to="/" className="brand" style={{ padding: "0 0 20px", color: "inherit" }}>
          <span className="logo">S</span> SkillBridge AI
        </Link>
        <h1>Create your student account</h1>
        <p className="muted">Tell us a little about yourself. You can add skills, projects and certifications after signing up.</p>
        <ErrorBox error={error} />
        <div className="form-grid">
          <div className="field full"><label htmlFor="name">Full name</label><input id="name" value={f.name} onChange={set("name")} autoComplete="name" /></div>
          <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" value={f.email} onChange={set("email")} autoComplete="email" /></div>
          <div className="field"><label htmlFor="password">Password</label><input id="password" type="password" value={f.password} onChange={set("password")} autoComplete="new-password" /><div className="hint">At least 8 characters</div></div>
          <div className="field"><label htmlFor="roll">Roll number</label><input id="roll" value={f.roll_no} onChange={set("roll_no")} /></div>
          <div className="field"><label htmlFor="dept">Department</label><select id="dept" value={f.department} onChange={set("department")}>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</select></div>
          <div className="field"><label htmlFor="year">Graduation year</label><input id="year" type="number" value={f.grad_year} onChange={set("grad_year")} /></div>
          <div className="field"><label htmlFor="cgpa">CGPA (out of 10)</label><input id="cgpa" type="number" step="0.01" min="0" max="10" value={f.cgpa} onChange={set("cgpa")} /></div>
          <div className="field full"><label htmlFor="college">College / Organization</label><input id="college" value={f.college} onChange={set("college")} /></div>
        </div>
        <button className="btn block" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
        <p className="muted small" style={{ marginTop: 16 }}>Already have an account? <Link to="/login">Sign in</Link></p>
      </form>
      <div className="auth-side">
        <h2>Know where you stand before placement season starts</h2>
        <ul className="checks" style={{ marginTop: 14 }}>
          <li>See your placement readiness score</li><li>Find jobs that match your skills</li><li>Get a roadmap for the skills you are missing</li>
        </ul>
      </div>
    </div>
  );
}
