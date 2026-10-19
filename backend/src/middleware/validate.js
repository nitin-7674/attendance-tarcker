const { ApiError } = require('../utils/api-error');

function validateBody(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return next(
        new ApiError(400, 'VALIDATION_ERROR', 'The request contains invalid fields.', result.error.flatten()),
      );
    }

    req.validatedBody = result.data;
    return next();
  };
}

function validateParams(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return next(
        new ApiError(400, 'VALIDATION_ERROR', 'The request path is invalid.', result.error.flatten()),
      );
    }
    req.validatedParams = result.data;
    return next();
  };
}

function validateQuery(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(
        new ApiError(400, 'VALIDATION_ERROR', 'The query parameters are invalid.', result.error.flatten()),
      );
    }
    req.validatedQuery = result.data;
    return next();
  };
}

module.exports = { validateBody, validateParams, validateQuery };
