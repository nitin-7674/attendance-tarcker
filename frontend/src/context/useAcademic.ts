import { useContext } from 'react';
import { AcademicContext } from './academic-context';

export function useAcademic() {
  const context = useContext(AcademicContext);
  if (!context) throw new Error('useAcademic must be used inside AcademicProvider.');
  return context;
}
