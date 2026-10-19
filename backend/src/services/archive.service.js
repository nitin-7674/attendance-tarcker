const crypto = require('node:crypto');
const ExcelJS = require('exceljs');
const { ApiError } = require('../utils/api-error');

function exportValue(value) {
  if (value instanceof Date) return value.toISOString();
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if (typeof value.toHexString === 'function') return value.toHexString();
    return JSON.stringify(value);
  }
  return value;
}

function addSheet(workbook, name, rows) {
  const sheet = workbook.addWorksheet(name);
  if (rows.length === 0) {
    sheet.addRow(['No records']);
    return;
  }
  const omitted = new Set(['ownerId', '__v']);
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))].filter(
    (key) => !omitted.has(key),
  );
  sheet.addRow(headers);
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) {
    sheet.addRow(headers.map((header) => exportValue(row[header])));
  }
  sheet.columns = headers.map((header) => ({
    key: header,
    width: Math.min(40, Math.max(14, header.length + 2)),
  }));
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

function createArchiveService({ repository, academicRepositories }) {
  async function requireSemester(ownerId, semesterId) {
    const semester = await academicRepositories.semesters.findById(ownerId, semesterId);
    if (!semester) throw new ApiError(404, 'SEMESTER_NOT_FOUND', 'Semester not found.');
    return semester;
  }

  return {
    async prepare(ownerId, semesterId) {
      const semester = await requireSemester(ownerId, semesterId);
      const snapshot = await repository.snapshot(ownerId, semesterId);
      const recordCounts = Object.fromEntries(
        Object.entries(snapshot).map(([name, rows]) => [name, rows.length]),
      );
      const catalog = await repository.upsertCatalog(ownerId, semesterId, recordCounts);
      if (semester.status !== 'COMPLETED') {
        await academicRepositories.semesters.update(ownerId, semesterId, { status: 'COMPLETED' });
      }
      return {
        id: String(catalog._id || catalog.id),
        semesterId,
        archiveStatus: 'DOWNLOAD_ONLY',
        recordCounts,
        cloudStorage: false,
        sourceDataRetained: true,
      };
    },

    async download(ownerId, semesterId) {
      const [semester, catalog] = await Promise.all([
        requireSemester(ownerId, semesterId),
        repository.findCatalog(ownerId, semesterId),
      ]);
      if (!catalog) {
        throw new ApiError(409, 'ARCHIVE_NOT_PREPARED', 'Prepare the semester download before requesting it.');
      }
      const snapshot = await repository.snapshot(ownerId, semesterId);
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Student Attendance Tracker';
      workbook.title = `${semester.name} archive`;
      for (const [name, rows] of Object.entries(snapshot)) {
        addSheet(workbook, name.slice(0, 31), rows);
      }
      const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
      return {
        buffer,
        checksum: crypto.createHash('sha256').update(buffer).digest('hex'),
        filename: `${String(semester.name).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'semester'}-archive.xlsx`,
      };
    },
  };
}

module.exports = { addSheet, createArchiveService };
