const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { createAuthController } = require('../controllers/auth.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { validateBody } = require('../middleware/validate');
const { loginSchema, registerSchema } = require('../validation/auth.schemas');

function createAuthRoutes(authService) {
  const router = express.Router();
  const controller = createAuthController(authService);
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many authentication attempts. Please try again later.',
      },
    },
  });

  router.post('/register', authLimiter, validateBody(registerSchema), controller.register);
  router.post('/login', authLimiter, validateBody(loginSchema), controller.login);
  router.post('/logout', requireAuthentication, controller.logout);
  router.get('/me', requireAuthentication, controller.me);

  return router;
}

module.exports = { createAuthRoutes };
