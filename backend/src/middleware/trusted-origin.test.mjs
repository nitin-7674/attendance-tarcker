import { describe, expect, it, vi } from 'vitest';
import originModule from './trusted-origin.js';

const { createTrustedOriginMiddleware } = originModule;

describe('trusted origin middleware', () => {
  it('rejects cross-origin state-changing browser requests', () => {
    const middleware = createTrustedOriginMiddleware('http://localhost:5173');
    const next = vi.fn();
    middleware(
      { method: 'POST', get: () => 'https://attacker.example' },
      {},
      next,
    );
    expect(next.mock.calls[0][0]).toMatchObject({ status: 403, code: 'UNTRUSTED_ORIGIN' });
  });

  it('allows safe methods without an origin header', () => {
    const middleware = createTrustedOriginMiddleware('http://localhost:5173');
    const next = vi.fn();
    middleware({ method: 'GET', get: () => undefined }, {}, next);
    expect(next).toHaveBeenCalledWith();
  });
});
