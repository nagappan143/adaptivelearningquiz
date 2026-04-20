/**
 * auth.controller.js
 * Simplified to match schema — no refresh tokens (table doesn't exist).
 * Admin and user both get a single access token on login.
 */

const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const authService = require("../services/auth.service");

// ─── USER ────────────────────────────────────────────────────────────────────

exports.register = async (req, res, next) => {
  try {
    const duplicate = await authService.findDuplicateUser(req.body.email, req.body.student_id);
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "A user with that email or student ID already exists",
      });
    }

    const user = await authService.createUser(req.body);
    res.status(201).json({ success: true, message: "Registered successfully", data: user });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { login_id, password } = req.body;

    const user = await authService.findUserByLoginId(login_id);
    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign({ id: user.id }, process.env.JWT_ACCESS_SECRET, { expiresIn: "1d" });

    const { password_hash, ...safeUser } = user;
    res.json({ success: true, data: { token, user: safeUser } });
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN ───────────────────────────────────────────────────────────────────

exports.registerAdmin = async (req, res, next) => {
  try {
    const duplicate = await authService.findDuplicateAdmin(req.body.email);
    if (duplicate) {
      return res.status(409).json({ success: false, message: "Admin with that email already exists" });
    }

    const admin = await authService.createAdmin(req.body);
    res.status(201).json({ success: true, message: "Admin registered successfully", data: admin });
  } catch (err) {
    next(err);
  }
};

exports.deleteAdmin = async (req, res, next) => {
  try {
    const deleted = await authService.deleteAdmin(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Content admin not found or already deleted" });
    }
    res.json({ success: true, message: "Admin deleted" });
  } catch (err) {
    next(err);
  }
};

exports.promoteAdmin = async (req, res, next) => {
  try {
    const promoted = await authService.promoteAdmin(req.params.id);
    if (!promoted) {
      return res.status(404).json({ success: false, message: "Content admin not found" });
    }
    res.json({ success: true, data: promoted });
  } catch (err) {
    next(err);
  }
};

exports.listAdmins = async (req, res, next) => {
  try {
    const admins = await authService.listAdmins();
    res.json({ success: true, data: admins });
  } catch (err) {
    next(err);
  }
};

exports.getUserMe = async (req, res, next) => {
  try {
    const user = await authService.findUserById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

exports.getAdminMe = async (req, res, next) => {
  try {
    const admin = await authService.findAdminById(req.admin.id);
    if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });
    const { password_hash, ...safeAdmin } = admin;
    res.json({ success: true, data: safeAdmin });
  } catch (err) {
    next(err);
  }
};

exports.loginAdmin = async (req, res, next) => {
  try {
    const { login_id, password } = req.body;

    const admin = await authService.findAdminByLoginId(login_id);
    if (!admin) return res.status(401).json({ success: false, message: "Invalid credentials" });

    if (!admin.is_active) return res.status(403).json({ success: false, message: "Account is disabled" });

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) return res.status(401).json({ success: false, message: "Invalid credentials" });

    // role is embedded in token so verifyAdmin middleware can check it
    const token = jwt.sign(
      { id: admin.id, role: admin.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "8h" }
    );

    const { password_hash, ...safeAdmin } = admin;
    res.json({ success: true, data: { token, admin: safeAdmin } });
  } catch (err) {
    next(err);
  }
};
