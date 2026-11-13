import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, useFetch } from "../../api.js";
import { Async, Bar, Card, Donut, ErrorBox, Pill, Tag, tone } from "../../components/Ui.jsx";

export default function JobMatch() {
  const { id } = useParams();
  const res = useFetch(`/student/jobs/${id}`);
  const [tab, setTab] = useState("Skill Match");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const apply = async (job) => {
    setBusy(true);
    setError("");
    try {
      const { apply_url } = await api(`/student/jobs/${job.id}/apply`, { method: "POST" });
      res.reload();
      if (apply_url) window.open(apply_url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Async res={res}>
      {({ job, match, applied }) => (
        <div className="stack">
          <div className="small"><Link to="/student/jobs">Job Opportunities</Link> › Match Analysis</div>
          <div className="page-head">
            <h1>Job Match Analysis</h1>
            <p>Your compatibility with <strong>{job.title}</strong> at {job.company}</p>
          </div>
          <div className="grid g-main">
            <Card>
              <div className="row wrap" style={{ gap: 24, justifyContent: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <Donut value={match.score} label="Match" />
                  <div style={{ marginTop: 10 }}><Pill color={tone(match.score)}>{match.verdict}</Pill></div>
                  <div style={{ marginTop: 12 }}>
                    {applied ? <button className="btn" disabled>Applied ✓</button> : <button className="btn" onClick={() => apply(job)} disabled={busy || job.status !== "Active" || !match.eligible}>{busy ? "Applying…" : "Apply Now"}</button>}
                  </div>
                  {!match.eligible && <div className="hint">CGPA {job.min_cgpa}+ required</div>}
                  {job.status !== "Active" && <div className="hint">This job is closed</div>}
                </div>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div className="tabs">
                    {["Skill Match", "Analysis", "Recommendations"].map((t) => <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t}</button>)}
                  </div>
                  {tab === "Skill Match" && match.skills.map((s) => (
                    <div className="meter-row" key={s.key}>
                      <span>{s.status === "missing" ? "✕" : "✓"} {s.label}</span><Bar value={s.score} /><strong>{s.score}%</strong>
                    </div>
                  ))}
                  {tab === "Analysis" && (
                    <>
                      <h3 style={{ marginBottom: 6 }}>Why this score?</h3>
                      <ul className="checks">{match.explanation.map((e) => <li key={e}>{e}</li>)}</ul>
                      <h3 style={{ margin: "14px 0 6px" }}>Score breakdown</h3>
                      {[["Skills (60%)", match.breakdown.skills], ["CGPA (15%)", match.breakdown.cgpa], ["Projects (15%)", match.breakdown.projects], ["Certifications (10%)", match.breakdown.certifications]].map(([k, v]) => (
                        <div className="meter-row" key={k}><span>{k}</span><Bar value={v} /><strong>{v}%</strong></div>
                      ))}
                    </>
                  )}
                  {tab === "Recommendations" && <ul className="checks warn">{match.recommendations.map((r) => <li key={r}>{r}</li>)}</ul>}
                </div>
              </div>
              <ErrorBox error={error} />
            </Card>
            <Card title="About this job">
              <p className="small">{job.description || "No description provided."}</p>
              <div className="small"><span className="muted">Type: </span>{job.type}</div>
              {job.location && <div className="small"><span className="muted">Location: </span>{job.location}</div>}
              <div className="small"><span className="muted">Openings: </span>{job.openings}</div>
              {job.eligibility && <div className="small"><span className="muted">Eligibility: </span>{job.eligibility}</div>}
              <div style={{ marginTop: 8 }}>{job.skills.map((s) => <Tag key={s}>{s}</Tag>)}</div>
            </Card>
          </div>
        </div>
      )}
    </Async>
  );
}
