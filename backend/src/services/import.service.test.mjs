import { describe, expect, it } from 'vitest';
import importModule from './import.service.js';

const { normalizeDate, normalizeTime } = importModule;

describe('import normalization', () => {
  it('accepts the documented date and time formats', () => {
    expect(normalizeDate('2026-10-17')).toBe('2026-10-17');
    expect(normalizeDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(normalizeTime('09:30-10:20')).toEqual({ startMinute: 570, endMinute: 620 });
  });
  it('rejects malformed or reversed times', () => {
    expect(normalizeTime('10:20-09:30')).toBeNull();
    expect(normalizeTime('period one')).toBeNull();
  });
});
