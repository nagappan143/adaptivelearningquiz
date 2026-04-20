/**
 * admin.dto.js
 * Schema-accurate fields: name, email, password, role
 * Removed: phone, countryid (not in schema)
 * Roles:   only 'super_admin' | 'content_admin' (matches admin_role ENUM)
 */

const VALID_ROLES = ["super_admin", "content_admin"];

function validateAdminRegister(body) {
  const errors = [];
  const { name, email, password, role } = body;

  if (!name || typeof name !== "string" || name.trim().length < 2)
    errors.push("name must be at least 2 characters");

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.push("a valid email is required");

  if (!password || typeof password !== "string" || password.length < 8)
    errors.push("admin password must be at least 8 characters");

  if (role && !VALID_ROLES.includes(role))
    errors.push(`role must be one of: ${VALID_ROLES.join(", ")}`);

  return {
    errors,
    value: {
      name: name?.trim(),
      email: email?.toLowerCase().trim(),
      password,
      role: role || "content_admin",
    },
  };
}

function validateAdminLogin(body) {
  const errors = [];
  const { login_id, password } = body;

  if (!login_id || typeof login_id !== "string" || !login_id.trim())
    errors.push("login_id (email) is required");

  if (!password)
    errors.push("password is required");

  return {
    errors,
    value: {
      login_id: login_id?.trim(),
      password,
    },
  };
}

module.exports = { validateAdminRegister, validateAdminLogin };
