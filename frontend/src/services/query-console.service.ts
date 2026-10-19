import { apiRequest } from './api';

export type QueryCollection =
  | 'subjects'
  | 'timetableEntries'
  | 'attendanceRecords'
  | 'calendarExceptions'
  | 'dutyLeaveApplications'
  | 'classNotes';

export interface QueryFieldDefinition {
  name: string;
  type: string;
}

export interface QueryFilterHelper extends QueryFieldDefinition {
  description: string;
}

export interface QueryExample {
  label: string;
  filter: Record<string, unknown>;
  projection: string[];
  sort: Record<string, 'asc' | 'desc'>;
}

export interface QueryCollectionDefinition {
  value: QueryCollection;
  label: string;
  description: string;
  fields: QueryFieldDefinition[];
  filterHelpers: QueryFilterHelper[];
  examples: QueryExample[];
}

export interface QueryConsoleSchema {
  maxLimit: number;
  operators: { value: string; meaning: string }[];
  collections: QueryCollectionDefinition[];
}

export async function getQuerySchema(): Promise<QueryConsoleSchema> {
  const response = await apiRequest<{ data: QueryConsoleSchema }>('/query-console/schema');
  return response.data;
}

export async function executeQuery(input: {
  semesterId: string;
  collection: QueryCollection;
  filter: Record<string, unknown>;
  projection?: string[];
  sort?: Record<string, 'asc' | 'desc'>;
  limit: number;
}): Promise<{ collection: string; count: number; rows: Record<string, unknown>[] }> {
  const response = await apiRequest<{
    data: { collection: string; count: number; rows: Record<string, unknown>[] };
  }>('/query-console/execute', { method: 'POST', body: JSON.stringify(input) });
  return response.data;
}
