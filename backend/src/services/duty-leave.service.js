const { ApiError } = require('../utils/api-error');

const serialize = (record) => {
  const value = typeof record?.toObject === 'function' ? record.toObject() : record;
  return { ...value, id: String(value._id || value.id), _id: undefined, ownerId: undefined };
};

function attendanceInterval(record) {
  const start = new Date(record.classDate);
  start.setUTCMinutes(record.startMinute);
  const end = new Date(record.classDate);
  end.setUTCMinutes(record.endMinute);
  return { start, end };
}

function partiallyOverlaps(record, startAt, endAt) {
  const interval = attendanceInterval(record);
  return interval.start < endAt && interval.end > startAt;
}

function createDutyLeaveService({ repository, attendanceRepository, academicRepositories }) {
  async function requireSemester(ownerId, semesterId) {
    const semester = await academicRepositories.semesters.findById(ownerId, semesterId);
    if (!semester) throw new ApiError(404, 'SEMESTER_NOT_FOUND', 'Semester not found.');
  }

  async function requireApplication(ownerId, applicationId) {
    const application = await repository.findApplication(ownerId, applicationId);
    if (!application) throw new ApiError(404, 'DUTY_LEAVE_NOT_FOUND', 'Duty Leave application not found.');
    return application;
  }

  async function eligible(ownerId, application) {
    const startAt = new Date(application.startAt);
    const endAt = new Date(application.endAt);
    const startDate = new Date(startAt);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(endAt);
    endDate.setUTCHours(0, 0, 0, 0);
    const absences = await attendanceRepository.listAbsencesBetween(
      ownerId,
      application.semesterId,
      startDate,
      endDate,
    );
    return absences.filter((record) => partiallyOverlaps(record, startAt, endAt));
  }

  return {
    async list(ownerId, semesterId) {
      await requireSemester(ownerId, semesterId);
      return (await repository.listApplications(ownerId, semesterId)).map(serialize);
    },
    async create(ownerId, semesterId, input) {
      await requireSemester(ownerId, semesterId);
      const startAt = new Date(input.startAt);
      const endAt = new Date(input.endAt);
      if (endAt <= startAt) {
        throw new ApiError(422, 'INVALID_TIME_RANGE', 'Duty Leave must end after it starts.');
      }
      return serialize(
        await repository.createApplication({
          ownerId,
          semesterId,
          ...input,
          startAt,
          endAt,
          status: 'PENDING',
        }),
      );
    },
    async updateStatus(ownerId, applicationId, status) {
      await requireApplication(ownerId, applicationId);
      return serialize(await repository.updateApplication(ownerId, applicationId, { status }));
    },
    async eligiblePeriods(ownerId, applicationId) {
      const application = await requireApplication(ownerId, applicationId);
      return (await eligible(ownerId, application)).map((record) => ({
        occurrenceKey: record.occurrenceKey,
        subjectId: String(record.subjectId),
        classDate: record.classDate,
        startMinute: record.startMinute,
        endMinute: record.endMinute,
      }));
    },
    async reconcile(ownerId, applicationId) {
      const application = await requireApplication(ownerId, applicationId);
      if (application.status !== 'APPROVED') {
        throw new ApiError(422, 'DUTY_LEAVE_NOT_APPROVED', 'Only approved Duty Leave can be credited.');
      }
      const periods = await eligible(ownerId, application);
      let applied = 0;
      let alreadyCredited = 0;
      for (const period of periods) {
        const result = await repository.createCreditIfAvailable({
          ownerId,
          semesterId: application.semesterId,
          dlApplicationId: application._id || application.id,
          occurrenceKey: period.occurrenceKey,
          creditStatus: 'APPLIED',
        });
        if (result.created) applied += 1;
        else alreadyCredited += 1;
      }
      return { eligible: periods.length, applied, alreadyCredited };
    },
  };
}

module.exports = { createDutyLeaveService, partiallyOverlaps };
