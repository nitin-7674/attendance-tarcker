const { ApiError } = require('../utils/api-error');

function createTrustedOriginMiddleware(frontendOrigin) {
  return (req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.get('origin');
    if (origin && origin !== frontendOrigin) {
      return next(new ApiError(403, 'UNTRUSTED_ORIGIN', 'The request origin is not allowed.'));
    }
    return next();
  };
}

module.exports = { createTrustedOriginMiddleware };
