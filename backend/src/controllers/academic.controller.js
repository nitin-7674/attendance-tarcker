function createAcademicController(service) {
  const action = (handler) => async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (error) {
      next(error);
    }
  };

  return {
    listSemesters: action(async (req, res) => {
      res.json({ data: { semesters: await service.listSemesters(req.auth.ownerId) } });
    }),
    createSemester: action(async (req, res) => {
      const semester = await service.createSemester(req.auth.ownerId, req.validatedBody);
      res.status(201).json({ data: { semester } });
    }),
    getSemester: action(async (req, res) => {
      const semester = await service.getSemester(req.auth.ownerId, req.validatedParams.semesterId);
      res.json({ data: { semester } });
    }),
    updateSemester: action(async (req, res) => {
      const semester = await service.updateSemester(
        req.auth.ownerId,
        req.validatedParams.semesterId,
        req.validatedBody,
      );
      res.json({ data: { semester } });
    }),
    listSubjects: action(async (req, res) => {
      const subjects = await service.listSubjects(
        req.auth.ownerId,
        req.validatedParams.semesterId,
        req.query.includeInactive === 'true',
      );
      res.json({ data: { subjects } });
    }),
    createSubject: action(async (req, res) => {
      const subject = await service.createSubject(
        req.auth.ownerId,
        req.validatedParams.semesterId,
        req.validatedBody,
      );
      res.status(201).json({ data: { subject } });
    }),
    updateSubject: action(async (req, res) => {
      const subject = await service.updateSubject(
        req.auth.ownerId,
        req.validatedParams.subjectId,
        req.validatedBody,
      );
      res.json({ data: { subject } });
    }),
    restoreSubject: action(async (req, res) => {
      const subject = await service.restoreSubject(req.auth.ownerId, req.validatedParams.subjectId);
      res.json({ data: { subject } });
    }),
    archiveSubject: action(async (req, res) => {
      const subject = await service.archiveSubject(req.auth.ownerId, req.validatedParams.subjectId);
      res.json({ data: { subject } });
    }),
    listTimetable: action(async (req, res) => {
      const entries = await service.listTimetable(
        req.auth.ownerId,
        req.validatedParams.semesterId,
        req.query.includeInactive === 'true',
      );
      res.json({ data: { entries } });
    }),
    createTimetableEntry: action(async (req, res) => {
      const entry = await service.createTimetableEntry(
        req.auth.ownerId,
        req.validatedParams.semesterId,
        req.validatedBody,
      );
      res.status(201).json({ data: { entry } });
    }),
    updateTimetableEntry: action(async (req, res) => {
      const entry = await service.updateTimetableEntry(
        req.auth.ownerId,
        req.validatedParams.entryId,
        req.validatedBody,
      );
      res.json({ data: { entry } });
    }),
    correctTimetableEntry: action(async (req, res) => {
      const entry = await service.correctTimetableEntry(
        req.auth.ownerId,
        req.validatedParams.entryId,
        req.validatedBody,
      );
      res.json({ data: { entry } });
    }),
    restoreTimetableEntry: action(async (req, res) => {
      const entry = await service.restoreTimetableEntry(req.auth.ownerId, req.validatedParams.entryId);
      res.json({ data: { entry } });
    }),
    archiveTimetableEntry: action(async (req, res) => {
      const entry = await service.archiveTimetableEntry(req.auth.ownerId, req.validatedParams.entryId);
      res.json({ data: { entry } });
    }),
  };
}

module.exports = { createAcademicController };
