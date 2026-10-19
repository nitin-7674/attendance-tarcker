import { describe, expect, it, vi } from 'vitest';
import academicModule from './academic.service.js';

const { createAcademicService } = academicModule;

function repositories() {
  return {
    semesters: {
      findById: vi.fn(async () => ({ _id: 'semester-1', startDate: new Date('2026-01-01'), endDate: new Date('2026-06-01') })),
      create: vi.fn(async (value) => ({ _id: 'semester-1', ...value })),
      list: vi.fn(async () => []),
      update: vi.fn(),
    },
    subjects: {
      findById: vi.fn(async () => ({ _id: 'subject-1', semesterId: 'semester-1' })),
      create: vi.fn(async (value) => ({ _id: 'subject-1', ...value })),
      list: vi.fn(async () => []),
      update: vi.fn(),
    },
    timetable: {
      create: vi.fn(async (value) => ({ _id: 'entry-1', ...value })),
      list: vi.fn(async () => []),
      findById: vi.fn(),
      update: vi.fn(async (_owner, _id, value) => ({ _id: 'entry-1', ...value })),
    },
  };
}

describe('academic service', () => {
  it('rejects a semester whose end date is not after its start date', async () => {
    const service = createAcademicService(repositories());
    await expect(
      service.createSemester('owner-1', {
        name: 'Invalid',
        startDate: '2026-06-01',
        endDate: '2026-01-01',
      }),
    ).rejects.toMatchObject({ status: 422, code: 'INVALID_DATE_RANGE' });
  });

  it('creates independent timetable periods and always adds owner scope', async () => {
    const repos = repositories();
    const service = createAcademicService(repos);
    await service.createTimetableEntry('owner-1', 'semester-1', {
      subjectId: 'subject-1',
      dayOfWeek: 1,
      startMinute: 540,
      endMinute: 600,
      type: 'L',
      teacherName: 'Professor',
      classroom: 'A-1',
      effectiveFrom: '2026-01-01',
      effectiveTo: null,
    });

    expect(repos.timetable.create).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: 'owner-1', semesterId: 'semester-1', scheduleVersion: 1 }),
    );
  });

  it('rejects a timetable entry whose end time is not after its start time', async () => {
    const service = createAcademicService(repositories());
    await expect(
      service.createTimetableEntry('owner-1', 'semester-1', {
        subjectId: 'subject-1',
        dayOfWeek: 1,
        startMinute: 600,
        endMinute: 600,
        type: 'L',
        effectiveFrom: '2026-01-01',
      }),
    ).rejects.toMatchObject({ status: 422, code: 'INVALID_TIME_RANGE' });
  });

  it('creates a new effective-dated version instead of mutating schedule details', async () => {
    const repos = repositories();
    repos.timetable.findById.mockResolvedValue({
      _id: 'entry-1',
      ownerId: 'owner-1',
      semesterId: 'semester-1',
      subjectId: 'subject-1',
      dayOfWeek: 1,
      startMinute: 540,
      endMinute: 600,
      type: 'L',
      teacherName: 'Old teacher',
      classroom: 'A-1',
      effectiveFrom: new Date('2099-01-01'),
      effectiveTo: null,
      scheduleVersion: 1,
      active: true,
    });
    const service = createAcademicService(repos);

    await service.updateTimetableEntry('owner-1', 'entry-1', {
      teacherName: 'New teacher',
      effectiveFrom: '2099-02-01',
    });

    expect(repos.timetable.update).toHaveBeenCalledWith(
      'owner-1',
      'entry-1',
      expect.objectContaining({ active: false, inactiveReason: 'SUPERSEDED', effectiveTo: new Date('2099-01-31T00:00:00.000Z') }),
    );
    expect(repos.timetable.create).toHaveBeenCalledWith(
      expect.objectContaining({ teacherName: 'New teacher', scheduleVersion: 2, active: true }),
    );
  });

  it('corrects a timetable typo in place without creating a new schedule version', async () => {
    const repos = repositories();
    repos.timetable.findById.mockResolvedValue({
      _id: 'entry-1',
      semesterId: 'semester-1',
      subjectId: 'subject-1',
      dayOfWeek: 1,
      startMinute: 540,
      endMinute: 600,
      type: 'L',
      teacherName: 'Old spelling',
      classroom: 'A-1',
      effectiveFrom: new Date('2099-01-01'),
      effectiveTo: null,
      scheduleVersion: 1,
      active: true,
    });
    const service = createAcademicService(repos);

    await service.correctTimetableEntry('owner-1', 'entry-1', {
      teacherName: 'Correct spelling',
    });

    expect(repos.timetable.update).toHaveBeenCalledWith(
      'owner-1',
      'entry-1',
      expect.objectContaining({ teacherName: 'Correct spelling' }),
    );
    expect(repos.timetable.create).not.toHaveBeenCalled();
  });

  it('protects timetable entries that have already started from in-place correction', async () => {
    const repos = repositories();
    repos.timetable.findById.mockResolvedValue({
      _id: 'entry-1',
      semesterId: 'semester-1',
      subjectId: 'subject-1',
      startMinute: 540,
      endMinute: 600,
      effectiveFrom: new Date('2000-01-01'),
    });
    const service = createAcademicService(repos);

    await expect(
      service.correctTimetableEntry('owner-1', 'entry-1', { teacherName: 'Changed' }),
    ).rejects.toMatchObject({ status: 409, code: 'TIMETABLE_HISTORY_PROTECTED' });
    expect(repos.timetable.update).not.toHaveBeenCalled();
  });

  it('does not restore a superseded historical timetable version', async () => {
    const repos = repositories();
    repos.timetable.findById.mockResolvedValue({
      _id: 'entry-1',
      inactiveReason: 'SUPERSEDED',
      active: false,
    });
    const service = createAcademicService(repos);

    await expect(
      service.restoreTimetableEntry('owner-1', 'entry-1'),
    ).rejects.toMatchObject({ status: 409, code: 'HISTORICAL_VERSION_READ_ONLY' });
    expect(repos.timetable.update).not.toHaveBeenCalled();
  });
});
