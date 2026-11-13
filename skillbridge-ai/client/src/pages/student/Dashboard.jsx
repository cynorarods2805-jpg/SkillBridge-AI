import { Link } from "react-router-dom";
import { useFetch, api } from "../../api.js";
import { Async, Bar, Card, Donut, Stat, tone } from "../../components/Ui.jsx";

export default function Dashboard() {
  const res = useFetch("/student/dashboard");
  return (
    <Async res={res}>
      {(d) => {
        const b = d.readiness;
        const rows = [["Technical Skills", b.technical], ["Projects", b.projects], ["Certifications", b.certifications], ["Profile Completeness", b.completeness]];
        const toggle = async (g) => {
          await api(`/student/goals/${g.id}`, { method: "PUT", body: { status: g.status === "done" ? "pending" : "done" } });
          res.reload();
        };
        return (
          <div className="stack">
            <div className="page-head">
              <h1>Welcome back, {d.name.split(" ")[0]}! 👋</h1>
              <p>Here's your placement readiness at a glance. Target role: <strong>{d.role}</strong></p>
            </div>
            <div className="grid g4">
              <Stat icon="◎" label="Placement Readiness" value={`${b.overall}%`} />
              <Stat icon="✦" label="Job Matches (70%+)" value={d.jobMatches} color="green" />
              <Stat icon="!" label="Skill Gaps" value={d.skillGaps} color="amber" />
              <Stat icon="⚑" label="Ongoing Goals" value={d.ongoingGoals} color="red" />
            </div>
            <div className="grid g-main">
              <Card title="Readiness Breakdown">
                <div className="row wrap" style={{ gap: 24 }}>
                  <Donut value={b.overall} label="Overall" />
                  <div style={{ flex: 1, minWidth: 240 }}>
                    {rows.map(([label, v]) => (
                      <div className="meter-row" key={label}>
                        <span>{label}</span>
                        <Bar value={v} />
                        <strong>{v}%</strong>
                      </div>
                    ))}
                  </div>
                </div>
                {b.tips.length > 0 && (
                  <>
                    <h3 style={{ marginTop: 18 }}>How to improve</h3>
                    <ul className="checks warn">{b.tips.map((t) => <li key={t}>{t}</li>)}</ul>
                  </>
                )}
              </Card>
              <div className="stack">
                <Card title="Upcoming Actions">
                  {d.actions.map((a) => (
                    <Link key={a.label} to={a.to} className="action-link"><span>{a.label}</span><span>→</span></Link>
                  ))}
                </Card>
                <Card title="Learning Goals" action={<Link to="/student/roadmap" className="small">Manage</Link>}>
                  {d.goals.length === 0 && <div className="empty">No goals yet. Start your career roadmap to create some.</div>}
                  {d.goals.map((g) => (
                    <label key={g.id} className="row" style={{ fontWeight: 400, padding: "5px 0" }}>
                      <input type="checkbox" style={{ width: "auto" }} checked={g.status === "done"} onChange={() => toggle(g)} />
                      <span style={{ textDecoration: g.status === "done" ? "line-through" : "none" }}>{g.title}</span>
                    </label>
                  ))}
                </Card>
              </div>
            </div>
          </div>
        );
      }}
    </Async>
  );
}
