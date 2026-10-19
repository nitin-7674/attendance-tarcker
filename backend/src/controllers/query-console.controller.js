function createQueryConsoleController(service) {
  return {
    describe(_req, res) {
      res.json({ data: service.describe() });
    },
    async execute(req, res, next) {
      try { res.json({ data: await service.execute(req.auth.ownerId, req.validatedBody) }); } catch (error) { next(error); }
    },
  };
}

module.exports = { createQueryConsoleController };
