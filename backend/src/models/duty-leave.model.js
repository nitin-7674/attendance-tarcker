const mongoose = require('mongoose');

const dutyLeaveApplicationSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    semesterId: { type: mongoose.Schema.Types.ObjectId, required: true },
    eventName: { type: String, trim: true, required: true, maxlength: 120 },
    reason: { type: String, trim: true, required: true, maxlength: 500 },
    reference: { type: String, trim: true, maxlength: 200, default: '' },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'],
      default: 'PENDING',
    },
  },
  { timestamps: true, versionKey: false },
);

dutyLeaveApplicationSchema.index({ ownerId: 1, semesterId: 1, status: 1 });

const dutyLeaveCreditSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    semesterId: { type: mongoose.Schema.Types.ObjectId, required: true },
    dlApplicationId: { type: mongoose.Schema.Types.ObjectId, required: true },
    occurrenceKey: { type: String, required: true },
    creditStatus: { type: String, enum: ['APPLIED'], default: 'APPLIED' },
    eligibleReason: { type: String, default: 'Approved Duty Leave overlaps an absent period.' },
    creditedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: false },
);

dutyLeaveCreditSchema.index(
  { ownerId: 1, semesterId: 1, occurrenceKey: 1 },
  { unique: true },
);

const DutyLeaveApplication =
  mongoose.models.DutyLeaveApplication ||
  mongoose.model('DutyLeaveApplication', dutyLeaveApplicationSchema);
const DutyLeaveCredit =
  mongoose.models.DutyLeaveCredit || mongoose.model('DutyLeaveCredit', dutyLeaveCreditSchema);

module.exports = { DutyLeaveApplication, DutyLeaveCredit };
