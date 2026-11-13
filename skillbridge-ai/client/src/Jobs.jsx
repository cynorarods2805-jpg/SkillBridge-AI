
import { useState, useEffect } from "react";

const emptyJob = {
  title: "",
  company: "",
  type: "Full-time",
  location: "",
  description: "",
  eligibility: "",
  skills: "",
  min_cgpa: 0,
  openings: 1,
  apply_url: "",
  status: "Active",
};

export default function Jobs() {
  const [job, setJob] = useState(emptyJob);
  const [pdf, setPdf] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const change = (e) =>
    setJob({ ...job, [e.target.name]: e.target.value });

  async function extractPDF() {
    if (!pdf) {
      setMessage("Please select a PDF.");
      return;
    }

    const form = new FormData();
    form.append("pdf", pdf);

    setLoading(true);
    setMessage("Extracting job details...");

    try {
      const response = await fetch("/api/tpo/jobs/extract-pdf", {
        method: "POST",
        credentials: "include",
        body: form,
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error);

      const data = result.extracted;

      setJob({
        ...emptyJob,
        ...data,
        skills: Array.isArray(data.skills)
          ? data.skills.join(", ")
          : data.skills || "",
      });

      setMessage("Extraction complete! Review the details below.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveJob(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/tpo/jobs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...job,
          skills: job.skills.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error);

      setMessage("Job saved successfully!");
      setJob({ ...emptyJob });
      setPdf(null);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "auto", padding: 30 }}>
      <h1>Job Management</h1>

      <section style={{ background: "#f3f0ff", padding: 20, borderRadius: 12 }}>
        <h3>Upload Job Description PDF</h3>

        <input
          type="file"
          accept=".pdf,application/pdf"
          onChange={(e) => setPdf(e.target.files[0])}
        />

        <button type="button" onClick={extractPDF} disabled={loading}>
          {loading ? "Processing..." : "Extract with AI"}
        </button>
      </section>

      <form onSubmit={saveJob} style={{ display: "grid", gap: 15, marginTop: 25 }}>
        <h2>Create / Review Job</h2>

        {[
          ["title", "Job Title"],
          ["company", "Company"],
          ["location", "Location"],
          ["eligibility", "Eligibility"],
          ["skills", "Required Skills (comma separated)"],
          ["apply_url", "Application URL"],
        ].map(([name, label]) => (
          <label key={name}>
            {label}
            <input
              name={name}
              value={job[name] ?? ""}
              onChange={change}
              required={["title", "company", "skills"].includes(name)}
              style={{ display: "block", width: "100%", padding: 10 }}
            />
          </label>
        ))}

        <label>
          Job Type
          <select name="type" value={job.type} onChange={change}>
            {["Full-time", "Internship", "Part-time", "Contract"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>

        <label>
          Description
          <textarea
            name="description"
            value={job.description ?? ""}
            onChange={change}
            rows={5}
            style={{ width: "100%" }}
          />
        </label>

        <label>
          Minimum CGPA
          <input
            type="number"
            name="min_cgpa"
            min="0"
            max="10"
            step="0.1"
            value={job.min_cgpa}
            onChange={change}
          />
        </label>

        <label>
          Openings
          <input
            type="number"
            name="openings"
            min="1"
            value={job.openings}
            onChange={change}
          />
        </label>

        <button type="submit" disabled={loading}>
          Save Job
        </button>
      </form>

      {message && <p>{message}</p>}
    </div>
  );
}
