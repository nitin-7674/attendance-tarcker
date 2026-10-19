import { describe, expect, it, vi } from 'vitest';
import setupImportModule from './setup-import.service.js';

const {
  SUBJECT_HEADERS,
  createSetupImportService,
  normalizeClock,
  normalizeDay,
  normalizeType,
  readRows,
} = setupImportModule;

function dependencies() {
  const academicRepositories = {
    semesters: {
      findById: vi.fn(async () => ({
        _id: 'semester-1',
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        endDate: new Date('2026-06-30T00:00:00.000Z'),
      })),
    },
    subjects: { list: vi.fn(async () => []) },
    timetable: { list: vi.fn(async () => []) },
  };
  const academicService = {
    createSubject: vi.fn(async (_ownerId, semesterId, input) => ({ id: 'subject-1', semesterId, ...input })),
    createTimetableEntry: vi.fn(),
  };
  return { academicRepositories, academicService };
}

describe('setup import service', () => {
  it('normalizes documented timetable values', () => {
    expect(normalizeDay('Monday')).toBe(1);
    expect(normalizeDay('7')).toBe(7);
    expect(normalizeClock('09:30')).toBe(570);
    expect(normalizeType('Practical')).toBe('P');
  });

  it('rejects files whose headers do not match the template', async () => {
    const file = { originalname: 'subjects.csv', buffer: Buffer.from('Subject,Code,Target Percentage\r\nMath,MTH,75\r\n') };
    await expect(readRows(file, SUBJECT_HEADERS)).rejects.toMatchObject({
      status: 422,
      code: 'INVALID_IMPORT_HEADERS',
    });
  });

  it('validates the whole subject file before importing any row', async () => {
    const deps = dependencies();
    const service = createSetupImportService(deps);
    const file = {
      originalname: 'subjects.csv',
      buffer: Buffer.from('Name,Code,Target Percentage\r\nMathematics,MTH,75\r\nPhysics,PHY,150\r\n'),
    };

    await expect(service.importSubjects('owner-1', 'semester-1', file)).rejects.toMatchObject({
      status: 422,
      code: 'IMPORT_VALIDATION_FAILED',
      details: { rows: [{ rowNumber: 3 }] },
    });
    expect(deps.academicService.createSubject).not.toHaveBeenCalled();
  });

  it('imports valid subject rows with the documented default target', async () => {
    const deps = dependencies();
    const service = createSetupImportService(deps);
    const file = {
      originalname: 'subjects.csv',
      buffer: Buffer.from('Name,Code,Target Percentage\r\nMathematics,MTH,\r\n'),
    };

    await expect(service.importSubjects('owner-1', 'semester-1', file)).resolves.toMatchObject({ imported: 1 });
    expect(deps.academicService.createSubject).toHaveBeenCalledWith(
      'owner-1',
      'semester-1',
      { name: 'Mathematics', code: 'MTH', targetPercentage: 75 },
    );
  });

  it('matches timetable subjects by code and imports documented values', async () => {
    const deps = dependencies();
    deps.academicRepositories.subjects.list.mockResolvedValue([
      { _id: 'subject-1', name: 'Mathematics', code: 'MTH', active: true },
    ]);
    deps.academicService.createTimetableEntry.mockResolvedValue({ id: 'entry-1' });
    const service = createSetupImportService(deps);
    const file = {
      originalname: 'timetable.csv',
      buffer: Buffer.from(
        'Subject,Day,Start Time,End Time,Type,Teacher,Room,Effective From,Effective To\r\nMTH,Monday,09:00,10:00,Lecture,Dr Rao,A-1,2026-01-05,\r\n',
      ),
    };

    await expect(service.importTimetable('owner-1', 'semester-1', file)).resolves.toMatchObject({ imported: 1 });
    expect(deps.academicService.createTimetableEntry).toHaveBeenCalledWith(
      'owner-1',
      'semester-1',
      expect.objectContaining({
        subjectId: 'subject-1',
        dayOfWeek: 1,
        startMinute: 540,
        endMinute: 600,
        type: 'L',
        effectiveFrom: '2026-01-05',
        effectiveTo: null,
      }),
    );
  });
});
