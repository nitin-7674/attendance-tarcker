import { apiRequest } from './api';

export interface ArchivePreparation {
  id: string;
  semesterId: string;
  archiveStatus: 'DOWNLOAD_ONLY';
  recordCounts: Record<string, number>;
  cloudStorage: false;
  sourceDataRetained: true;
}

export async function prepareArchive(semesterId: string): Promise<ArchivePreparation> {
  const response = await apiRequest<{ data: ArchivePreparation }>(
    `/semesters/${semesterId}/archive`,
    { method: 'POST' },
  );
  return response.data;
}
