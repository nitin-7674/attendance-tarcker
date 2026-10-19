const mongoose = require('mongoose');

const calendarExceptionSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    semesterId: { type: mongoose.Schema.Types.ObjectId, required: true },
    date: { type: Date, required: true },
    type: { type: String, enum: ['HOLIDAY', 'CANCELLED', 'EXTRA'], required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, default: null },
    occurrenceKey: { type: String, default: '' },
    startMinute: { type: Number, min: 0, max: 1439 },
    endMinute: { type: Number, min: 1, max: 1440 },
    classType: { type: String, enum: ['L', 'P'] },
    teacherName: { type: String, trim: true, maxlength: 100, default: '' },
    classroom: { type: String, trim: true, maxlength: 100, default: '' },
    reason: { type: String, trim: true, maxlength: 250, default: '' },
  },
  { timestamps: true, versionKey: false },
);

calendarExceptionSchema.index({ ownerId: 1, semesterId: 1, date: 1 });

const CalendarException =
  mongoose.models.CalendarException ||
  mongoose.model('CalendarException', calendarExceptionSchema);

module.exports = { CalendarException };
