const { ArchiveCatalog } = require('../models/archive-catalog.model');
const { AttendanceRecord } = require('../models/attendance-record.model');
const { CalendarException } = require('../models/calendar-exception.model');
const { DutyLeaveApplication, DutyLeaveCredit } = require('../models/duty-leave.model');
const { Subject } = require('../models/subject.model');
const { TimetableEntry } = require('../models/timetable-entry.model');
const { ClassNote } = require('../models/class-note.model');

function createArchiveRepository(models = {}) {
  const collections = {
    subjects: models.Subject || Subject,
    timetable: models.TimetableEntry || TimetableEntry,
    attendance: models.AttendanceRecord || AttendanceRecord,
    exceptions: models.CalendarException || CalendarException,
    dutyLeave: models.DutyLeaveApplication || DutyLeaveApplication,
    dutyLeaveCredits: models.DutyLeaveCredit || DutyLeaveCredit,
    classNotes: models.ClassNote || ClassNote,
  };
  const catalogModel = models.ArchiveCatalog || ArchiveCatalog;

  return {
    async snapshot(ownerId, semesterId) {
      const entries = await Promise.all(
        Object.entries(collections).map(async ([name, model]) => [
          name,
          await model.find({ ownerId, semesterId }).sort({ createdAt: 1 }).lean(),
        ]),
      );
      return Object.fromEntries(entries);
    },
    upsertCatalog(ownerId, semesterId, recordCounts) {
      return catalogModel
        .findOneAndUpdate(
          { ownerId, semesterId },
          {
            $set: { archiveStatus: 'DOWNLOAD_ONLY', recordCounts, preparedAt: new Date(), version: 1 },
            $setOnInsert: { ownerId, semesterId },
          },
          { new: true, upsert: true, runValidators: true },
        )
        .lean();
    },
    findCatalog(ownerId, semesterId) {
      return catalogModel.findOne({ ownerId, semesterId }).lean();
    },
  };
}

module.exports = { createArchiveRepository };
