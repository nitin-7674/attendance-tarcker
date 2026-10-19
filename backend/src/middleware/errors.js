function notFoundHandler(req, _res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

function errorHandler(error, _req, res, _next) {
  void _next;
  const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : Number.isInteger(error.status) ? error.status : 500;
  const message = status >= 500 ? 'An unexpected server error occurred.' : error.message;

  if (status >= 500 && process.env.NODE_ENV !== 'test') {
    console.error(error);
  }

  res.status(status).json({
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message,
      ...(error.details ? { details: error.details } : {}),
    },
  });
}

module.exports = { errorHandler, notFoundHandler };
