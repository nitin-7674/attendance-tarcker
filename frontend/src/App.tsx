import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AcademicProvider } from './context/AcademicProvider';
import { AuthProvider } from './context/AuthProvider';
import { useAuth } from './context/useAuth';
import { AuthLayout } from './layouts/AuthLayout';
import { AppLayout } from './layouts/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { SemestersPage } from './pages/SemestersPage';
import { SubjectsPage } from './pages/SubjectsPage';
import { TimetablePage } from './pages/TimetablePage';
import { AttendancePage } from './pages/AttendancePage';
import { CalendarPage } from './pages/CalendarPage';
import { DutyLeavePage } from './pages/DutyLeavePage';
import { DataPage } from './pages/DataPage';
import { QueryConsolePage } from './pages/QueryConsolePage';

function AcademicApp() {
  return <AcademicProvider><AppLayout /></AcademicProvider>;
}

function HomeRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-status">Loading…</div>;
  return <Navigate to={user ? '/dashboard' : '/login'} replace />;
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<AcademicApp />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/semesters" element={<SemestersPage />} />
            <Route path="/subjects" element={<SubjectsPage />} />
            <Route path="/timetable" element={<TimetablePage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/duty-leave" element={<DutyLeavePage />} />
            <Route path="/data" element={<DataPage />} />
            <Route path="/query-console" element={<QueryConsolePage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
