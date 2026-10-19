function createArchiveController(service) {
  return {
    async prepare(req, res, next) {
      try { res.status(201).json({ data: await service.prepare(req.auth.ownerId, req.validatedParams.semesterId) }); } catch (error) { next(error); }
    },
    async download(req, res, next) {
      try {
        const output = await service.download(req.auth.ownerId, req.validatedParams.semesterId);
        res.set('X-Archive-SHA256', output.checksum);
        res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').attachment(output.filename).send(output.buffer);
      } catch (error) { next(error); }
    },
  };
}

module.exports = { createArchiveController };
