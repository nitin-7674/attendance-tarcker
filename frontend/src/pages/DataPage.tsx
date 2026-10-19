import { useEffect, useState, type FormEvent } from 'react';
import { useAcademic } from '../context/useAcademic';
import * as academicService from '../services/academic.service';
import * as importService from '../services/import.service';
import type { Subject } from '../types/academic';

export function DataPage() {
  const { selectedSemester } = useAcademic();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<importService.ImportPreview | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!selectedSemester) return;
    academicService.listSubjects(selectedSemester.id).then((records) => {
      setSubjects(records);
      setSubjectId((current) => current || records[0]?.id || '');
    }).catch((loadError) => setError(loadError.message));
    setPreview(null);
  }, [selectedSemester]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSemester || !file || !subjectId) return;
    setWorking(true); setError(''); setMessage('');
    try { setPreview(await importService.previewImport(selectedSemester.id, subjectId, file)); }
    catch (previewError) { setError(previewError instanceof Error ? previewError.message : 'Unable to preview import.'); }
    finally { setWorking(false); }
  }

  async function commit() {
    if (!preview) return;
    setWorking(true); setError(''); setMessage('');
    try {
      const result = await importService.commitImport(preview.id);
      setMessage(`${result.committed} row${result.committed === 1 ? '' : 's'} committed; ${result.skipped} skipped; ${result.rejected} rejected.`);
      setPreview(null);
    } catch (commitError) { setError(commitError instanceof Error ? commitError.message : 'Unable to commit import.'); }
    finally { setWorking(false); }
  }

  if (!selectedSemester) return <main className="page-container"><section className="empty-state"><h2>Select or create a semester first</h2></section></main>;

  return (
    <main className="page-container">
      <div className="page-heading"><span className="eyebrow">{selectedSemester.name}</span><h1>Import and export</h1><p>Imports are previewed and validated before any attendance is written.</p></div>
      {message ? <div className="success-banner">{message}</div> : null}{error ? <div className="form-error page-error" role="alert">{error}</div> : null}
      <div className="two-column-grid">
        <section className="content-card">
          <h2>Attendance import</h2>
          <div className="download-links"><a href="/api/v1/imports/templates/csv">CSV template</a><a href="/api/v1/imports/templates/xlsx">Excel template</a></div>
          {subjects.length === 0 ? <p className="muted">Add a subject before importing attendance.</p> : <form onSubmit={submit}><label>Subject<select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label><label>CSV or XLSX file<input accept=".csv,.xlsx" type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} required /></label><button className="primary-button" disabled={working} type="submit">{working ? 'Checking file…' : 'Preview import'}</button></form>}
        </section>
        <section className="content-card">
          <h2>Active-semester export</h2>
          <p className="muted">Download explicit present and absent records. Pending periods are intentionally not stored.</p>
          <a className="primary-link" href={`/api/v1/semesters/${selectedSemester.id}/exports/attendance.csv`}>Download attendance CSV</a>
        </section>
      </div>
      {preview ? <section className="content-card import-preview"><div className="section-heading"><div><span className="card-label">Preview only</span><h2>{preview.rowCounts.valid} valid of {preview.rowCounts.total} rows</h2></div><button className="primary-button" disabled={working || preview.rowCounts.valid === 0} onClick={() => void commit()} type="button">Confirm and commit</button></div><div className="preview-table-wrap"><table><thead><tr><th>Row</th><th>Date</th><th>Time</th><th>Status</th><th>Outcome</th><th>Messages</th></tr></thead><tbody>{preview.rows.map((row) => <tr key={row.rowNumber}><td>{row.rowNumber}</td><td>{row.date}</td><td>{row.time}</td><td>{row.status}</td><td><span className={`import-${row.outcome.toLowerCase()}`}>{row.outcome}</span></td><td>{row.messages.join(' ') || 'Ready to commit.'}</td></tr>)}</tbody></table></div></section> : null}
    </main>
  );
}
