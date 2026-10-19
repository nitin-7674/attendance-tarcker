const express = require('express');
const multer = require('multer');
const { rateLimit } = require('express-rate-limit');
const { z } = require('zod');
const { createImportController } = require('../controllers/import.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { validateBody, validateParams } = require('../middleware/validate');
const { objectId } = require('../validation/academic.schemas');

function createImportRoutes(importService, exportService, maxBytes = 5242880) {
  const router = express.Router();
  const controller = createImportController(importService, exportService);
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1 },
    fileFilter(_req, file, callback) {
      const extension = file.originalname.toLowerCase().split('.').pop();
      callback(extension === 'csv' || extension === 'xlsx' ? null : new Error('Only CSV and XLSX files are allowed.'), extension === 'csv' || extension === 'xlsx');
    },
  });
  const importLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false });

  router.get(
    '/imports/templates/:type',
    validateParams(z.object({ type: z.enum(['csv', 'xlsx']) })),
    controller.template,
  );
  router.use(requireAuthentication);
  router.post(
    '/imports/preview',
    importLimiter,
    upload.single('file'),
    validateBody(z.object({ semesterId: objectId, subjectId: objectId })),
    controller.preview,
  );
  router.post('/imports/commit', importLimiter, validateBody(z.object({ importId: objectId })), controller.commit);
  router.get('/imports/:importId', validateParams(z.object({ importId: objectId })), controller.get);
  router.get('/semesters/:semesterId/exports/attendance.csv', validateParams(z.object({ semesterId: objectId })), controller.attendanceCsv);
  return router;
}

module.exports = { createImportRoutes };
