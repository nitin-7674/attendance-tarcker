import { apiRequest } from './api';

export interface ImportPreviewRow {
  rowNumber: number;
  date: string;
  time: string;
  status: string;
  type: string;
  teacherName: string;
  blockReason: string;
  outcome: 'VALID' | 'SKIPPED' | 'REJECTED';
  messages: string[];
}

export interface ImportPreview {
  id: string;
  status: 'PREVIEWED';
  rowCounts: { total: number; valid: number; skipped: number; rejected: number; committed: number };
  rows: ImportPreviewRow[];
}

export async function previewImport(
  semesterId: string,
  subjectId: string,
  file: File,
): Promise<ImportPreview> {
  const body = new FormData();
  body.append('semesterId', semesterId);
  body.append('subjectId', subjectId);
  body.append('file', file);
  const response = await apiRequest<{ data: ImportPreview }>('/imports/preview', {
    method: 'POST',
    body,
  });
  return response.data;
}

export async function commitImport(importId: string): Promise<{
  committed: number;
  skipped: number;
  rejected: number;
}> {
  const response = await apiRequest<{
    data: { committed: number; skipped: number; rejected: number };
  }>('/imports/commit', { method: 'POST', body: JSON.stringify({ importId }) });
  return response.data;
}
