const { ApiError } = require('../utils/api-error');

function requireAuthentication(req, _res, next) {
  if (!req.session?.userId) {
    return next(new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Please sign in to continue.'));
  }

  req.auth = { ownerId: req.session.userId };
  return next();
}

module.exports = { requireAuthentication };
