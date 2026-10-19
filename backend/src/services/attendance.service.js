const { ApiError } = require('../utils/api-error');

const startOfDate = (dateString) => new Date(`${dateString}T00:00:00.000Z`);
const isoDayOfWeek = (date) => date.getUTCDay() || 7;
const regularKey = (entryId, dateString) => `regular:${entryId}:${dateString}`;
const extraKey = (extraId) => `extra:${extraId}`;
const overlaps = (left, right) => left.startMinute < right.endMinute && left.endMinute > right.startMinute;

function plain(value) {
  return typeof value?.toObject === 'function' ? value.toObject() : value;
}

function createAttendanceService({ repository, academicRepositories }) {
  async function requireSemester(ownerId, semesterId) {
    const semester = await academicRepositories.semesters.findById(ownerId, semesterId);
    if (!semester) throw new ApiError(404, 'SEMESTER_NOT_FOUND', 'Semester not found.');
    return semester;
  }

  async function requireSubject(ownerId, subjectId, semesterId) {
    const subject = await academicRepositories.subjects.findById(ownerId, subjectId);
    if (!subject || String(subject.semesterId) !== String(semesterId) || !subject.active) {
      throw new ApiError(404, 'SUBJECT_NOT_FOUND', 'Subject not found.');
    }
    return subject;
  }

  async function dailySchedule(ownerId, semesterId, dateString) {
    const semester = await requireSemester(ownerId, semesterId);
    const date = startOfDate(dateString);
    if (date < new Date(semester.startDate) || date > new Date(semester.endDate)) {
      throw new ApiError(422, 'DATE_OUTSIDE_SEMESTER', 'The selected date is outside this semester.');
    }

    const [entries, exceptions] = await Promise.all([
      repository.listTimetableForDate(ownerId, semesterId, isoDayOfWeek(date), date),
      repository.listExceptionsForDate(ownerId, semesterId, date),
    ]);
    const holiday = exceptions.find((item) => item.type === 'HOLIDAY');
    const cancelled = new Set(
      exceptions.filter((item) => item.type === 'CANCELLED').map((item) => item.occurrenceKey),
    );

    const recurring = holiday
      ? []
      : entries
          .map((entry) => {
            const record = plain(entry);
            return {
              occurrenceKey: regularKey(record._id || record.id, dateString),
              timetableEntryId: String(record._id || record.id),
              subjectId: String(record.subjectId),
              classDate: date,
              date: dateString,
              startMinute: record.startMinute,
              endMinute: record.endMinute,
              type: record.type,
              teacherName: record.teacherName || '',
              classroom: record.classroom || '',
              source: 'RECURRING',
            };
          })
          .filter((occurrence) => !cancelled.has(occurrence.occurrenceKey));

    const extras = exceptions
      .filter((item) => item.type === 'EXTRA')
      .map((item) => {
        const record = plain(item);
        return {
          occurrenceKey: extraKey(record._id || record.id),
          extraClassId: String(record._id || record.id),
          subjectId: String(record.subjectId),
          classDate: date,
          date: dateString,
          startMinute: record.startMinute,
          endMinute: record.endMinute,
          type: record.classType,
          teacherName: record.teacherName || '',
          classroom: record.classroom || '',
          source: 'EXTRA',
        };
      });

    const occurrences = [...recurring, ...extras].sort(
      (left, right) => left.startMinute - right.startMinute || left.endMinute - right.endMinute,
    );
    const records = await repository.listAttendanceByKeys(
      ownerId,
      semesterId,
      occurrences.map((item) => item.occurrenceKey),
    );
    const statusByKey = new Map(records.map((record) => [record.occurrenceKey, record.status]));

    return {
      date: dateString,
      holiday: holiday ? { reason: holiday.reason || 'Holiday' } : null,
      occurrences: occurrences.map((occurrence) => ({
        ...occurrence,
        classDate: undefined,
        status: statusByKey.get(occurrence.occurrenceKey) || 'PENDING',
      })),
      internalOccurrences: occurrences,
    };
  }

  return {
    async getDailySchedule(ownerId, semesterId, dateString) {
      const result = await dailySchedule(ownerId, semesterId, dateString);
      return { date: result.date, holiday: result.holiday, occurrences: result.occurrences };
    },

    async getHistory(ownerId, semesterId, options) {
      await requireSemester(ownerId, semesterId);
      const { records, total } = await repository.history(ownerId, semesterId, options);
      return {
        records: records.map((record) => ({
          id: String(record._id || record.id),
          subjectId: String(record.subjectId),
          occurrenceKey: record.occurrenceKey,
          status: record.status,
          classDate: record.classDate,
          startMinute: record.startMinute,
          endMinute: record.endMinute,
          type: record.type,
          teacherName: record.teacherSnapshot || '',
          classroom: record.classroomSnapshot || '',
          source: record.source,
          blockReason: record.blockReason || '',
        })),
        pagination: {
          page: options.page,
          limit: options.limit,
          total,
          pages: Math.ceil(total / options.limit),
        },
      };
    },

    async createHoliday(ownerId, semesterId, input) {
      await requireSemester(ownerId, semesterId);
      const record = await repository.createException({
        ownerId,
        semesterId,
        date: startOfDate(input.date),
        type: 'HOLIDAY',
        reason: input.reason,
      });
      return { id: String(record._id || record.id), date: input.date, type: 'HOLIDAY', reason: input.reason };
    },

    async createExtraClass(ownerId, semesterId, input) {
      await requireSemester(ownerId, semesterId);
      await requireSubject(ownerId, input.subjectId, semesterId);
      if (input.endMinute <= input.startMinute) {
        throw new ApiError(422, 'INVALID_TIME_RANGE', 'Class end time must be after its start time.');
      }
      const record = await repository.createException({
        ownerId,
        semesterId,
        date: startOfDate(input.date),
        type: 'EXTRA',
        subjectId: input.subjectId,
        startMinute: input.startMinute,
        endMinute: input.endMinute,
        classType: input.type,
        teacherName: input.teacherName || '',
        classroom: input.classroom || '',
        reason: input.reason || '',
      });
      return { id: String(record._id || record.id), type: 'EXTRA' };
    },

    async markAttendance(ownerId, semesterId, occurrenceKey, input) {
      const schedule = await dailySchedule(ownerId, semesterId, input.classDate);
      const selected = schedule.internalOccurrences.find(
        (occurrence) => occurrence.occurrenceKey === occurrenceKey,
      );
      if (!selected) {
        throw new ApiError(404, 'OCCURRENCE_NOT_FOUND', 'Class occurrence not found for this date.');
      }

      const overlapping = schedule.occurrences.filter(
        (occurrence) =>
          occurrence.occurrenceKey !== occurrenceKey &&
          occurrence.status === 'PENDING' &&
          overlaps(selected, occurrence),
      );

      if (input.status === 'PRESENT' && overlapping.length > 0 && !input.overlapAction) {
        throw new ApiError(
          409,
          'OVERLAP_CONFIRMATION_REQUIRED',
          'Other pending classes overlap this period.',
          { overlaps: overlapping },
        );
      }

      const record = await repository.upsertAttendance(ownerId, semesterId, occurrenceKey, {
        subjectId: selected.subjectId,
        status: input.status,
        classDate: selected.classDate,
        startMinute: selected.startMinute,
        endMinute: selected.endMinute,
        type: selected.type,
        teacherSnapshot: selected.teacherName,
        classroomSnapshot: selected.classroom,
        source: selected.source,
        blockReason: input.blockReason || '',
        lastChangedBy: 'MANUAL',
      });

      const autoMarkedAbsent = [];
      if (input.status === 'PRESENT' && input.overlapAction === 'MARK_PENDING_ABSENT') {
        for (const occurrence of overlapping) {
          if (await repository.insertAbsentOnlyIfPending(ownerId, semesterId, occurrence)) {
            autoMarkedAbsent.push(occurrence.occurrenceKey);
          }
        }
      }

      return {
        occurrenceKey,
        status: record.status,
        autoMarkedAbsent,
      };
    },
  };
}

module.exports = { createAttendanceService, overlaps, regularKey };
