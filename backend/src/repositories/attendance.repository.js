const { AttendanceRecord } = require('../models/attendance-record.model');
const { CalendarException } = require('../models/calendar-exception.model');
const { TimetableEntry } = require('../models/timetable-entry.model');
const mongoose = require('mongoose');

const asObjectId = (value) =>
  value instanceof mongoose.Types.ObjectId ? value : new mongoose.Types.ObjectId(value);

function createAttendanceRepository(models = {}) {
  const attendanceModel = models.AttendanceRecord || AttendanceRecord;
  const exceptionModel = models.CalendarException || CalendarException;
  const timetableModel = models.TimetableEntry || TimetableEntry;

  return {
    listTimetableForDate(ownerId, semesterId, dayOfWeek, date) {
      return timetableModel
        .find({
          ownerId,
          semesterId,
          dayOfWeek,
          effectiveFrom: { $lte: date },
          $or: [{ effectiveTo: null }, { effectiveTo: { $gte: date } }],
        })
        .sort({ startMinute: 1, createdAt: 1 })
        .lean();
    },

    listExceptionsForDate(ownerId, semesterId, date) {
      return exceptionModel.find({ ownerId, semesterId, date }).sort({ startMinute: 1 }).lean();
    },

    createException(values) {
      return exceptionModel.create(values);
    },

    listAttendanceByKeys(ownerId, semesterId, occurrenceKeys) {
      return attendanceModel
        .find({ ownerId, semesterId, occurrenceKey: { $in: occurrenceKeys } })
        .lean();
    },

    upsertAttendance(ownerId, semesterId, occurrenceKey, values) {
      return attendanceModel
        .findOneAndUpdate(
          { ownerId, semesterId, occurrenceKey },
          { $set: values, $setOnInsert: { ownerId, semesterId, occurrenceKey } },
          { new: true, upsert: true, runValidators: true },
        )
        .lean();
    },

    async insertAbsentOnlyIfPending(ownerId, semesterId, occurrence) {
      const result = await attendanceModel.updateOne(
        { ownerId, semesterId, occurrenceKey: occurrence.occurrenceKey },
        {
          $setOnInsert: {
            ownerId,
            semesterId,
            occurrenceKey: occurrence.occurrenceKey,
            subjectId: occurrence.subjectId,
            status: 'ABSENT',
            classDate: occurrence.classDate,
            startMinute: occurrence.startMinute,
            endMinute: occurrence.endMinute,
            type: occurrence.type,
            teacherSnapshot: occurrence.teacherName,
            classroomSnapshot: occurrence.classroom,
            source: occurrence.source,
            lastChangedBy: 'OVERLAP',
          },
        },
        { upsert: true },
      );
      return result.upsertedCount === 1;
    },

    summarizeBySubject(ownerId, semesterId) {
      const scopedOwnerId = asObjectId(ownerId);
      const scopedSemesterId = asObjectId(semesterId);
      return attendanceModel.aggregate([
        { $match: { ownerId: scopedOwnerId, semesterId: scopedSemesterId } },
        {
          $group: {
            _id: '$subjectId',
            present: { $sum: { $cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0] } },
            absent: { $sum: { $cond: [{ $eq: ['$status', 'ABSENT'] }, 1, 0] } },
          },
        },
      ]);
    },

    listAbsencesBetween(ownerId, semesterId, startDate, endDate) {
      return attendanceModel
        .find({
          ownerId,
          semesterId,
          status: 'ABSENT',
          classDate: { $gte: startDate, $lte: endDate },
        })
        .lean();
    },

    listAttendance(ownerId, semesterId) {
      return attendanceModel
        .find({ ownerId, semesterId })
        .sort({ classDate: 1, startMinute: 1 })
        .lean();
    },

    async insertAttendanceIfPending(ownerId, semesterId, occurrence, status, blockReason = '') {
      const result = await attendanceModel.updateOne(
        { ownerId, semesterId, occurrenceKey: occurrence.occurrenceKey },
        {
          $setOnInsert: {
            ownerId,
            semesterId,
            occurrenceKey: occurrence.occurrenceKey,
            subjectId: occurrence.subjectId,
            status,
            classDate: new Date(`${occurrence.date}T00:00:00.000Z`),
            startMinute: occurrence.startMinute,
            endMinute: occurrence.endMinute,
            type: occurrence.type,
            teacherSnapshot: occurrence.teacherName || '',
            classroomSnapshot: occurrence.classroom || '',
            source: occurrence.source,
            blockReason,
            lastChangedBy: 'IMPORT',
          },
        },
        { upsert: true },
      );
      return result.upsertedCount === 1;
    },

    async history(ownerId, semesterId, options) {
      const filter = {
        ownerId,
        semesterId,
        ...(options.subjectId ? { subjectId: options.subjectId } : {}),
      };
      const [records, total] = await Promise.all([
        attendanceModel
          .find(filter)
          .sort({ classDate: -1, startMinute: -1 })
          .skip((options.page - 1) * options.limit)
          .limit(options.limit)
          .lean(),
        attendanceModel.countDocuments(filter),
      ]);
      return { records, total };
    },
  };
}

module.exports = { createAttendanceRepository };
