const express = require('express');
const { z } = require('zod');
const { createAnalyticsController } = require('../controllers/analytics.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { validateParams } = require('../middleware/validate');
const { objectId } = require('../validation/academic.schemas');

function createAnalyticsRoutes(service) {
  const router = express.Router();
  const controller = createAnalyticsController(service);
  router.use(requireAuthentication);
  router.get('/semesters/:semesterId/dashboard', validateParams(z.object({ semesterId: objectId })), controller.dashboard);
  router.get('/subjects/:subjectId/attendance-summary', validateParams(z.object({ subjectId: objectId })), controller.subject);
  return router;
}

module.exports = { createAnalyticsRoutes };
