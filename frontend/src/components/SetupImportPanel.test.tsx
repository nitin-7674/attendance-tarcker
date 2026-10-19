import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SetupImportPanel } from './SetupImportPanel';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('SetupImportPanel', () => {
  it('offers both templates and imports a selected CSV file', async () => {
    const onImported = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: { imported: 2 } }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    const user = userEvent.setup();
    render(
      <SetupImportPanel
        semesterId="semester-1"
        kind="subjects"
        format="Name, Code, Target Percentage"
        onImported={onImported}
      />,
    );

    expect(screen.getByRole('link', { name: 'CSV template' })).toHaveAttribute(
      'href',
      '/api/v1/setup-imports/subjects/templates/csv',
    );
    expect(screen.getByRole('link', { name: 'Excel template' })).toHaveAttribute(
      'href',
      '/api/v1/setup-imports/subjects/templates/xlsx',
    );

    const file = new File(['Name,Code,Target Percentage\nMath,MTH,75\n'], 'subjects.csv', {
      type: 'text/csv',
    });
    const fileInput = screen.getByLabelText('Completed CSV or Excel file');
    await user.upload(fileInput, file);
    fireEvent.submit(fileInput.closest('form')!);

    expect(await screen.findByText('2 subjects imported.')).toBeInTheDocument();
    expect(onImported).toHaveBeenCalledOnce();
  });
});
