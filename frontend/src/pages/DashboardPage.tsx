import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAcademic } from '../context/useAcademic';
import { useAuth } from '../context/useAuth';
import * as analyticsService from '../services/analytics.service';
import type { DashboardSummary } from '../types/academic';

export function DashboardPage() {
  const { user } = useAuth();
  const { selectedSemester, loading } = useAcademic();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedSemester) { setSummary(null); return; }
    analyticsService.getDashboard(selectedSemester.id).then(setSummary).catch((loadError) => setError(loadError.message));
  }, [selectedSemester]);

  const displayPercentage = (value: number | null | undefined) => value === null || value === undefined ? 'N/A' : `${value}%`;

  return (
    <main className="page-container">
      <div className="page-heading">
        <span className="eyebrow">Version 1 workspace</span>
        <h1>Good to see you, {user?.name}.</h1>
        <p>Set up your academic structure before attendance tracking begins.</p>
      </div>
      {loading ? <div className="content-card">Loading your semester…</div> : null}
      {!loading && !selectedSemester ? (
        <section className="empty-state">
          <h2>Create your current semester</h2>
          <p>A semester provides the boundary for subjects, timetable entries, and attendance.</p>
          <Link className="primary-link" to="/semesters">Create semester</Link>
        </section>
      ) : null}
      {selectedSemester ? (
        <>
          {error ? <div className="form-error page-error" role="alert">{error}</div> : null}
          <section className="metric-grid">
            <article className="metric-card"><span>Actual attendance</span><strong>{displayPercentage(summary?.overall.actualPercentage)}</strong></article>
            <article className="metric-card"><span>DL-adjusted</span><strong>{displayPercentage(summary?.overall.adjustedPercentage)}</strong></article>
            <article className="metric-card"><span>Present periods</span><strong>{summary?.overall.present ?? 0}</strong></article>
            <article className="metric-card"><span>Absent periods</span><strong>{summary?.overall.absent ?? 0}</strong></article>
          </section>
          <section className="content-card dashboard-subjects">
            <div className="section-heading"><div><span className="card-label">Selected semester</span><h2>{selectedSemester.name}</h2></div><span className="status-chip">{selectedSemester.status}</span></div>
            {summary?.subjects.length ? <div className="record-list">{summary.subjects.map((subject) => <article className="record-row" key={subject.subjectId}><div><strong>{subject.name}</strong><span>{subject.present} present · {subject.absent} absent · target {subject.targetPercentage}%</span></div><span className={subject.belowTarget ? 'percentage-alert' : 'percentage-good'}>{displayPercentage(subject.actualPercentage)}</span></article>)}</div> : <p className="muted">Add subjects and attendance to see analytics.</p>}
          </section>
        </>
      ) : null}
    </main>
  );
}
