import { useState } from "react";
import { api, useFetch } from "../../api.js";
import { Async, Card, ErrorBox, Modal, Pill, Tag } from "../../components/Ui.jsx";

const LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];

/** Generic add / edit / delete list for skills, projects, certifications and achievements. */
function Collection({ endpoint, items, fields, title, reload, renderItem, empty }) {
  const [editing, setEditing] = useState(null); // null | {} (new) | item
  const [form, setForm] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const open = (item) => {
    const base = {};
    fields.forEach((f) => {
      const v = item?.[f.name];
      base[f.name] = Array.isArray(v) ? v.join(", ") : v ?? f.default ?? "";
    });
    setForm(base);
    setError("");
    setEditing(item || {});
  };
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/student/${endpoint}${editing.id ? `/${editing.id}` : ""}`, { method: editing.id ? "PUT" : "POST", body: form });
      setEditing(null);
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (item) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      await api(`/student/${endpoint}/${item.id}`, { method: "DELETE" });
      reload();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <Card title={title} action={<button className="btn small" onClick={() => open(null)}>+ Add</button>}>
      {items.length === 0 && <div className="empty">{empty}</div>}
      {items.map((it) => (
        <div className="list-item" key={it.id}>
          <div>{renderItem(it)}</div>
          <div className="row" style={{ gap: 6, alignSelf: "flex-start" }}>
            <button className="btn small ghost" onClick={() => open(it)}>Edit</button>
            <button className="btn small danger" onClick={() => remove(it)}>Delete</button>
          </div>
        </div>
      ))}
      {editing && (
        <Modal title={`${editing.id ? "Edit" : "Add"} ${title.toLowerCase().replace(/s$/, "")}`} onClose={() => setEditing(null)}>
          <form onSubmit={save}>
            <ErrorBox error={error} />
            <div className="form-grid">
              {fields.map((f) => (
                <div className={`field ${f.full ? "full" : ""}`} key={f.name}>
                  <label htmlFor={`f-${f.name}`}>{f.label}{f.required ? " *" : ""}</label>
                  {f.type === "select" ? (
                    <select id={`f-${f.name}`} value={form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}>
                      {f.options.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea id={`f-${f.name}`} value={form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
                  ) : (
                    <input id={`f-${f.name}`} type={f.type || "text"} step={f.step} min={f.min} placeholder={f.placeholder} value={form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
                  )}
                  {f.hint && <div className="hint">{f.hint}</div>}
                </div>
              ))}
            </div>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button type="button" className="btn ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn" disabled={busy}>{busy ? "Saving…" : "Save Changes"}</button>
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
}

const link = (url, label) => url && <a href={url} target="_blank" rel="noreferrer noopener" className="small" style={{ marginRight: 12 }}>{label} ↗</a>;

export default function Profile() {
  const res = useFetch("/student/profile");
  const [tab, setTab] = useState("Overview");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const roles = useFetch("/student/roles");

  const startEdit = (s) => {
    setForm({ name: s.name, ...Object.fromEntries(["phone", "bio", "roll_no", "department", "grad_year", "cgpa", "college", "github", "linkedin", "portfolio", "target_role"].map((k) => [k, s.profile[k] ?? ""])) });
    setError("");
    setSaved(false);
    setEditing(true);
  };
  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      await api("/student/profile", { method: "PUT", body: form });
      setEditing(false);
      setSaved(true);
      res.reload();
    } catch (err) {
      setError(err.message);
    }
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <Async res={res}>
      {(s) => {
        const p = s.profile;
        return (
          <div className="stack">
            <div className="page-head"><h1>My Profile</h1><p>Manage your academic and professional details.</p></div>
            <Card>
              <div className="row between wrap">
                <div className="row">
                  <span className="avatar" style={{ width: 56, height: 56, fontSize: "1.4rem" }}>{s.name.charAt(0)}</span>
                  <div>
                    <h2>{s.name}</h2>
                    <div className="muted small">{p.department ? `B.Tech – ${p.department}` : "Department not set"}{p.grad_year ? ` (Class of ${p.grad_year})` : ""}</div>
                    <div className="small">{s.email}</div>
                  </div>
                </div>
                {!editing && <button className="btn" onClick={() => startEdit(s)}>Edit Profile</button>}
              </div>
              {saved && <div className="alert ok">Profile saved.</div>}
            </Card>

            <div className="tabs" role="tablist">
              {["Overview", "Skills", "Projects", "Certifications", "Achievements"].map((t) => (
                <button key={t} role="tab" aria-selected={tab === t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t}</button>
              ))}
            </div>

            {tab === "Overview" && !editing && (
              <>
                <div className="grid g4">
                  {[["CGPA", p.cgpa ?? "—"], ["Graduation", p.grad_year ?? "—"], ["Department", p.department ?? "—"], ["College", p.college ?? "—"]].map(([k, v]) => (
                    <div className="card" key={k}><div className="muted small">{k}</div><div style={{ fontWeight: 700, fontSize: "1.2rem" }}>{v}</div></div>
                  ))}
                </div>
                <Card title="Personal Information">
                  <div className="grid g2 small">
                    <div><span className="muted">Phone: </span>{p.phone || "—"}</div>
                    <div><span className="muted">Roll number: </span>{p.roll_no || "—"}</div>
                    <div><span className="muted">Target role: </span>{p.target_role}</div>
                    <div>{link(p.github, "GitHub")}{link(p.linkedin, "LinkedIn")}{link(p.portfolio, "Portfolio")}{!p.github && !p.linkedin && !p.portfolio && "No social links yet"}</div>
                  </div>
                  <p style={{ marginBottom: 0 }}>{p.bio || <span className="muted">No bio yet. Click Edit Profile to add one.</span>}</p>
                </Card>
              </>
            )}

            {tab === "Overview" && editing && (
              <Card title="Edit Profile">
                <form onSubmit={saveProfile}>
                  <ErrorBox error={error} />
                  <div className="form-grid">
                    <div className="field"><label htmlFor="e-name">Full name</label><input id="e-name" value={form.name} onChange={set("name")} /></div>
                    <div className="field"><label htmlFor="e-phone">Phone number</label><input id="e-phone" value={form.phone} onChange={set("phone")} /></div>
                    <div className="field full"><label htmlFor="e-bio">Bio</label><textarea id="e-bio" value={form.bio} onChange={set("bio")} maxLength={600} /></div>
                    <div className="field"><label htmlFor="e-roll">Roll number</label><input id="e-roll" value={form.roll_no} onChange={set("roll_no")} /></div>
                    <div className="field"><label htmlFor="e-dept">Department</label><input id="e-dept" value={form.department} onChange={set("department")} /></div>
                    <div className="field"><label htmlFor="e-year">Graduation year</label><input id="e-year" type="number" value={form.grad_year} onChange={set("grad_year")} /></div>
                    <div className="field"><label htmlFor="e-cgpa">CGPA</label><input id="e-cgpa" type="number" step="0.01" min="0" max="10" value={form.cgpa} onChange={set("cgpa")} /></div>
                    <div className="field full"><label htmlFor="e-college">College / Organization</label><input id="e-college" value={form.college} onChange={set("college")} /></div>
                    <div className="field"><label htmlFor="e-gh">GitHub</label><input id="e-gh" placeholder="https://github.com/you" value={form.github} onChange={set("github")} /></div>
                    <div className="field"><label htmlFor="e-li">LinkedIn</label><input id="e-li" placeholder="https://linkedin.com/in/you" value={form.linkedin} onChange={set("linkedin")} /></div>
                    <div className="field"><label htmlFor="e-pf">Portfolio</label><input id="e-pf" value={form.portfolio} onChange={set("portfolio")} /></div>
                    <div className="field">
                      <label htmlFor="e-role">Target role</label>
                      <select id="e-role" value={form.target_role} onChange={set("target_role")}>{(roles.data || [form.target_role]).map((r) => <option key={r}>{r}</option>)}</select>
                      <div className="hint">Used for skill gaps, roadmap and resume feedback</div>
                    </div>
                  </div>
                  <div className="row" style={{ justifyContent: "flex-end" }}>
                    <button type="button" className="btn ghost" onClick={() => setEditing(false)}>Cancel</button>
                    <button className="btn">Save Changes</button>
                  </div>
                </form>
              </Card>
            )}

            {tab === "Skills" && (
              <Collection
                endpoint="skills" title="Skills" items={s.skills} reload={res.reload} empty="No skills yet. Add the technologies you know."
                fields={[
                  { name: "name", label: "Skill", required: true, placeholder: "e.g. React" },
                  { name: "level", label: "Proficiency", type: "select", options: LEVELS, default: "Beginner" },
                  { name: "years", label: "Years of experience", type: "number", step: "0.5", min: "0", default: 0 },
                ]}
                renderItem={(k) => (
                  <>
                    <strong>{k.name}</strong> <Pill color="purple">{k.level}</Pill>{" "}
                    {k.verified ? <Pill color="green">✓ Verified</Pill> : <Pill>Unverified</Pill>}
                    <div className="muted small">{k.years} yr experience</div>
                  </>
                )}
              />
            )}
            {tab === "Projects" && (
              <Collection
                endpoint="projects" title="Projects" items={s.projects} reload={res.reload} empty="No projects yet. Projects are a big part of your readiness score."
                fields={[
                  { name: "title", label: "Project title", required: true, full: true },
                  { name: "description", label: "Description", type: "textarea", full: true },
                  { name: "technologies", label: "Technologies used", full: true, placeholder: "React, Node.js, PostgreSQL", hint: "Comma separated" },
                  { name: "github_url", label: "GitHub repository link" },
                  { name: "live_url", label: "Live project link" },
                ]}
                renderItem={(p) => (
                  <>
                    <strong>{p.title}</strong>
                    <div className="small">{p.description}</div>
                    <div>{p.technologies.map((t) => <Tag key={t}>{t}</Tag>)}</div>
                    <div>{link(p.github_url, "GitHub")}{link(p.live_url, "Live")}</div>
                  </>
                )}
              />
            )}
            {tab === "Certifications" && (
              <Collection
                endpoint="certifications" title="Certifications" items={s.certifications} reload={res.reload} empty="No certifications yet."
                fields={[
                  { name: "name", label: "Certification name", required: true, full: true },
                  { name: "issuer", label: "Issuing organization" },
                  { name: "credential_url", label: "Credential URL" },
                  { name: "issue_date", label: "Issue date", type: "date" },
                  { name: "expiry_date", label: "Expiry date", type: "date" },
                ]}
                renderItem={(c) => (
                  <>
                    <strong>{c.name}</strong>
                    <div className="muted small">{c.issuer}{c.issue_date ? ` · Issued ${c.issue_date}` : ""}{c.expiry_date ? ` · Expires ${c.expiry_date}` : ""}</div>
                    {link(c.credential_url, "Credential")}
                  </>
                )}
              />
            )}
            {tab === "Achievements" && (
              <Collection
                endpoint="achievements" title="Achievements" items={s.achievements} reload={res.reload} empty="No achievements yet."
                fields={[
                  { name: "title", label: "Title", required: true, full: true },
                  { name: "description", label: "Description", type: "textarea", full: true },
                  { name: "date", label: "Date", type: "date" },
                ]}
                renderItem={(a) => (
                  <>
                    <strong>{a.title}</strong>{a.date && <span className="muted small"> · {a.date}</span>}
                    <div className="small">{a.description}</div>
                  </>
                )}
              />
            )}
          </div>
        );
      }}
    </Async>
  );
}
