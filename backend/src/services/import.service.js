const ExcelJS = require('exceljs');
const { Readable } = require('node:stream');
const { ApiError } = require('../utils/api-error');

const HEADERS = ['Date', 'Time', 'Type', 'Attendance', 'Name', 'Block Reason'];
const STATUS_MAP = new Map([
  ['PRESENT', 'PRESENT'],
  ['P', 'PRESENT'],
  ['ABSENT', 'ABSENT'],
  ['A', 'ABSENT'],
]);

function text(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && 'text' in value) return String(value.text).trim();
  return String(value).trim();
}

function normalizeDate(value) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const raw = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== raw ? null : raw;
}

function normalizeTime(value) {
  const match = text(value).match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const [, startHour, startMinute, endHour, endMinute] = match.map(Number);
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  if (startHour > 23 || endHour > 24 || startMinute > 59 || endMinute > 59 || end <= start || end > 1440) {
    return null;
  }
  return { startMinute: start, endMinute: end };
}

async function readRows(file) {
  const workbook = new ExcelJS.Workbook();
  if (file.originalname.toLowerCase().endsWith('.csv')) {
    await workbook.csv.read(Readable.from([file.buffer]));
  } else {
    await workbook.xlsx.load(file.buffer);
  }
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new ApiError(400, 'EMPTY_SPREADSHEET', 'The uploaded file has no worksheet.');

  const actualHeaders = HEADERS.map((_header, index) => text(worksheet.getRow(1).getCell(index + 1).value));
  if (actualHeaders.some((header, index) => header !== HEADERS[index])) {
    throw new ApiError(422, 'INVALID_IMPORT_HEADERS', `Headers must be exactly: ${HEADERS.join(', ')}.`);
  }

  const rows = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = HEADERS.map((_header, index) => row.getCell(index + 1).value);
    if (values.every((value) => text(value) === '')) return;
    rows.push({ rowNumber, values });
  });
  return rows;
}

