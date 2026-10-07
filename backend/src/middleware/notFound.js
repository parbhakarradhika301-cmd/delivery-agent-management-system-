/**
 * 404 Not Found middleware for unhandled route requests.
 * Returns standardized error response when requesting non-existent endpoints.
 */
const ApiError = require('../utils/ApiError');

const notFound = (req, res, next) => {
  next(new ApiError(404, 'ROUTE_NOT_FOUND', `Cannot ${req.method} ${req.originalUrl}`));
};

module.exports = notFound;
