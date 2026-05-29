import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProblemsSection } from './components/layout/ProblemsSection';
import { SessionDetailSection } from './components/layout/SessionDetailSection';
import { SessionsSection } from './components/layout/SessionsSection';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Problems } from './pages/Problems';
import { ProblemDetail } from './pages/ProblemDetail';
import { Sessions } from './pages/Sessions';
import { Scorecard } from './pages/Scorecard';
import { Report } from './pages/Report';
import SessionLive from './pages/SessionLive';
import ProblemCreate from './pages/ProblemCreate';
import SessionReplay from './pages/SessionReplay';
import UsersPage from './pages/UsersPage';
import QueuePage from './pages/QueuePage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';
import { Operator } from './pages/Operator';

function InterviewRedirect() {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  return <Navigate to={`/sessions/${sessionId}`} replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/landing" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/problems" element={<ProblemsSection />}>
          <Route index element={<Problems />} />
          <Route path="new" element={<ProblemCreate />} />
          <Route path=":id" element={<ProblemDetail />} />
        </Route>
        <Route path="/sessions" element={<SessionsSection />}>
          <Route index element={<Sessions />} />
          <Route path=":id" element={<SessionDetailSection />}>
            <Route index element={<SessionLive />} />
            <Route path="replay" element={<SessionReplay />} />
          </Route>
        </Route>
        <Route path="/scorecard/:sessionId" element={<Scorecard />} />
        <Route path="/report/:sessionId" element={<Report />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<Navigate to="/settings/profile" replace />} />
        <Route path="/settings/profile" element={<SettingsPage />} />
        <Route path="/settings/security" element={<SettingsPage />} />
        <Route path="/settings/keys" element={<SettingsPage />} />
        <Route path="/admin" element={<Operator />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/queue" element={<QueuePage />} />
        <Route path="/analytics" element={<Navigate to="/reports" replace />} />
        <Route path="/operator" element={<Navigate to="/admin" replace />} />
        <Route path="/interview/:sessionId" element={<InterviewRedirect />} />
      </Route>
    </Routes>
  );
}

export default App;
