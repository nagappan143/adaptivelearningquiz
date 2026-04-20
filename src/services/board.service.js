/**
 * board.service.js
 * Business logic for board CRUD operations
 */

const pool = require("../config/db");
const { getPagination } = require("../utils/pagination");

/**
 * List all active boards
 * @returns {Array} Array of board objects
 */
const listBoards = async () => {
  const result = await pool.query(
    `SELECT id, name, description, board_code, is_active, created_at
     FROM boards
     ORDER BY name`
  );
  return result.rows;
};

/**
 * List boards with pagination filtered by is_active status
 * @param {Object} options - { page, limit, is_active }
 * @returns {Object} Paginated result with data, total, page info
 */
const listBoardsPaginated = async ({ page = 1, limit = 10, is_active = true } = {}) => {
  const { limit: l, offset } = getPagination(page, limit);

  const result = await pool.query(
    `SELECT id, name, description, board_code, is_active, created_at
     FROM boards
     WHERE is_active = $1
     ORDER BY name
     LIMIT $2 OFFSET $3`,
    [is_active, l, offset]
  );

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM boards WHERE is_active = $1`,
    [is_active]
  );

  const total = parseInt(countResult.rows[0].count);

  return {
    page: parseInt(page),
    limit: l,
    total,
    totalPages: Math.ceil(total / l),
    data: result.rows,
  };
};

/**
 * Find a board by ID
 * @param {string} id - Board UUID
 * @returns {Object|null} Board object or null if not found
 */
const findBoardById = async (id) => {
  const result = await pool.query(
    `SELECT id, name, description, board_code, is_active, created_at, updated_at
     FROM boards
     WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Find a board by code
 * @param {string} code - Board code
 * @returns {Object|null} Board object or null if not found
 */
const findBoardByCode = async (code) => {
  const result = await pool.query(
    `SELECT id, name, description, board_code, is_active, created_at, updated_at
     FROM boards
     WHERE board_code = $1`,
    [code]
  );
  return result.rows[0] || null;
};

/**
 * Create a new board
 * @param {Object} params - { name, board_code, description }
 * @param {string} adminId - Admin UUID who created the board
 * @returns {Object} Created board object
 */
const createBoard = async ({ name, board_code, description }, adminId) => {
  const result = await pool.query(
    `INSERT INTO boards (name, description, board_code, created_by, is_active)
     VALUES ($1, $2, $3, $4, true)
     RETURNING id, name, description, board_code, is_active, created_at`,
    [name, description, board_code, adminId]
  );
  return result.rows[0];
};

/**
 * Update a board
 * @param {string} id - Board UUID
 * @param {Object} fields - Fields to update { name, board_code, description, is_active }
 * @returns {Object|null} Updated board object or null if not found
 */
const updateBoard = async (id, fields) => {
  const keys = Object.keys(fields);
  if (keys.length === 0) return findBoardById(id);

  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const values = [...Object.values(fields), id];

  const result = await pool.query(
    `UPDATE boards 
     SET ${setClauses}, updated_at = NOW() 
     WHERE id = $${values.length}
     RETURNING id, name, description, board_code, is_active, created_at, updated_at`,
    values
  );
  return result.rows[0] || null;
};

/**
 * Soft-delete a board (set is_active = false)
 * @param {string} id - Board UUID
 * @returns {Object|null} Updated board object or null if not found
 */
const deactivateBoard = async (id) => {
  const result = await pool.query(
    `UPDATE boards 
     SET is_active = false, updated_at = NOW() 
     WHERE id = $1 
     RETURNING id, name, board_code, is_active`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Get board with all related grades
 * @param {string} id - Board UUID
 * @returns {Object} Board with nested grades
 */
const getBoardWithGrades = async (id) => {
  const boardResult = await pool.query(
    `SELECT id, name, description, board_code, is_active, created_at
     FROM boards
     WHERE id = $1`,
    [id]
  );

  if (!boardResult.rows[0]) return null;

  const gradesResult = await pool.query(
    `SELECT id, name, description, is_active, created_at
     FROM grade
     WHERE board_id = $1 AND is_active = true
     ORDER BY name`,
    [id]
  );

  return {
    ...boardResult.rows[0],
    grades: gradesResult.rows,
  };
};

module.exports = {
  listBoards,
  listBoardsPaginated,
  findBoardById,
  findBoardByCode,
  createBoard,
  updateBoard,
  deactivateBoard,
  getBoardWithGrades,
};