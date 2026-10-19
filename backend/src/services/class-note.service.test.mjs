import { describe, expect, it, vi } from 'vitest';
import noteModule from './class-note.service.js';

const { createClassNoteService } = noteModule;

describe('class note service', () => {
  it('requires the note to belong to a real occurrence for the owner and date', async () => {
    const service = createClassNoteService({
      repository: { find: vi.fn(), upsert: vi.fn() },
      attendanceService: { getDailySchedule: vi.fn(async () => ({ occurrences: [] })) },
    });
    await expect(service.get('owner-1', 'semester-1', 'missing', '2026-10-17')).rejects.toMatchObject({ code: 'OCCURRENCE_NOT_FOUND' });
  });
});
