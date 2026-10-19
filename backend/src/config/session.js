const session = require('express-session');

function createSessionMiddleware(options) {
  const isProduction = options.nodeEnv === 'production';

  return session({
    name: 'sat.sid',
    secret: options.secret,
    store: options.store,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      maxAge: options.maxAgeMs,
    },
  });
}

module.exports = { createSessionMiddleware };
