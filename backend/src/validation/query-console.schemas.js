const { z } = require('zod');
const { objectId } = require('./academic.schemas');

const queryConsoleSchema = z.object({
  semesterId: objectId,
  collection: z.enum([
    'subjects',
    'timetableEntries',
    'attendanceRecords',
    'calendarExceptions',
    'dutyLeaveApplications',
    'classNotes',
  ]),
  filter: z.record(z.string(), z.unknown()).optional().default({}),
  projection: z.array(z.string()).max(30).optional(),
  sort: z
    .record(z.string(), z.union([z.enum(['asc', 'desc']), z.literal(1), z.literal(-1)]))
    .optional()
    .default({}),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});

module.exports = { queryConsoleSchema };
