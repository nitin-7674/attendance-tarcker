const express = require('express');
const { z } = require('zod');
const { createAttendanceController } = require('../controllers/attendance.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { validateBody, validateParams, validateQuery } = require('../middleware/validate');
const { objectId } = require('../validation/academic.schemas');
const {
  attendanceBodySchema,
  dailyQuerySchema,
  extraClassSchema,
  holidaySchema,
  historyQuerySchema,
  occurrenceParamsSchema,
} = require('../validation/attendance.schemas');

function createAttendanceRoutes(service) {
  const router = express.Router();
  const controller = createAttendanceController(service);
  const semesterParams = z.object({ semesterId: objectId });

  router.use(requireAuthentication);
  router.get(
    '/semesters/:semesterId/attendance',
    validateParams(semesterParams),
    validateQuery(dailyQuerySchema),
    controller.daily,
  );
  router.get(
    '/semesters/:semesterId/attendance/history',
    validateParams(semesterParams),
    validateQuery(historyQuerySchema),
    controller.history,
  );
  router.patch(
    '/semesters/:semesterId/occurrences/:occurrenceKey/attendance',
    validateParams(occurrenceParamsSchema),
    validateBody(attendanceBodySchema),
    controller.mark,
  );
  router.post(
    '/semesters/:semesterId/holidays',
    validateParams(semesterParams),
    validateBody(holidaySchema),
    controller.holiday,
  );
  router.post(
    '/semesters/:semesterId/extra-classes',
    validateParams(semesterParams),
    validateBody(extraClassSchema),
    controller.extraClass,
  );

  return router;
}

module.exports = { createAttendanceRoutes };
