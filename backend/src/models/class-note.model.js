const mongoose = require('mongoose');

const classNoteSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    semesterId: { type: mongoose.Schema.Types.ObjectId, required: true },
    occurrenceKey: { type: String, required: true },
    topicCovered: { type: String, trim: true, maxlength: 1000, default: '' },
    assignmentGiven: { type: String, trim: true, maxlength: 1000, default: '' },
    dueDate: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

classNoteSchema.index({ ownerId: 1, semesterId: 1, occurrenceKey: 1 }, { unique: true });
classNoteSchema.index({ ownerId: 1, semesterId: 1, dueDate: 1 });

const ClassNote = mongoose.models.ClassNote || mongoose.model('ClassNote', classNoteSchema);

module.exports = { ClassNote };
