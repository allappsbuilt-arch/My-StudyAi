/**
 * Small input-validation helpers used by controllers.
 * They throw AppError(400) with a clear message when input is invalid.
 */
const { AppError } = require('./errorHandler');

function requireString(value, field, { min = 1, max = 10000 } = {}) {
  if (typeof value !== 'string' || value.trim().length < min) {
    throw new AppError(min > 1 ? `${field} must be at least ${min} characters.` : `${field} is required.`, 400);
  }
  if (value.trim().length > max) throw new AppError(`${field} must be at most ${max} characters.`, 400);
  return value.trim();
}

function optionalString(value, field, { max = 10000 } = {}) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new AppError(`${field} must be text.`, 400);
  if (value.trim().length > max) throw new AppError(`${field} must be at most ${max} characters.`, 400);
  return value.trim() || null;
}

/** Parse a positive integer id like :id */
function requireId(value, field = 'id') {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new AppError(`Invalid ${field}.`, 400);
  return n;
}

module.exports = { requireString, optionalString, requireId };
