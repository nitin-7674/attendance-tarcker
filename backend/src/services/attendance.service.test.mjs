import { describe, expect, it, vi } from 'vitest';
import attendanceModule from './attendance.service.js';

const { createAttendanceService, overlaps, regularKey } = attendanceModule;

function setup({ existing = [], entries } = {}) {
  const repository = {
    listTimetableForDate: vi.fn(async () => entries || [
      { _id: 'entry-1', subjectId: 'subject-1', startMinute: 540, endMinute: 600, type: 'L' },
      { _id: 'entry-2', subjectId: 'subject-2', startMinute: 570, endMinute: 630, type: 'L' },
    ]),
    listExceptionsForDate: vi.fn(async () => []),
    listAttendanceByKeys: vi.fn(async () => existing),
    upsertAttendance: vi.fn(async (_owner, _semester, _key, values) => values),
    insertAbsentOnlyIfPending: vi.fn(async () => true),
    createException: vi.fn(),
  };
  const academicRepositories = {
    semesters: { findById: vi.fn(async () => ({ startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') })) },
    subjects: { findById: vi.fn(async (_owner, id) => ({ _id: id, semesterId: 'semester-1', active: true })) },
  };
  return { repository, service: createAttendanceService({ repository, academicRepositories }) };
}

describe('attendance service', () => {
  it('uses half-open ranges for overlap detection', () => {
    expect(overlaps({ startMinute: 810, endMinute: 850 }, { startMinute: 840, endMinute: 900 })).toBe(true);
    expect(overlaps({ startMinute: 810, endMinute: 840 }, { startMinute: 840, endMinute: 900 })).toBe(false);
  });

  it('infers pending and keeps overlapping periods independent', async () => {
    const { service } = setup();
    const day = await service.getDailySchedule('owner-1', 'semester-1', '2026-10-19');
    expect(day.occurrences).toHaveLength(2);
    expect(day.occurrences.every((item) => item.status === 'PENDING')).toBe(true);
    expect(day.occurrences[0].occurrenceKey).not.toBe(day.occurrences[1].occurrenceKey);
  });

  it('requires a decision before marking present when pending classes overlap', async () => {
    const { service } = setup();
    await expect(
      service.markAttendance('owner-1', 'semester-1', regularKey('entry-1', '2026-10-19'), {
        classDate: '2026-10-19',
        status: 'PRESENT',
      }),
    ).rejects.toMatchObject({ status: 409, code: 'OVERLAP_CONFIRMATION_REQUIRED' });
  });

  it('marks only pending overlaps absent after confirmation', async () => {
    const { service, repository } = setup();
    const result = await service.markAttendance(
      'owner-1',
      'semester-1',
      regularKey('entry-1', '2026-10-19'),
      { classDate: '2026-10-19', status: 'PRESENT', overlapAction: 'MARK_PENDING_ABSENT' },
    );
    expect(result.autoMarkedAbsent).toEqual([regularKey('entry-2', '2026-10-19')]);
    expect(repository.insertAbsentOnlyIfPending).toHaveBeenCalledTimes(1);
  });
});
