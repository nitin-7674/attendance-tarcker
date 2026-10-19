function createAnalyticsController(service) {
  return {
    async dashboard(req, res, next) {
      try { res.json({ data: await service.getDashboard(req.auth.ownerId, req.validatedParams.semesterId) }); } catch (error) { next(error); }
    },
    async subject(req, res, next) {
      try { res.json({ data: await service.getSubjectSummary(req.auth.ownerId, req.validatedParams.subjectId) }); } catch (error) { next(error); }
    },
  };
}

module.exports = { createAnalyticsController };
