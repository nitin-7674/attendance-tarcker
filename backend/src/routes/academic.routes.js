const express = require('express');
const { createAcademicController } = require('../controllers/academic.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { validateBody, validateParams } = require('../middleware/validate');
const {
  objectId,
  semesterCreateSchema,
  semesterUpdateSchema,
  subjectCreateSchema,
  subjectUpdateSchema,
  timetableEntrySchema,
  timetableUpdateSchema,
} = require('../validation/academic.schemas');
const { z } = require('zod');

function createAcademicRoutes(service) {
  const router = express.Router();
  const controller = createAcademicController(service);
  const semesterParams = z.object({ semesterId: objectId });
  const subjectParams = z.object({ subjectId: objectId });
  const entryParams = z.object({ entryId: objectId });

  router.use(requireAuthentication);
  router.get('/semesters', controller.listSemesters);
  router.post('/semesters', validateBody(semesterCreateSchema), controller.createSemester);
  router.get('/semesters/:semesterId', validateParams(semesterParams), controller.getSemester);
  router.put(
    '/semesters/:semesterId',
    validateParams(semesterParams),
    validateBody(semesterUpdateSchema),
    controller.updateSemester,
  );
  router.get(
    '/semesters/:semesterId/subjects',
    validateParams(semesterParams),
    controller.listSubjects,
  );
  router.post(
    '/semesters/:semesterId/subjects',
    validateParams(semesterParams),
    validateBody(subjectCreateSchema),
    controller.createSubject,
  );
  router.put(
    '/subjects/:subjectId',
    validateParams(subjectParams),
    validateBody(subjectUpdateSchema),
    controller.updateSubject,
  );
  router.delete('/subjects/:subjectId', validateParams(subjectParams), controller.archiveSubject);
  router.post('/subjects/:subjectId/restore', validateParams(subjectParams), controller.restoreSubject);
  router.get(
    '/semesters/:semesterId/timetable',
    validateParams(semesterParams),
    controller.listTimetable,
  );
  router.post(
    '/semesters/:semesterId/timetable',
    validateParams(semesterParams),
    validateBody(timetableEntrySchema),
    controller.createTimetableEntry,
  );
  router.put(
    '/timetable/:entryId',
    validateParams(entryParams),
    validateBody(timetableUpdateSchema),
    controller.updateTimetableEntry,
  );
  router.patch(
    '/timetable/:entryId',
    validateParams(entryParams),
    validateBody(timetableUpdateSchema),
    controller.correctTimetableEntry,
  );
  router.delete('/timetable/:entryId', validateParams(entryParams), controller.archiveTimetableEntry);
  router.post('/timetable/:entryId/restore', validateParams(entryParams), controller.restoreTimetableEntry);

  return router;
}

module.exports = { createAcademicRoutes };
