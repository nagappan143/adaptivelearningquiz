const express = require("express");
const router = express.Router();

const auth                                     = require("../controllers/auth.controller");
const validate                                 = require("../middleware/validate.middleware");
const { authLimiter }                          = require("../middleware/rateLimiter.middleware");
const { validateRegister, validateLogin }      = require("../dto/user.dto");
const { validateAdminRegister,
        validateAdminLogin }                   = require("../dto/admin.dto");
const { verifySuperAdmin, verifyAdmin, verifyUser } = require("../middleware/auth.middleware");

// User
router.post("/register", authLimiter, validate(validateRegister), auth.register);
router.post("/login",    authLimiter, validate(validateLogin),    auth.login);
router.get("/me",        verifyUser,                              auth.getUserMe);

// Admin
router.post("/admin/register", authLimiter, verifySuperAdmin, validate(validateAdminRegister), auth.registerAdmin);
router.post("/admin/login",    authLimiter, validate(validateAdminLogin), auth.loginAdmin);
router.get("/admin/me",        verifyAdmin,      auth.getAdminMe);
router.get("/admins",             verifySuperAdmin, auth.listAdmins);
router.delete("/admins/:id",      verifySuperAdmin, auth.deleteAdmin);
router.patch("/admins/:id/role",  verifySuperAdmin, auth.promoteAdmin);

module.exports = router;