import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { SetupImportPanel } from '../components/SetupImportPanel';
import { useAcademic } from '../context/useAcademic';
import * as academicService from '../services/academic.service';
import type { Subject } from '../types/academic';

const emptyForm = { name: '', code: '', targetPercentage: 75 };

export function SubjectsPage() {
  const { selectedSemester } = useAcademic();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadSubjects = useCallback(async () => {
    if (!selectedSemester) return setSubjects([]);
    setSubjects(await academicService.listSubjects(selectedSemester.id, true));
  }, [selectedSemester]);

  useEffect(() => {
    loadSubjects().catch((loadError) => setError(loadError.message));
  }, [loadSubjects]);

  function resetForm() {
    setEditingId('');
    setForm(emptyForm);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSemester) return;
    setError('');
    setMessage('');
    try {
      if (editingId) {
        const updated = await academicService.updateSubject(editingId, form);
        setSubjects((current) => current.map((subject) => subject.id === updated.id ? updated : subject));
        setMessage('Subject corrected. Attendance records remain linked to it.');
      } else {
        const subject = await academicService.createSubject(selectedSemester.id, form);
        setSubjects((current) => [...current, subject].sort((a, b) => a.name.localeCompare(b.name)));
        setMessage('Subject added.');
      }
      resetForm();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save subject.');
    }
  }

  function beginEdit(subject: Subject) {
    setEditingId(subject.id);
    setForm({ name: subject.name, code: subject.code || '', targetPercentage: subject.targetPercentage });
    setError('');
    setMessage('');
  }

  async function archive(subject: Subject) {
    if (!window.confirm(`Archive ${subject.name}? You can restore it later from this page.`)) return;
    setError('');
    try {
      await academicService.archiveSubject(subject.id);
      setSubjects((current) => current.map((item) => item.id === subject.id ? { ...item, active: false } : item));
      if (editingId === subject.id) resetForm();
      setMessage('Subject archived. It remains available below for restoration.');
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : 'Unable to archive subject.');
    }
  }

  async function restore(subject: Subject) {
    setError('');
    try {
      const restored = await academicService.restoreSubject(subject.id);
      setSubjects((current) => current.map((item) => item.id === restored.id ? restored : item));
      setMessage('Subject restored.');
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : 'Unable to restore subject.');
    }
  }

  if (!selectedSemester) return <MissingSemester />;

  return (
    <main className="page-container">
      <div className="page-heading"><span className="eyebrow">{selectedSemester.name}</span><h1>Subjects</h1><p>Add subjects individually, correct them at any time, or import a prepared list.</p></div>
      {message ? <div className="success-banner" role="status">{message}</div> : null}
      {error ? <div className="form-error page-error" role="alert">{error}</div> : null}
      <div className="two-column-grid setup-grid">
        <section className="content-card">
          <h2>{editingId ? 'Correct subject' : 'Add subject'}</h2>
          <form onSubmit={submit}>
            <label>Subject name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
            <div className="field-grid">
              <label>Code (optional)<input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label>
              <label>Target %<input type="number" min="1" max="100" value={form.targetPercentage} onChange={(event) => setForm({ ...form, targetPercentage: Number(event.target.value) })} required /></label>
            </div>
            <div className="form-actions">
              <button className="primary-button" type="submit">{editingId ? 'Save correction' : 'Add subject'}</button>
              {editingId ? <button className="secondary-button" onClick={resetForm} type="button">Cancel</button> : null}
            </div>
          </form>
        </section>
        <section className="content-card">
          <h2>Subjects</h2>
          {subjects.length === 0 ? <p className="muted">No subjects added.</p> : <div className="record-list">{subjects.map((subject) => (
            <article className={`record-row ${subject.active ? '' : 'archived-record'}`} key={subject.id}>
              <div><strong>{subject.name}</strong><span>{subject.code || 'No code'} · Target {subject.targetPercentage}%{subject.active ? '' : ' · Archived'}</span></div>
              <div className="record-actions">
                <button className="text-action" onClick={() => beginEdit(subject)} type="button">Edit</button>
                {subject.active
                  ? <button className="text-button" onClick={() => void archive(subject)} type="button">Archive</button>
                  : <button className="text-action" onClick={() => void restore(subject)} type="button">Restore</button>}
              </div>
            </article>
          ))}</div>}
        </section>
      </div>
      <SetupImportPanel
        semesterId={selectedSemester.id}
        kind="subjects"
        format="Name, Code, Target Percentage"
        onImported={loadSubjects}
      />
    </main>
  );
}

function MissingSemester() {
  return <main className="page-container"><section className="empty-state"><h2>Select or create a semester first</h2><p>Subjects must belong to an owner-scoped semester.</p></section></main>;
}
