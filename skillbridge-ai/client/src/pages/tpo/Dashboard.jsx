import { Link } from "react-router-dom";
import { useFetch } from "../../api.js";
import { Async, Bar, Card, ColumnChart, Pill, Stat, tone } from "../../components/Ui.jsx";

export default function TpoDashboard() {
  const res = useFetch("/tpo/analytics");
  return (
    <Async res={res}>
      {(d) => (
        <div className="stack">
          <div className="page-head"><h1>Placement Dashboard</h1><p>Overview of students, jobs and placement progress.</p></div>
          <div className="grid g4">
            <Stat icon="☺" label="Total Students" value={d.totalStudents} />
            <Stat icon="✦" label="Active Jobs" value={d.activeJobs} color="green" />
            <Stat icon="◎" label="Avg. Readiness" value={`${d.avgReadiness}%`} color="amber" />
            <Stat icon="★" label="Selections" value={d.selections} color="red" />
          </div>
          <div className="grid g-main">
            <Card title="Placement Readiness Distribution"><ColumnChart data={d.distribution} /></Card>
            <Card title="Top Skills in Demand">
              {d.topSkillsInDemand.length === 0 && <div className="empty">Add active jobs to see skill demand.</div>}
              {d.topSkillsInDemand.map((s) => (
                <div className="meter-row" key={s.skill} style={{ gridTemplateColumns: "110px 1fr 44px" }}><span>{s.skill}</span><Bar value={s.percent} color="purple" /><strong>{s.percent}%</strong></div>
              ))}
              <div className="hint">Share of active jobs requiring the skill</div>
            </Card>
          </div>
          <div className="grid g2">
            <Card title="Skills students have">
              {d.skillDistribution.length === 0 && <div className="empty">No student skills yet.</div>}
              {d.skillDistribution.map((s) => (
                <div className="meter-row" key={s.skill} style={{ gridTemplateColumns: "130px 1fr 36px" }}><span>{s.skill}</span><Bar value={(s.students / Math.max(1, d.totalStudents)) * 100} color="purple" /><strong>{s.students}</strong></div>
              ))}
            </Card>
            <Card title="Students who need extra preparation" action={<Link to="/tpo/students" className="small">View all</Link>}>
              {d.needsPreparation.length === 0 && <div className="empty">Everyone is above 60% readiness. 🎉</div>}
              {d.needsPreparation.map((s) => (
                <Link to={`/tpo/students/${s.id}`} className="list-item" key={s.id} style={{ color: "inherit" }}>
                  <span>{s.name} <span className="muted small">· {s.department || "—"}</span></span><Pill color={tone(s.readiness)}>{s.readiness}%</Pill>
                </Link>
              ))}
            </Card>
          </div>
        </div>
      )}
    </Async>
  );
}
