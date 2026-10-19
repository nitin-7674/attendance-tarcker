const {
  absenceAllowance,
  actualAttendance,
  adjustedAttendance,
  periodsNeededForTarget,
} = require('./attendance-calculations');
const { ApiError } = require('../utils/api-error');

function createAnalyticsService({ attendanceRepository, dutyLeaveRepository, academicRepositories }) {
  async function summary(ownerId, semesterId) {
    const semester = await academicRepositories.semesters.findById(ownerId, semesterId);
    if (!semester) throw new ApiError(404, 'SEMESTER_NOT_FOUND', 'Semester not found.');

    const [subjects, counts, creditCounts] = await Promise.all([
      academicRepositories.subjects.list(ownerId, semesterId, false),
      attendanceRepository.summarizeBySubject(ownerId, semesterId),
      dutyLeaveRepository.countCreditsBySubject(ownerId, semesterId),
    ]);
    const bySubject = new Map(counts.map((item) => [String(item._id), item]));
    const creditsBySubject = new Map(creditCounts.map((item) => [String(item._id), item.credits]));

    const subjectSummaries = subjects.map((subject) => {
      const id = String(subject._id || subject.id);
      const record = bySubject.get(id) || { present: 0, absent: 0 };
      const credits = creditsBySubject.get(id) || 0;
      const target = subject.targetPercentage;
      const actualPercentage = actualAttendance(record.present, record.absent);
      return {
        subjectId: id,
        name: subject.name,
        code: subject.code || '',
        targetPercentage: target,
        present: record.present,
        absent: record.absent,
        dutyLeaveCredits: credits,
        actualPercentage,
        adjustedPercentage: adjustedAttendance(record.present, record.absent, credits),
        periodsNeeded: periodsNeededForTarget(record.present, record.absent, target),
        absenceAllowance: absenceAllowance(record.present, record.absent, target),
        belowTarget: actualPercentage !== null && actualPercentage < target,
      };
    });

    const overall = subjectSummaries.reduce(
      (total, item) => ({
        present: total.present + item.present,
        absent: total.absent + item.absent,
        dutyLeaveCredits: total.dutyLeaveCredits + item.dutyLeaveCredits,
      }),
      { present: 0, absent: 0, dutyLeaveCredits: 0 },
    );

    return {
      semester: { id: String(semester._id || semester.id), name: semester.name },
      overall: {
        ...overall,
        actualPercentage: actualAttendance(overall.present, overall.absent),
        adjustedPercentage: adjustedAttendance(
          overall.present,
          overall.absent,
          overall.dutyLeaveCredits,
        ),
      },
      subjects: subjectSummaries,
    };
  }

  return {
    getDashboard: summary,
    async getSubjectSummary(ownerId, subjectId) {
      const subject = await academicRepositories.subjects.findById(ownerId, subjectId);
      if (!subject) throw new ApiError(404, 'SUBJECT_NOT_FOUND', 'Subject not found.');
      const dashboard = await summary(ownerId, String(subject.semesterId));
      return dashboard.subjects.find((item) => item.subjectId === String(subjectId));
    },
  };
}

module.exports = { createAnalyticsService };
