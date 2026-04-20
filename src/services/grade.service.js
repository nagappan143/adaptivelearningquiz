const pool = require("../config/db");
const { getPagination } = require("../utils/pagination");

// Validation function for grade name format
const validateGradeName = (name) => {
  // Regular expression to match "Grade-1", "Grade-2", "Grade-3", etc.
  const gradePattern = /^Grade-([1-9]|[1-9][0-9]|1[0-9]{2})$/; // Supports Grade-1 to Grade-199
  return gradePattern.test(name);
};

const listGrades = async (boardId = null) => {
  let query = `SELECT id, board_id, name, description, is_active, created_at
               FROM grade
               WHERE is_active = true`;
  const params = [];

  if (boardId) {
    query += ` AND board_id = $1`;
    params.push(boardId);
    console.log('[Grade Service] listGrades() - filtering by board_id:', boardId);
  } else {
    console.log('[Grade Service] listGrades() - NO board_id filter, returning all grades');
  }

  query += ` ORDER BY name`;
  const result = await pool.query(query, params);
  console.log('[Grade Service] listGrades() - query executed, found', result.rows.length, 'rows');
  return result.rows;
};

/**
 * List grades with pagination
 * @param {Object} options - Pagination options { page, limit, boardId }
 * @returns {Object} Paginated result with data, total, page info
 */
const listGradesPaginated = async ({ page = 1, limit = 10, boardId = null } = {}) => {
  const { limit: l, offset } = getPagination(page, limit);

  let query = `SELECT id, board_id, name, description, is_active, created_at
               FROM grade
               WHERE is_active = true`;
  let countQuery = `SELECT COUNT(*) FROM grade WHERE is_active = true`;
  const params = [];
  const countParams = [];

  if (boardId) {
    query += ` AND board_id = $1`;
    countQuery += ` AND board_id = $1`;
    params.push(boardId);
    countParams.push(boardId);
    console.log('[Grade Service] listGradesPaginated() - filtering by board_id:', boardId);
  }

  query += ` ORDER BY name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(l, offset);

  const result = await pool.query(query, params);
  const countResult = await pool.query(countQuery, countParams);
  const total = parseInt(countResult.rows[0].count);

  console.log('[Grade Service] listGradesPaginated() - found', result.rows.length, 'rows, total:', total);

  return {
    page: parseInt(page),
    limit: l,
    total,
    totalPages: Math.ceil(total / l),
    data: result.rows
  };
};

const findGradeById = async (id) => {
  const result = await pool.query(`SELECT * FROM grade WHERE id = $1`, [id]);
  return result.rows[0] || null;
};

/**
 * Check if a grade with the same name already exists for this board
 * @param {string} boardId - Board UUID
 * @param {string} name - Grade name
 * @returns {boolean} True if grade exists
 */
const checkGradeExists = async (boardId, name) => {
  const result = await pool.query(
    `SELECT id FROM grade WHERE board_id = $1 AND name = $2 AND is_active = true`,
    [boardId, name]
  );
  return result.rows.length > 0;
};

const createGrade = async ({ board_id, name, description }, adminId) => {
  // Validate grade name format - ONLY accept "Grade-1", "Grade-2", etc.
  if (!validateGradeName(name)) {
    const error = new Error('Grade name must be in format "Grade-1", "Grade-2", "Grade-3", etc.');
    error.code = "INVALID_GRADE_FORMAT";
    throw error;
  }

  // Check if grade with same name already exists for this board
  const gradeExists = await checkGradeExists(board_id, name);
  
  if (gradeExists) {
    const error = new Error(`Grade "${name}" already exists for this board`);
    error.code = "DUPLICATE_GRADE";
    throw error;
  }

  const result = await pool.query(
    `INSERT INTO grade (board_id, name, description, created_by, is_active)
     VALUES ($1, $2, $3, $4, true)
     RETURNING id, board_id, name, description, is_active, created_at`,
    [board_id, name, description, adminId]
  );
  return result.rows[0];
};

const updateGrade = async (id, fields) => {
  // If updating name, validate format first
  if (fields.name) {
    if (!validateGradeName(fields.name)) {
      const error = new Error('Grade name must be in format "Grade-1", "Grade-2", "Grade-3", etc.');
      error.code = "INVALID_GRADE_FORMAT";
      throw error;
    }
    
    // Get current grade to know its board_id
    const currentGrade = await findGradeById(id);
    if (currentGrade) {
      const duplicateExists = await checkGradeExists(currentGrade.board_id, fields.name);
      if (duplicateExists && currentGrade.name !== fields.name) {
        const error = new Error(`Grade "${fields.name}" already exists for this board`);
        error.code = "DUPLICATE_GRADE";
        throw error;
      }
    }
  }

  // Build SET clause dynamically from only the fields provided
  const keys = Object.keys(fields);
  if (keys.length === 0) return findGradeById(id);

  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const values = [...Object.values(fields), id];

  const result = await pool.query(
    `UPDATE grade SET ${setClauses}, updated_at = NOW() WHERE id = $${values.length}
     RETURNING id, board_id, name, description, is_active, created_at`,
    values
  );
  return result.rows[0] || null;
};

// Soft-deactivate (soft delete using is_active = false)
const deactivateGrade = async (id) => {
  const result = await pool.query(
    `UPDATE grade SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`,
    [id]
  );
  return result.rows[0] || null;
};

module.exports = { 
  listGrades, 
  listGradesPaginated,
  findGradeById, 
  checkGradeExists,
  createGrade, 
  updateGrade, 
  deactivateGrade,
  validateGradeName  // Export for testing if needed
};