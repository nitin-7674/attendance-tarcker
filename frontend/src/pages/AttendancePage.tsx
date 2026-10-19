import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAcademic } from '../context/useAcademic';
import * as academicService from '../services/academic.service';
import * as attendanceService from '../services/attendance.service';
import { ApiError } from '../services/api';
import type { ClassNote, ClassOccurrence, DailyAttendance, Subject } from '../types/academic';

const toTime = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

function initialDate(startDate?: string, endDate?: string) {
  const today = new Date().toLocaleDateString('en-CA');
  if (startDate && today < startDate.slice(0, 10)) return startDate.slice(0, 10);
  if (endDate && today > endDate.slice(0, 10)) return endDate.slice(0, 10);
  return today;
}

interface OverlapPrompt {
  occurrence: ClassOccurrence;
  overlaps: ClassOccurrence[];
}

export function AttendancePage() {
  const { selectedSemester } = useAcademic();
  const [date, setDate] = useState(() => initialDate());
  const [day, setDay] = useState<DailyAttendance | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState<OverlapPrompt | null>(null);
  const [noteOccurrence, setNoteOccurrence] = useState<ClassOccurrence | null>(null);
  const [note, setNote] = useState<Pick<ClassNote, 'topicCovered' | 'assignmentGiven' | 'dueDate'>>({ topicCovered: '', assignmentGiven: '', dueDate: null });

  const load = useCallback(async () => {
    if (!selectedSemester) return;
    setLoading(true);
    setError('');
    try {
      const [nextDay, nextSubjects] = await Promise.all([
        attendanceService.getDailyAttendance(selectedSemester.id, date),
        academicService.listSubjects(selectedSemester.id),
      ]);
      setDay(nextDay);
      setSubjects(nextSubjects);
    } catch (loadError) {
      setDay(null);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load attendance.');
    } finally {
      setLoading(false);
    }
  }, [date, selectedSemester]);

  useEffect(() => {
    if (selectedSemester) {
      setDate(initialDate(selectedSemester.startDate, selectedSemester.endDate));
    }
  }, [selectedSemester]);

  useEffect(() => {
    void load();
  }, [load]);

  const subjectNames = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject.name])),
    [subjects],
  );

  async function mark(
    occurrence: ClassOccurrence,
    status: 'PRESENT' | 'ABSENT',
    overlapAction?: attendanceService.OverlapAction,
  ) {
    if (!selectedSemester) return;
    setError('');
    try {
      await attendanceService.markAttendance(
        selectedSemester.id,
        occurrence.occurrenceKey,
        date,
        status,
        overlapAction,
      );
      setPrompt(null);
      await load();
    } catch (markError) {
      if (
        markError instanceof ApiError &&
        markError.code === 'OVERLAP_CONFIRMATION_REQUIRED'
      ) {
        const details = markError.details as { overlaps?: ClassOccurrence[] } | undefined;
        setPrompt({ occurrence, overlaps: details?.overlaps || [] });
        return;
      }
      setError(markError instanceof Error ? markError.message : 'Unable to mark attendance.');
    }
  }

  async function openNote(occurrence: ClassOccurrence) {
    if (!selectedSemester) return;
    setError('');
    try {
      const saved = await attendanceService.getClassNote(selectedSemester.id, occurrence.occurrenceKey, date);
      setNote({ topicCovered: saved.topicCovered, assignmentGiven: saved.assignmentGiven, dueDate: saved.dueDate ? saved.dueDate.slice(0, 10) : null });
      setNoteOccurrence(occurrence);
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : 'Unable to open class notes.');
    }
  }

  async function saveNote() {
    if (!selectedSemester || !noteOccurrence) return;
    try {
      await attendanceService.saveClassNote(selectedSemester.id, noteOccurrence.occurrenceKey, date, note);
      setNoteOccurrence(null);
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : 'Unable to save class notes.');
    }
  }

  if (!selectedSemester) {
    return <main className="page-container"><section className="empty-state"><h2>Select or create a semester first</h2></section></main>;
  }

  return (
    <main className="page-container">
      <div className="page-heading">
        <span className="eyebrow">{selectedSemester.name}</span>
        <h1>Attendance</h1>
        <p>Pending is inferred until you explicitly mark a period.</p>
      </div>
      <section className="content-card attendance-toolbar">
        <label>Date<input type="date" min={selectedSemester.startDate.slice(0, 10)} max={selectedSemester.endDate.slice(0, 10)} value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <span>{loading ? 'Loading periods…' : `${day?.occurrences.length || 0} periods`}</span>
      </section>
      {error ? <div className="form-error page-error" role="alert">{error}</div> : null}
      {day?.holiday ? <div className="holiday-banner"><strong>Holiday</strong><span>{day.holiday.reason}</span><small>Explicit extra classes still appear below.</small></div> : null}
      <section className="attendance-list">
        {!loading && day?.occurrences.length === 0 ? <div className="empty-state"><h2>No classes for this date</h2><p>Recurring periods may not be scheduled, or a holiday may suppress them.</p></div> : null}
        {day?.occurrences.map((occurrence) => (
          <article className="attendance-row" key={occurrence.occurrenceKey}>
            <div className="time-block"><strong>{toTime(occurrence.startMinute)}</strong><span>{toTime(occurrence.endMinute)}</span></div>
            <div className="class-details"><h2>{subjectNames.get(occurrence.subjectId) || 'Subject'}</h2><span>{occurrence.type === 'L' ? 'Lecture' : 'Practical'} · {occurrence.teacherName || 'Teacher not set'} · {occurrence.classroom || 'Room not set'}{occurrence.source === 'EXTRA' ? ' · Extra class' : ''}</span></div>
            <span className={`attendance-status status-${occurrence.status.toLowerCase()}`}>{occurrence.status}</span>
            <div className="attendance-actions">
              <button className="present-button" onClick={() => void mark(occurrence, 'PRESENT')} type="button">Present</button>
              <button className="absent-button" onClick={() => void mark(occurrence, 'ABSENT')} type="button">Absent</button>
              <button className="note-button" onClick={() => void openNote(occurrence)} type="button">Notes</button>
            </div>
          </article>
        ))}
      </section>
      {prompt ? (
        <div className="dialog-backdrop" role="presentation">
          <section aria-labelledby="overlap-title" aria-modal="true" className="dialog" role="dialog">
            <span className="eyebrow">Overlap detected</span>
            <h2 id="overlap-title">This class overlaps {prompt.overlaps.length} pending period{prompt.overlaps.length === 1 ? '' : 's'}.</h2>
            <p>Only pending overlapping periods can be marked absent automatically. Existing decisions are never overwritten.</p>
            <div className="dialog-actions">
              <button className="primary-button" onClick={() => void mark(prompt.occurrence, 'PRESENT', 'MARK_PENDING_ABSENT')} type="button">Mark pending overlaps absent</button>
              <button className="secondary-button" onClick={() => void mark(prompt.occurrence, 'PRESENT', 'LEAVE_UNCHANGED')} type="button">Leave them unchanged</button>
              <button className="text-button" onClick={() => setPrompt(null)} type="button">Cancel</button>
            </div>
          </section>
        </div>
      ) : null}
      {noteOccurrence ? (
        <div className="dialog-backdrop" role="presentation">
          <section aria-labelledby="note-title" aria-modal="true" className="dialog" role="dialog">
            <span className="eyebrow">Occurrence-specific</span>
            <h2 id="note-title">Class notes and assignment</h2>
            <div className="note-form">
              <label>Topic covered<textarea rows={4} value={note.topicCovered} onChange={(event) => setNote({ ...note, topicCovered: event.target.value })} /></label>
              <label>Assignment given<textarea rows={4} value={note.assignmentGiven} onChange={(event) => setNote({ ...note, assignmentGiven: event.target.value })} /></label>
              <label>Due date (optional)<input type="date" value={note.dueDate || ''} onChange={(event) => setNote({ ...note, dueDate: event.target.value || null })} /></label>
            </div>
            <div className="dialog-actions"><button className="primary-button" onClick={() => void saveNote()} type="button">Save notes</button><button className="secondary-button" onClick={() => setNoteOccurrence(null)} type="button">Cancel</button></div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
