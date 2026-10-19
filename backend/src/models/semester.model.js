const mongoose = require('mongoose');

const semesterSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['CURRENT', 'COMPLETED'],
      default: 'CURRENT',
      required: true,
    },
  },
  { timestamps: true, versionKey: false },
);

semesterSchema.index(
  { ownerId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'CURRENT' } },
);
semesterSchema.index({ ownerId: 1, createdAt: -1 });

const Semester = mongoose.models.Semester || mongoose.model('Semester', semesterSchema);

module.exports = { Semester };
