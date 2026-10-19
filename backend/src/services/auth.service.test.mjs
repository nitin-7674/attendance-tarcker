import { describe, expect, it } from 'vitest';
import authModule from './auth.service.js';

const { createAuthService } = authModule;

function createMemoryUserRepository() {
  const users = [];

  return {
    users,
    async create(values) {
      const user = { _id: String(users.length + 1), preferences: {}, ...values };
      users.push(user);
      return user;
    },
    async findByEmail(email) {
      return users.find((user) => user.email === email) || null;
    },
    async findByEmailWithPassword(email) {
      return users.find((user) => user.email === email) || null;
    },
    async findPublicById(id) {
      return users.find((user) => user._id === id) || null;
    },
  };
}

describe('auth service', () => {
  it('normalizes registration data and stores only a password hash', async () => {
    const repository = createMemoryUserRepository();
    const service = createAuthService({ userRepository: repository, passwordRounds: 4 });

    const user = await service.register({
      name: '  Student One  ',
      email: ' Student@Example.COM ',
      password: 'correct horse battery staple',
    });

    expect(user).toEqual({
      id: '1',
      name: 'Student One',
      email: 'student@example.com',
      preferences: {},
    });
    expect(repository.users[0].passwordHash).not.toBe('correct horse battery staple');
  });

  it('rejects invalid login credentials without revealing which field failed', async () => {
    const repository = createMemoryUserRepository();
    const service = createAuthService({ userRepository: repository, passwordRounds: 4 });

    await expect(
      service.login({ email: 'missing@example.com', password: 'anything' }),
    ).rejects.toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' });
  });
});