function createImportService({ repository, attendanceRepository, attendanceService, academicRepositories }) {
  return {
    async preview(ownerId, semesterId, subjectId, file) {
      if (!file) throw new ApiError(400, 'FILE_REQUIRED', 'Choose a CSV or XLSX file.');
      const semester = await academicRepositories.semesters.findById(ownerId, semesterId);
      const subject = await academicRepositories.subjects.findById(ownerId, subjectId);
      if (!semester) throw new ApiError(404, 'SEMESTER_NOT_FOUND', 'Semester not found.');
      if (!subject || String(subject.semesterId) !== String(semesterId)) {
        throw new ApiError(404, 'SUBJECT_NOT_FOUND', 'Subject not found.');
      }

      const rows = await readRows(file);
      const previewRows = [];
      const validRows = [];
      const seen = new Set();

      for (const row of rows) {
        const [dateValue, timeValue, typeValue, attendanceValue, nameValue, blockReasonValue] = row.values;
        const date = normalizeDate(dateValue);
        const time = normalizeTime(timeValue);
        const status = STATUS_MAP.get(text(attendanceValue).toUpperCase());
        const messages = [];
        let outcome = 'VALID';
        if (!date) messages.push('Date must use YYYY-MM-DD.');
        if (!time) messages.push('Time must use HH:MM-HH:MM.');
        if (!status) messages.push('Attendance must be PRESENT, ABSENT, P, or A.');

        let occurrence;
        if (date && time && status) {
          try {
            const day = await attendanceService.getDailySchedule(ownerId, semesterId, date);
            const matches = day.occurrences.filter(
              (item) =>
                item.subjectId === String(subjectId) &&
                item.startMinute === time.startMinute &&
                item.endMinute === time.endMinute,
            );
            if (matches.length === 0) messages.push('No matching timetable or extra-class period.');
            if (matches.length > 1) messages.push('More than one period matches this subject, date, and time.');
            if (matches.length === 1) {
              occurrence = matches[0];
              const duplicateKey = occurrence.occurrenceKey;
              if (seen.has(duplicateKey)) messages.push('Duplicate row for the same class occurrence.');
              seen.add(duplicateKey);
              if (occurrence.status !== 'PENDING') {
                outcome = 'SKIPPED';
                messages.push(
                  occurrence.status === status
                    ? 'Attendance is already recorded with this status.'
                    : `Conflict: existing status is ${occurrence.status}; it will not be overwritten.`,
                );
              }
              const suppliedType = text(typeValue).toUpperCase();
              if (suppliedType && suppliedType !== occurrence.type) {
                messages.push(`Warning: supplied type ${suppliedType} differs from timetable ${occurrence.type}.`);
              }
              const suppliedTeacher = text(nameValue);
              if (suppliedTeacher && suppliedTeacher !== occurrence.teacherName) {
                messages.push('Warning: supplied teacher differs from the timetable.');
              }
            }
          } catch (error) {
            messages.push(error instanceof Error ? error.message : 'Unable to match this row.');
          }
        }

        if (messages.some((message) => !message.startsWith('Warning:')) && outcome !== 'SKIPPED') {
          outcome = 'REJECTED';
        }
        const preview = {
          rowNumber: row.rowNumber,
          date: date || text(dateValue),
          time: text(timeValue),
          status: status || text(attendanceValue),
          type: text(typeValue) || occurrence?.type || '',
          teacherName: text(nameValue) || occurrence?.teacherName || '',
          blockReason: text(blockReasonValue),
          outcome,
          messages,
        };
        previewRows.push(preview);
        if (outcome === 'VALID' && occurrence && status) {
          validRows.push({ occurrence, status, blockReason: text(blockReasonValue) });
        }
      }

      const rowCounts = {
        total: previewRows.length,
        valid: validRows.length,
        skipped: previewRows.filter((row) => row.outcome === 'SKIPPED').length,
        rejected: previewRows.filter((row) => row.outcome === 'REJECTED').length,
        committed: 0,
      };
      const job = await repository.create({
        ownerId,
        semesterId,
        subjectId,
        fileType: file.originalname.toLowerCase().endsWith('.csv') ? 'CSV' : 'XLSX',
        status: 'PREVIEWED',
        rowCounts,
        previewRows,
        validRows,
      });
      return { id: String(job._id || job.id), status: 'PREVIEWED', rowCounts, rows: previewRows };
    },

    async commit(ownerId, importId) {
      const job = await repository.findById(ownerId, importId);
      if (!job) throw new ApiError(404, 'IMPORT_NOT_FOUND', 'Import preview not found.');
      if (job.status === 'COMMITTED') {
        return { importId, ...job.rowCounts, status: 'COMMITTED' };
      }
      if (job.status !== 'PREVIEWED') {
        throw new ApiError(409, 'IMPORT_NOT_COMMITTABLE', 'This import cannot be committed.');
      }

      let committed = 0;
      let skipped = job.rowCounts.skipped;
      for (const row of job.validRows) {
        const created = await attendanceRepository.insertAttendanceIfPending(
          ownerId,
          job.semesterId,
          row.occurrence,
          row.status,
          row.blockReason,
        );
        if (created) committed += 1;
        else skipped += 1;
      }
      const rowCounts = { ...job.rowCounts, committed, skipped };
      await repository.update(ownerId, importId, { status: 'COMMITTED', rowCounts, validRows: [] });
      return { importId, status: 'COMMITTED', ...rowCounts };
    },

    async get(ownerId, importId) {
      const job = await repository.findById(ownerId, importId);
      if (!job) throw new ApiError(404, 'IMPORT_NOT_FOUND', 'Import not found.');
      return { id: String(job._id), status: job.status, rowCounts: job.rowCounts, rows: job.previewRows };
    },
  };
}

module.exports = { HEADERS, createImportService, normalizeDate, normalizeTime, readRows };
