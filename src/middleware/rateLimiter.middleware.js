/**
 * rateLimiter.middleware.js
 *
 * WHY THIS EXISTS:
 * Without rate limiting, an attacker can hammer your /login endpoint with
 * thousands of password guesses per second (brute force). Rate limiting
 * makes that impractical by tracking requests per IP and blocking extras.
 *
 * express-rate-limit is already in your package.json dependencies.
 *
 * TWO LIMITERS:
 *
 *   authLimiter
 *     → Applied to login/register routes.
 *     → Only 10 attempts allowed per IP per 15 minutes.
 *     → Harsh because these routes are the most attack-prone.
 *
 *   apiLimiter
 *     → Applied globally to all other API routes.
 *     → 100 requests per minute — generous for legitimate use,
 *       tight enough to throttle scrapers.
 *
 * USAGE IN ROUTES:
 *   router.post("/login", authLimiter, validate(validateLogin), loginController);
 *
 * USAGE IN server.js (global):
 *   app.use("/api", apiLimiter);
 */

const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                   // max 10 requests per window per IP
  standardHeaders: true,     // sends RateLimit-* headers in response
  legacyHeaders: false,      // disables the older X-RateLimit-* headers
  message: {
    success: false,
    message: "Too many attempts from this IP. Please try again in 15 minutes.",
  },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
  },
});

module.exports = { authLimiter, apiLimiter };
