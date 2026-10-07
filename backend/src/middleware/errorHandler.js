/**
 * Centralized error-handling middleware.
 * Formats all operational and unexpected errors into a consistent JSON response.
 * Prevents internal stack traces from leaking to clients.
 */
const ApiError = require('../utils/ApiError');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // 1. Handle JSON syntax parse error from express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Malformed JSON payload in request body',
      },
    });
  }

  // 2. Handle Prisma Unique Constraint Violation (P2002)
  if (err.code === 'P2002') {
    const targetFields = err.meta && err.meta.target;
    const fieldName = Array.isArray(targetFields)
      ? targetFields.join(', ')
      : targetFields || 'field';

    return res.status(409).json({
      error: {
        code: 'DUPLICATE_AGENT',
        message: `An agent with this ${fieldName} already exists`,
      },
    });
  }

  // 3. Handle Prisma Record Not Found (P2025)
  if (err.code === 'P2025') {
    return res.status(404).json({
      error: {
        code: 'AGENT_NOT_FOUND',
        message: 'Agent not found',
      },
    });
  }

  // 4. Handle custom operational ApiErrors (validation, invalid ID, not found, etc.)
  if (err instanceof ApiError) {
    const errorPayload = {
      code: err.code,
      message: err.message,
    };

    if (err.details && err.details.length > 0) {
      errorPayload.details = err.details;
    }

    return res.status(err.statusCode).json({
      error: errorPayload,
    });
  }

  // 5. Handle unexpected internal server errors
  console.error('[Unhandled Error]:', err);

  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected internal server error occurred',
    },
  });
};

module.exports = errorHandler;
