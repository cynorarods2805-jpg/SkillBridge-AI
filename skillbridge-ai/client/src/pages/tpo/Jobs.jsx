
import { useState } from "react";
import { api, useFetch } from "../../api.js";
import { Async, Card, ErrorBox, Modal, Pill } from "../../components/Ui.jsx";

const EMPTY = {
  title: "",
  company: "",
  type: "Full-time",
  location: "",
  description: "",
  eligibility: "",
  skills: "",
  min_cgpa: "",
  openings: 1,
  apply_url: "",
  status: "Active",
};

export default function TpoJobs() {
  const res = useFetch("/tpo/jobs");

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pageError, setPageError] = useState("");
  const [pdf, setPdf] = useState(null);

  const open = (job) => {
    setForm(
      job
        ? {
            ...EMPTY,
            ...job,
            skills: job.skills.join(", "),
            min_cgpa: job.min_cgpa || "",
            apply_url: job.apply_url || "",
            location: job.location || "",
            description: job.description || "",
            eligibility: job.eligibility || "",
          }
        : { ...EMPTY }
    );

    setError("");
    setPdf(null);
    setEditing(job || {});
  };

  const set = (k) => (e) =>
    setForm({ ...form, [k]: e.target.value });

  // Upload PDF and extract job details using AI
  const extractPDF = async () => {
    if (!pdf) {
      setError("Please select a job description PDF.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("pdf", pdf);

      const result = await api("/tpo/jobs/extract-pdf", {
        method: "POST",
        form: formData,
      });

      const data = result.extracted;

      setForm({
        ...EMPTY,
        ...data,
        skills: Array.isArray(data.skills)
          ? data.skills.join(", ")
          : data.skills || "",
        min_cgpa: data.min_cgpa ?? "",
        openings: data.openings ?? 1,
        status: data.status || "Active",
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Save job using existing API
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const payload = {
        ...form,
        skills: form.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        min_cgpa:
          form.min_cgpa === "" ? null : Number(form.min_cgpa),
        openings: Number(form.openings),
      };

      await api(
        editing.id ? `/tpo/jobs/${editing.id}` : "/tpo/jobs",
        {
          method: editing.id ? "PUT" : "POST",
          body: payload,
        }
      );

      setEditing(null);
      setPdf(null);
      res.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Delete job
  const remove = async (job) => {
    if (
      !window.confirm(
        `Delete "${job.title}" at ${job.company}? Applications to it will also be removed.`
      )
    )
      return;

    setPageError("");

    try {
      await api(`/tpo/jobs/${job.id}`, {
        method: "DELETE",
      });

      res.reload();
    } catch (err) {
      setPageError(err.message);
    }
  };

  return (
    <div className="stack">
      <div className="row between wrap page-head">
        <div>
          <h1>Job Management</h1>
          <p>Create, view and manage placement opportunities.</p>
        </div>

        <button className="btn" onClick={() => open(null)}>
          + Add New Job
        </button>
      </div>

      <ErrorBox error={pageError} />

      <Card>
        <Async res={res}>
          {(jobs) =>
            jobs.length === 0 ? (
              <div className="empty">
                No jobs yet. Add your first one.
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Job Title</th>
                      <th>Company</th>
                      <th>Type</th>
                      <th>Min CGPA</th>
                      <th>Applications</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {jobs.map((j) => (
                      <tr key={j.id}>
                        <td>
                          <strong>{j.title}</strong>
                          <div className="muted small">
                            {j.skills.join(", ")}
                          </div>
                        </td>

                        <td>{j.company}</td>
                        <td>{j.type}</td>
                        <td>{j.min_cgpa || "—"}</td>
                        <td>{j.applications}</td>

                        <td>
                          <Pill
                            color={
                              j.status === "Active" ? "green" : "red"
                            }
                          >
                            {j.status}
                          </Pill>
                        </td>

                        <td
                          className="right"
                          style={{ whiteSpace: "nowrap" }}
                        >
                          <button
                            className="btn small ghost"
                            onClick={() => open(j)}
                          >
                            Edit
                          </button>{" "}

                          <button
                            className="btn small danger"
                            onClick={() => remove(j)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </Async>
      </Card>

      {editing && (
        <Modal
          title={editing.id ? "Edit job" : "Add new job"}
          onClose={() => setEditing(null)}
        >
          <form onSubmit={save}>
            <ErrorBox error={error} />

            {/* AI PDF extraction */}
            {!editing.id && (
              <div
                className="field"
                style={{
                  marginBottom: 20,
                  padding: 15,
                  border: "1px solid #ddd",
                  borderRadius: 8,
                }}
              >
                <label>Upload Job Description PDF</label>

                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) =>
                    setPdf(e.target.files[0] || null)
                  }
                />

                <button
                  type="button"
                  className="btn"
                  onClick={extractPDF}
                  disabled={busy || !pdf}
                  style={{ marginTop: 10 }}
                >
                  {busy
                    ? "Processing…"
                    : "Extract Details with AI"}
                </button>

                <div className="hint">
                  Upload a PDF to automatically fill the job form.
                  Review and edit the extracted details before saving.
                </div>
              </div>
            )}

            {/* Job form */}
            <div className="form-grid">
              <div className="field">
                <label htmlFor="j-title">Job title *</label>
                <input
                  id="j-title"
                  value={form.title}
                  onChange={set("title")}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="j-co">Company *</label>
                <input
                  id="j-co"
                  value={form.company}
                  onChange={set("company")}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="j-type">Type</label>
                <select
                  id="j-type"
                  value={form.type}
                  onChange={set("type")}
                >
                  <option>Full-time</option>
                  <option>Internship</option>
                  <option>Part-time</option>
                  <option>Contract</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="j-loc">Location</label>
                <input
                  id="j-loc"
                  value={form.location}
                  onChange={set("location")}
                />
              </div>

              <div className="field full">
                <label htmlFor="j-skills">Required skills *</label>
                <input
                  id="j-skills"
                  placeholder="React, Node.js, PostgreSQL"
                  value={form.skills}
                  onChange={set("skills")}
                  required
                />
                <div className="hint">
                  Comma separated. These drive AI matching and ranking.
                </div>
              </div>

              <div className="field">
                <label htmlFor="j-cgpa">Minimum CGPA</label>
                <input
                  id="j-cgpa"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={form.min_cgpa}
                  onChange={set("min_cgpa")}
                />
              </div>

              <div className="field">
                <label htmlFor="j-open">Openings</label>
                <input
                  id="j-open"
                  type="number"
                  min="1"
                  value={form.openings}
                  onChange={set("openings")}
                />
              </div>

              <div className="field full">
                <label htmlFor="j-elig">Eligibility criteria</label>
                <input
                  id="j-elig"
                  value={form.eligibility}
                  onChange={set("eligibility")}
                  placeholder="e.g. No active backlogs"
                />
              </div>

              <div className="field full">
                <label htmlFor="j-desc">Description</label>
                <textarea
                  id="j-desc"
                  value={form.description}
                  onChange={set("description")}
                />
              </div>

              <div className="field">
                <label htmlFor="j-url">Application link</label>
                <input
                  id="j-url"
                  placeholder="https://…"
                  value={form.apply_url}
                  onChange={set("apply_url")}
                />
              </div>

              <div className="field">
                <label htmlFor="j-status">Status</label>
                <select
                  id="j-status"
                  value={form.status}
                  onChange={set("status")}
                >
                  <option>Active</option>
                  <option>Closed</option>
                </select>
              </div>
            </div>

            <div
              className="row"
              style={{ justifyContent: "flex-end" }}
            >
              <button
                type="button"
                className="btn ghost"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>

              <button className="btn" disabled={busy}>
                {busy ? "Saving…" : "Save job"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
