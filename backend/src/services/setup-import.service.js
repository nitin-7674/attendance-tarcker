const ExcelJS = require('exceljs');
const { Readable } = require('node:stream');
const { ApiError } = require('../utils/api-error');

const SUBJECT_HEADERS = ['Name', 'Code', 'Target Percentage'];
const TIMETABLE_HEADERS = [
  'Subject',
  'Day',
  'Start Time',
  'End Time',
  'Type',
  'Teacher',
  'Room',
  'Effective From',
  'Effective To',
];
const DAYS = new Map(
  ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
    (day, index) => [day.toLowerCase(), index + 1],
  ),
);

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

function normalizeClock(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 1) {
    return Math.round(value * 1440);
  }
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.getUTCHours() * 60 + value.getUTCMinutes();
  }
  const match = text(value).match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

function normalizeDay(value) {
  const raw = text(value).toLowerCase();
  if (DAYS.has(raw)) return DAYS.get(raw);
  const number = Number(raw);
  return Number.isInteger(number) && number >= 1 && number <= 7 ? number : null;
}

function normalizeType(value) {
  const raw = text(value).toUpperCase();
  if (raw === 'L' || raw === 'LECTURE') return 'L';
  if (raw === 'P' || raw === 'PRACTICAL') return 'P';
  return null;
}

async function readRows(file, headers) {
  if (!file) throw new ApiError(400, 'FILE_REQUIRED', 'Choose a CSV or XLSX file.');
  const workbook = new ExcelJS.Workbook();
  if (file.originalname.toLowerCase().endsWith('.csv')) {
    await workbook.csv.read(Readable.from([file.buffer]));
  } else {
    await workbook.xlsx.load(file.buffer);
  }
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new ApiError(400, 'EMPTY_SPREADSHEET', 'The uploaded file has no worksheet.');

  const actualHeaders = headers.map((_header, index) => text(worksheet.getRow(1).getCell(index + 1).value));
  const extraHeader = text(worksheet.getRow(1).getCell(headers.length + 1).value);
  if (actualHeaders.some((header, index) => header !== headers[index]) || extraHeader) {
    throw new ApiError(
      422,
      'INVALID_IMPORT_HEADERS',
      `Headers must be exactly: ${headers.join(', ')}.`,
    );
  }

  const rows = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = headers.map((_header, index) => row.getCell(index + 1).value);
    if (!values.every((value) => text(value) === '')) rows.push({ rowNumber, values });
  });
  if (rows.length === 0) throw new ApiError(422, 'EMPTY_IMPORT', 'Add at least one data row to the file.');
  if (rows.length > 1000) throw new ApiError(422, 'IMPORT_TOO_LARGE', 'Import at most 1,000 rows at a time.');
  return rows;
}

function rowError(rowNumber, messages) {
  return { rowNumber, messages };
}

function throwRowErrors(errors) {
  if (errors.length) {
    throw new ApiError(
      422,
      'IMPORT_VALIDATION_FAILED',
      `${errors.length} row${errors.length === 1 ? '' : 's'} need correction. Nothing was imported.`,
      { rows: errors },
    );
  }
}

function createTemplateWorkbook(kind, headers) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Student Attendance Tracker';
  const sheet = workbook.addWorksheet(kind === 'subjects' ? 'Subjects' : 'Timetable');
  sheet.addRow(headers);
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF087F78' } };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.columns = headers.map((header) => ({ width: Math.max(16, header.length + 4) }));

  const guide = workbook.addWorksheet('Format Guide');
  if (kind === 'subjects') {
    guide.addRows([
      ['Column', 'Required', 'Accepted format'],
      ['Name', 'Yes', 'Subject name, up to 100 characters'],
      ['Code', 'No', 'Unique code, up to 30 characters'],
      ['Target Percentage', 'No', 'Number from 1 to 100; blank defaults to 75'],
    ]);
  } else {
    guide.addRows([
      ['Column', 'Required', 'Accepted format'],
      ['Subject', 'Yes', 'Existing subject code or exact subject name'],
      ['Day', 'Yes', 'Monday-Sunday or 1-7 (Monday is 1)'],
      ['Start Time / End Time', 'Yes', '24-hour HH:MM'],
      ['Type', 'Yes', 'L, Lecture, P, or Practical'],
      ['Teacher / Room', 'No', 'Text, up to 100 characters'],
      ['Effective From', 'Yes', 'YYYY-MM-DD'],
      ['Effective To', 'No', 'YYYY-MM-DD and after Effective From'],
    ]);
  }
  guide.getRow(1).font = { bold: true };
  guide.columns = [{ width: 26 }, { width: 14 }, { width: 58 }];
  return workbook;
}

