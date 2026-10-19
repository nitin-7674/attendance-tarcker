const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { z } = require('zod');
const { createArchiveController } = require('../controllers/archive.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { validateParams } = require('../middleware/validate');
const { objectId } = require('../validation/academic.schemas');

function createArchiveRoutes(service) {
  const router = express.Router();
  const controller = createArchiveController(service);
  const params = z.object({ semesterId: objectId });
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });
  router.use(requireAuthentication);
  router.post('/semesters/:semesterId/archive', limiter, validateParams(params), controller.prepare);
  router.get('/semesters/:semesterId/download', limiter, validateParams(params), controller.download);
  return router;
}

module.exports = { createArchiveRoutes };
