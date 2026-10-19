const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    semesterId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
    code: { type: String, trim: true, maxlength: 30, default: undefined },
    targetPercentage: { type: Number, min: 1, max: 100, default: 75 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

subjectSchema.index({ ownerId: 1, semesterId: 1, active: 1 });
subjectSchema.index(
  { ownerId: 1, semesterId: 1, code: 1 },
  {
    unique: true,
    partialFilterExpression: { code: { $type: 'string' }, active: true },
  },
);

const Subject = mongoose.models.Subject || mongoose.model('Subject', subjectSchema);

module.exports = { Subject };
