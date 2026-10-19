import type { AttendanceStatus, ClassNote, DailyAttendance } from '../types/academic';
import { apiRequest } from './api';

export type OverlapAction = 'MARK_PENDING_ABSENT' | 'LEAVE_UNCHANGED';

export async function getDailyAttendance(
  semesterId: string,
  date: string,
): Promise<DailyAttendance> {
  const response = await apiRequest<{ data: DailyAttendance }>(
    `/semesters/${semesterId}/attendance?date=${encodeURIComponent(date)}`,
  );
  return response.data;
}

export async function markAttendance(
  semesterId: string,
  occurrenceKey: string,
  classDate: string,
  status: Exclude<AttendanceStatus, 'PENDING'>,
  overlapAction?: OverlapAction,
): Promise<void> {
  await apiRequest(
    `/semesters/${semesterId}/occurrences/${encodeURIComponent(occurrenceKey)}/attendance`,
    {
      method: 'PATCH',
      body: JSON.stringify({ classDate, status, overlapAction }),
    },
  );
}

export async function createHoliday(
  semesterId: string,
  input: { date: string; reason: string },
): Promise<void> {
  await apiRequest(`/semesters/${semesterId}/holidays`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function createExtraClass(
  semesterId: string,
  input: {
    date: string;
    subjectId: string;
    startMinute: number;
    endMinute: number;
    type: 'L' | 'P';
    teacherName?: string;
    classroom?: string;
    reason?: string;
  },
): Promise<void> {
  await apiRequest(`/semesters/${semesterId}/extra-classes`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getClassNote(
  semesterId: string,
  occurrenceKey: string,
  date: string,
): Promise<ClassNote> {
  const response = await apiRequest<{ data: { note: ClassNote } }>(
    `/semesters/${semesterId}/occurrences/${encodeURIComponent(occurrenceKey)}/notes?date=${encodeURIComponent(date)}`,
  );
  return response.data.note;
}

export async function saveClassNote(
  semesterId: string,
  occurrenceKey: string,
  date: string,
  note: Pick<ClassNote, 'topicCovered' | 'assignmentGiven' | 'dueDate'>,
): Promise<ClassNote> {
  const response = await apiRequest<{ data: { note: ClassNote } }>(
    `/semesters/${semesterId}/occurrences/${encodeURIComponent(occurrenceKey)}/notes?date=${encodeURIComponent(date)}`,
    { method: 'PUT', body: JSON.stringify(note) },
  );
  return response.data.note;
}
