
import { useRef, useState } from "react";
import { api, useFetch } from "../../api.js";
import { Async, Bar, Card, Donut, ErrorBox, Tag } from "../../components/Ui.jsx";

const LABELS = {
  contact: "Contact details",
  structure: "Sections & structure",
  skills: "Skills coverage",
  impact: "Impact & action verbs",
  length: "Length"
};

export default function Resume() {
  const latest = useFetch("/student/resume");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [note, setNote] = useState("");
  const input = useRef(null);

  const upload = async (file) => {
    setError("");
    setNote("");
    if (!file) return;

    if (!/\.(pdf|txt)$/i.test(file.name))
      return setError("Please choose a PDF or TXT file.");

    if (file.size > 5 * 1024 * 1024)
      return setError("File is too large. The limit is 5 MB.");

    const form = new FormData();
    form.append("resume", file);
    setBusy(true);

    try {
      const response = await api("/student/resume", {
        method: "POST",
        form
      });

      setResult(response);
      await latest.reload?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const addSkills = async (skills) => {
    try {
      const { added } = await api("/student/resume/apply-skills", {
        method: "POST",
        body: { skills }
      });

      setNote(
        added
          ? `Added ${added} skill${added > 1 ? "s" : ""} to your profile at Beginner level. Adjust the levels in Profile → Skills.`
          : "All detected skills are already in your profile."
      );
    } catch (e) {
      setError(e.message);
    }
  };

  const shown = result || latest.data;

  const breakdown = shown?.breakdown || {};
  const detectedSkills = shown?.detectedSkills || [];
  const missingSkills = shown?.missingSkills || [];
  const strengths = shown?.strengths || [];
  const weaknesses = shown?.weaknesses || [];
  const suggestions = shown?.suggestions || [];

  return (
    <div className="stack">
      <div className="page-head">
        <h1>AI Resume Analyzer</h1>
        <p>Upload your resume and get an analysis of your skills, experience and placement readiness.</p>
      </div>

      <div className="grid g-main">
        <Card>
          <div
            className={`dropzone ${drag ? "drag" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              upload(e.dataTransfer.files?.[0]);
            }}
          >
            <div style={{ fontSize: "2rem" }} aria-hidden="true">☁</div>
            <p style={{ margin: "6px 0" }}>
              <strong>Drag and drop your resume here</strong>
              <br />or click to browse
            </p>
            <p className="muted small">PDF or TXT · max 5 MB</p>

            <input
              ref={input}
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              hidden
              onChange={(e) => {
                upload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />

            <button
              className="btn"
              disabled={busy}
              onClick={() => input.current?.click()}
            >
              {busy ? "Analyzing…" : "Upload Resume"}
            </button>
          </div>

          <ErrorBox error={error} />
          {note && <div className="alert ok">{note}</div>}
        </Card>

        <Card title="What you'll get">
          <ul className="checks">
            <li>Extracted skills and technologies</li>
            <li>Section and completeness check</li>
            <li>Overall resume score</li>
            <li>Missing skills for your target role</li>
            <li>Personalized improvement tips</li>
          </ul>
        </Card>
      </div>

      {!result && (
        <Async res={latest}>
          {() => (
            !latest.data
              ? <div className="empty">You haven't analyzed a resume yet. Upload one above to see your report.</div>
              : null
          )}
        </Async>
      )}

      {shown && (
        <>
          <div className="muted small">
            Report for <strong>{shown.filename || "Resume"}</strong>
            {" "}· target role: {shown.role || "Not specified"}
          </div>

          <div className="grid g-main">
            <Card title="Resume score">
              <div className="row wrap" style={{ gap: 24 }}>
                <Donut value={Number(shown.score) || 0} label="Score" />

                <div style={{ flex: 1, minWidth: 220 }}>
                  {Object.entries(breakdown).map(([k, v]) => (
                    <div className="meter-row" key={k}>
                      <span>{LABELS[k] || k}</span>
                      <Bar value={Number(v) || 0} />
                      <strong>{Number(v) || 0}%</strong>
                    </div>
                  ))}
                  {!Object.keys(breakdown).length && (
                    <span className="muted">Detailed score breakdown unavailable.</span>
                  )}
                </div>
              </div>
            </Card>

            <Card
              title="Skills found"
              action={
                detectedSkills.length > 0 && (
                  <button
                    className="btn small ghost"
                    onClick={() => addSkills(detectedSkills)}
                  >
                    Add to profile
                  </button>
                )
              }
            >
              {detectedSkills.length
                ? detectedSkills.map((s) => <Tag key={s}>{s}</Tag>)
                : <span className="muted">No known skills detected.</span>
              }

              {missingSkills.length > 0 && (
                <>
                  <h3 style={{ margin: "16px 0 6px" }}>
                    Missing for {shown.role || "your target role"}
                  </h3>
                  {missingSkills.map((s) => (
                    <span key={s} className="pill amber" style={{ marginRight: 4 }}>
                      {s}
                    </span>
                  ))}
                </>
              )}
            </Card>
          </div>

          <div className="grid g3">
            <Card title="Strengths">
              {strengths.length
                ? <ul className="checks">{strengths.map((s) => <li key={s}>{s}</li>)}</ul>
                : <span className="muted">None identified yet.</span>
              }
            </Card>

            <Card title="Weaknesses">
              {weaknesses.length
                ? <ul className="checks bad">{weaknesses.map((s) => <li key={s}>{s}</li>)}</ul>
                : <span className="muted">No major weaknesses found.</span>
              }
            </Card>

            <Card title="Improvement tips">
              {suggestions.length
                ? <ul className="checks warn">{suggestions.map((s) => <li key={s}>{s}</li>)}</ul>
                : <span className="muted">Looks great!</span>
              }
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
