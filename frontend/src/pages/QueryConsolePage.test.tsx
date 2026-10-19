import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryConsolePage } from './QueryConsolePage';
import * as queryService from '../services/query-console.service';

vi.mock('../context/useAcademic', () => ({
  useAcademic: () => ({
    selectedSemester: { id: '507f1f77bcf86cd799439011', name: 'Semester 1', status: 'CURRENT' },
  }),
}));

vi.mock('../services/query-console.service', async () => {
  const actual = await vi.importActual<typeof import('../services/query-console.service')>('../services/query-console.service');
  return { ...actual, getQuerySchema: vi.fn(), executeQuery: vi.fn() };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('QueryConsolePage', () => {
  it('shows approved fields and sends the guided example query', async () => {
    vi.mocked(queryService.getQuerySchema).mockResolvedValue({
      maxLimit: 100,
      operators: [{ value: '$in', meaning: 'matches any value in an array' }],
      collections: [{
        value: 'attendanceRecords',
        label: 'Attendance records',
        description: 'Explicit attendance records.',
        fields: [
          { name: 'subjectId', type: 'object ID' },
          { name: 'status', type: 'PRESENT or ABSENT' },
          { name: 'classDate', type: 'date' },
          { name: 'startMinute', type: 'number' },
          { name: 'blockReason', type: 'text' },
        ],
        filterHelpers: [
          { name: 'courseName', type: 'text', description: 'Course/subject name.' },
          { name: 'courseId', type: 'text', description: 'The familiar course code.' },
          { name: 'teacherName', type: 'text', description: 'Teacher name.' },
          { name: 'startTime', type: '24-hour time (HH:MM)', description: 'For example 20:00 for 8:00 PM.' },
        ],
        examples: [{
          label: 'Recent absences',
          filter: { status: 'ABSENT' },
          projection: ['subjectId', 'status', 'classDate', 'startMinute', 'blockReason'],
          sort: { classDate: 'desc' },
        }],
      }],
    });
    vi.mocked(queryService.executeQuery).mockResolvedValue({
      collection: 'attendanceRecords',
      count: 1,
      rows: [{ status: 'ABSENT', startMinute: 1200 }],
    });
    const user = userEvent.setup();
    render(<QueryConsolePage />);

    expect(await screen.findByText('PRESENT or ABSENT')).toBeInTheDocument();
    expect(screen.getByText('matches any value in an array')).toBeInTheDocument();
    expect(screen.getByText('No database ID needed:')).toBeInTheDocument();
    expect(screen.getByText('20:00', { selector: 'code' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Run read-only query' }));

    expect(queryService.executeQuery).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'attendanceRecords',
      filter: { status: 'ABSENT' },
      sort: { classDate: 'desc' },
      limit: 25,
    }));
    expect(await screen.findByText('8:00 PM')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Start time' })).toBeInTheDocument();
  });
});
