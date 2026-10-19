import { useRef, useState, type FormEvent } from 'react';
import { ApiError } from '../services/api';
import * as academicService from '../services/academic.service';

interface ImportRowError {
  rowNumber: number;
  messages: string[];
}

interface SetupImportPanelProps {
  semesterId: string;
  kind: 'subjects' | 'timetable';
  format: string;
  onImported(): Promise<void> | void;
}

function getRowErrors(error: unknown): ImportRowError[] {
  if (!(error instanceof ApiError) || !error.details || typeof error.details !== 'object') return [];
  const rows = (error.details as { rows?: unknown }).rows;
  if (!Array.isArray(rows)) return [];
  return rows.filter((row): row is ImportRowError => {
    if (!row || typeof row !== 'object') return false;
    const candidate = row as Partial<ImportRowError>;
    return typeof candidate.rowNumber === 'number' && Array.isArray(candidate.messages);
  });
}

export function SetupImportPanel({ semesterId, kind, format, onImported }: SetupImportPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [rowErrors, setRowErrors] = useState<ImportRowError[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    setWorking(true);
    setMessage('');
    setError('');
    setRowErrors([]);
    try {
      const result = await academicService.importSetupFile(semesterId, kind, file);
      setMessage(`${result.imported} ${kind === 'subjects' ? 'subject' : 'period'}${result.imported === 1 ? '' : 's'} imported.`);
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
      await onImported();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Unable to import the file.');
      setRowErrors(getRowErrors(importError));
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="content-card setup-import-card">
      <div className="section-heading">
        <div>
          <span className="card-label">Batch upload</span>
          <h2>Import {kind}</h2>
        </div>
        <div className="download-links compact-downloads">
          <a href={`/api/v1/setup-imports/${kind}/templates/csv`}>CSV template</a>
          <a href={`/api/v1/setup-imports/${kind}/templates/xlsx`}>Excel template</a>
        </div>
      </div>
      <p className="format-help"><strong>Required columns:</strong> {format}</p>
      <form className="import-form" onSubmit={submit}>
        <label>Completed CSV or Excel file
          <input
            accept=".csv,.xlsx"
            ref={fileInput}
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            required
          />
        </label>
        <button className="primary-button" disabled={working || !file} type="submit">
          {working ? 'Validating and importing…' : `Import ${kind}`}
        </button>
      </form>
      {message ? <div className="success-banner" role="status">{message}</div> : null}
      {error ? <div className="form-error" role="alert">{error}</div> : null}
      {rowErrors.length ? (
        <div className="import-error-list" aria-label="Rows that need correction">
          {rowErrors.slice(0, 20).map((row) => (
            <p key={row.rowNumber}><strong>Row {row.rowNumber}:</strong> {row.messages.join(' ')}</p>
          ))}
          {rowErrors.length > 20 ? <p>Fix the first 20 rows shown, then upload again to see any remaining issues.</p> : null}
        </div>
      ) : null}
    </section>
  );
}
