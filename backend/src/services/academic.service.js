const { ApiError } = require('../utils/api-error');

function toPlain(value) {
  return typeof value?.toObject === 'function' ? value.toObject() : value;
}

function serialize(value) {
  const plain = toPlain(value);
  return {
    ...plain,
    id: String(plain._id || plain.id),
    _id: undefined,
    ownerId: undefined,
  };
}

function parseDate(value) {
  return new Date(`${value}T00:00:00.000Z`);
}

function dayBefore(date) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() - 1);
  return result;
}

function assertDateOrder(startDate, endDate, message) {
  if (startDate >= endDate) {
    throw new ApiError(422, 'INVALID_DATE_RANGE', message);
  }
}

function startOfToday() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
}

function createAcademicService(repositories) {
  async function requireSemester(ownerId, semesterId) {
    const semester = await repositories.semesters.findById(ownerId, semesterId);
    if (!semester) {
      throw new ApiError(404, 'SEMESTER_NOT_FOUND', 'Semester not found.');
    }
    return semester;
  }

  async function requireSubject(ownerId, subjectId, semesterId) {
    const subject = await repositories.subjects.findById(ownerId, subjectId);
    if (!subject || (semesterId && String(subject.semesterId) !== String(semesterId))) {
      throw new ApiError(404, 'SUBJECT_NOT_FOUND', 'Subject not found.');
    }
    return subject;
  }

  return {
    async listSemesters(ownerId) {
      return (await repositories.semesters.list(ownerId)).map(serialize);
    },

    async getSemester(ownerId, semesterId) {
      return serialize(await requireSemester(ownerId, semesterId));
    },

    async createSemester(ownerId, input) {
      const startDate = parseDate(input.startDate);
      const endDate = parseDate(input.endDate);
      assertDateOrder(startDate, endDate, 'Semester end date must be after its start date.');

      try {
        return serialize(
          await repositories.semesters.create({
            ownerId,
            name: input.name,
            startDate,
            endDate,
            status: 'CURRENT',
          }),
        );
      } catch (error) {
        if (error?.code === 11000) {
          throw new ApiError(409, 'CURRENT_SEMESTER_EXISTS', 'Complete the current semester before creating another.');
        }
        throw error;
      }
    },

    async updateSemester(ownerId, semesterId, input) {
      const current = await requireSemester(ownerId, semesterId);
      const startDate = input.startDate ? parseDate(input.startDate) : new Date(current.startDate);
      const endDate = input.endDate ? parseDate(input.endDate) : new Date(current.endDate);
      assertDateOrder(startDate, endDate, 'Semester end date must be after its start date.');

      try {
        const updated = await repositories.semesters.update(ownerId, semesterId, {
          ...input,
          ...(input.startDate ? { startDate } : {}),
          ...(input.endDate ? { endDate } : {}),
        });
        return serialize(updated);
      } catch (error) {
        if (error?.code === 11000 && input.status === 'CURRENT') {
          throw new ApiError(409, 'CURRENT_SEMESTER_EXISTS', 'Complete the current semester before reopening this one.');
        }
        throw error;
      }
    },

    async listSubjects(ownerId, semesterId, includeInactive = false) {
      await requireSemester(ownerId, semesterId);
      return (await repositories.subjects.list(ownerId, semesterId, includeInactive)).map(serialize);
    },

    async createSubject(ownerId, semesterId, input) {
      await requireSemester(ownerId, semesterId);
      try {
        return serialize(
          await repositories.subjects.create({
            ownerId,
            semesterId,
            name: input.name,
            code: input.code || undefined,
            targetPercentage: input.targetPercentage,
          }),
        );
      } catch (error) {
        if (error?.code === 11000) {
          throw new ApiError(409, 'SUBJECT_CODE_IN_USE', 'This subject code is already used in the semester.');
        }
        throw error;
      }
    },

    async updateSubject(ownerId, subjectId, input) {
      await requireSubject(ownerId, subjectId);
      try {
        const updated = await repositories.subjects.update(ownerId, subjectId, input);
        return serialize(updated);
      } catch (error) {
        if (error?.code === 11000) {
          throw new ApiError(409, 'SUBJECT_CODE_IN_USE', 'This subject code is already used in the semester.');
        }
        throw error;
      }
    },

    async archiveSubject(ownerId, subjectId) {
      await requireSubject(ownerId, subjectId);
      return serialize(await repositories.subjects.update(ownerId, subjectId, { active: false }));
    },

    async restoreSubject(ownerId, subjectId) {
      await requireSubject(ownerId, subjectId);
      try {
        return serialize(await repositories.subjects.update(ownerId, subjectId, { active: true }));
      } catch (error) {
        if (error?.code === 11000) {
          throw new ApiError(409, 'SUBJECT_CODE_IN_USE', 'Change the archived subject code before restoring it.');
        }
        throw error;
      }
    },

    async listTimetable(ownerId, semesterId, includeInactive = false) {
      await requireSemester(ownerId, semesterId);
      return (await repositories.timetable.list(ownerId, semesterId, includeInactive)).map(serialize);
    },

    async createTimetableEntry(ownerId, semesterId, input) {
      await requireSemester(ownerId, semesterId);
      await requireSubject(ownerId, input.subjectId, semesterId);
      if (input.endMinute <= input.startMinute) {
        throw new ApiError(422, 'INVALID_TIME_RANGE', 'Class end time must be after its start time.');
      }

      const effectiveFrom = parseDate(input.effectiveFrom);
      const effectiveTo = input.effectiveTo ? parseDate(input.effectiveTo) : null;
      if (effectiveTo) {
        assertDateOrder(effectiveFrom, effectiveTo, 'Effective end date must be after its start date.');
      }

      return serialize(
        await repositories.timetable.create({
          ownerId,
          semesterId,
          ...input,
          effectiveFrom,
          effectiveTo,
          scheduleVersion: 1,
        }),
      );
    },

    async updateTimetableEntry(ownerId, entryId, input) {
      const current = await repositories.timetable.findById(ownerId, entryId);
      if (!current) {
        throw new ApiError(404, 'TIMETABLE_ENTRY_NOT_FOUND', 'Timetable entry not found.');
      }
      if (!input.effectiveFrom) {
        throw new ApiError(
          422,
          'EFFECTIVE_DATE_REQUIRED',
          'Choose the future date when this timetable change should begin.',
        );
      }
      if (input.subjectId) await requireSubject(ownerId, input.subjectId, current.semesterId);
      const startMinute = input.startMinute ?? current.startMinute;
      const endMinute = input.endMinute ?? current.endMinute;
      if (endMinute <= startMinute) {
        throw new ApiError(422, 'INVALID_TIME_RANGE', 'Class end time must be after its start time.');
      }

      const effectiveFrom = parseDate(input.effectiveFrom);
      if (effectiveFrom <= new Date(current.effectiveFrom)) {
        throw new ApiError(
          422,
          'INVALID_EFFECTIVE_DATE',
          'A new timetable version must begin after the current version begins.',
        );
      }
      if (effectiveFrom <= startOfToday()) {
        throw new ApiError(
          422,
          'PAST_TIMETABLE_CHANGE',
          'To preserve previous classes, a schedule change must begin tomorrow or later.',
        );
      }

      const originalEnd = current.effectiveTo || null;
      const originalActive = current.active;
      await repositories.timetable.update(ownerId, entryId, {
        effectiveTo: dayBefore(effectiveFrom),
        active: false,
        inactiveReason: 'SUPERSEDED',
      });
      try {
        const created = await repositories.timetable.create({
          ownerId,
          semesterId: current.semesterId,
          subjectId: input.subjectId || current.subjectId,
          dayOfWeek: input.dayOfWeek ?? current.dayOfWeek,
          startMinute,
          endMinute,
          type: input.type || current.type,
          teacherName: input.teacherName ?? current.teacherName,
          classroom: input.classroom ?? current.classroom,
          effectiveFrom,
          effectiveTo: input.effectiveTo ? parseDate(input.effectiveTo) : originalEnd,
          scheduleVersion: Number(current.scheduleVersion || 1) + 1,
          active: true,
          inactiveReason: null,
        });
        return serialize(created);
      } catch (error) {
        await repositories.timetable.update(ownerId, entryId, {
          effectiveTo: originalEnd,
          active: originalActive,
          inactiveReason: current.inactiveReason || null,
        });
        throw error;
      }
    },

    async correctTimetableEntry(ownerId, entryId, input) {
      const current = await repositories.timetable.findById(ownerId, entryId);
      if (!current) {
        throw new ApiError(404, 'TIMETABLE_ENTRY_NOT_FOUND', 'Timetable entry not found.');
      }
      if (new Date(current.effectiveFrom) <= startOfToday()) {
        throw new ApiError(
          409,
          'TIMETABLE_HISTORY_PROTECTED',
          'This period has already started. Create a dated schedule change instead of editing its history.',
        );
      }
      if (input.subjectId) await requireSubject(ownerId, input.subjectId, current.semesterId);
      const startMinute = input.startMinute ?? current.startMinute;
      const endMinute = input.endMinute ?? current.endMinute;
      if (endMinute <= startMinute) {
        throw new ApiError(422, 'INVALID_TIME_RANGE', 'Class end time must be after its start time.');
      }
      const effectiveFrom = input.effectiveFrom
        ? parseDate(input.effectiveFrom)
        : new Date(current.effectiveFrom);
      if (effectiveFrom <= startOfToday()) {
        throw new ApiError(
          422,
          'PAST_TIMETABLE_CHANGE',
          'A future period cannot be moved to today or an earlier date.',
        );
      }
      const effectiveTo = input.effectiveTo === null
        ? null
        : input.effectiveTo
          ? parseDate(input.effectiveTo)
          : current.effectiveTo;
      if (effectiveTo) {
        assertDateOrder(effectiveFrom, new Date(effectiveTo), 'Effective end date must be after its start date.');
      }
      return serialize(
        await repositories.timetable.update(ownerId, entryId, {
          ...input,
          startMinute,
          endMinute,
          effectiveFrom,
          effectiveTo,
        }),
      );
    },

    async archiveTimetableEntry(ownerId, entryId) {
      const current = await repositories.timetable.findById(ownerId, entryId);
      if (!current) {
        throw new ApiError(404, 'TIMETABLE_ENTRY_NOT_FOUND', 'Timetable entry not found.');
      }
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      return serialize(
        await repositories.timetable.update(ownerId, entryId, {
          active: false,
          effectiveTo: today,
          inactiveReason: 'ARCHIVED',
        }),
      );
    },

    async restoreTimetableEntry(ownerId, entryId) {
      const current = await repositories.timetable.findById(ownerId, entryId);
      if (!current) {
        throw new ApiError(404, 'TIMETABLE_ENTRY_NOT_FOUND', 'Timetable entry not found.');
      }
      if (current.inactiveReason === 'SUPERSEDED') {
        throw new ApiError(
          409,
          'HISTORICAL_VERSION_READ_ONLY',
          'Historical timetable versions cannot be restored.',
        );
      }
      return serialize(
        await repositories.timetable.update(ownerId, entryId, {
          active: true,
          effectiveTo: null,
          inactiveReason: null,
        }),
      );
    },
  };
}

module.exports = { createAcademicService, serialize };
