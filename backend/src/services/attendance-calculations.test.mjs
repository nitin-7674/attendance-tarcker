import { describe, expect, it } from 'vitest';
import calculations from './attendance-calculations.js';

const { absenceAllowance, actualAttendance, adjustedAttendance, periodsNeededForTarget } = calculations;

describe('attendance calculations', () => {
  it('returns N/A as null when no eligible periods exist', () => {
    expect(actualAttendance(0, 0)).toBeNull();
  });
  it('uses period-weighted percentages', () => {
    expect(actualAttendance(7, 3)).toBe(70);
    expect(adjustedAttendance(7, 3, 2)).toBe(90);
  });
  it('calculates periods needed and clamps absence allowance', () => {
    expect(periodsNeededForTarget(7, 3, 75)).toBe(2);
    expect(absenceAllowance(7, 3, 75)).toBe(0);
  });
  it('reports an impossible return to 100 percent after an absence', () => {
    expect(periodsNeededForTarget(7, 1, 100)).toBeNull();
  });
});
