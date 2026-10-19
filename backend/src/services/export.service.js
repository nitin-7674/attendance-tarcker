const ExcelJS = require('exceljs');

const headers = ['Date', 'Time', 'Type', 'Attendance', 'Name', 'Block Reason'];
const pad = (value) => String(value).padStart(2, '0');
const time = (minute) => `${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`;
const safeCell = (value) => (/^[=+\-@]/.test(String(value)) ? `'${value}` : String(value));
const csvCell = (value) => `"${safeCell(value).replaceAll('"', '""')}"`;

function createExportService({ attendanceRepository, academicRepositories }) {
  return {
    async attendanceCsv(ownerId, semesterId) {
      const [semester, records, subjects] = await Promise.all([
        academicRepositories.semesters.findById(ownerId, semesterId),
        attendanceRepository.listAttendance(ownerId, semesterId),
        academicRepositories.subjects.list(ownerId, semesterId, true),
      ]);
      if (!semester) return null;
      const subjectNames = new Map(subjects.map((subject) => [String(subject._id || subject.id), subject.name]));
      const rows = records.map((record) => [
        new Date(record.classDate).toISOString().slice(0, 10),
        `${time(record.startMinute)}-${time(record.endMinute)}`,
        record.type,
        record.status,
        record.teacherSnapshot || '',
        record.blockReason || '',
        subjectNames.get(String(record.subjectId)) || '',
      ]);
      const outputHeaders = [...headers, 'Subject'];
      return `${outputHeaders.map(csvCell).join(',')}\r\n${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
    },

    async template(type) {
      if (type === 'csv') {
        return { buffer: Buffer.from(`${headers.join(',')}\r\n`), contentType: 'text/csv', extension: 'csv' };
      }
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Attendance Import');
      sheet.addRow(headers);
      sheet.getRow(1).font = { bold: true };
      sheet.columns = [14, 18, 12, 16, 24, 30].map((width) => ({ width }));
      const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
      return {
        buffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extension: 'xlsx',
      };
    },
  };
}

module.exports = { createExportService, safeCell };
