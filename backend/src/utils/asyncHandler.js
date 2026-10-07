/**
 * Async handler utility to wrap asynchronous express route handlers and middleware.
 * Eliminates the need for repetitive try-catch blocks by forwarding caught errors to Express next().
 *
 * @param {Function} fn - Asynchronous route handler/middleware function
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
