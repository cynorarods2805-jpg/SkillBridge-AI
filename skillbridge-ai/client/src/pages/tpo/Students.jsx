
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFetch } from "../../api.js";
import { Async, Card, Pill, tone } from "../../components/Ui.jsx";

export default function Students() {
  const navigate = useNavigate();

  const [f, setF] = useState({
    q: "",
    department: "",
    minReadiness: "",
    minCgpa: ""
  });

  const [applied, setApplied] = useState(f);

  useEffect(() => {
    const t = setTimeout(() => setApplied(f), 250);
    return () => clearTimeout(t);
  }, [f]);

  const res = useFetch(`/tpo/students?${new URLSearchParams(applied)}`);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Student Management</h1>
        <p>View and manage all student records.</p>
      </div>

      <Card>
        <div className="row wrap">
          <input
            style={{ flex: 2, minWidth: 200 }}
            placeholder="Search by name, roll no. or skill…"
            aria-label="Search students"
            value={f.q}
            onChange={set("q")}
          />

          <select
            style={{ flex: 1, minWidth: 140 }}
            aria-label="Department"
            value={f.department}
            onChange={set("department")}
          >
            <option value="">All Departments</option>
            {(res.data?.departments || []).map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>

          <input
            style={{ width: 120 }}
            type="number"
            min="0"
            max="10"
            step="0.1"
            placeholder="Min CGPA"
            aria-label="Minimum CGPA"
            value={f.minCgpa}
            onChange={set("minCgpa")}
          />

          <input
            style={{ width: 140 }}
            type="number"
            min="0"
            max="100"
            placeholder="Min readiness %"
            aria-label="Minimum readiness"
            value={f.minReadiness}
            onChange={set("minReadiness")}
          />
        </div>

        <Async res={res}>
          {(d) =>
            d.students.length === 0 ? (
              <div className="empty" style={{ marginTop: 14 }}>
                No students match these filters.
              </div>
            ) : (
              <div className="table-wrap" style={{ marginTop: 10 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Roll No</th>
                      <th>Department</th>
                      <th>CGPA</th>
                      <th>Readiness</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {d.students.map((s) => (
                      <tr
                        key={s.id}
                        className="click"
                        onClick={() => navigate(`/tpo/students/${s.id}`)}
                      >
                        <td>
                          <strong>{s.name}</strong>
                          <div className="muted small">{s.email}</div>
                        </td>

                        <td>{s.roll_no || "—"}</td>
                        <td>{s.department || "—"}</td>
                        <td>{s.cgpa ?? "—"}</td>

                        <td>
                          <Pill color={tone(s.readiness)}>
                            {s.readiness}%
                          </Pill>
                        </td>

                        <td>
                          <button
                            className="btn small ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/tpo/students/${s.id}`);
                            }}
                          >
                            View
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
    </div>
  );
}
