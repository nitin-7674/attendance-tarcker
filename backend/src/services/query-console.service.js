const { ApiError } = require('../utils/api-error');

const allowedFields = {
  subjects: ['name', 'code', 'targetPercentage', 'active', 'createdAt', 'updatedAt'],
  timetableEntries: ['subjectId', 'dayOfWeek', 'startMinute', 'endMinute', 'type', 'teacherName', 'classroom', 'effectiveFrom', 'effectiveTo', 'active'],
  attendanceRecords: ['subjectId', 'occurrenceKey', 'status', 'classDate', 'startMinute', 'endMinute', 'type', 'teacherSnapshot', 'classroomSnapshot', 'source', 'blockReason'],
  calendarExceptions: ['date', 'type', 'subjectId', 'occurrenceKey', 'startMinute', 'endMinute', 'classType', 'teacherName', 'classroom', 'reason'],
  dutyLeaveApplications: ['eventName', 'reason', 'reference', 'startAt', 'endAt', 'status', 'createdAt', 'updatedAt'],
  classNotes: ['occurrenceKey', 'topicCovered', 'assignmentGiven', 'dueDate', 'createdAt', 'updatedAt'],
};

const subjectHelperFields = [
  { name: 'courseName', type: 'text', description: 'Course/subject name. Partial search is supported with $contains.' },
  { name: 'courseId', type: 'text', description: 'The familiar course/subject code, such as CSE101 — not a database ID.' },
];
const timeHelperFields = [
  { name: 'startTime', type: '24-hour time (HH:MM)', description: 'Class start time, for example 20:00 for 8:00 PM.' },
  { name: 'endTime', type: '24-hour time (HH:MM)', description: 'Class end time, for example 21:30 for 9:30 PM.' },
];
const queryHelpers = {
  subjects: [],
  timetableEntries: [
    ...subjectHelperFields,
    { name: 'teacherName', type: 'text', description: 'Teacher name. Partial search is supported with $contains.' },
    ...timeHelperFields,
  ],
  attendanceRecords: [
    ...subjectHelperFields,
    { name: 'teacherName', type: 'text', description: 'Teacher name saved with the attendance record. Partial search is supported with $contains.' },
    ...timeHelperFields,
  ],
  calendarExceptions: [
    ...subjectHelperFields,
    { name: 'teacherName', type: 'text', description: 'Teacher name. Partial search is supported with $contains.' },
    ...timeHelperFields,
  ],
  dutyLeaveApplications: [],
  classNotes: [],
};
const helperAliases = {
  timetableEntries: ['subjectName', 'subjectCode'],
  attendanceRecords: ['subjectName', 'subjectCode'],
  calendarExceptions: ['subjectName', 'subjectCode'],
};

