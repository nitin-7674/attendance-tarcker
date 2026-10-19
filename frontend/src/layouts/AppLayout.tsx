import { NavLink, Outlet } from 'react-router-dom';
import { useAcademic } from '../context/useAcademic';
import { useAuth } from '../context/useAuth';

const navigation = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/semesters', label: 'Semesters' },
  { to: '/subjects', label: 'Subjects' },
  { to: '/timetable', label: 'Timetable' },
  { to: '/attendance', label: 'Attendance' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/duty-leave', label: 'Duty Leave' },
  { to: '/data', label: 'Data' },
  { to: '/query-console', label: 'Query console' },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const { semesters, selectedSemester, selectSemester } = useAcademic();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">Attendance Tracker</div>
        <nav aria-label="Primary navigation">
          {navigation.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button className="sidebar-logout" onClick={() => void logout()} type="button">
          Sign out
        </button>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            <span className="topbar-label">Signed in as</span>
            <strong>{user?.name}</strong>
          </div>
          <label className="semester-selector">
            <span>Current context</span>
            <select
              value={selectedSemester?.id || ''}
              onChange={(event) => selectSemester(event.target.value)}
              disabled={semesters.length === 0}
            >
              {semesters.length === 0 ? <option value="">No semester</option> : null}
              {semesters.map((semester) => (
                <option key={semester.id} value={semester.id}>
                  {semester.name} · {semester.status.toLowerCase()}
                </option>
              ))}
            </select>
          </label>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