function createSetupImportService({ academicRepositories, academicService }) {
  async function requireSemester(ownerId, semesterId) {
    const semester = await academicRepositories.semesters.findById(ownerId, semesterId);
    if (!semester) throw new ApiError(404, 'SEMESTER_NOT_FOUND', 'Semester not found.');
    return semester;
  }

  return {
    async template(kind, type) {
      const headers = kind === 'subjects' ? SUBJECT_HEADERS : TIMETABLE_HEADERS;
      if (type === 'csv') {
        return {
          buffer: Buffer.from(`${headers.join(',')}\r\n`),
          contentType: 'text/csv',
          extension: 'csv',
        };
      }
      const workbook = createTemplateWorkbook(kind, headers);
      return {
        buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extension: 'xlsx',
      };
    },

    async importSubjects(ownerId, semesterId, file) {
      await requireSemester(ownerId, semesterId);
      const [rows, existing] = await Promise.all([
        readRows(file, SUBJECT_HEADERS),
        academicRepositories.subjects.list(ownerId, semesterId, true),
      ]);
      const existingCodes = new Set(
        existing.filter((subject) => subject.active && subject.code).map((subject) => subject.code.toLowerCase()),
      );
      const existingNames = new Set(
        existing.filter((subject) => subject.active).map((subject) => subject.name.toLowerCase()),
      );
      const seenCodes = new Set();
      const seenNames = new Set();
      const valid = [];
      const errors = [];

      for (const row of rows) {
        const [nameValue, codeValue, targetValue] = row.values;
        const name = text(nameValue);
        const code = text(codeValue);
        const targetPercentage = text(targetValue) === '' ? 75 : Number(targetValue);
        const messages = [];
        if (!name || name.length > 100) messages.push('Name is required and must be 100 characters or fewer.');
        if (code.length > 30) messages.push('Code must be 30 characters or fewer.');
        if (!Number.isFinite(targetPercentage) || targetPercentage < 1 || targetPercentage > 100) {
          messages.push('Target Percentage must be a number from 1 to 100.');
        }
        const nameKey = name.toLowerCase();
        const codeKey = code.toLowerCase();
        if (name && (existingNames.has(nameKey) || seenNames.has(nameKey))) {
          messages.push('An active subject with this name already exists.');
        }
        if (code && (existingCodes.has(codeKey) || seenCodes.has(codeKey))) {
          messages.push('An active subject with this code already exists.');
        }
        if (messages.length) errors.push(rowError(row.rowNumber, messages));
        else {
          valid.push({ name, code, targetPercentage });
          seenNames.add(nameKey);
          if (code) seenCodes.add(codeKey);
        }
      }
      throwRowErrors(errors);

      const subjects = [];
      for (const input of valid) {
        subjects.push(await academicService.createSubject(ownerId, semesterId, input));
      }
      return { imported: subjects.length, subjects };
    },

    async importTimetable(ownerId, semesterId, file) {
      const semester = await requireSemester(ownerId, semesterId);
      const [rows, subjects, existingEntries] = await Promise.all([
        readRows(file, TIMETABLE_HEADERS),
        academicRepositories.subjects.list(ownerId, semesterId, false),
        academicRepositories.timetable.list(ownerId, semesterId, false),
      ]);
      const subjectLookup = new Map();
      const ambiguous = new Set();
      for (const subject of subjects) {
        for (const key of [subject.code, subject.name].filter(Boolean).map((value) => value.toLowerCase())) {
          if (subjectLookup.has(key) && String(subjectLookup.get(key)._id) !== String(subject._id)) ambiguous.add(key);
          else subjectLookup.set(key, subject);
        }
      }
      const semesterStart = new Date(semester.startDate).toISOString().slice(0, 10);
      const semesterEnd = new Date(semester.endDate).toISOString().slice(0, 10);
      const existingKeys = new Set(
        existingEntries.map((entry) =>
          [entry.subjectId, entry.dayOfWeek, entry.startMinute, entry.endMinute, new Date(entry.effectiveFrom).toISOString().slice(0, 10)].join('|'),
        ),
      );
      const seen = new Set();
      const valid = [];
      const errors = [];

      for (const row of rows) {
        const [subjectValue, dayValue, startValue, endValue, typeValue, teacherValue, roomValue, fromValue, toValue] = row.values;
        const subjectKey = text(subjectValue).toLowerCase();
        const subject = subjectLookup.get(subjectKey);
        const dayOfWeek = normalizeDay(dayValue);
        const startMinute = normalizeClock(startValue);
        const endMinute = normalizeClock(endValue);
        const type = normalizeType(typeValue);
        const teacherName = text(teacherValue);
        const classroom = text(roomValue);
        const effectiveFrom = normalizeDate(fromValue);
        const effectiveTo = text(toValue) === '' ? null : normalizeDate(toValue);
        const messages = [];
        if (!subjectKey || !subject || ambiguous.has(subjectKey)) {
          messages.push(ambiguous.has(subjectKey) ? 'Subject name is ambiguous; use a unique subject code.' : 'Subject must match an active subject code or exact name.');
        }
        if (!dayOfWeek) messages.push('Day must be Monday-Sunday or 1-7.');
        if (startMinute === null) messages.push('Start Time must use 24-hour HH:MM.');
        if (endMinute === null) messages.push('End Time must use 24-hour HH:MM.');
        if (startMinute !== null && endMinute !== null && endMinute <= startMinute) {
          messages.push('End Time must be after Start Time.');
        }
        if (!type) messages.push('Type must be L, Lecture, P, or Practical.');
        if (teacherName.length > 100) messages.push('Teacher must be 100 characters or fewer.');
        if (classroom.length > 100) messages.push('Room must be 100 characters or fewer.');
        if (!effectiveFrom) messages.push('Effective From must use YYYY-MM-DD.');
        if (text(toValue) !== '' && !effectiveTo) messages.push('Effective To must use YYYY-MM-DD.');
        if (effectiveFrom && (effectiveFrom < semesterStart || effectiveFrom > semesterEnd)) {
          messages.push('Effective From must fall within the semester dates.');
        }
        if (effectiveTo && (effectiveTo < semesterStart || effectiveTo > semesterEnd)) {
          messages.push('Effective To must fall within the semester dates.');
        }
        if (effectiveFrom && effectiveTo && effectiveTo <= effectiveFrom) {
          messages.push('Effective To must be after Effective From.');
        }
        if (subject && dayOfWeek && startMinute !== null && endMinute !== null && effectiveFrom) {
          const duplicateKey = [subject._id || subject.id, dayOfWeek, startMinute, endMinute, effectiveFrom].join('|');
          if (existingKeys.has(duplicateKey) || seen.has(duplicateKey)) {
            messages.push('This recurring period already exists.');
          }
          seen.add(duplicateKey);
        }
        if (messages.length) errors.push(rowError(row.rowNumber, messages));
        else {
          valid.push({
            subjectId: String(subject._id || subject.id),
            dayOfWeek,
            startMinute,
            endMinute,
            type,
            teacherName,
            classroom,
            effectiveFrom,
            effectiveTo,
          });
        }
      }
      throwRowErrors(errors);

      const entries = [];
      for (const input of valid) {
        entries.push(await academicService.createTimetableEntry(ownerId, semesterId, input));
      }
      return { imported: entries.length, entries };
    },
  };
}

module.exports = {
  SUBJECT_HEADERS,
  TIMETABLE_HEADERS,
  createSetupImportService,
  normalizeClock,
  normalizeDate,
  normalizeDay,
  normalizeType,
  readRows,
};
