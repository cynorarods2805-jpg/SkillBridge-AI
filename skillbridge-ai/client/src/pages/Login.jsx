import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { authClient } from "../api.js";
import { ErrorBox } from "../components/Ui.jsx";

/** One form for both audiences. mode="tpo" is the placement-officer login. */
export default function Login({ mode }) {
  const isTpo = mode === "tpo";
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to={session.user.role === "tpo" ? "/tpo" : "/student"} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.email.trim() || !form.password) return setError("Enter your email and password.");
    setBusy(true);
    const { data, error: err } = await authClient.signIn.email({ email: form.email.trim(), password: form.password });
    setBusy(false);
    if (err) return setError(err.message || "Sign in failed. Check your email and password.");
    const role = data?.user?.role;
    if (isTpo && role !== "tpo") {
      await authClient.signOut();
      return setError("This account is not a placement officer account. Use the student login instead.");
    }
    if (!isTpo && role === "tpo") {
      await authClient.signOut();
      return setError("This is a placement officer account. Use the placement officer login.");
    }
    navigate(role === "tpo" ? "/tpo" : "/student");
  };

  return (
    <div className="auth">
      <form className="auth-form" onSubmit={submit} noValidate>
        <Link to="/" className="brand" style={{ padding: "0 0 24px", color: "inherit" }}>
          <span className="logo">S</span> SkillBridge AI
        </Link>
        <h1>{isTpo ? "Placement Officer Login" : "Welcome Back 👋"}</h1>
        <p className="muted">{isTpo ? "Sign in to manage students, jobs and placement analytics." : "Sign in to your account and continue your placement journey."}</p>
        <ErrorBox error={error} />
        <div className="field">
          <label htmlFor="email">Email address</label>
          <input id="email" type="email" autoComplete="email" placeholder="Enter your email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" placeholder="Enter your password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <button className="btn block" disabled={busy}>{busy ? "Signing in…" : "Sign In"}</button>
        <p className="muted small" style={{ marginTop: 16 }}>
          {isTpo ? <>Are you a student? <Link to="/login">Student login</Link></> : <>Don't have an account? <Link to="/signup">Sign Up</Link> · <Link to="/tpo/login">Placement officer?</Link></>}
        </p>
      </form>
      <div className="auth-side">
        <h2>One Platform for Students, Colleges and Recruiters</h2>
        <ul className="checks" style={{ marginTop: 14 }}>
          <li>AI-powered job matching</li><li>Skill gap analysis</li><li>Personalized learning paths</li>
        </ul>
      </div>
    </div>
  );
}