const operators = new Set(['$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$contains']);
const collectionMetadata = {
  subjects: {
    label: 'Subjects',
    description: 'Subject setup, attendance targets, codes and active status.',
    fieldTypes: { name: 'text', code: 'text', targetPercentage: 'number', active: 'boolean', createdAt: 'date', updatedAt: 'date' },
    examples: [
      { label: 'Find a course by name', filter: { name: { $contains: 'math' } }, projection: ['name', 'code', 'targetPercentage'], sort: { name: 'asc' } },
      { label: 'Active subjects below 75% target', filter: { active: true, targetPercentage: { $lt: 75 } }, projection: ['name', 'code', 'targetPercentage'], sort: { name: 'asc' } },
    ],
  },
  timetableEntries: {
    label: 'Timetable entries',
    description: 'Recurring class periods and their effective date ranges.',
    fieldTypes: { subjectId: 'database ID (output only)', dayOfWeek: 'number (1=Monday, 7=Sunday)', startMinute: 'displayed as clock time', endMinute: 'displayed as clock time', type: 'L or P', teacherName: 'text', classroom: 'text', effectiveFrom: 'date', effectiveTo: 'date or null', active: 'boolean' },
    examples: [
      { label: 'Find by course and teacher', filter: { courseName: { $contains: 'math' }, teacherName: { $contains: 'rao' } }, projection: ['subjectId', 'dayOfWeek', 'startMinute', 'endMinute', 'teacherName', 'classroom'], sort: { startMinute: 'asc' } },
      { label: 'Evening classes', filter: { startTime: { $gte: '20:00' }, active: true }, projection: ['subjectId', 'dayOfWeek', 'startMinute', 'endMinute', 'teacherName'], sort: { startMinute: 'asc' } },
    ],
  },
  attendanceRecords: {
    label: 'Attendance records',
    description: 'Explicit PRESENT and ABSENT records. Pending classes are not stored.',
    fieldTypes: { subjectId: 'database ID (output only)', occurrenceKey: 'text', status: 'PRESENT or ABSENT', classDate: 'date', startMinute: 'displayed as clock time', endMinute: 'displayed as clock time', type: 'L or P', teacherSnapshot: 'teacher name', classroomSnapshot: 'classroom', source: 'RECURRING or EXTRA', blockReason: 'text' },
    examples: [
      { label: 'Recent absences', filter: { status: 'ABSENT' }, projection: ['subjectId', 'status', 'classDate', 'startMinute', 'blockReason'], sort: { classDate: 'desc' } },
      { label: 'Absences by course and teacher', filter: { status: 'ABSENT', courseId: 'CSE101', teacherName: { $contains: 'rao' } }, projection: ['subjectId', 'status', 'classDate', 'startMinute', 'teacherSnapshot'], sort: { classDate: 'desc' } },
    ],
  },
  calendarExceptions: {
    label: 'Calendar exceptions',
    description: 'Holidays, cancelled periods and extra classes.',
    fieldTypes: { date: 'date', type: 'HOLIDAY, CANCELLED or EXTRA', subjectId: 'database ID (output only)', occurrenceKey: 'text', startMinute: 'displayed as clock time', endMinute: 'displayed as clock time', classType: 'L or P', teacherName: 'text', classroom: 'text', reason: 'text' },
    examples: [
      { label: 'Holidays', filter: { type: 'HOLIDAY' }, projection: ['date', 'type', 'reason'], sort: { date: 'asc' } },
      { label: 'Evening extra classes', filter: { type: 'EXTRA', startTime: { $gte: '18:00' } }, projection: ['date', 'subjectId', 'startMinute', 'endMinute', 'teacherName'], sort: { date: 'asc' } },
    ],
  },
  dutyLeaveApplications: {
    label: 'Duty Leave applications',
    description: 'Duty Leave requests, date ranges and approval status.',
    fieldTypes: { eventName: 'text', reason: 'text', reference: 'text', startAt: 'date/time', endAt: 'date/time', status: 'PENDING, APPROVED, REJECTED or WITHDRAWN', createdAt: 'date/time', updatedAt: 'date/time' },
    examples: [{ label: 'Pending applications', filter: { status: 'PENDING' }, projection: ['eventName', 'startAt', 'endAt', 'status'], sort: { startAt: 'asc' } }],
  },
  classNotes: {
    label: 'Class notes',
    description: 'Topics, assignments and due dates saved against class occurrences.',
    fieldTypes: { occurrenceKey: 'text', topicCovered: 'text', assignmentGiven: 'text', dueDate: 'date or null', createdAt: 'date/time', updatedAt: 'date/time' },
    examples: [{ label: 'Notes with assignments', filter: { assignmentGiven: { $ne: '' } }, projection: ['occurrenceKey', 'topicCovered', 'assignmentGiven', 'dueDate'], sort: { dueDate: 'asc' } }],
  },
};

function filterableFields(collection) {
  return [
    ...allowedFields[collection],
    ...(queryHelpers[collection] || []).map((field) => field.name),
    ...(helperAliases[collection] || []),
  ];
}

