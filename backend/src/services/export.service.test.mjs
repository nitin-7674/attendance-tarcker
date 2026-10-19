import { describe, expect, it } from 'vitest';
import exportModule from './export.service.js';

const { safeCell } = exportModule;

describe('CSV export safety', () => {
  it('neutralizes spreadsheet formula prefixes', () => {
    expect(safeCell('=HYPERLINK("bad")')).toBe('\'=HYPERLINK("bad")');
    expect(safeCell('ordinary')).toBe('ordinary');
  });
});
