import request from 'supertest';
import { describe, expect, it } from 'vitest';
import appModule from './app.js';

const { createApp } = appModule;

function createFakeAuthService() {
  const user = { id: 'user-1', name: 'Student One', email: 'student@example.com', preferences: {} };
  return {
    async register() {
      return user;
    },
    async login() {
      return user;
    },
    async getProfile(id) {
      if (id !== user.id) throw new Error('Unexpected user id');
      return user;
    },
  };
}

describe('authentication routes', () => {
  it('establishes and destroys an authenticated session', async () => {
    const agent = request.agent(createApp({ authService: createFakeAuthService() }));

    const login = await agent.post('/api/v1/auth/login').send({
      email: 'student@example.com',
      password: 'correct horse battery staple',
    });
    expect(login.status).toBe(200);

    const profile = await agent.get('/api/v1/auth/me');
    expect(profile.status).toBe(200);
    expect(profile.body.data.user.id).toBe('user-1');

    const logout = await agent.post('/api/v1/auth/logout');
    expect(logout.status).toBe(204);

    const afterLogout = await agent.get('/api/v1/auth/me');
    expect(afterLogout.status).toBe(401);
  });

  it('rejects malformed registration data before reaching the service', async () => {
    const response = await request(createApp({ authService: createFakeAuthService() }))
      .post('/api/v1/auth/register')
      .send({ name: 'A', email: 'not-an-email', password: 'short', confirmPassword: 'different' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
