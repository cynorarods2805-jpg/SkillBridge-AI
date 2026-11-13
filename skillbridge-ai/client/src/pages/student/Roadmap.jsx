import { useState } from "react";
import { api, useFetch } from "../../api.js";
import { Async, Bar, Card, ErrorBox, Pill } from "../../components/Ui.jsx";

export default function Roadmap() {
  const roles = useFetch("/student/roles");
  const [role, setRole] = useState("");
  const res = useFetch(`/student/roadmap${role ? `?role=${encodeURIComponent(role)}` : ""}`);
  const goals = useFetch("/student/goals");
  const [error, setError] = useState("");
  const [newGoal, setNewGoal] = useState("");

  const run = async (fn) => {
    setError("");
    try {
      await fn();
      res.reload();
      goals.reload();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  };
  const start = (r) => run(() => api("/student/roadmap/start", { method: "POST", body: { role: r.role } }));
  const toggle = (g) => run(() => api(`/student/goals/${g.id}`, { method: "PUT", body: { status: g.status === "done" ? "pending" : "done" } }));
  const addGoal = (e) => {
    e.preventDefault();
    if (!newGoal.trim()) return;
    run(() => api("/student/goals", { method: "POST", body: { title: newGoal } })).then((ok) => ok && setNewGoal(""));
  };
  const removeGoal = (g) => run(() => api(`/student/goals/${g.id}`, { method: "DELETE" }));

  return (
    <div className="stack">
      <div className="page-head"><h1>Your AI Career Roadmap</h1><p>A personalized plan to close your skill gaps and improve your placement chances.</p></div>
      <div className="row wrap">
        <label htmlFor="role" style={{ margin: 0 }}>Target role</label>
        <select id="role" style={{ maxWidth: 260 }} value={role || res.data?.role || ""} onChange={(e) => setRole(e.target.value)}>
          {(roles.data || []).map((r) => <option key={r}>{r}</option>)}
        </select>
      </div>
      <ErrorBox error={error} />
      <Async res={res}>
        {(r) => (
          <>
            <div className="grid g-main">
              <Card title={`Roadmap · ${r.totalWeeks} weeks`}>
                <ol className="steps">
                  {r.steps.map((s) => (
                    <li className="step" key={s.order}>
                      <div className={`step-num ${s.status === "done" ? "done" : ""}`}>{s.status === "done" ? "✓" : s.order}</div>
                      <div style={{ flex: 1 }}>
                        <div className="row between"><strong>{s.title}</strong><Pill color="purple">{s.weeks} week{s.weeks > 1 ? "s" : ""}</Pill></div>
                        <div className="small muted">{s.description}</div>
                        <div className="small" style={{ marginTop: 4 }}>{s.skills.join(" · ")}</div>
                        {s.resources.length > 0 && (
                          <div className="small" style={{ marginTop: 4 }}>
                            {s.resources.slice(0, 3).map((x) => <a key={x.url + x.title} href={x.url} target="_blank" rel="noreferrer noopener" style={{ marginRight: 12 }}>{x.title} ↗</a>)}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </Card>
              <div className="stack">
                <Card title="Estimated readiness">
                  <div className="row" style={{ fontSize: "1.8rem", fontWeight: 800 }}>{r.currentReadiness}% → <span style={{ color: "var(--green)" }}>{r.estimatedReadiness}%</span></div>
                  <Bar value={r.estimatedReadiness} />
                  <p className="hint">Estimate after completing this roadmap. Based on your current gaps, not a guarantee.</p>
                  <button className="btn block" onClick={() => start(r)}>{r.started ? "Refresh Roadmap Goals" : "Start Roadmap"}</button>
                  {r.started && <p className="hint">Your steps are saved as goals below. Completed goals are kept when you refresh.</p>}
                </Card>
                <Card title="Skill gap">
                  <div className="small muted">Coverage for {r.role}: <strong>{r.gap.coverage}%</strong></div>
                  <Bar value={r.gap.coverage} />
                  {r.gap.missing.length > 0 && <><h3 style={{ margin: "12px 0 4px" }}>Missing</h3>{r.gap.missing.map((m) => <div className="row between small" key={m.key} style={{ padding: "3px 0" }}><span>{m.label}</span><Pill color={m.priority === "High" ? "red" : m.priority === "Medium" ? "amber" : "gray"}>{m.priority}</Pill></div>)}</>}
                  {r.gap.weak.length > 0 && <><h3 style={{ margin: "12px 0 4px" }}>Needs strengthening</h3>{r.gap.weak.map((m) => <div className="row between small" key={m.key} style={{ padding: "3px 0" }}><span>{m.label} <span className="muted">({m.level})</span></span><Pill color={m.priority === "High" ? "red" : "amber"}>{m.priority}</Pill></div>)}</>}
                  {r.gap.matched.length > 0 && <><h3 style={{ margin: "12px 0 4px" }}>Strong</h3>{r.gap.matched.map((m) => <span className="pill green" key={m.key} style={{ marginRight: 4 }}>{m.label}</span>)}</>}
                </Card>
              </div>
            </div>
          </>
        )}
      </Async>

      <Card title="Learning goals & progress">
        <Async res={goals}>
          {(list) => {
            const done = list.filter((g) => g.status === "done").length;
            return (
              <>
                {list.length > 0 && <div className="row" style={{ marginBottom: 10 }}><Bar value={Math.round((done / list.length) * 100)} /><span className="small muted" style={{ whiteSpace: "nowrap" }}>{done}/{list.length} done</span></div>}
                {list.length === 0 && <div className="empty">No goals yet. Start the roadmap or add your own below.</div>}
                {list.map((g) => (
                  <div className="list-item" key={g.id}>
                    <label className="row" style={{ fontWeight: 400, margin: 0 }}>
                      <input type="checkbox" style={{ width: "auto" }} checked={g.status === "done"} onChange={() => toggle(g)} />
                      <span style={{ textDecoration: g.status === "done" ? "line-through" : "none" }}>{g.title}{g.weeks ? <span className="muted small"> · {g.weeks}w</span> : null}</span>
                    </label>
                    <button className="btn small danger" onClick={() => removeGoal(g)} aria-label={`Delete goal ${g.title}`}>Delete</button>
                  </div>
                ))}
                <form className="row" onSubmit={addGoal} style={{ marginTop: 12 }}>
                  <input placeholder="Add your own goal, e.g. Solve 50 DSA problems" aria-label="New goal" value={newGoal} onChange={(e) => setNewGoal(e.target.value)} maxLength={150} />
                  <button className="btn">Add</button>
                </form>
              </>
            );
          }}
        </Async>
      </Card>
    </div>
  );
}
