const mongoose = require('mongoose');

const archiveCatalogSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    semesterId: { type: mongoose.Schema.Types.ObjectId, required: true },
    archiveStatus: { type: String, enum: ['DOWNLOAD_ONLY'], default: 'DOWNLOAD_ONLY' },
    recordCounts: { type: mongoose.Schema.Types.Mixed, default: {} },
    preparedAt: { type: Date, default: Date.now },
    version: { type: Number, default: 1 },
  },
  { timestamps: true, versionKey: false },
);

archiveCatalogSchema.index({ ownerId: 1, semesterId: 1 }, { unique: true });

const ArchiveCatalog =
  mongoose.models.ArchiveCatalog || mongoose.model('ArchiveCatalog', archiveCatalogSchema);

module.exports = { ArchiveCatalog };
