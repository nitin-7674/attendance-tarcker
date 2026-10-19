export type SemesterStatus = 'CURRENT' | 'COMPLETED';

export interface Semester {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: SemesterStatus;
}

export interface Subject {
  id: string;
  semesterId: string;
  name: string;
  code: string;
  targetPercentage: number;
  active: boolean;
}

export interface TimetableEntry {
  id: string;
  semesterId: string;
  subjectId: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  type: 'L' | 'P';
  teacherName: string;
  classroom: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  scheduleVersion: number;
  active: boolean;
  inactiveReason: 'SUPERSEDED' | 'ARCHIVED' | null;
}

export type AttendanceStatus = 'PENDING' | 'PRESENT' | 'ABSENT';

export interface ClassOccurrence {
  occurrenceKey: string;
  timetableEntryId?: string;
  extraClassId?: string;
  subjectId: string;
  date: string;
  startMinute: number;
  endMinute: number;
  type: 'L' | 'P';
  teacherName: string;
  classroom: string;
  source: 'RECURRING' | 'EXTRA';
  status: AttendanceStatus;
}

export interface DailyAttendance {
  date: string;
  holiday: { reason: string } | null;
  occurrences: ClassOccurrence[];
}

export interface SubjectAttendanceSummary {
  subjectId: string;
  name: string;
  code: string;
  targetPercentage: number;
  present: number;
  absent: number;
  dutyLeaveCredits: number;
  actualPercentage: number | null;
  adjustedPercentage: number | null;
  periodsNeeded: number | null;
  absenceAllowance: number | null;
  belowTarget: boolean;
}

export interface DashboardSummary {
  semester: { id: string; name: string };
  overall: {
    present: number;
    absent: number;
    dutyLeaveCredits: number;
    actualPercentage: number | null;
    adjustedPercentage: number | null;
  };
  subjects: SubjectAttendanceSummary[];
}

export interface DutyLeaveApplication {
  id: string;
  semesterId: string;
  eventName: string;
  reason: string;
  reference: string;
  startAt: string;
  endAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
}

export interface ClassNote {
  id?: string;
  occurrenceKey: string;
  topicCovered: string;
  assignmentGiven: string;
  dueDate: string | null;
}
