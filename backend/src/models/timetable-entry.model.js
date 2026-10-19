const mongoose = require('mongoose');

const timetableEntrySchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    semesterId: { type: mongoose.Schema.Types.ObjectId, required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, required: true },
    dayOfWeek: { type: Number, required: true, min: 1, max: 7 },
    startMinute: { type: Number, required: true, min: 0, max: 1439 },
    endMinute: { type: Number, required: true, min: 1, max: 1440 },
    type: { type: String, enum: ['L', 'P'], required: true },
    teacherName: { type: String, trim: true, maxlength: 100, default: '' },
    classroom: { type: String, trim: true, maxlength: 100, default: '' },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date, default: null },
    scheduleVersion: { type: Number, required: true, min: 1, default: 1 },
    active: { type: Boolean, default: true },
    inactiveReason: { type: String, enum: ['SUPERSEDED', 'ARCHIVED'], default: null },
  },
  { timestamps: true, versionKey: false },
);

timetableEntrySchema.index({ ownerId: 1, semesterId: 1, dayOfWeek: 1, effectiveFrom: 1 });
timetableEntrySchema.index({ ownerId: 1, semesterId: 1, subjectId: 1, dayOfWeek: 1 });

const TimetableEntry =
  mongoose.models.TimetableEntry || mongoose.model('TimetableEntry', timetableEntrySchema);

module.exports = { TimetableEntry };
