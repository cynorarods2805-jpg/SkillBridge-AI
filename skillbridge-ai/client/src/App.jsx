import { Navigate, Route, Routes } from "react-router-dom";
import { authClient } from "./api.js";
import Layout from "./components/Layout.jsx";
import { Loading } from "./components/Ui.jsx";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Dashboard from "./pages/student/Dashboard.jsx";
import Profile from "./pages/student/Profile.jsx";
import Resume from "./pages/student/Resume.jsx";
import Jobs from "./pages/student/Jobs.jsx";
import JobMatch from "./pages/student/JobMatch.jsx";
import Roadmap from "./pages/student/Roadmap.jsx";
import TpoDashboard from "./pages/tpo/Dashboard.jsx";
import Students from "./pages/tpo/Students.jsx";
import StudentDetail from "./pages/tpo/StudentDetail.jsx";
import TpoJobs from "./pages/tpo/Jobs.jsx";
import Ranking from "./pages/tpo/Ranking.jsx";
import Reports from "./pages/tpo/Reports.jsx";

const home = (role) => (role === "tpo" ? "/tpo" : "/student");

/** Only lets signed-in users with the right role through. */
function Protected({ role }) {
  const { data, isPending } = authClient.useSession();
  if (isPending) return <Loading text="Checking your session…" />;
  if (!data) return <Navigate to={role === "tpo" ? "/tpo/login" : "/login"} replace />;
  if (data.user.role !== role) return <Navigate to={home(data.user.role)} replace />;
  return <Layout role={role} user={data.user} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login mode="student" />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/tpo/login" element={<Login mode="tpo" />} />

      <Route path="/student" element={<Protected role="student" />}>
        <Route index element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="resume" element={<Resume />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="jobs/:id" element={<JobMatch />} />
        <Route path="roadmap" element={<Roadmap />} />
      </Route>

      <Route path="/tpo" element={<Protected role="tpo" />}>
        <Route index element={<TpoDashboard />} />
        <Route path="students" element={<Students />} />
        <Route path="students/:id" element={<StudentDetail />} />
        <Route path="jobs" element={<TpoJobs />} />
        <Route path="ranking" element={<Ranking />} />
        <Route path="reports" element={<Reports />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
