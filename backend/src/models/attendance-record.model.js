const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    semesterId: { type: mongoose.Schema.Types.ObjectId, required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, required: true },
    occurrenceKey: { type: String, required: true },
    status: { type: String, enum: ['PRESENT', 'ABSENT'], required: true },
    classDate: { type: Date, required: true },
    startMinute: { type: Number, required: true },
    endMinute: { type: Number, required: true },
    type: { type: String, enum: ['L', 'P'], required: true },
    teacherSnapshot: { type: String, default: '' },
    classroomSnapshot: { type: String, default: '' },
    source: { type: String, enum: ['RECURRING', 'EXTRA'], required: true },
    blockReason: { type: String, default: '' },
    lastChangedBy: { type: String, enum: ['MANUAL', 'OVERLAP', 'IMPORT'], default: 'MANUAL' },
  },
  { timestamps: true, versionKey: false },
);

attendanceRecordSchema.index(
  { ownerId: 1, semesterId: 1, occurrenceKey: 1 },
  { unique: true },
);
attendanceRecordSchema.index({ ownerId: 1, semesterId: 1, classDate: 1, startMinute: 1 });
attendanceRecordSchema.index({ ownerId: 1, semesterId: 1, subjectId: 1, classDate: 1 });

const AttendanceRecord =
  mongoose.models.AttendanceRecord || mongoose.model('AttendanceRecord', attendanceRecordSchema);

module.exports = { AttendanceRecord };
