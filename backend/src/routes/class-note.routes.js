const express = require('express');
const { z } = require('zod');
const { createClassNoteController } = require('../controllers/class-note.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { validateBody, validateParams, validateQuery } = require('../middleware/validate');
const { dateOnly, objectId } = require('../validation/academic.schemas');

function createClassNoteRoutes(service) {
  const router = express.Router();
  const controller = createClassNoteController(service);
  const params = z.object({ semesterId: objectId, occurrenceKey: z.string().min(1).max(200) });
  const query = z.object({ date: dateOnly });
  const body = z.object({
    topicCovered: z.string().trim().max(1000).optional().default(''),
    assignmentGiven: z.string().trim().max(1000).optional().default(''),
    dueDate: dateOnly.nullable().optional(),
  });
  router.use(requireAuthentication);
  router.get('/semesters/:semesterId/occurrences/:occurrenceKey/notes', validateParams(params), validateQuery(query), controller.get);
  router.put('/semesters/:semesterId/occurrences/:occurrenceKey/notes', validateParams(params), validateQuery(query), validateBody(body), controller.save);
  return router;
}

module.exports = { createClassNoteRoutes };
