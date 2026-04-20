/**
 * validate.middleware.js
 *
 * WHY THIS EXISTS:
 * Without this, every controller would need to run its own validation,
 * and a developer could accidentally forget it. This middleware is a
 * "gate" that sits between the route and the controller.
 *
 * HOW IT WORKS:
 * It's a higher-order function (a factory) — it takes a DTO validator
 * function and returns an Express middleware function.
 *
 *   validate(validateRegister)
 *       ↓ returns ↓
 *   (req, res, next) => { ... }
 *
 * That returned middleware runs the DTO, and either:
 *   - Sends a 400 with error details (short-circuits — controller never runs)
 *   - Replaces req.body with the clean, sanitized value and calls next()
 *
 * USAGE IN ROUTES:
 *   router.post("/register", validate(validateRegister), registerController);
 *                            ^^^^^^^^^^^^^^^^^^^^^^^^^^
 *                            This is the gate. The controller only fires
 *                            if the request passes this check.
 */

const validate = (dtoFn) => (req, res, next) => {
  const { errors, value } = dtoFn(req.body);

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  req.body = value; // swap raw body with sanitized value
  next();
};

module.exports = validate;
