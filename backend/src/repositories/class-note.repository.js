const { ClassNote } = require('../models/class-note.model');

function createClassNoteRepository(model = ClassNote) {
  return {
    find(ownerId, semesterId, occurrenceKey) {
      return model.findOne({ ownerId, semesterId, occurrenceKey }).lean();
    },
    upsert(ownerId, semesterId, occurrenceKey, values) {
      return model
        .findOneAndUpdate(
          { ownerId, semesterId, occurrenceKey },
          {
            $set: values,
            $setOnInsert: { ownerId, semesterId, occurrenceKey },
          },
          { new: true, upsert: true, runValidators: true },
        )
        .lean();
    },
  };
}

module.exports = { createClassNoteRepository };
