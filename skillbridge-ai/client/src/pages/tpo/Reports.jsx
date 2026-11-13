import { useFetch } from "../../api.js";
import { Async, Bar, Card, ColumnChart, Pill, tone } from "../../components/Ui.jsx";

export default function Reports() {
  const res = useFetch("/tpo/reports");
  return (
    <Async res={res}>
      {(d) => (
        <div className="stack">
          <div className="row between wrap page-head">
            <div><h1>Placement Reports</h1><p>{d.totals.students} students · average readiness {d.totals.avgReadiness}%</p></div>
            <a className="btn" href="/api/tpo/reports/students.csv" download>Download student report (CSV)</a>
          </div>
          <Card title="Insights">
            {d.insights.length === 0 ? <div className="empty">No issues found. Readiness looks healthy.</div> : <ul className="checks warn">{d.insights.map((i) => <li key={i}>{i}</li>)}</ul>}
          </Card>
          <div className="grid g2">
            <Card title="Readiness distribution"><ColumnChart data={d.distribution} /></Card>
            <Card title="Department-wise readiness">
              {d.departments.map((x) => (
                <div className="meter-row" key={x.department} style={{ gridTemplateColumns: "100px 1fr 90px" }}>
                  <span>{x.department}</span><Bar value={x.avgReadiness} /><span className="small"><strong>{x.avgReadiness}%</strong> · {x.students}</span>
                </div>
              ))}
            </Card>
          </div>
          <Card title="Skill supply vs. job demand">
            <p className="muted small" style={{ marginTop: 0 }}>Demand = share of active jobs asking for the skill. Supply = share of students who list it. A large gap suggests a training need.</p>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Skill</th><th>Job demand</th><th>Students</th><th>Gap</th></tr></thead>
                <tbody>
                  {d.skillSupplyDemand.map((s) => (
                    <tr key={s.skill}>
                      <td><strong>{s.skill}</strong></td><td>{s.demand}%</td><td>{s.students}%</td>
                      <td><Pill color={s.gap > 30 ? "red" : s.gap > 10 ? "amber" : "green"}>{s.gap > 0 ? `+${s.gap}` : s.gap}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </Async>
  );
}
