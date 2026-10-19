import { describe, expect, it, vi } from 'vitest';
import queryModule from './query-console.service.js';

const { createQueryConsoleService, validateFilter } = queryModule;

describe('query console safety', () => {
  it('describes the exact fields, examples and operators available to the UI', () => {
    const service = createQueryConsoleService({ repository: {}, academicRepositories: {} });
    const description = service.describe();
    const attendance = description.collections.find((item) => item.value === 'attendanceRecords');
    expect(description.maxLimit).toBe(100);
    expect(description.operators.map((item) => item.value)).toContain('$in');
    expect(description.operators.map((item) => item.value)).toContain('$contains');
    expect(attendance.fields).toContainEqual({ name: 'status', type: 'PRESENT or ABSENT' });
    expect(attendance.filterHelpers).toContainEqual(expect.objectContaining({ name: 'courseName' }));
    expect(attendance.filterHelpers).toContainEqual(expect.objectContaining({ name: 'startTime' }));
    expect(attendance.examples[0].filter).toEqual({ status: 'ABSENT' });
  });
  it('rejects attempts to manipulate owner scope', () => {
    expect(() => validateFilter('attendanceRecords', { ownerId: 'another-user' })).toThrowError(
      /scope are enforced/i,
    );
  });
  it('rejects JavaScript and unapproved operators', () => {
    expect(() => validateFilter('attendanceRecords', { status: { $where: 'evil()' } })).toThrowError(
      /unsupported operator/i,
    );
  });
  it('caps results and passes server scope separately to the repository', async () => {
    const repository = { execute: vi.fn(async () => []) };
    const academicRepositories = { semesters: { findById: vi.fn(async () => ({ status: 'CURRENT' })) } };
    const service = createQueryConsoleService({ repository, academicRepositories });
    await service.execute('owner-1', { semesterId: 'semester-1', collection: 'subjects', filter: {}, projection: ['name'], sort: {}, limit: 1000 });
    expect(repository.execute).toHaveBeenCalledWith('subjects', 'owner-1', 'semester-1', expect.objectContaining({ limit: 100 }));
  });

  it('resolves course, teacher and clock-time helpers without exposing database IDs', async () => {
    const repository = { execute: vi.fn(async () => []) };
    const academicRepositories = {
      semesters: { findById: vi.fn(async () => ({ status: 'CURRENT' })) },
      subjects: {
        list: vi.fn(async () => [
          { _id: 'subject-1', name: 'Advanced Mathematics', code: 'MTH101' },
          { _id: 'subject-2', name: 'Physics', code: 'PHY101' },
        ]),
      },
    };
    const service = createQueryConsoleService({ repository, academicRepositories });

    await service.execute('owner-1', {
      semesterId: 'semester-1',
      collection: 'attendanceRecords',
      filter: {
        courseName: { $contains: 'math' },
        teacherName: { $contains: 'rao' },
        startTime: { $gte: '20:00' },
      },
      projection: ['status', 'startMinute'],
      sort: {},
      limit: 25,
    });

    const query = repository.execute.mock.calls[0][3];
    expect(query.filter.subjectId).toEqual({ $in: ['subject-1'] });
    expect(query.filter.startMinute).toEqual({ $gte: 1200 });
    expect(query.filter.teacherSnapshot).toBeInstanceOf(RegExp);
    expect(query.filter.teacherSnapshot.test('Professor Rao')).toBe(true);
  });

  it('explains how to enter invalid clock times', async () => {
    const repository = { execute: vi.fn(async () => []) };
    const academicRepositories = { semesters: { findById: vi.fn(async () => ({ status: 'CURRENT' })) } };
    const service = createQueryConsoleService({ repository, academicRepositories });
    await expect(service.execute('owner-1', {
      semesterId: 'semester-1',
      collection: 'timetableEntries',
      filter: { startTime: '8 PM' },
      projection: ['startMinute'],
      sort: {},
      limit: 25,
    })).rejects.toThrowError(/20:00 for 8:00 PM/i);
  });
});
