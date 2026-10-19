const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { createQueryConsoleController } = require('../controllers/query-console.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { validateBody } = require('../middleware/validate');
const { queryConsoleSchema } = require('../validation/query-console.schemas');

function createQueryConsoleRoutes(service) {
  const router = express.Router();
  const controller = createQueryConsoleController(service);
  const limiter = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false });
  router.get('/query-console/schema', requireAuthentication, controller.describe);
  router.post('/query-console/execute', requireAuthentication, limiter, validateBody(queryConsoleSchema), controller.execute);
  return router;
}

module.exports = { createQueryConsoleRoutes };
