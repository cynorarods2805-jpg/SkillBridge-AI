import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { authClient } from "../api.js";

const NAV = {
  student: [
    ["/student", "Dashboard", "▦", true],
    ["/student/profile", "Profile", "☺"],
    ["/student/resume", "Resume Analyzer", "▤"],
    ["/student/jobs", "Jobs", "✦"],
    ["/student/roadmap", "Career Roadmap", "➤"],
  ],
  tpo: [
    ["/tpo", "Dashboard", "▦", true],
    ["/tpo/students", "Students", "☺"],
    ["/tpo/jobs", "Jobs", "✦"],
    ["/tpo/ranking", "Candidate Ranking", "★"],
    ["/tpo/reports", "Reports", "▤"],
  ],
};

export default function Layout({ role, user }) {
  const navigate = useNavigate();
  const logout = async () => {
    await authClient.signOut();
    navigate(role === "tpo" ? "/tpo/login" : "/login");
  };
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="logo">S</span> SkillBridge AI
        </div>
        <nav>
          {NAV[role].map(([to, label, icon, end]) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              <span aria-hidden="true">{icon}</span> {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <span className="muted small">{role === "tpo" ? "Placement Officer" : "Student"} workspace</span>
          <div className="user-chip">
            <span className="avatar">{(user.name || "?").charAt(0).toUpperCase()}</span>
            <span>{user.name}</span>
            <button className="btn small ghost" onClick={logout}>
              Sign out
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
