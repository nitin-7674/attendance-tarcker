import request from 'supertest';
import { describe, expect, it } from 'vitest';
import appModule from './app.js';

const { createApp } = appModule;

describe('API foundation', () => {
  it('reports service health', async () => {
    const response = await request(createApp()).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      service: 'student-attendance-tracker-api',
      version: 1,
    });
  });

  it('returns a consistent JSON error for an unknown route', async () => {
    const response = await request(createApp()).get('/missing');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
  });
});
