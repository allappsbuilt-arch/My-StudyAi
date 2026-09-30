/**
 * Error handling helpers.
 *
 * - AppError: throw this anywhere with a status code and a user-friendly message.
 * - notFound: 404 for unknown API routes.
 * - errorHandler: the last middleware; turns any error into a JSON response.
 *
 * Express 5 forwards errors thrown inside async route handlers automatically,
 * so controllers can simply `throw new AppError(...)`.
 */
const multer = require('multer');

class AppError extends Error {
  constructor(message, statusCode = 400, details, code) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.code = code; // optional machine-readable code, e.g. 'AI_NOT_CONFIGURED'
  }
}

function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Something went wrong';

  if (err instanceof multer.MulterError) {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'This file is too large.' : `Upload error: ${err.message}`;
  }
  if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON in request body.';
  }
  if (status >= 500 && !(err instanceof AppError)) {
    console.error('[error]', req.method, req.originalUrl, '\n', err);
    if (process.env.NODE_ENV === 'production') message = 'Internal server error';
  }

  res.status(status).json({
    success: false,
    message,
    ...(err instanceof AppError && err.code ? { code: err.code } : {}),
    ...(err.details ? { details: err.details } : {}),
  });
}

module.exports = { AppError, notFound, errorHandler };
