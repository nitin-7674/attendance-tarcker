const { z } = require('zod');
const { objectId } = require('./academic.schemas');

const applicationSchema = z.object({
  eventName: z.string().trim().min(2).max(120),
  reason: z.string().trim().min(2).max(500),
  reference: z.string().trim().max(200).optional().default(''),
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
});
const statusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN']),
});
const applicationParams = z.object({ applicationId: objectId });

module.exports = { applicationParams, applicationSchema, statusSchema };
