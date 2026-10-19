import { createContext } from 'react';
import type { Semester } from '../types/academic';
import type { SemesterInput } from '../services/academic.service';

export interface AcademicContextValue {
  semesters: Semester[];
  selectedSemester: Semester | null;
  loading: boolean;
  selectSemester(id: string): void;
  createSemester(input: SemesterInput): Promise<Semester>;
  refreshSemesters(): Promise<void>;
}

export const AcademicContext = createContext<AcademicContextValue | null>(null);
