/**
 * Wraps an async (or sync) route handler so any thrown error or rejected
 * promise is automatically forwarded to Express's error handler.
 *
 * Guarantees `next` exists — eliminates "next is not a function" errors.
 *
 * Usage:
 *   router.get('/path', asyncHandler(myController));
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;