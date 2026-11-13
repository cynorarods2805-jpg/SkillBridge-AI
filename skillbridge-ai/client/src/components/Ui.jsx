import { useEffect } from "react";

export const tone = (v) => (v >= 80 ? "green" : v >= 60 ? "amber" : "red");

export function Loading({ text = "Loading…" }) {
  return <div className="state">{text}</div>;
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="alert error" role="alert">
      <span>{error}</span>
      {onRetry && (
        <button className="btn small ghost" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

/** Convenience wrapper: shows loading / error, otherwise renders children(data). */
export function Async({ res, children }) {
  if (res.loading && !res.data) return <Loading />;
  if (res.error) return <ErrorBox error={res.error} onRetry={res.reload} />;
  return children(res.data);
}

export const Card = ({ title, action, children, className = "" }) => (
  <section className={`card ${className}`}>
    {(title || action) && (
      <div className="card-head">
        <h3>{title}</h3>
        {action}
      </div>
    )}
    {children}
  </section>
);

export const Stat = ({ icon, label, value, color = "purple" }) => (
  <div className="card stat">
    <div className={`stat-icon ${color}`}>{icon}</div>
    <div>
      <div className="stat-value">{value}</div>
      <div className="muted small">{label}</div>
    </div>
  </div>
);

export const Bar = ({ value, color }) => (
  <div className="bar">
    <div className={`bar-fill ${color || tone(value)}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
  </div>
);

export function Donut({ value, size = 140, label }) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = { green: "#22a35a", amber: "#e8a317", red: "#dc4c4c" }[tone(value)];
  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={`${label || "Score"} ${value}%`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ece8fb" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(100, value)) / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="donut-label">
        <strong>{value}%</strong>
        {label && <span className="muted small">{label}</span>}
      </div>
    </div>
  );
}

export const Pill = ({ children, color = "gray" }) => <span className={`pill ${color}`}>{children}</span>;
export const Tag = ({ children }) => <span className="tag">{children}</span>;

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="card-head">
          <h3>{title}</h3>
          <button className="btn small ghost" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Simple vertical bar chart (no chart library needed). */
export function ColumnChart({ data, labelKey = "label", valueKey = "count" }) {
  const max = Math.max(1, ...data.map((d) => d[valueKey]));
  return (
    <div className="columns">
      {data.map((d) => (
        <div className="col" key={d[labelKey]}>
          <span className="col-val">{d[valueKey]}</span>
          <div className="col-bar" style={{ height: `${(d[valueKey] / max) * 100}%` }} />
          <span className="muted small">{d[labelKey]}</span>
        </div>
      ))}
    </div>
  );
}
