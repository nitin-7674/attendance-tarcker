const express = require('express');
const { z } = require('zod');
const { createDutyLeaveController } = require('../controllers/duty-leave.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { validateBody, validateParams } = require('../middleware/validate');
const { objectId } = require('../validation/academic.schemas');
const { applicationParams, applicationSchema, statusSchema } = require('../validation/duty-leave.schemas');

function createDutyLeaveRoutes(service) {
  const router = express.Router();
  const controller = createDutyLeaveController(service);
  router.use(requireAuthentication);
  router.get('/semesters/:semesterId/dl', validateParams(z.object({ semesterId: objectId })), controller.list);
  router.post('/semesters/:semesterId/dl', validateParams(z.object({ semesterId: objectId })), validateBody(applicationSchema), controller.create);
  router.patch('/dl/:applicationId', validateParams(applicationParams), validateBody(statusSchema), controller.update);
  router.get('/dl/:applicationId/eligible-periods', validateParams(applicationParams), controller.eligible);
  router.post('/dl/:applicationId/reconcile', validateParams(applicationParams), controller.reconcile);
  return router;
}

module.exports = { createDutyLeaveRoutes };
