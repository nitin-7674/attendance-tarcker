const { ApiError } = require('../utils/api-error');

function serialize(record, occurrenceKey) {
  if (!record) return { occurrenceKey, topicCovered: '', assignmentGiven: '', dueDate: null };
  return {
    id: String(record._id || record.id),
    occurrenceKey: record.occurrenceKey,
    topicCovered: record.topicCovered || '',
    assignmentGiven: record.assignmentGiven || '',
    dueDate: record.dueDate || null,
  };
}

function createClassNoteService({ repository, attendanceService }) {
  async function requireOccurrence(ownerId, semesterId, occurrenceKey, classDate) {
    const day = await attendanceService.getDailySchedule(ownerId, semesterId, classDate);
    if (!day.occurrences.some((occurrence) => occurrence.occurrenceKey === occurrenceKey)) {
      throw new ApiError(404, 'OCCURRENCE_NOT_FOUND', 'Class occurrence not found for this date.');
    }
  }

  return {
    async get(ownerId, semesterId, occurrenceKey, classDate) {
      await requireOccurrence(ownerId, semesterId, occurrenceKey, classDate);
      return serialize(await repository.find(ownerId, semesterId, occurrenceKey), occurrenceKey);
    },
    async save(ownerId, semesterId, occurrenceKey, classDate, input) {
      await requireOccurrence(ownerId, semesterId, occurrenceKey, classDate);
      const note = await repository.upsert(ownerId, semesterId, occurrenceKey, {
        topicCovered: input.topicCovered || '',
        assignmentGiven: input.assignmentGiven || '',
        dueDate: input.dueDate ? new Date(`${input.dueDate}T00:00:00.000Z`) : null,
      });
      return serialize(note, occurrenceKey);
    },
  };
}

module.exports = { createClassNoteService };
