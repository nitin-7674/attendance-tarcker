const { z } = require('zod');
const { dateOnly, objectId } = require('./academic.schemas');

const dailyQuerySchema = z.object({ date: dateOnly });
const occurrenceParamsSchema = z.object({
  semesterId: objectId,
  occurrenceKey: z.string().min(1).max(200),
});
const attendanceBodySchema = z.object({
  classDate: dateOnly,
  status: z.enum(['PRESENT', 'ABSENT']),
  overlapAction: z.enum(['MARK_PENDING_ABSENT', 'LEAVE_UNCHANGED']).optional(),
  blockReason: z.string().trim().max(250).optional(),
});
const holidaySchema = z.object({
  date: dateOnly,
  reason: z.string().trim().min(1).max(250),
});
const extraClassSchema = z.object({
  date: dateOnly,
  subjectId: objectId,
  startMinute: z.coerce.number().int().min(0).max(1439),
  endMinute: z.coerce.number().int().min(1).max(1440),
  type: z.enum(['L', 'P']),
  teacherName: z.string().trim().max(100).optional(),
  classroom: z.string().trim().max(100).optional(),
  reason: z.string().trim().max(250).optional(),
});
const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  subjectId: objectId.optional(),
});

module.exports = {
  attendanceBodySchema,
  dailyQuerySchema,
  extraClassSchema,
  holidaySchema,
  historyQuerySchema,
  occurrenceParamsSchema,
};
