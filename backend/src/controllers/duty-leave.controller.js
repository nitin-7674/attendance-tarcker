function createDutyLeaveController(service) {
  const action = (handler) => async (req, res, next) => {
    try { await handler(req, res); } catch (error) { next(error); }
  };
  return {
    list: action(async (req, res) => res.json({ data: { applications: await service.list(req.auth.ownerId, req.validatedParams.semesterId) } })),
    create: action(async (req, res) => res.status(201).json({ data: { application: await service.create(req.auth.ownerId, req.validatedParams.semesterId, req.validatedBody) } })),
    update: action(async (req, res) => res.json({ data: { application: await service.updateStatus(req.auth.ownerId, req.validatedParams.applicationId, req.validatedBody.status) } })),
    eligible: action(async (req, res) => res.json({ data: { periods: await service.eligiblePeriods(req.auth.ownerId, req.validatedParams.applicationId) } })),
    reconcile: action(async (req, res) => res.json({ data: await service.reconcile(req.auth.ownerId, req.validatedParams.applicationId) })),
  };
}

module.exports = { createDutyLeaveController };
