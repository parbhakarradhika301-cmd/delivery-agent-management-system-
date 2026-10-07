/**
 * Custom operational error class for consistent API error responses.
 * Encapsulates HTTP status code, application error code, message, and optional validation details.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code (e.g., 400, 404, 409, 500)
   * @param {string} code - Standardized error code string (e.g., "VALIDATION_ERROR", "AGENT_NOT_FOUND")
   * @param {string} message - Human-readable error message
   * @param {Array<{field?: string, message: string}>} [details=[]] - Optional array of granular error details
   */
  constructor(statusCode, code, message, details = []) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
