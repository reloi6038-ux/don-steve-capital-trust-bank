/* =========================================================
   Error Middleware — MUST have exactly this signature
   Express detects error handlers by the 4-argument signature:
   (err, req, res, next)
   ========================================================= */

// 404 Not Found handler — 3 args (req, res, next), but only uses 2
const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
};

// Global error handler — MUST have 4 args (err, req, res, next)
// Express will NOT recognize it as an error handler otherwise.
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('❌ Error:', err.message);
  console.error(err.stack);

  let statusCode = res.statusCode && res.statusCode !== 200
    ? res.statusCode
    : 500;

  let message = err.message || 'Server Error';

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Resource not found';
  }
  if (err.code === 11000) {
    statusCode = 400;
    message = `Duplicate value for: ${Object.keys(err.keyValue || {}).join(', ')}`;
  }
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };