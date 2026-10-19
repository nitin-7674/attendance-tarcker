import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAcademic } from '../context/useAcademic';
import * as queryService from '../services/query-console.service';

const fallbackCollections: { value: queryService.QueryCollection; label: string }[] = [
  { value: 'subjects', label: 'Subjects' },
  { value: 'timetableEntries', label: 'Timetable entries' },
  { value: 'attendanceRecords', label: 'Attendance records' },
  { value: 'calendarExceptions', label: 'Calendar exceptions' },
  { value: 'dutyLeaveApplications', label: 'Duty Leave applications' },
  { value: 'classNotes', label: 'Class notes' },
];

const initialFilter = { status: 'ABSENT' };
const initialProjection = ['subjectId', 'status', 'classDate', 'startMinute', 'blockReason'];

export function QueryConsolePage() {
  const { selectedSemester } = useAcademic();
  const [schema, setSchema] = useState<queryService.QueryConsoleSchema | null>(null);
  const [collection, setCollection] = useState<queryService.QueryCollection>('attendanceRecords');
  const [filter, setFilter] = useState(JSON.stringify(initialFilter, null, 2));
  const [projection, setProjection] = useState<string[]>(initialProjection);
  const [sortField, setSortField] = useState('classDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [limit, setLimit] = useState(25);
  const [result, setResult] = useState<{ count: number; rows: Record<string, unknown>[] } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    queryService.getQuerySchema().then(setSchema).catch((schemaError) => {
      setError(schemaError instanceof Error ? schemaError.message : 'Unable to load the query reference.');
    });
  }, []);

  const definition = useMemo(
    () => schema?.collections.find((item) => item.value === collection) || null,
    [collection, schema],
  );
  const resultColumns = useMemo(
    () => [...new Set(result?.rows.flatMap((row) => Object.keys(row)) || [])],
    [result],
  );

  function applyExample(example: queryService.QueryExample) {
    setFilter(JSON.stringify(example.filter, null, 2));
    setProjection(example.projection);
    const [field, direction] = Object.entries(example.sort)[0] || ['', 'asc'];
    setSortField(field);
    setSortDirection(direction);
    setResult(null);
    setError('');
  }

  function selectCollection(value: queryService.QueryCollection) {
    setCollection(value);
    const nextDefinition = schema?.collections.find((item) => item.value === value);
    if (nextDefinition?.examples[0]) applyExample(nextDefinition.examples[0]);
    else {
      setFilter('{}');
      setProjection([]);
      setSortField('');
    }
  }

  function toggleProjection(field: string) {
    setProjection((current) => current.includes(field)
      ? current.filter((item) => item !== field)
      : [...current, field]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSemester) return;
    setError('');
    setResult(null);
    if (projection.length === 0) {
      setError('Choose at least one output field.');
      return;
    }
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(filter) as Record<string, unknown>;
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
        setError('Filter JSON must be one object enclosed in { } braces.');
        return;
      }
    } catch (parseError) {
      const detail = parseError instanceof Error ? parseError.message : 'Invalid JSON.';
      setError(`Filter JSON is invalid: ${detail} Use double quotes around field names and text values.`);
      return;
    }
    try {
      const output = await queryService.executeQuery({
        semesterId: selectedSemester.id,
        collection,
        filter: parsed,
        projection,
        sort: sortField ? { [sortField]: sortDirection } : {},
        limit,
      });
      setResult(output);
    } catch (queryError) {
      setError(queryError instanceof Error ? queryError.message : 'Unable to execute query.');
    }
  }

  if (!selectedSemester) return <main className="page-container"><section className="empty-state"><h2>Select or create a semester first</h2></section></main>;

  const collectionOptions = schema?.collections || fallbackCollections;

  return (
    <main className="page-container">
      <div className="page-heading"><span className="eyebrow">Restricted read-only access</span><h1>Query console</h1><p>Build an approved query with a guided field list. The server automatically restricts every result to your account and selected semester.</p></div>
      {selectedSemester.status !== 'CURRENT' ? <div className="holiday-banner"><strong>Active semester only</strong><span>Select a current semester to use the console.</span></div> : null}

      <div className="query-reference-grid">
        <section className="content-card query-guide">
          <span className="card-label">How it works</span>
          <h2>Query structure</h2>
          <ol>
            <li><strong>Collection</strong> chooses the type of record.</li>
            <li><strong>Filter</strong> is a JSON object. Multiple fields are combined with AND.</li>
            <li><strong>Output fields</strong> control which properties are returned.</li>
            <li><strong>Sort and limit</strong> control result order and size.</li>
          </ol>
          <div className="query-safety-note"><strong>Automatically applied:</strong> <code>ownerId</code> and <code>semesterId</code>. Do not include them in the filter.</div>
          <h3>Supported operators</h3>
          <div className="operator-list">
            {schema?.operators.map((operator) => <code key={operator.value}>{operator.value} <span>{operator.meaning}</span></code>) || <span className="muted">Loading operators…</span>}
          </div>
          <p className="query-example-line">Course example: <code>{'"courseName": { "$contains": "math" }'}</code></p>
          <p className="query-example-line">Teacher example: <code>{'"teacherName": { "$contains": "rao" }'}</code></p>
          <p className="query-example-line">8 PM example: <code>{'"startTime": { "$gte": "20:00" }'}</code></p>
        </section>

        <section className="content-card field-reference">
          <span className="card-label">Selected collection</span>
          <h2>{definition?.label || 'Available fields'}</h2>
          <p>{definition?.description || 'Choose a collection to see its approved field names and value types.'}</p>
          {definition?.filterHelpers.length ? <>
            <h3>Student-friendly filter fields</h3>
            <div className="field-reference-table"><table><thead><tr><th>Use in filter</th><th>What to enter</th></tr></thead><tbody>{definition.filterHelpers.map((field) => <tr key={field.name}><td><code>{field.name}</code></td><td><strong>{field.type}</strong><br />{field.description}</td></tr>)}</tbody></table></div>
            <p className="query-id-note"><strong>No database ID needed:</strong> use <code>courseName</code> or <code>courseId</code>. Here, <code>courseId</code> means the familiar course code such as CSE101.</p>
          </> : null}
          {definition ? <>
            <h3>Output and advanced fields</h3>
            <div className="field-reference-table"><table><thead><tr><th>Field</th><th>Value type</th></tr></thead><tbody>{definition.fields.map((field) => <tr key={field.name}><td><code>{field.name}</code></td><td>{field.type}</td></tr>)}</tbody></table></div>
          </> : null}
        </section>
      </div>

      <div className="query-grid guided-query-grid">
        <section className="content-card">
          <form onSubmit={submit}>
            <label>1. Collection<select value={collection} onChange={(event) => selectCollection(event.target.value as queryService.QueryCollection)}>{collectionOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>

            {definition?.examples.length ? <div className="example-query-block"><span>Start with an example</span><div className="compact-actions">{definition.examples.map((example) => <button className="text-action" key={example.label} onClick={() => applyExample(example)} type="button">{example.label}</button>)}</div></div> : null}

            <label>2. Filter JSON<textarea aria-describedby="filter-help" value={filter} onChange={(event) => setFilter(event.target.value)} rows={9} spellCheck={false} /></label>
            <p className="field-help" id="filter-help">Use <code>{'{}'}</code> for all records. JSON requires double quotes. Times use 24-hour <code>HH:MM</code>, so 8 PM is <code>20:00</code>. Dates use ISO text such as <code>2026-10-18</code>.</p>

            <fieldset className="projection-picker">
              <legend>3. Output fields</legend>
              <div className="projection-actions"><button className="text-action" onClick={() => setProjection(definition?.fields.map((field) => field.name) || [])} type="button">Select all</button><span>{projection.length} selected</span></div>
              <div className="projection-options">{definition?.fields.map((field) => <label key={field.name}><input checked={projection.includes(field.name)} onChange={() => toggleProjection(field.name)} type="checkbox" /> <span>{field.name}</span></label>)}</div>
            </fieldset>

            <div className="field-grid query-sort-grid">
              <label>4. Sort by<select value={sortField} onChange={(event) => setSortField(event.target.value)}><option value="">No sorting</option>{definition?.fields.map((field) => <option key={field.name} value={field.name}>{field.name}</option>)}</select></label>
              <label>Direction<select disabled={!sortField} value={sortDirection} onChange={(event) => setSortDirection(event.target.value as 'asc' | 'desc')}><option value="asc">Ascending</option><option value="desc">Descending</option></select></label>
            </div>
            <label>5. Result limit<input type="number" min="1" max={schema?.maxLimit || 100} value={limit} onChange={(event) => setLimit(Number(event.target.value))} /><span className="field-help">Maximum {schema?.maxLimit || 100} rows.</span></label>
            {error ? <div className="form-error" role="alert">{error}</div> : null}
            <button className="primary-button" disabled={selectedSemester.status !== 'CURRENT' || !schema} type="submit">Run read-only query</button>
          </form>
        </section>

        <section className="content-card query-result">
          <div className="section-heading"><div><span className="card-label">Read-only result</span><h2>{result ? `${result.count} row${result.count === 1 ? '' : 's'}` : 'No query run yet'}</h2></div></div>
          {!result ? <div className="result-placeholder"><strong>Results will appear here</strong><span>Choose a collection, adjust the example, then run the query.</span></div> : result.rows.length === 0 ? <div className="result-placeholder"><strong>No matching records</strong><span>Try removing a filter condition or checking the expected value format.</span></div> : <>
            <div className="preview-table-wrap query-table"><table><thead><tr>{resultColumns.map((column) => <th key={column}>{formatColumn(column)}</th>)}</tr></thead><tbody>{result.rows.map((row, index) => <tr key={index}>{resultColumns.map((column) => <td key={column}>{formatCell(row[column], column)}</td>)}</tr>)}</tbody></table></div>
            <details className="raw-result"><summary>View raw JSON</summary><pre>{JSON.stringify(result.rows, null, 2)}</pre></details>
          </>}
        </section>
      </div>
    </main>
  );
}

function formatColumn(column: string) {
  const labels: Record<string, string> = {
    startMinute: 'Start time',
    endMinute: 'End time',
    teacherSnapshot: 'Teacher',
    classroomSnapshot: 'Classroom',
  };
  return labels[column] || column;
}

function formatCell(value: unknown, column: string) {
  if (value === null || value === undefined) return '—';
  if ((column === 'startMinute' || column === 'endMinute') && typeof value === 'number') {
    const hour = Math.floor(value / 60);
    const minute = value % 60;
    const suffix = hour >= 12 && hour < 24 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`;
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
