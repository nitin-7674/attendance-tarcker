function createClassNoteController(service) {
  return {
    async get(req, res, next) {
      try {
        const note = await service.get(req.auth.ownerId, req.validatedParams.semesterId, req.validatedParams.occurrenceKey, req.validatedQuery.date);
        res.json({ data: { note } });
      } catch (error) { next(error); }
    },
    async save(req, res, next) {
      try {
        const note = await service.save(req.auth.ownerId, req.validatedParams.semesterId, req.validatedParams.occurrenceKey, req.validatedQuery.date, req.validatedBody);
        res.json({ data: { note } });
      } catch (error) { next(error); }
    },
  };
}

module.exports = { createClassNoteController };
