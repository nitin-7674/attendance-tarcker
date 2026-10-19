import { describe, expect, it } from 'vitest';
import dutyLeaveModule from './duty-leave.service.js';

const { partiallyOverlaps } = dutyLeaveModule;

describe('Duty Leave overlap', () => {
  const record = { classDate: new Date('2026-10-17T00:00:00.000Z'), startMinute: 810, endMinute: 850 };
  it('includes partial overlap', () => {
    expect(partiallyOverlaps(record, new Date('2026-10-17T14:00:00.000Z'), new Date('2026-10-17T15:00:00.000Z'))).toBe(true);
  });
  it('excludes a class ending exactly when leave starts', () => {
    expect(partiallyOverlaps(record, new Date('2026-10-17T14:10:00.000Z'), new Date('2026-10-17T15:00:00.000Z'))).toBe(false);
  });
});
