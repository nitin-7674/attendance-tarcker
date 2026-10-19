import type { DutyLeaveApplication } from '../types/academic';
import { apiRequest } from './api';

export async function listDutyLeave(semesterId: string): Promise<DutyLeaveApplication[]> {
  const response = await apiRequest<{ data: { applications: DutyLeaveApplication[] } }>(
    `/semesters/${semesterId}/dl`,
  );
  return response.data.applications;
}

export async function createDutyLeave(
  semesterId: string,
  input: { eventName: string; reason: string; reference?: string; startAt: string; endAt: string },
): Promise<DutyLeaveApplication> {
  const response = await apiRequest<{ data: { application: DutyLeaveApplication } }>(
    `/semesters/${semesterId}/dl`,
    { method: 'POST', body: JSON.stringify(input) },
  );
  return response.data.application;
}

export async function updateDutyLeaveStatus(
  id: string,
  status: DutyLeaveApplication['status'],
): Promise<DutyLeaveApplication> {
  const response = await apiRequest<{ data: { application: DutyLeaveApplication } }>(`/dl/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return response.data.application;
}

export async function reconcileDutyLeave(
  id: string,
): Promise<{ eligible: number; applied: number; alreadyCredited: number }> {
  const response = await apiRequest<{
    data: { eligible: number; applied: number; alreadyCredited: number };
  }>(`/dl/${id}/reconcile`, { method: 'POST' });
  return response.data;
}
