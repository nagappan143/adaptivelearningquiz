/**
 * error.middleware.js — Global Error Handler
 *
 * WHY THIS EXISTS:
 * Without this, every controller needs its own try/catch that formats error
 * responses. That means inconsistent error shapes, duplicated code, and
 * stack traces accidentally leaking to clients in production.
 *
 * HOW IT WORKS:
 * Express recognises a middleware with 4 parameters (err, req, res, next)
 * as an error handler. It is ONLY called when a controller does:
 *
 *   next(err)    ← passes an error object down the middleware chain
 *
 * or when an unhandled exception occurs inside async route handlers
 * (Express 5 catches these automatically).
 *
 * It must be registered LAST in server.js, after all routes.
 *
 * WHAT IT HANDLES:
 *   - PostgreSQL unique violations (23505) → 409 Conflict
 *   - PostgreSQL foreign key violations (23503) → 400
 *   - JWT errors → 401
 *   - Custom errors with a statusCode property → uses that status
 *   - Everything else → 500, with message hidden in production
 *
 * USAGE IN CONTROLLERS:
 *   exports.register = async (req, res, next) => {
 *     try {
 *       ...
 *     } catch (err) {
 *       next(err);  // ← hands the error to this middleware
 *     }
 *   };
 */

const errorHandler = (err, req, res, next) => {
  // Always log server-side for debugging
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} →`, err.message);

  // PostgreSQL: unique constraint violation (e.g. duplicate email)
  if (err.code === "23505") {
    return res.status(409).json({
      success: false,
      message: "A resource with that value already exists",
    });
  }

  // PostgreSQL: foreign key violation (e.g. invalid countryid)
  if (err.code === "23503") {
    return res.status(400).json({
      success: false,
      message: "Referenced resource does not exist",
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }

  // Controllers can throw { message: '...', statusCode: 404 }
  const statusCode = err.statusCode || 500;

  // Never leak internal error details to clients in production
  const message =
    process.env.NODE_ENV === "production" && statusCode === 500
      ? "Internal server error"
      : err.message;

  res.status(statusCode).json({ success: false, message });
};

module.exports = errorHandler;
