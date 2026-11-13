
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, useFetch } from "../../api.js";
import { Async, Bar, Card, Donut, ErrorBox, Pill, Tag } from "../../components/Ui.jsx";

export default function StudentDetail() {
  const { id } = useParams();
  const res = useFetch(`/tpo/students/${id}`);
  const [error, setError] = useState("");

  const verify = async (skill) => {
    setError("");
    try {
      await api(`/tpo/students/${id}/skills/${skill.id}/verify`, {
        method: "PUT",
        body: { verified: !skill.verified },
      });
      res.reload();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <Async res={res}>
      {(s) => {
        const p = s.profile || {};
        const r = s.readiness || {};
        const gap = s.skillGap || {};
        const skills = s.skills || [];
        const projects = s.projects || [];
        const certifications = s.certifications || [];
        const applications = s.applications || [];
        const resume = s.resumeAnalysis;

        return (
          <div className="stack">
            <div className="small">
              <Link to="/tpo/students">Students</Link> › {s.name}
            </div>

            <div className="page-head">
              <h1>{s.name || "Student Details"}</h1>
              <p>
                {s.email || "No email"} · {p.roll_no || "No roll no."} ·
                {" "}{p.department || "No department"} · CGPA {p.cgpa ?? "—"} ·
                {" "}Class of {p.grad_year || "—"}
              </p>
            </div>

            <ErrorBox error={error} />

            <div className="grid g-main">
              <Card title="Readiness">
                <div className="row wrap" style={{ gap: 24 }}>
                  <Donut value={r.overall ?? 0} label="Overall" />

                  <div style={{ flex: 1, minWidth: 220 }}>
                    {[
                      ["Technical Skills", r.technical ?? 0],
                      ["Projects", r.projects ?? 0],
                      ["Certifications", r.certifications ?? 0],
                      ["Profile Completeness", r.completeness ?? 0],
                    ].map(([k, v]) => (
                      <div className="meter-row" key={k}>
                        <span>{k}</span>
                        <Bar value={v} />
                        <strong>{v}%</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <Card title={`Skill gap · ${gap.role || "Selected Role"}`}>
                <div className="small muted">
                  Coverage {gap.coverage ?? 0}%
                </div>
                <Bar value={gap.coverage ?? 0} />

                <div style={{ marginTop: 10 }}>
                  {(gap.missing || []).map((m) => (
                    <span
                      key={m.key}
                      className="pill red"
                      style={{ marginRight: 4 }}
                    >
                      {m.label}
                    </span>
                  ))}

                  {(gap.weak || []).map((m) => (
                    <span
                      key={m.key}
                      className="pill amber"
                      style={{ marginRight: 4 }}
                    >
                      {m.label}
                    </span>
                  ))}

                  {!(gap.missing || []).length &&
                    !(gap.weak || []).length && (
                      <span className="muted">No gaps for this role 🎉</span>
                    )}
                </div>
              </Card>
            </div>

            <div className="grid g2">
              <Card title="Skills">
                {skills.length === 0 && (
                  <div className="empty">No skills added.</div>
                )}

                {skills.map((k) => (
                  <div className="list-item" key={k.id}>
                    <div>
                      <strong>{k.name}</strong>{" "}
                      <Pill color="purple">{k.level || "Beginner"}</Pill>{" "}
                      {k.verified && <Pill color="green">✓ Verified</Pill>}
                    </div>

                    <button
                      className="btn small ghost"
                      onClick={() => verify(k)}
                    >
                      {k.verified ? "Unverify" : "Verify"}
                    </button>
                  </div>
                ))}
              </Card>

              <Card title="Projects">
                {projects.length === 0 && (
                  <div className="empty">No projects added.</div>
                )}

                {projects.map((pr) => (
                  <div className="list-item" key={pr.id}>
                    <div>
                      <strong>{pr.title}</strong>
                      <div className="small">{pr.description}</div>
                      {(pr.technologies || []).map((t) => (
                        <Tag key={t}>{t}</Tag>
                      ))}
                    </div>
                  </div>
                ))}
              </Card>

              <Card title="Certifications">
                {certifications.length === 0 && (
                  <div className="empty">No certifications.</div>
                )}

                {certifications.map((c) => (
                  <div className="list-item" key={c.id}>
                    <div>
                      <strong>{c.name}</strong>
                      <div className="muted small">{c.issuer}</div>
                    </div>
                  </div>
                ))}
              </Card>

              <Card title="Applications">
                {applications.length === 0 && (
                  <div className="empty">No applications yet.</div>
                )}

                {applications.map((a, i) => (
                  <div className="list-item" key={a.id || i}>
                    <div>
                      {a.title}{" "}
                      <span className="muted">· {a.company}</span>
                    </div>

                    <Pill
                      color={
                        a.status === "selected"
                          ? "green"
                          : a.status === "rejected"
                          ? "red"
                          : "purple"
                      }
                    >
                      {a.status}
                    </Pill>
                  </div>
                ))}
              </Card>
            </div>

            <Card title="Latest resume analysis">
              {!resume ? (
                <div className="empty">
                  This student has not uploaded a resume yet.
                </div>
              ) : (
                <div
                  className="row wrap"
                  style={{ gap: 24, alignItems: "flex-start" }}
                >
                  <Donut value={resume.score ?? 0} size={110} label="Score" />

                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div className="muted small">{resume.filename}</div>

                    <div>
                      {(resume.detectedSkills || []).map((k) => (
                        <Tag key={k}>{k}</Tag>
                      ))}
                    </div>

                    <ul className="checks warn">
                      {(resume.suggestions || [])
                        .slice(0, 4)
                        .map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                    </ul>
                  </div>
                </div>
              )}
            </Card>
          </div>
        );
      }}
    </Async>
  );
}
