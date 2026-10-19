const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const { createSessionMiddleware } = require('./config/session');
const { errorHandler, notFoundHandler } = require('./middleware/errors');
const { createTrustedOriginMiddleware } = require('./middleware/trusted-origin');
const { createUserRepository } = require('./repositories/user.repository');
const { createAcademicRepositories } = require('./repositories/academic.repository');
const { createAttendanceRepository } = require('./repositories/attendance.repository');
const { createDutyLeaveRepository } = require('./repositories/duty-leave.repository');
const { createImportRepository } = require('./repositories/import.repository');
const { createArchiveRepository } = require('./repositories/archive.repository');
const { createQueryConsoleRepository } = require('./repositories/query-console.repository');
const { createClassNoteRepository } = require('./repositories/class-note.repository');
const { createAcademicRoutes } = require('./routes/academic.routes');
const { createAttendanceRoutes } = require('./routes/attendance.routes');
const { createAnalyticsRoutes } = require('./routes/analytics.routes');
const { createDutyLeaveRoutes } = require('./routes/duty-leave.routes');
const { createImportRoutes } = require('./routes/import.routes');
const { createSetupImportRoutes } = require('./routes/setup-import.routes');
const { createArchiveRoutes } = require('./routes/archive.routes');
const { createQueryConsoleRoutes } = require('./routes/query-console.routes');
const { createClassNoteRoutes } = require('./routes/class-note.routes');
const { createAuthRoutes } = require('./routes/auth.routes');
const healthRoutes = require('./routes/health.routes');
const { createAcademicService } = require('./services/academic.service');
const { createAttendanceService } = require('./services/attendance.service');
const { createAnalyticsService } = require('./services/analytics.service');
const { createDutyLeaveService } = require('./services/duty-leave.service');
const { createExportService } = require('./services/export.service');
const { createImportService } = require('./services/import.service');
const { createSetupImportService } = require('./services/setup-import.service');
const { createArchiveService } = require('./services/archive.service');
const { createQueryConsoleService } = require('./services/query-console.service');
const { createClassNoteService } = require('./services/class-note.service');
const { createAuthService } = require('./services/auth.service');

function createApp(options = {}) {
  const app = express();
  const frontendOrigin = options.frontendOrigin || 'http://localhost:5173';
  const authService =
    options.authService || createAuthService({ userRepository: createUserRepository() });
  const academicRepositories = options.academicRepositories || createAcademicRepositories();
  const academicService = options.academicService || createAcademicService(academicRepositories);
  const attendanceRepository = options.attendanceRepository || createAttendanceRepository();
  const dutyLeaveRepository = options.dutyLeaveRepository || createDutyLeaveRepository();
  const attendanceService =
    options.attendanceService ||
    createAttendanceService({
      repository: attendanceRepository,
      academicRepositories,
    });
  const dutyLeaveService =
    options.dutyLeaveService ||
    createDutyLeaveService({
      repository: dutyLeaveRepository,
      attendanceRepository,
      academicRepositories,
    });
  const analyticsService =
    options.analyticsService ||
    createAnalyticsService({ attendanceRepository, dutyLeaveRepository, academicRepositories });
  const exportService = options.exportService || createExportService({ attendanceRepository, academicRepositories });
  const importService =
    options.importService ||
    createImportService({
      repository: createImportRepository(),
      attendanceRepository,
      attendanceService,
      academicRepositories,
    });
  const setupImportService =
    options.setupImportService || createSetupImportService({ academicRepositories, academicService });
  const archiveService =
    options.archiveService ||
    createArchiveService({ repository: createArchiveRepository(), academicRepositories });
  const queryConsoleService =
    options.queryConsoleService ||
    createQueryConsoleService({
      repository: createQueryConsoleRepository(),
      academicRepositories,
    });
  const classNoteService =
    options.classNoteService ||
    createClassNoteService({
      repository: createClassNoteRepository(),
      attendanceService,
    });

  app.disable('x-powered-by');
  if (options.nodeEnv === 'production') {
    app.set('trust proxy', 1);
  }
  app.use(helmet());
  app.use(
    cors({
      origin: frontendOrigin,
      credentials: true,
    }),
  );
  app.use(createTrustedOriginMiddleware(frontendOrigin));
  app.use(express.json({ limit: '1mb' }));
  app.use(
    createSessionMiddleware({
      nodeEnv: options.nodeEnv || 'test',
      secret: options.sessionSecret || 'test-only-session-secret-at-least-32-characters',
      maxAgeMs: options.sessionMaxAgeMs || 604800000,
      store: options.sessionStore,
    }),
  );

  app.use('/api/v1/health', healthRoutes);
  app.use('/api/v1/auth', createAuthRoutes(authService));
  app.use('/api/v1', createAcademicRoutes(academicService));
  app.use('/api/v1', createAttendanceRoutes(attendanceService));
  app.use('/api/v1', createDutyLeaveRoutes(dutyLeaveService));
  app.use('/api/v1', createAnalyticsRoutes(analyticsService));
  app.use('/api/v1', createImportRoutes(importService, exportService, options.uploadMaxBytes));
  app.use('/api/v1', createSetupImportRoutes(setupImportService, options.uploadMaxBytes));
  app.use('/api/v1', createArchiveRoutes(archiveService));
  app.use('/api/v1', createQueryConsoleRoutes(queryConsoleService));
  app.use('/api/v1', createClassNoteRoutes(classNoteService));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
