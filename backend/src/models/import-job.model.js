const mongoose = require('mongoose');

const importJobSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    semesterId: { type: mongoose.Schema.Types.ObjectId, required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, required: true },
    fileType: { type: String, enum: ['CSV', 'XLSX'], required: true },
    status: { type: String, enum: ['PREVIEWED', 'COMMITTED', 'FAILED'], required: true },
    rowCounts: {
      total: { type: Number, default: 0 },
      valid: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      rejected: { type: Number, default: 0 },
      committed: { type: Number, default: 0 },
    },
    previewRows: { type: [mongoose.Schema.Types.Mixed], default: [] },
    validRows: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { timestamps: true, versionKey: false },
);

importJobSchema.index({ ownerId: 1, semesterId: 1, createdAt: -1 });

const ImportJob = mongoose.models.ImportJob || mongoose.model('ImportJob', importJobSchema);

module.exports = { ImportJob };
