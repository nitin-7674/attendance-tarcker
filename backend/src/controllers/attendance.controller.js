function createAttendanceController(service) {
  const action = (handler) => async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (error) {
      next(error);
    }
  };

  return {
    daily: action(async (req, res) => {
      const schedule = await service.getDailySchedule(
        req.auth.ownerId,
        req.validatedParams.semesterId,
        req.validatedQuery.date,
      );
      res.json({ data: schedule });
    }),
    history: action(async (req, res) => {
      const history = await service.getHistory(
        req.auth.ownerId,
        req.validatedParams.semesterId,
        req.validatedQuery,
      );
      res.json({ data: history });
    }),
    mark: action(async (req, res) => {
      const result = await service.markAttendance(
        req.auth.ownerId,
        req.validatedParams.semesterId,
        req.validatedParams.occurrenceKey,
        req.validatedBody,
      );
      res.json({ data: result });
    }),
    holiday: action(async (req, res) => {
      const exception = await service.createHoliday(
        req.auth.ownerId,
        req.validatedParams.semesterId,
        req.validatedBody,
      );
      res.status(201).json({ data: { exception } });
    }),
    extraClass: action(async (req, res) => {
      const exception = await service.createExtraClass(
        req.auth.ownerId,
        req.validatedParams.semesterId,
        req.validatedBody,
      );
      res.status(201).json({ data: { exception } });
    }),
  };
}

module.exports = { createAttendanceController };
