import { useEffect, useState, type FormEvent } from 'react';
import { useAcademic } from '../context/useAcademic';
import * as academicService from '../services/academic.service';
import * as attendanceService from '../services/attendance.service';
import type { Subject } from '../types/academic';

const toMinute = (time: string) => { const [hour, minute] = time.split(':').map(Number); return hour * 60 + minute; };

export function CalendarPage() {
  const { selectedSemester } = useAcademic();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [holiday, setHoliday] = useState({ date: '', reason: '' });
  const [extra, setExtra] = useState({ date: '', subjectId: '', start: '09:00', end: '10:00', type: 'L' as 'L' | 'P', teacherName: '', classroom: '', reason: '' });

  useEffect(() => {
    if (!selectedSemester) return;
    academicService.listSubjects(selectedSemester.id).then((records) => { setSubjects(records); setExtra((current) => ({ ...current, subjectId: current.subjectId || records[0]?.id || '', date: current.date || selectedSemester.startDate.slice(0, 10) })); }).catch((loadError) => setError(loadError.message));
    setHoliday((current) => ({ ...current, date: current.date || selectedSemester.startDate.slice(0, 10) }));
  }, [selectedSemester]);

  async function submitHoliday(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedSemester) return; setError(''); setMessage('');
    try { await attendanceService.createHoliday(selectedSemester.id, holiday); setMessage('Holiday saved. Ordinary recurring classes will be suppressed for this date.'); setHoliday({ ...holiday, reason: '' }); } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'Unable to save holiday.'); }
  }

  async function submitExtra(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedSemester) return; setError(''); setMessage('');
    try { await attendanceService.createExtraClass(selectedSemester.id, { date: extra.date, subjectId: extra.subjectId, startMinute: toMinute(extra.start), endMinute: toMinute(extra.end), type: extra.type, teacherName: extra.teacherName, classroom: extra.classroom, reason: extra.reason }); setMessage('Extra class saved. It will appear on the attendance page even if the date is a holiday.'); } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'Unable to save extra class.'); }
  }

  if (!selectedSemester) return <main className="page-container"><section className="empty-state"><h2>Select or create a semester first</h2></section></main>;

  return (
    <main className="page-container">
      <div className="page-heading"><span className="eyebrow">{selectedSemester.name}</span><h1>Calendar exceptions</h1><p>Holidays suppress recurring classes; explicit extra classes still occur.</p></div>
      {message ? <div className="success-banner">{message}</div> : null}{error ? <div className="form-error page-error" role="alert">{error}</div> : null}
      <div className="two-column-grid">
        <section className="content-card"><h2>Add holiday</h2><form onSubmit={submitHoliday}><label>Date<input type="date" value={holiday.date} onChange={(event) => setHoliday({ ...holiday, date: event.target.value })} required /></label><label>Reason<input value={holiday.reason} onChange={(event) => setHoliday({ ...holiday, reason: event.target.value })} required /></label><button className="primary-button" type="submit">Save holiday</button></form></section>
        <section className="content-card"><h2>Add extra class</h2>{subjects.length === 0 ? <p className="muted">Add a subject first.</p> : <form onSubmit={submitExtra}><div className="field-grid"><label>Date<input type="date" value={extra.date} onChange={(event) => setExtra({ ...extra, date: event.target.value })} required /></label><label>Subject<select value={extra.subjectId} onChange={(event) => setExtra({ ...extra, subjectId: event.target.value })}>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label><label>Start<input type="time" value={extra.start} onChange={(event) => setExtra({ ...extra, start: event.target.value })} required /></label><label>End<input type="time" value={extra.end} onChange={(event) => setExtra({ ...extra, end: event.target.value })} required /></label><label>Type<select value={extra.type} onChange={(event) => setExtra({ ...extra, type: event.target.value as 'L' | 'P' })}><option value="L">Lecture</option><option value="P">Practical</option></select></label><label>Teacher<input value={extra.teacherName} onChange={(event) => setExtra({ ...extra, teacherName: event.target.value })} /></label><label>Room<input value={extra.classroom} onChange={(event) => setExtra({ ...extra, classroom: event.target.value })} /></label><label>Reason<input value={extra.reason} onChange={(event) => setExtra({ ...extra, reason: event.target.value })} /></label></div><button className="primary-button" type="submit">Save extra class</button></form>}</section>
      </div>
    </main>
  );
}
