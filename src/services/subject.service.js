const pool = require("../config/db");
const { getPagination } = require("../utils/pagination");

const listSubjects = async (grade_id = null) => {
  if (grade_id) {
    const result = await pool.query(
      `SELECT id, grade_id, name, description, is_active, created_at
       FROM subjects
       WHERE grade_id = $1
         AND is_active = true
         AND deleted_at IS NULL
       ORDER BY name`,
      [grade_id]
    );
    return result.rows;
  }

  // No grade_id — return all active subjects (admin overview use case)
  const result = await pool.query(
    `SELECT id, grade_id, name, description, is_active, created_at
     FROM subjects
     WHERE is_active = true
       AND deleted_at IS NULL
     ORDER BY name`
  );
  return result.rows;
};

/**
 * List subjects with pagination
 * @param {Object} options - Pagination options { page, limit, grade_id }
 * @returns {Object} Paginated result with data, total, page info
 */
const listSubjectsPaginated = async ({ page = 1, limit = 10, grade_id = null } = {}) => {
  const { limit: l, offset } = getPagination(page, limit);

  let query = `SELECT id, grade_id, name, description, is_active, created_at
               FROM subjects
               WHERE is_active = true
                 AND deleted_at IS NULL`;
  let countQuery = `SELECT COUNT(*) FROM subjects WHERE is_active = true AND deleted_at IS NULL`;
  const params = [];
  const countParams = [];

  if (grade_id) {
    query += ` AND grade_id = $1`;
    countQuery += ` AND grade_id = $1`;
    params.push(grade_id);
    countParams.push(grade_id);
  }

  query += ` ORDER BY name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(l, offset);

  const result = await pool.query(query, params);
  const countResult = await pool.query(countQuery, countParams);
  const total = parseInt(countResult.rows[0].count);

  return {
    page: parseInt(page),
    limit: l,
    total,
    totalPages: Math.ceil(total / l),
    data: result.rows
  };
};

const findSubjectById = async (id) => {
  const result = await pool.query(
    `SELECT * FROM subjects WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return result.rows[0] || null;
};

const createSubject = async ({ grade_id, name, description }, adminId) => {
  const result = await pool.query(
    `INSERT INTO subjects (grade_id, name, description, created_by)
     VALUES ($1,$2,$3,$4)
     RETURNING id, grade_id, name, description, is_active, created_at`,
    [grade_id, name, description, adminId]
  );
  return result.rows[0];
};

const updateSubject = async (id, fields) => {
  const keys = Object.keys(fields);
  if (keys.length === 0) return findSubjectById(id);

  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const values = [...Object.values(fields), id];

  const result = await pool.query(
    `UPDATE subjects
     SET ${setClauses}, updated_at = NOW()
     WHERE id = $${values.length} AND deleted_at IS NULL
     RETURNING id, grade_id, name, description, is_active, updated_at`,
    values
  );
  return result.rows[0] || null;
};

const deleteSubject = async (id) => {
  const result = await pool.query(
    `UPDATE subjects SET deleted_at = NOW(), is_active = false
     WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
    [id]
  );
  return result.rows[0] || null;
};

module.exports = { 
  listSubjects, 
  listSubjectsPaginated,
  findSubjectById, 
  createSubject, 
  updateSubject, 
  deleteSubject 
};