import { useEffect, useState, type FormEvent } from 'react';
import { useAcademic } from '../context/useAcademic';
import * as dutyLeaveService from '../services/duty-leave.service';
import type { DutyLeaveApplication } from '../types/academic';

export function DutyLeavePage() {
  const { selectedSemester } = useAcademic();
  const [applications, setApplications] = useState<DutyLeaveApplication[]>([]);
  const [form, setForm] = useState({ eventName: '', reason: '', reference: '', startAt: '', endAt: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!selectedSemester) return;
    dutyLeaveService.listDutyLeave(selectedSemester.id).then(setApplications).catch((loadError) => setError(loadError.message));
  }, [selectedSemester]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedSemester) return; setError(''); setMessage('');
    try {
      const application = await dutyLeaveService.createDutyLeave(selectedSemester.id, { ...form, startAt: new Date(form.startAt).toISOString(), endAt: new Date(form.endAt).toISOString() });
      setApplications((current) => [application, ...current]);
      setForm({ eventName: '', reason: '', reference: '', startAt: '', endAt: '' });
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'Unable to create Duty Leave.'); }
  }

  async function setStatus(application: DutyLeaveApplication, status: DutyLeaveApplication['status']) {
    setError(''); setMessage('');
    try {
      const updated = await dutyLeaveService.updateDutyLeaveStatus(application.id, status);
      setApplications((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : 'Unable to update Duty Leave.'); }
  }

  async function reconcile(application: DutyLeaveApplication) {
    setError(''); setMessage('');
    try {
      const result = await dutyLeaveService.reconcileDutyLeave(application.id);
      setMessage(`${result.applied} eligible absence${result.applied === 1 ? '' : 's'} credited; ${result.alreadyCredited} already had a credit.`);
    } catch (reconcileError) { setError(reconcileError instanceof Error ? reconcileError.message : 'Unable to reconcile Duty Leave.'); }
  }

  if (!selectedSemester) return <main className="page-container"><section className="empty-state"><h2>Select or create a semester first</h2></section></main>;

  return (
    <main className="page-container">
      <div className="page-heading"><span className="eyebrow">{selectedSemester.name}</span><h1>Duty Leave</h1><p>Credits stay separate from the original absent attendance records.</p></div>
      {message ? <div className="success-banner">{message}</div> : null}{error ? <div className="form-error page-error" role="alert">{error}</div> : null}
      <div className="two-column-grid">
        <section className="content-card"><h2>New application</h2><form onSubmit={submit}><label>Event name<input value={form.eventName} onChange={(event) => setForm({ ...form, eventName: event.target.value })} required /></label><label>Reason<input value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} required /></label><label>Reference (optional)<input value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} /></label><div className="field-grid"><label>Starts<input type="datetime-local" value={form.startAt} onChange={(event) => setForm({ ...form, startAt: event.target.value })} required /></label><label>Ends<input type="datetime-local" value={form.endAt} onChange={(event) => setForm({ ...form, endAt: event.target.value })} required /></label></div><button className="primary-button" type="submit">Create application</button></form></section>
        <section className="content-card"><h2>Applications</h2>{applications.length === 0 ? <p className="muted">No Duty Leave applications.</p> : <div className="record-list">{applications.map((application) => <article className="dl-record" key={application.id}><div className="section-heading"><div><strong>{application.eventName}</strong><span>{new Date(application.startAt).toLocaleString()} – {new Date(application.endAt).toLocaleString()}</span></div><span className="status-chip">{application.status}</span></div><p>{application.reason}</p><div className="compact-actions"><button className="text-action" onClick={() => void setStatus(application, 'APPROVED')} type="button">Approve</button><button className="text-action" onClick={() => void setStatus(application, 'REJECTED')} type="button">Reject</button><button className="text-action" disabled={application.status !== 'APPROVED'} onClick={() => void reconcile(application)} type="button">Apply credits</button></div></article>)}</div>}</section>
      </div>
    </main>
  );
}
