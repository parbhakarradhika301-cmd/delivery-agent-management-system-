/**
 * Generic Zod validation middleware for Express routes.
 * Supports validating request body, query, and path parameters.
 * Formats errors to match the standardized API error structure.
 */
const { ZodError } = require('zod');
const ApiError = require('../utils/ApiError');

/**
 * Creates middleware to validate a target request property (body, params, query) against a Zod schema.
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {'body'|'params'|'query'} [source='body'] - Request property to validate
 * @returns {import('express').RequestHandler}
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      // Replace with parsed/transformed data (e.g., trimmed, lowercased strings)
      req[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        // Specifically map invalid UUID parameter to 400 INVALID_ID
        const idIssue = err.issues.find((issue) => issue.path.includes('id'));
        if (source === 'params' && idIssue) {
          return next(new ApiError(400, 'INVALID_ID', idIssue.message || 'Agent ID must be a valid UUID'));
        }

        // Map general schema validation errors to 400 VALIDATION_ERROR
        const details = err.issues.map((issue) => ({
          field: issue.path.length > 0 ? issue.path.join('.') : 'body',
          message: issue.message,
        }));

        const message = details.length === 1 ? details[0].message : 'Validation failed';
        return next(new ApiError(400, 'VALIDATION_ERROR', message, details));
      }

      next(err);
    }
  };
};

module.exports = {
  validate,
  validateBody: (schema) => validate(schema, 'body'),
  validateParams: (schema) => validate(schema, 'params'),
};
