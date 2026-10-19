const { DutyLeaveApplication, DutyLeaveCredit } = require('../models/duty-leave.model');
const mongoose = require('mongoose');

const asObjectId = (value) =>
  value instanceof mongoose.Types.ObjectId ? value : new mongoose.Types.ObjectId(value);

function createDutyLeaveRepository(models = {}) {
  const applicationModel = models.DutyLeaveApplication || DutyLeaveApplication;
  const creditModel = models.DutyLeaveCredit || DutyLeaveCredit;

  return {
    createApplication(values) {
      return applicationModel.create(values);
    },
    listApplications(ownerId, semesterId) {
      return applicationModel.find({ ownerId, semesterId }).sort({ startAt: -1 }).lean();
    },
    findApplication(ownerId, id) {
      return applicationModel.findOne({ _id: id, ownerId }).lean();
    },
    updateApplication(ownerId, id, values) {
      return applicationModel.findOneAndUpdate({ _id: id, ownerId }, values, {
        new: true,
        runValidators: true,
      }).lean();
    },
    async createCreditIfAvailable(values) {
      try {
        const credit = await creditModel.create(values);
        return { created: true, credit };
      } catch (error) {
        if (error?.code === 11000) return { created: false, credit: null };
        throw error;
      }
    },
    countCreditsBySubject(ownerId, semesterId) {
      const scopedOwnerId = asObjectId(ownerId);
      const scopedSemesterId = asObjectId(semesterId);
      return creditModel.aggregate([
        { $match: { ownerId: scopedOwnerId, semesterId: scopedSemesterId, creditStatus: 'APPLIED' } },
        {
          $lookup: {
            from: 'attendancerecords',
            let: { key: '$occurrenceKey' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$ownerId', scopedOwnerId] },
                      { $eq: ['$semesterId', scopedSemesterId] },
                      { $eq: ['$occurrenceKey', '$$key'] },
                    ],
                  },
                },
              },
            ],
            as: 'attendance',
          },
        },
        { $unwind: '$attendance' },
        { $group: { _id: '$attendance.subjectId', credits: { $sum: 1 } } },
      ]);
    },
  };
}

module.exports = { createDutyLeaveRepository };
