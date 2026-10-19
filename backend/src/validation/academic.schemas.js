const { z } = require('zod');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier.');
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }, 'Enter a real calendar date.');

const semesterCreateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  startDate: dateOnly,
  endDate: dateOnly,
});

const semesterUpdateSchema = semesterCreateSchema.partial().extend({
  status: z.enum(['CURRENT', 'COMPLETED']).optional(),
});

const subjectCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  code: z.string().trim().max(30).optional().default(''),
  targetPercentage: z.coerce.number().min(1).max(100).default(75),
});

const subjectUpdateSchema = subjectCreateSchema.partial();

const timetableEntrySchema = z.object({
  subjectId: objectId,
  dayOfWeek: z.coerce.number().int().min(1).max(7),
  startMinute: z.coerce.number().int().min(0).max(1439),
  endMinute: z.coerce.number().int().min(1).max(1440),
  type: z.enum(['L', 'P']),
  teacherName: z.string().trim().max(100).optional().default(''),
  classroom: z.string().trim().max(100).optional().default(''),
  effectiveFrom: dateOnly,
  effectiveTo: dateOnly.nullable().optional(),
});

const timetableUpdateSchema = timetableEntrySchema.partial();

module.exports = {
  objectId,
  dateOnly,
  semesterCreateSchema,
  semesterUpdateSchema,
  subjectCreateSchema,
  subjectUpdateSchema,
  timetableEntrySchema,
  timetableUpdateSchema,
};
