import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import * as academicService from '../services/academic.service';
import type { Semester } from '../types/academic';
import { AcademicContext } from './academic-context';

export function AcademicProvider({ children }: PropsWithChildren) {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const refreshSemesters = useCallback(async () => {
    const records = await academicService.listSemesters();
    setSemesters(records);
    setSelectedId((current) => {
      if (records.some((semester) => semester.id === current)) return current;
      return records.find((semester) => semester.status === 'CURRENT')?.id || records[0]?.id || '';
    });
  }, []);

  useEffect(() => {
    refreshSemesters()
      .catch((error) => console.error('Unable to load semesters.', error))
      .finally(() => setLoading(false));
  }, [refreshSemesters]);

  const value = useMemo(
    () => ({
      semesters,
      selectedSemester: semesters.find((semester) => semester.id === selectedId) || null,
      loading,
      selectSemester: setSelectedId,
      async createSemester(input: academicService.SemesterInput) {
        const semester = await academicService.createSemester(input);
        setSemesters((current) => [semester, ...current]);
        setSelectedId(semester.id);
        return semester;
      },
      refreshSemesters,
    }),
    [loading, refreshSemesters, selectedId, semesters],
  );

  return <AcademicContext.Provider value={value}>{children}</AcademicContext.Provider>;
}