function validateFilter(collection, filter) {
  const sanitized = {};
  for (const [field, value] of Object.entries(filter || {})) {
    if (field === 'ownerId' || field === 'semesterId') {
      throw new ApiError(400, 'OWNER_SCOPE_IMMUTABLE', 'Ownership and semester scope are enforced by the server.');
    }
    if (!filterableFields(collection).includes(field)) {
      throw new ApiError(400, 'QUERY_FIELD_NOT_ALLOWED', `Filtering by ${field} is not allowed.`);
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const operatorEntries = Object.entries(value);
      if (operatorEntries.some(([operator]) => !operators.has(operator))) {
        throw new ApiError(400, 'QUERY_OPERATOR_NOT_ALLOWED', 'The filter uses an unsupported operator.');
      }
      sanitized[field] = Object.fromEntries(operatorEntries);
    } else {
      sanitized[field] = value;
    }
  }
  return sanitized;
}

function parseClockTime(value) {
  if (typeof value !== 'string') {
    throw new ApiError(400, 'INVALID_TIME_FILTER', 'Time filters must use 24-hour HH:MM text, for example 20:00 for 8:00 PM.');
  }
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) {
    throw new ApiError(400, 'INVALID_TIME_FILTER', 'Use 24-hour HH:MM time, for example 08:30 or 20:00 for 8:00 PM.');
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

function mapCriterion(criterion, converter) {
  if (!criterion || typeof criterion !== 'object' || Array.isArray(criterion)) return converter(criterion);
  return Object.fromEntries(Object.entries(criterion).map(([operator, value]) => {
    if (operator !== '$in') return [operator, converter(value)];
    if (!Array.isArray(value)) throw new ApiError(400, 'INVALID_QUERY_FILTER', '$in requires an array.');
    return [operator, value.map(converter)];
  }));
}

function textMatches(value, criterion) {
  const actual = String(value || '').toLocaleLowerCase();
  const compare = (candidate) => actual === String(candidate || '').toLocaleLowerCase();
  if (!criterion || typeof criterion !== 'object' || Array.isArray(criterion)) return compare(criterion);
  return Object.entries(criterion).every(([operator, expected]) => {
    if (operator === '$contains') return actual.includes(String(expected || '').toLocaleLowerCase());
    if (operator === '$eq') return compare(expected);
    if (operator === '$ne') return !compare(expected);
    if (operator === '$in' && Array.isArray(expected)) return expected.some(compare);
    throw new ApiError(400, 'INVALID_COURSE_FILTER', 'Course name and course ID support exact values, $eq, $ne, $in and $contains.');
  });
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeContains(filter) {
  return Object.fromEntries(Object.entries(filter).map(([field, criterion]) => {
    if (!criterion || typeof criterion !== 'object' || Array.isArray(criterion) || !('$contains' in criterion)) {
      return [field, criterion];
    }
    if (Object.keys(criterion).length !== 1 || typeof criterion.$contains !== 'string' || criterion.$contains.trim() === '') {
      throw new ApiError(400, 'INVALID_CONTAINS_FILTER', '$contains must be used alone with non-empty text.');
    }
    return [field, new RegExp(escapeRegex(criterion.$contains.trim()), 'i')];
  }));
}

async function resolveQueryHelpers(ownerId, semesterId, collection, filter, academicRepositories) {
  const resolved = { ...filter };
  const courseName = resolved.courseName ?? resolved.subjectName;
  const courseId = resolved.courseId ?? resolved.subjectCode;
  delete resolved.courseName;
  delete resolved.subjectName;
  delete resolved.courseId;
  delete resolved.subjectCode;

  if (courseName !== undefined || courseId !== undefined) {
    if (resolved.subjectId !== undefined) {
      throw new ApiError(400, 'CONFLICTING_COURSE_FILTER', 'Use courseName/courseId or subjectId, not both.');
    }
    const subjects = await academicRepositories.subjects.list(ownerId, semesterId, true);
    const matchingIds = subjects
      .filter((subject) => (courseName === undefined || textMatches(subject.name, courseName))
        && (courseId === undefined || textMatches(subject.code, courseId)))
      .map((subject) => subject._id || subject.id);
    resolved.subjectId = { $in: matchingIds };
  }

  if (collection === 'attendanceRecords' && resolved.teacherName !== undefined) {
    if (resolved.teacherSnapshot !== undefined) {
      throw new ApiError(400, 'CONFLICTING_TEACHER_FILTER', 'Use teacherName or teacherSnapshot, not both.');
    }
    resolved.teacherSnapshot = resolved.teacherName;
    delete resolved.teacherName;
  }

  for (const [helper, storedField] of [['startTime', 'startMinute'], ['endTime', 'endMinute']]) {
    if (resolved[helper] === undefined) continue;
    if (resolved[storedField] !== undefined) {
      throw new ApiError(400, 'CONFLICTING_TIME_FILTER', `Use ${helper} or ${storedField}, not both.`);
    }
    resolved[storedField] = mapCriterion(resolved[helper], parseClockTime);
    delete resolved[helper];
  }
  return normalizeContains(resolved);
}

function createQueryConsoleService({ repository, academicRepositories }) {
  return {
    describe() {
      return {
        maxLimit: 100,
        operators: [
          { value: '$eq', meaning: 'equal to' },
          { value: '$ne', meaning: 'not equal to' },
          { value: '$gt', meaning: 'greater than' },
          { value: '$gte', meaning: 'greater than or equal to' },
          { value: '$lt', meaning: 'less than' },
          { value: '$lte', meaning: 'less than or equal to' },
          { value: '$in', meaning: 'matches any value in an array' },
          { value: '$contains', meaning: 'contains this text (case-insensitive)' },
        ],
        collections: Object.entries(collectionMetadata).map(([value, metadata]) => ({
          value,
          label: metadata.label,
          description: metadata.description,
          fields: allowedFields[value].map((name) => ({ name, type: metadata.fieldTypes[name] })),
          filterHelpers: queryHelpers[value] || [],
          examples: metadata.examples,
        })),
      };
    },

    async execute(ownerId, input) {
      const semester = await academicRepositories.semesters.findById(ownerId, input.semesterId);
      if (!semester) throw new ApiError(404, 'SEMESTER_NOT_FOUND', 'Semester not found.');
      if (semester.status !== 'CURRENT') {
        throw new ApiError(403, 'ACTIVE_SEMESTER_ONLY', 'The query console can access only the current semester.');
      }
      const available = allowedFields[input.collection];
      const projection = (input.projection?.length ? input.projection : available).filter((field) => available.includes(field));
      if (projection.length === 0) {
        throw new ApiError(400, 'EMPTY_PROJECTION', 'Choose at least one approved field.');
      }
      const sort = {};
      for (const [field, direction] of Object.entries(input.sort || {})) {
        if (!available.includes(field)) {
          throw new ApiError(400, 'QUERY_FIELD_NOT_ALLOWED', `Sorting by ${field} is not allowed.`);
        }
        sort[field] = direction;
      }
      const validatedFilter = validateFilter(input.collection, input.filter);
      const filter = await resolveQueryHelpers(ownerId, input.semesterId, input.collection, validatedFilter, academicRepositories);
      const rows = await repository.execute(input.collection, ownerId, input.semesterId, {
        filter,
        projection,
        sort,
        limit: Math.min(input.limit || 25, 100),
      });
      return { collection: input.collection, count: rows.length, rows };
    },
  };
}

module.exports = {
  allowedFields,
  collectionMetadata,
  createQueryConsoleService,
  parseClockTime,
  queryHelpers,
  resolveQueryHelpers,
  validateFilter,
};
