import { useState } from "react";
import { Link } from "react-router-dom";
import { api, useFetch } from "../../api.js";
import { Async, Bar, Card, ErrorBox, Pill, Tag, tone } from "../../components/Ui.jsx";

export default function Ranking() {
  const jobs = useFetch("/tpo/jobs");
  const [jobId, setJobId] = useState("");
  const [pick, setPick] = useState(0);
  const [tab, setTab] = useState("Match Explanation");
  const [error, setError] = useState("");

  const selected = jobId || (jobs.data && jobs.data.find((j) => j.status === "Active")?.id) || jobs.data?.[0]?.id || "";
  const ranking = useFetch(selected ? `/tpo/jobs/${selected}/ranking` : null);

  const setStatus = async (c, status) => {
    setError("");
    try {
      await api(`/tpo/jobs/${selected}/candidates/${c.student.id}/status`, { method: "PUT", body: { status } });
      ranking.reload();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="stack">
      <div className="page-head"><h1>AI Candidate Ranking</h1><p>Top recommended candidates for a job, ranked by compatibility.</p></div>
      <Async res={jobs}>
        {(list) =>
          list.length === 0 ? <div className="empty">Add a job first to rank candidates.</div> : (
            <div className="field" style={{ maxWidth: 380 }}>
              <label htmlFor="job">Job</label>
              <select id="job" value={selected} onChange={(e) => { setJobId(e.target.value); setPick(0); }}>
                {list.map((j) => <option key={j.id} value={j.id}>{j.title} · {j.company}{j.status === "Closed" ? " (closed)" : ""}</option>)}
              </select>
            </div>
          )
        }
      </Async>
      <ErrorBox error={error} />
      {selected && (
        <Async res={ranking}>
          {({ job, candidates }) => {
            const c = candidates[pick] || candidates[0];
            if (!c) return <div className="empty">No students registered yet.</div>;
            return (
              <div className="grid g-main" style={{ gridTemplateColumns: "1fr 1.3fr" }}>
                <Card title={`Top ${candidates.length} for ${job.title}`}>
                  {candidates.map((x, i) => (
                    <button key={x.student.id} className={`rank-item ${i === pick ? "active" : ""}`} onClick={() => setPick(i)}>
                      <span className="rank-no">#{x.rank}</span>
                      <span style={{ flex: 1 }}><strong>{x.student.name}</strong><div className="muted small">{x.student.department || "—"} · CGPA {x.student.cgpa ?? "—"}{x.status ? ` · ${x.status}` : ""}</div></span>
                      <Pill color={tone(x.match.score)}>{x.match.score}%</Pill>
                    </button>
                  ))}
                </Card>
                <Card>
                  <div className="row between wrap">
                    <div><h2>{c.student.name}</h2><div className="muted small">Rank #{c.rank} · {c.match.verdict}{!c.match.eligible && " · Below CGPA cut-off"}</div></div>
                    <Link className="btn small ghost" to={`/tpo/students/${c.student.id}`}>Full profile</Link>
                  </div>
                  <div className="tabs" style={{ marginTop: 12 }}>
                    {["Match Explanation", "Profile Summary"].map((t) => <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t}</button>)}
                  </div>
                  {tab === "Match Explanation" ? (
                    <>
                      <h3 style={{ marginBottom: 6 }}>Why {c.student.name.split(" ")[0]} is {c.match.score >= 70 ? "a great match" : "ranked here"}?</h3>
                      <ul className="checks">{c.match.explanation.map((e) => <li key={e}>{e}</li>)}</ul>
                      {c.match.skills.map((s) => <div className="meter-row" key={s.key}><span>{s.label}</span><Bar value={s.score} /><strong>{s.score}%</strong></div>)}
                    </>
                  ) : (
                    <>
                      <div className="grid g2 small">
                        <div><span className="muted">Readiness: </span><strong>{c.student.readiness}%</strong></div>
                        <div><span className="muted">CGPA: </span><strong>{c.student.cgpa ?? "—"}</strong></div>
                        <div><span className="muted">Projects: </span><strong>{c.student.projects}</strong></div>
                        <div><span className="muted">Certifications: </span><strong>{c.student.certifications}</strong></div>
                      </div>
                      {c.match.gaps.length > 0 && <><h3 style={{ margin: "14px 0 6px" }}>Skill gaps</h3>{c.match.gaps.map((g) => <Tag key={g}>{g}</Tag>)}</>}
                    </>
                  )}
                  <div className="row" style={{ marginTop: 16 }}>
                    <button className="btn small" disabled={c.status === "shortlisted"} onClick={() => setStatus(c, "shortlisted")}>Shortlist</button>
                    <button className="btn small ghost" disabled={c.status === "selected"} onClick={() => setStatus(c, "selected")}>Mark selected</button>
                    <button className="btn small danger" disabled={c.status === "rejected"} onClick={() => setStatus(c, "rejected")}>Reject</button>
                  </div>
                </Card>
              </div>
            );
          }}
        </Async>
      )}
    </div>
  );
}
