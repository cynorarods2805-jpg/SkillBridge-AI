import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useFetch } from "../../api.js";
import { Async, Card, Pill, Tag, tone } from "../../components/Ui.jsx";

export default function Jobs() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [role, setRole] = useState("");
  const [type, setType] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const params = new URLSearchParams({ q: debounced, role, type });
  const res = useFetch(`/student/jobs?${params}`);

  return (
    <div className="stack">
      <div className="page-head"><h1>Job Opportunities</h1><p>Explore placement opportunities matched to your profile.</p></div>
      <Card>
        <div className="row wrap">
          <input style={{ flex: 2, minWidth: 200 }} placeholder="Search jobs, company or skills…" aria-label="Search jobs" value={q} onChange={(e) => setQ(e.target.value)} />
          <select style={{ flex: 1, minWidth: 140 }} aria-label="Filter by role" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">All Roles</option>
            {(res.data?.roles || []).map((r) => <option key={r}>{r}</option>)}
          </select>
          <select style={{ flex: 1, minWidth: 130 }} aria-label="Filter by type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All Types</option>
            <option>Full-time</option><option>Internship</option>
          </select>
        </div>
        <Async res={res}>
          {(d) =>
            d.jobs.length === 0 ? (
              <div className="empty" style={{ marginTop: 14 }}>No jobs match your search.</div>
            ) : (
              <div style={{ marginTop: 8 }}>
                {d.jobs.map((j) => (
                  <div className="job-card" key={j.id}>
                    <div>
                      <strong>{j.title}</strong> <span className="muted">· {j.company}</span>
                      <div className="muted small">{j.type}{j.location ? ` · ${j.location}` : ""}{j.min_cgpa ? ` · CGPA ${j.min_cgpa}+` : ""}</div>
                      <div>
                        {j.skills.slice(0, 4).map((s) => <Tag key={s}>{s}</Tag>)}
                        {j.skills.length > 4 && <Tag>+{j.skills.length - 4}</Tag>}
                      </div>
                    </div>
                    <div className="row">
                      {j.applied && <Pill color="purple">Applied</Pill>}
                      {!j.eligible && <Pill color="red">Not eligible</Pill>}
                      <Pill color={tone(j.match)}>{j.match}% Match</Pill>
                      <Link className="btn small ghost" to={`/student/jobs/${j.id}`}>View →</Link>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </Async>
      </Card>
    </div>
  );
}
