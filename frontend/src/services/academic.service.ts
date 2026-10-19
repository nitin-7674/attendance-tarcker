import type { Semester, Subject, TimetableEntry } from '../types/academic';
import { apiRequest } from './api';

export interface SemesterInput {
  name: string;
  startDate: string;
  endDate: string;
}

export interface SubjectInput {
  name: string;
  code?: string;
  targetPercentage: number;
}

export interface TimetableInput {
  subjectId: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  type: 'L' | 'P';
  teacherName?: string;
  classroom?: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export async function listSemesters(): Promise<Semester[]> {
  const response = await apiRequest<{ data: { semesters: Semester[] } }>('/semesters');
  return response.data.semesters;
}

export async function createSemester(input: SemesterInput): Promise<Semester> {
  const response = await apiRequest<{ data: { semester: Semester } }>('/semesters', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return response.data.semester;
}

export async function updateSemester(semesterId: string, input: Partial<SemesterInput> & { status?: Semester['status'] }): Promise<Semester> {
  const response = await apiRequest<{ data: { semester: Semester } }>(`/semesters/${semesterId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return response.data.semester;
}

export async function listSubjects(semesterId: string, includeInactive = false): Promise<Subject[]> {
  const response = await apiRequest<{ data: { subjects: Subject[] } }>(
    `/semesters/${semesterId}/subjects${includeInactive ? '?includeInactive=true' : ''}`,
  );
  return response.data.subjects;
}

export async function updateSubject(subjectId: string, input: Partial<SubjectInput>): Promise<Subject> {
  const response = await apiRequest<{ data: { subject: Subject } }>(`/subjects/${subjectId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return response.data.subject;
}

export async function createSubject(semesterId: string, input: SubjectInput): Promise<Subject> {
  const response = await apiRequest<{ data: { subject: Subject } }>(
    `/semesters/${semesterId}/subjects`,
    { method: 'POST', body: JSON.stringify(input) },
  );
  return response.data.subject;
}

export async function archiveSubject(subjectId: string): Promise<void> {
  await apiRequest(`/subjects/${subjectId}`, { method: 'DELETE' });
}

export async function restoreSubject(subjectId: string): Promise<Subject> {
  const response = await apiRequest<{ data: { subject: Subject } }>(`/subjects/${subjectId}/restore`, {
    method: 'POST',
  });
  return response.data.subject;
}

export async function listTimetable(semesterId: string, includeInactive = false): Promise<TimetableEntry[]> {
  const response = await apiRequest<{ data: { entries: TimetableEntry[] } }>(
    `/semesters/${semesterId}/timetable${includeInactive ? '?includeInactive=true' : ''}`,
  );
  return response.data.entries;
}

export async function correctTimetableEntry(entryId: string, input: TimetableInput): Promise<TimetableEntry> {
  const response = await apiRequest<{ data: { entry: TimetableEntry } }>(`/timetable/${entryId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return response.data.entry;
}

export async function updateTimetableEntry(entryId: string, input: TimetableInput): Promise<TimetableEntry> {
  const response = await apiRequest<{ data: { entry: TimetableEntry } }>(`/timetable/${entryId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return response.data.entry;
}

export async function createTimetableEntry(
  semesterId: string,
  input: TimetableInput,
): Promise<TimetableEntry> {
  const response = await apiRequest<{ data: { entry: TimetableEntry } }>(
    `/semesters/${semesterId}/timetable`,
    { method: 'POST', body: JSON.stringify(input) },
  );
  return response.data.entry;
}

export async function archiveTimetableEntry(entryId: string): Promise<void> {
  await apiRequest(`/timetable/${entryId}`, { method: 'DELETE' });
}

export async function restoreTimetableEntry(entryId: string): Promise<TimetableEntry> {
  const response = await apiRequest<{ data: { entry: TimetableEntry } }>(`/timetable/${entryId}/restore`, {
    method: 'POST',
  });
  return response.data.entry;
}

export interface SetupImportResult {
  imported: number;
}

export async function importSetupFile(
  semesterId: string,
  kind: 'subjects' | 'timetable',
  file: File,
): Promise<SetupImportResult> {
  const body = new FormData();
  body.append('file', file);
  const response = await apiRequest<{ data: SetupImportResult }>(
    `/semesters/${semesterId}/setup-imports/${kind}`,
    { method: 'POST', body },
  );
  return response.data;
}
