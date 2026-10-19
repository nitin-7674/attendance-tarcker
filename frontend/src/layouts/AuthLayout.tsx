import { Link, Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <main className="auth-shell">
      <section className="auth-intro">
        <Link className="brand" to="/">
          Attendance Tracker
        </Link>
        <div>
          <span className="eyebrow">One period at a time</span>
          <h1>Know where your attendance stands.</h1>
          <p>
            Build your semester timetable, record every class independently, and
            keep your academic data private to your account.
          </p>
        </div>
      </section>
      <section className="auth-panel">
        <Outlet />
      </section>
    </main>
  );
}
