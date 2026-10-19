const { Semester } = require('../models/semester.model');
const { Subject } = require('../models/subject.model');
const { TimetableEntry } = require('../models/timetable-entry.model');

function createAcademicRepositories(models = {}) {
  const semesterModel = models.Semester || Semester;
  const subjectModel = models.Subject || Subject;
  const timetableModel = models.TimetableEntry || TimetableEntry;

  return {
    semesters: {
      create(values) {
        return semesterModel.create(values);
      },
      list(ownerId) {
        return semesterModel.find({ ownerId }).sort({ createdAt: -1 }).lean();
      },
      findById(ownerId, id) {
        return semesterModel.findOne({ _id: id, ownerId }).lean();
      },
      update(ownerId, id, values) {
        return semesterModel.findOneAndUpdate({ _id: id, ownerId }, values, {
          new: true,
          runValidators: true,
        }).lean();
      },
    },
    subjects: {
      create(values) {
        return subjectModel.create(values);
      },
      list(ownerId, semesterId, includeInactive = false) {
        return subjectModel
          .find({ ownerId, semesterId, ...(includeInactive ? {} : { active: true }) })
          .sort({ name: 1 })
          .lean();
      },
      findById(ownerId, id) {
        return subjectModel.findOne({ _id: id, ownerId }).lean();
      },
      update(ownerId, id, values) {
        const update = { ...values };
        const clearCode = update.code === '';
        if (clearCode) delete update.code;
        return subjectModel.findOneAndUpdate({ _id: id, ownerId }, clearCode
          ? { $set: update, $unset: { code: 1 } }
          : update, {
          new: true,
          runValidators: true,
        }).lean();
      },
    },
    timetable: {
      create(values) {
        return timetableModel.create(values);
      },
      list(ownerId, semesterId, includeInactive = false) {
        return timetableModel
          .find({ ownerId, semesterId, ...(includeInactive ? {} : { active: true }) })
          .sort({ dayOfWeek: 1, startMinute: 1, createdAt: 1 })
          .lean();
      },
      findById(ownerId, id) {
        return timetableModel.findOne({ _id: id, ownerId }).lean();
      },
      update(ownerId, id, values) {
        return timetableModel.findOneAndUpdate({ _id: id, ownerId }, values, {
          new: true,
          runValidators: true,
        }).lean();
      },
    },
  };
}

module.exports = { createAcademicRepositories };
