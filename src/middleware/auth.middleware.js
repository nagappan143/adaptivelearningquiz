/**
 * auth.middleware.js
 *
 * WHY THIS EXISTS:
 * Any route that needs a logged-in user should not repeat JWT verification
 * logic inside the controller. This middleware centralises it.
 *
 * HOW IT WORKS:
 * 1. Checks the Authorization header for "Bearer <token>"
 * 2. Verifies the token with the secret (JWT_ACCESS_SECRET)
 * 3. If valid → attaches the decoded payload to req.user (or req.admin)
 *    and calls next() so the controller can run.
 * 4. If invalid/expired → immediately returns 401 without touching the controller.
 *
 * TWO VARIANTS:
 *   verifyUser  → for user-facing protected endpoints
 *   verifyAdmin → for admin-only endpoints; additionally checks that the
 *                 token payload contains a `role` field (set at admin login time)
 *
 * USAGE IN ROUTES:
 *   router.get("/profile", verifyUser, profileController);
 *   router.get("/dashboard", verifyAdmin, dashboardController);
 */

const jwt = require("jsonwebtoken");

const verifyUser = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authorization header missing or malformed. Expected: Bearer <token>",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded; // { id, iat, exp }
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authorization header missing or malformed. Expected: Bearer <token>",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    if (!decoded.role) {
      return res.status(403).json({
        success: false,
        message: "Access denied: not an admin token",
      });
    }

    req.admin = decoded; // { id, role, iat, exp }
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

const verifySuperAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authorization header missing or malformed. Expected: Bearer <token>",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    if (!decoded.role) {
      return res.status(403).json({ success: false, message: "Access denied: not an admin token" });
    }

    if (decoded.role !== "super_admin") {
      return res.status(403).json({ success: false, message: "Access denied: super_admin only" });
    }

    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

module.exports = { verifyUser, verifyAdmin, verifySuperAdmin };
