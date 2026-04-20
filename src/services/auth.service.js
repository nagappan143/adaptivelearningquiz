/**
 * auth.service.js
 * Schema-accurate: users has no phone/countryid, has grade_id, is_active, deleted_at
 * admins has no phone/countryid, has is_active, deleted_at
 * admin_refresh_tokens does NOT exist in schema — removed entirely
 */

const pool = require("../config/db");
const bcrypt = require("bcrypt");

// ─── USER ────────────────────────────────────────────────────────────────────

const findDuplicateUser = async (email, student_id) => {
  const result = await pool.query(
    `SELECT id FROM users
     WHERE email = $1
        OR (student_id IS NOT NULL AND student_id = $2)
     LIMIT 1`,
    [email, student_id || null]
  );
  return result.rows[0] || null;
};

const createUser = async ({ name, email, password, student_id, standard, grade_id }) => {
  const hash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, student_id, standard, grade_id)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id, name, email, student_id, standard, grade_id, is_active, created_at`,
    [name, email, hash, student_id, standard, grade_id]
  );
  return result.rows[0];
};

// Login by email OR student_id; also checks active + not deleted
const findUserByLoginId = async (loginId) => {
  const result = await pool.query(
    `SELECT * FROM users
     WHERE (email = $1 OR student_id = $1)
       AND is_active = true
       AND deleted_at IS NULL
     LIMIT 1`,
    [loginId]
  );
  return result.rows[0] || null;
};

// ─── ADMIN ───────────────────────────────────────────────────────────────────

const findDuplicateAdmin = async (email) => {
  const result = await pool.query(
    `SELECT id FROM admins WHERE email = $1 LIMIT 1`,
    [email]
  );
  return result.rows[0] || null;
};

const createAdmin = async ({ name, email, password, role }) => {
  const hash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO admins (name, email, password_hash, role)
     VALUES ($1,$2,$3,$4)
     RETURNING id, name, email, role, is_active, created_at`,
    [name, email, hash, role]
  );
  return result.rows[0];
};

const deleteAdmin = async (id) => {
  const result = await pool.query(
    `UPDATE admins SET deleted_at = NOW(), is_active = false
     WHERE id = $1 AND role = 'content_admin' AND deleted_at IS NULL
     RETURNING id`,
    [id]
  );
  return result.rows[0] || null;
};

const promoteAdmin = async (id) => {
  const result = await pool.query(
    `UPDATE admins SET role = 'super_admin', updated_at = NOW()
     WHERE id = $1 AND role = 'content_admin' AND deleted_at IS NULL
     RETURNING id, name, email, role, is_active, created_at`,
    [id]
  );
  return result.rows[0] || null;
};

const listAdmins = async () => {
  const result = await pool.query(
    `SELECT id, name, email, role, is_active, created_at FROM admins
     WHERE deleted_at IS NULL ORDER BY created_at DESC`
  );
  return result.rows;
};

const findUserById = async (id) => {
  const result = await pool.query(
    `SELECT id, name, email, student_id, standard, grade_id, is_active, created_at
     FROM users WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
};

const findAdminById = async (id) => {
  const result = await pool.query(
    `SELECT * FROM admins WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
};

const findAdminByLoginId = async (loginId) => {
  const result = await pool.query(
    `SELECT * FROM admins
     WHERE email = $1
       AND is_active = true
       AND deleted_at IS NULL
     LIMIT 1`,
    [loginId]
  );
  return result.rows[0] || null;
};


module.exports = {
  findDuplicateUser,
  createUser,
  findUserByLoginId,
  findUserById,
  findDuplicateAdmin,
  createAdmin,
  listAdmins,
  findAdminById,
  findAdminByLoginId,
  deleteAdmin,
  promoteAdmin,
};
