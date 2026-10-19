const { AttendanceRecord } = require('../models/attendance-record.model');
const { CalendarException } = require('../models/calendar-exception.model');
const { DutyLeaveApplication } = require('../models/duty-leave.model');
const { Subject } = require('../models/subject.model');
const { TimetableEntry } = require('../models/timetable-entry.model');
const { ClassNote } = require('../models/class-note.model');

const models = {
  subjects: Subject,
  timetableEntries: TimetableEntry,
  attendanceRecords: AttendanceRecord,
  calendarExceptions: CalendarException,
  dutyLeaveApplications: DutyLeaveApplication,
  classNotes: ClassNote,
};

function createQueryConsoleRepository(modelMap = models) {
  return {
    execute(collection, ownerId, semesterId, query) {
      return modelMap[collection]
        .find({ ...query.filter, ownerId, semesterId })
        .select(query.projection.join(' '))
        .sort(query.sort)
        .limit(query.limit)
        .maxTimeMS(1500)
        .lean();
    },
  };
}

module.exports = { createQueryConsoleRepository };
