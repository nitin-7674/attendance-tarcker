const express = require('express');
const multer = require('multer');
const { rateLimit } = require('express-rate-limit');
const { z } = require('zod');
const { requireAuthentication } = require('../middleware/authenticate');
const { validateParams } = require('../middleware/validate');
const { objectId } = require('../validation/academic.schemas');
const { ApiError } = require('../utils/api-error');

function createSetupImportRoutes(service, maxBytes = 5242880) {
  const router = express.Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1 },
    fileFilter(_req, file, callback) {
      const extension = file.originalname.toLowerCase().split('.').pop();
      const allowed = extension === 'csv' || extension === 'xlsx';
      callback(allowed ? null : new ApiError(415, 'UNSUPPORTED_FILE_TYPE', 'Only CSV and XLSX files are allowed.'), allowed);
    },
  });
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false });
  const templateParams = z.object({
    kind: z.enum(['subjects', 'timetable']),
    type: z.enum(['csv', 'xlsx']),
  });
  const importParams = z.object({
    semesterId: objectId,
    kind: z.enum(['subjects', 'timetable']),
  });
  const action = (handler) => async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (error) {
      next(error);
    }
  };

  router.use(requireAuthentication);
  router.get(
    '/setup-imports/:kind/templates/:type',
    validateParams(templateParams),
    action(async (req, res) => {
      const { kind, type } = req.validatedParams;
      const output = await service.template(kind, type);
      res
        .type(output.contentType)
        .attachment(`${kind}-import-template.${output.extension}`)
        .send(output.buffer);
    }),
  );
  router.post(
    '/semesters/:semesterId/setup-imports/:kind',
    limiter,
    upload.single('file'),
    validateParams(importParams),
    action(async (req, res) => {
      const { semesterId, kind } = req.validatedParams;
      const result = kind === 'subjects'
        ? await service.importSubjects(req.auth.ownerId, semesterId, req.file)
        : await service.importTimetable(req.auth.ownerId, semesterId, req.file);
      res.status(201).json({ data: result });
    }),
  );
  return router;
}

module.exports = { createSetupImportRoutes };
