const bcrypt = require('bcryptjs');
const { ApiError } = require('../utils/api-error');

function publicUser(user) {
  return {
    id: String(user._id || user.id),
    name: user.name,
    email: user.email,
    preferences: user.preferences || {},
  };
}

function createAuthService({ userRepository, passwordRounds = 12 }) {
  return {
    async register(input) {
      const email = input.email.trim().toLowerCase();
      const existingUser = await userRepository.findByEmail(email);

      if (existingUser) {
        throw new ApiError(409, 'EMAIL_IN_USE', 'An account already exists for this email.');
      }

      const passwordHash = await bcrypt.hash(input.password, passwordRounds);

      try {
        const user = await userRepository.create({
          name: input.name.trim(),
          email,
          passwordHash,
        });
        return publicUser(user);
      } catch (error) {
        if (error?.code === 11000) {
          throw new ApiError(409, 'EMAIL_IN_USE', 'An account already exists for this email.');
        }
        throw error;
      }
    },

    async login(input) {
      const email = input.email.trim().toLowerCase();
      const user = await userRepository.findByEmailWithPassword(email);
      const passwordMatches = user
        ? await bcrypt.compare(input.password, user.passwordHash)
        : false;

      if (!user || !passwordMatches) {
        throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
      }

      return publicUser(user);
    },

    async getProfile(userId) {
      const user = await userRepository.findPublicById(userId);
      if (!user) {
        throw new ApiError(401, 'SESSION_USER_NOT_FOUND', 'Your session is no longer valid.');
      }
      return publicUser(user);
    },
  };
}

module.exports = { createAuthService, publicUser };
