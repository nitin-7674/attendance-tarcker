const { User } = require('../models/user.model');

function createUserRepository(model = User) {
  return {
    async create(values) {
      return model.create(values);
    },

    async findByEmail(email) {
      return model.findOne({ email }).lean();
    },

    async findByEmailWithPassword(email) {
      return model.findOne({ email }).select('+passwordHash').lean();
    },

    async findPublicById(id) {
      return model.findById(id).lean();
    },
  };
}

module.exports = { createUserRepository };
