function createImportController(importService, exportService) {
  const action = (handler) => async (req, res, next) => {
    try { await handler(req, res); } catch (error) { next(error); }
  };
  return {
    preview: action(async (req, res) => {
      const result = await importService.preview(
        req.auth.ownerId,
        req.validatedBody.semesterId,
        req.validatedBody.subjectId,
        req.file,
      );
      res.status(201).json({ data: result });
    }),
    commit: action(async (req, res) => res.json({ data: await importService.commit(req.auth.ownerId, req.validatedBody.importId) })),
    get: action(async (req, res) => res.json({ data: await importService.get(req.auth.ownerId, req.validatedParams.importId) })),
    template: action(async (req, res) => {
      const output = await exportService.template(req.params.type);
      res.type(output.contentType).attachment(`attendance-import-template.${output.extension}`).send(output.buffer);
    }),
    attendanceCsv: action(async (req, res) => {
      const csv = await exportService.attendanceCsv(req.auth.ownerId, req.validatedParams.semesterId);
      if (csv === null) return res.status(404).json({ error: { code: 'SEMESTER_NOT_FOUND', message: 'Semester not found.' } });
      return res.type('text/csv').attachment('attendance.csv').send(csv);
    }),
  };
}

module.exports = { createImportController };
