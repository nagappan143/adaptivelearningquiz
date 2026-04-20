/**
 * user.dto.js
 * Schema-accurate fields: name, email, password, student_id, standard, grade_id
 * Removed: phone, countryid (not in schema)
 * Added:   grade_id (UUID, optional FK to grade table)
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateRegister(body) {
  const errors = [];
  const { name, email, password, student_id, standard, grade_id } = body;

  if (!name || typeof name !== "string" || name.trim().length < 2)
    errors.push("name must be at least 2 characters");

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.push("a valid email is required");

  if (!password || typeof password !== "string" || password.length < 6)
    errors.push("password must be at least 6 characters");

  if (grade_id && !UUID_RE.test(grade_id))
    errors.push("grade_id must be a valid UUID");

  return {
    errors,
    value: {
      name: name?.trim(),
      email: email?.toLowerCase().trim(),
      password,
      student_id: student_id?.trim() || null,
      standard: standard?.trim() || null,
      grade_id: grade_id || null,
    },
  };
}

function validateLogin(body) {
  const errors = [];
  const { login_id, password } = body;

  if (!login_id || typeof login_id !== "string" || !login_id.trim())
    errors.push("login_id (email or student_id) is required");

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

module.exports = { validateRegister, validateLogin };
