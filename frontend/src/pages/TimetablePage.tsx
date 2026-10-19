import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { SetupImportPanel } from '../components/SetupImportPanel';
import { useAcademic } from '../context/useAcademic';
import * as academicService from '../services/academic.service';
import type { Subject, TimetableEntry } from '../types/academic';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const toMinute = (time: string) => { const [hour, minute] = time.split(':').map(Number); return hour * 60 + minute; };
const toTime = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
const localDate = (dayOffset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
type TimetableForm = { subjectId: string; dayOfWeek: number; startTime: string; endTime: string; type: 'L' | 'P'; teacherName: string; classroom: string; effectiveFrom: string; effectiveTo: string };

export function TimetablePage() {
  const { selectedSemester } = useAcademic();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState<TimetableForm>({ subjectId: '', dayOfWeek: 1, startTime: '09:00', endTime: '10:00', type: 'L', teacherName: '', classroom: '', effectiveFrom: '', effectiveTo: '' });

  const loadSetup = useCallback(async () => {
    if (!selectedSemester) { setSubjects([]); setEntries([]); return; }
    const [nextSubjects, nextEntries] = await Promise.all([
      academicService.listSubjects(selectedSemester.id, true),
      academicService.listTimetable(selectedSemester.id, true),
    ]);
    setSubjects(nextSubjects);
    setEntries(nextEntries.sort(sortEntries));
    setForm((current) => ({ ...current, subjectId: current.subjectId || nextSubjects.find((subject) => subject.active)?.id || '', effectiveFrom: current.effectiveFrom || selectedSemester.startDate.slice(0, 10) }));
  }, [selectedSemester]);

  useEffect(() => { loadSetup().catch((loadError) => setError(loadError.message)); }, [loadSetup]);

  const subjectNames = useMemo(() => new Map(subjects.map((subject) => [subject.id, subject.name])), [subjects]);
  const selectableSubjects = useMemo(
    () => subjects.filter((subject) => subject.active || (editingId && subject.id === form.subjectId)),
    [editingId, form.subjectId, subjects],
  );
  const editingEntry = useMemo(
    () => entries.find((entry) => entry.id === editingId) || null,
    [editingId, entries],
  );
  const editingStartedEntry = Boolean(
    editingEntry && editingEntry.effectiveFrom.slice(0, 10) <= localDate(),
  );

  function resetForm() {
    setEditingId('');
    setForm({ subjectId: subjects.find((subject) => subject.active)?.id || '', dayOfWeek: 1, startTime: '09:00', endTime: '10:00', type: 'L', teacherName: '', classroom: '', effectiveFrom: selectedSemester?.startDate.slice(0, 10) || '', effectiveTo: '' });
  }

  function payload() {
    return { subjectId: form.subjectId, dayOfWeek: form.dayOfWeek, startMinute: toMinute(form.startTime), endMinute: toMinute(form.endTime), type: form.type, teacherName: form.teacherName, classroom: form.classroom, effectiveFrom: form.effectiveFrom, effectiveTo: form.effectiveTo || null };
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSemester) return;
    setError(''); setMessage('');
    try {
      if (editingId) {
        if (editingStartedEntry) {
          await academicService.updateTimetableEntry(editingId, payload());
          await loadSetup();
          setMessage(`Schedule changed from ${form.effectiveFrom}. Previous class records keep the earlier timetable.`);
        } else {
          const updated = await academicService.correctTimetableEntry(editingId, payload());
          setEntries((current) => current.map((entry) => entry.id === updated.id ? updated : entry).sort(sortEntries));
          setMessage('Future timetable entry corrected. No previous class records were affected.');
        }
      } else {
        const entry = await academicService.createTimetableEntry(selectedSemester.id, payload());
        setEntries((current) => [...current, entry].sort(sortEntries));
        setMessage('Recurring period added.');
      }
      resetForm();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save timetable entry.');
    }
  }

  function beginEdit(entry: TimetableEntry) {
    setEditingId(entry.id);
    const hasStarted = entry.effectiveFrom.slice(0, 10) <= localDate();
    setForm({ subjectId: entry.subjectId, dayOfWeek: entry.dayOfWeek, startTime: toTime(entry.startMinute), endTime: toTime(entry.endMinute), type: entry.type, teacherName: entry.teacherName || '', classroom: entry.classroom || '', effectiveFrom: hasStarted ? localDate(1) : entry.effectiveFrom.slice(0, 10), effectiveTo: entry.effectiveTo?.slice(0, 10) || '' });
    setError(''); setMessage('');
  }

  async function archive(entry: TimetableEntry) {
    if (!window.confirm('Archive this recurring period? You can restore it later from this page.')) return;
    setError('');
    try {
      await academicService.archiveTimetableEntry(entry.id);
      setEntries((current) => current.map((item) => item.id === entry.id ? { ...item, active: false } : item));
      if (editingId === entry.id) resetForm();
      setMessage('Period archived.');
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : 'Unable to archive period.');
    }
  }

  async function restore(entry: TimetableEntry) {
    setError('');
    try {
      const restored = await academicService.restoreTimetableEntry(entry.id);
      setEntries((current) => current.map((item) => item.id === restored.id ? restored : item).sort(sortEntries));
      setMessage('Period restored.');
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : 'Unable to restore period.');
    }
  }

  if (!selectedSemester) return <main className="page-container"><section className="empty-state"><h2>Select or create a semester first</h2></section></main>;

  return (
    <main className="page-container">
      <div className="page-heading"><span className="eyebrow">{selectedSemester.name}</span><h1>Weekly timetable</h1><p>Add periods one by one, correct mistakes in place, or import a complete timetable.</p></div>
      {message ? <div className="success-banner" role="status">{message}</div> : null}
      {error ? <div className="form-error page-error" role="alert">{error}</div> : null}
      <section className="content-card">
        <h2>{editingId ? editingStartedEntry ? 'Change recurring period' : 'Correct future period' : 'Add recurring period'}</h2>
        {editingStartedEntry ? <p className="inline-help">This period has already started. Saving creates a new version from the selected date, while all earlier classes keep the original timetable.</p> : null}
        {subjects.every((subject) => !subject.active) && !editingId ? <p className="muted">Add or restore a subject before creating timetable periods.</p> : (
          <form className="wide-form" onSubmit={submit}>
            <label>Subject<select value={form.subjectId} onChange={(event) => setForm({ ...form, subjectId: event.target.value })}>{selectableSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}{subject.active ? '' : ' (archived)'}</option>)}</select></label>
            <label>Day<select value={form.dayOfWeek} onChange={(event) => setForm({ ...form, dayOfWeek: Number(event.target.value) })}>{days.map((day, index) => <option key={day} value={index + 1}>{day}</option>)}</select></label>
            <label>Start<input type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} required /></label>
            <label>End<input type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} required /></label>
            <label>Type<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as 'L' | 'P' })}><option value="L">Lecture</option><option value="P">Practical</option></select></label>
            <label>Teacher<input value={form.teacherName} onChange={(event) => setForm({ ...form, teacherName: event.target.value })} /></label>
            <label>Room / lab<input value={form.classroom} onChange={(event) => setForm({ ...form, classroom: event.target.value })} /></label>
            <label>{editingStartedEntry ? 'Change effective from' : 'Effective from'}<input type="date" min={editingStartedEntry ? localDate(1) : undefined} value={form.effectiveFrom} onChange={(event) => setForm({ ...form, effectiveFrom: event.target.value })} required /></label>
            <label>Effective to (optional)<input type="date" value={form.effectiveTo} onChange={(event) => setForm({ ...form, effectiveTo: event.target.value })} /></label>
            <div className="form-actions wide-form-actions">
              <button className="primary-button" type="submit">{editingId ? editingStartedEntry ? 'Save schedule change' : 'Save correction' : 'Add period'}</button>
              {editingId ? <button className="secondary-button" onClick={resetForm} type="button">Cancel</button> : null}
            </div>
          </form>
        )}
      </section>
      <SetupImportPanel semesterId={selectedSemester.id} kind="timetable" format="Subject, Day, Start Time, End Time, Type, Teacher, Room, Effective From, Effective To" onImported={loadSetup} />
      <section className="content-card timetable-card">
        <h2>Recurring periods</h2>
        {entries.length === 0 ? <p className="muted">No timetable periods yet.</p> : <div className="record-list">{entries.map((entry) => (
          <article className={`record-row ${entry.active ? '' : 'archived-record'}`} key={entry.id}>
            <div><strong>{subjectNames.get(entry.subjectId) || 'Subject'} · {entry.type}</strong><span>{days[entry.dayOfWeek - 1]} · {toTime(entry.startMinute)}–{toTime(entry.endMinute)} · {entry.teacherName || 'Teacher not set'} · {entry.classroom || 'Room not set'}{entry.active ? '' : entry.inactiveReason === 'SUPERSEDED' ? ' · Historical version' : ' · Archived'}</span></div>
            <div className="record-actions">
              {entry.active ? <>
                <button className="text-action" onClick={() => beginEdit(entry)} type="button">Edit</button>
                <button className="text-button" onClick={() => void archive(entry)} type="button">Archive</button>
              </> : entry.inactiveReason !== 'SUPERSEDED'
                ? <button className="text-action" onClick={() => void restore(entry)} type="button">Restore</button>
                : null}
            </div>
          </article>
        ))}</div>}
      </section>
    </main>
  );
}

function sortEntries(a: TimetableEntry, b: TimetableEntry) {
  return Number(!a.active) - Number(!b.active) || a.dayOfWeek - b.dayOfWeek || a.startMinute - b.startMinute;
}
