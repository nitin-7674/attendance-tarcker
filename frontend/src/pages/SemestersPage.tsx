import { useState, type FormEvent } from 'react';
import { useAcademic } from '../context/useAcademic';
import * as academicService from '../services/academic.service';
import * as archiveService from '../services/archive.service';
import type { Semester } from '../types/academic';

const emptyForm = { name: '', startDate: '', endDate: '' };

export function SemestersPage() {
  const { semesters, createSemester, refreshSemesters } = useAcademic();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const hasCurrentSemester = semesters.some((semester) => semester.status === 'CURRENT');

  function resetForm() {
    setEditingId('');
    setForm(emptyForm);
  }

  function beginEdit(semester: Semester) {
    setEditingId(semester.id);
    setForm({ name: semester.name, startDate: semester.startDate.slice(0, 10), endDate: semester.endDate.slice(0, 10) });
    setError('');
    setMessage('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      if (editingId) {
        await academicService.updateSemester(editingId, form);
        await refreshSemesters();
        setMessage('Semester details corrected.');
      } else {
        await createSemester(form);
        setMessage('Semester created.');
      }
      resetForm();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save semester.');
    } finally {
      setSubmitting(false);
    }
  }

  async function prepareArchive(semester: Semester) {
    if (!window.confirm(`Complete ${semester.name} and prepare its workbook? You can reopen it later if no other semester is current.`)) return;
    setError(''); setMessage('');
    try {
      const result = await archiveService.prepareArchive(semester.id);
      const total = Object.values(result.recordCounts).reduce((sum, count) => sum + count, 0);
      setMessage(`Download prepared with ${total} records. Source data remains in MongoDB.`);
      await refreshSemesters();
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : 'Unable to prepare semester download.');
    }
  }

  async function reopen(semester: Semester) {
    setError(''); setMessage('');
    try {
      await academicService.updateSemester(semester.id, { status: 'CURRENT' });
      await refreshSemesters();
      setMessage(`${semester.name} reopened as the current semester.`);
    } catch (reopenError) {
      setError(reopenError instanceof Error ? reopenError.message : 'Unable to reopen semester.');
    }
  }

  return (
    <main className="page-container">
      <div className="page-heading">
        <span className="eyebrow">Academic setup</span>
        <h1>Semesters</h1>
        <p>Create one current semester, correct its details later, and reopen a completed semester when needed.</p>
      </div>
      {message ? <div className="success-banner" role="status">{message}</div> : null}
      {error ? <div className="form-error page-error" role="alert">{error}</div> : null}
      <div className="two-column-grid">
        <section className="content-card">
          <h2>{editingId ? 'Correct semester' : 'New semester'}</h2>
          {!editingId && hasCurrentSemester ? <p className="inline-help">Complete the current semester before creating another.</p> : null}
          <form onSubmit={submit}>
            <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
            <div className="field-grid">
              <label>Start date<input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} required /></label>
              <label>End date<input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} required /></label>
            </div>
            <div className="form-actions">
              <button className="primary-button" disabled={submitting || (!editingId && hasCurrentSemester)} type="submit">{submitting ? 'Saving…' : editingId ? 'Save correction' : 'Create semester'}</button>
              {editingId ? <button className="secondary-button" onClick={resetForm} type="button">Cancel</button> : null}
            </div>
          </form>
        </section>
        <section className="content-card">
          <h2>Your semesters</h2>
          {semesters.length === 0 ? <p className="muted">No semesters yet.</p> : (
            <div className="record-list">
              {semesters.map((semester) => (
                <article className="record-row semester-record" key={semester.id}>
                  <div><strong>{semester.name}</strong><span>{new Date(semester.startDate).toLocaleDateString()} – {new Date(semester.endDate).toLocaleDateString()}</span></div>
                  <div className="semester-actions">
                    <span className="status-chip">{semester.status}</span>
                    <div className="record-actions">
                      <button className="text-action" onClick={() => beginEdit(semester)} type="button">Edit</button>
                      {semester.status === 'CURRENT'
                        ? <button className="text-action" onClick={() => void prepareArchive(semester)} type="button">Complete and prepare download</button>
                        : <>
                            <a className="text-action link-action" href={`/api/v1/semesters/${semester.id}/download`}>Download workbook</a>
                            <button className="text-action" disabled={hasCurrentSemester} onClick={() => void reopen(semester)} type="button">Reopen</button>
                          </>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
