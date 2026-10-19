import type { DashboardSummary } from '../types/academic';
import { apiRequest } from './api';

export async function getDashboard(semesterId: string): Promise<DashboardSummary> {
  const response = await apiRequest<{ data: DashboardSummary }>(
    `/semesters/${semesterId}/dashboard`,
  );
  return response.data;
}
