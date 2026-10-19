const { ImportJob } = require('../models/import-job.model');

function createImportRepository(model = ImportJob) {
  return {
    create(values) {
      return model.create(values);
    },
    findById(ownerId, id) {
      return model.findOne({ _id: id, ownerId }).lean();
    },
    update(ownerId, id, values) {
      return model.findOneAndUpdate({ _id: id, ownerId }, values, { new: true }).lean();
    },
  };
}

module.exports = { createImportRepository };
