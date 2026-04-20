const pool = require("../config/db");
const { getPagination } = require("../utils/pagination");

const listTopics = async (subject_id) => {
  const result = await pool.query(
    `SELECT id, subject_id, name, description, is_active, created_at
     FROM topics
     WHERE subject_id = $1
       AND is_active = true
       AND deleted_at IS NULL
     ORDER BY name`,
    [subject_id]
  );
  return result.rows;
};

/**
 * List topics with pagination
 * @param {Object} options - Pagination options { page, limit, subject_id }
 * @returns {Object} Paginated result with data, total, page info
 */
const listTopicsPaginated = async ({ page = 1, limit = 10, subject_id } = {}) => {
  if (!subject_id) {
    throw new Error("subject_id is required for paginated topics");
  }
  
  const { limit: l, offset } = getPagination(page, limit);

  const query = `SELECT id, subject_id, name, description, is_active, created_at
                 FROM topics
                 WHERE subject_id = $1
                   AND is_active = true
                   AND deleted_at IS NULL
                 ORDER BY name
                 LIMIT $2 OFFSET $3`;
  
  const countQuery = `SELECT COUNT(*) 
                      FROM topics 
                      WHERE subject_id = $1 
                        AND is_active = true 
                        AND deleted_at IS NULL`;

  const result = await pool.query(query, [subject_id, l, offset]);
  const countResult = await pool.query(countQuery, [subject_id]);
  const total = parseInt(countResult.rows[0].count);

  return {
    page: parseInt(page),
    limit: l,
    total,
    totalPages: Math.ceil(total / l),
    data: result.rows
  };
};

const findTopicById = async (id) => {
  const result = await pool.query(
    `SELECT * FROM topics WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return result.rows[0] || null;
};

const createTopic = async ({ subject_id, name, description }, adminId) => {
  const result = await pool.query(
    `INSERT INTO topics (subject_id, name, description, created_by)
     VALUES ($1,$2,$3,$4)
     RETURNING id, subject_id, name, description, is_active, created_at`,
    [subject_id, name, description, adminId]
  );
  return result.rows[0];
};

const updateTopic = async (id, fields) => {
  const keys = Object.keys(fields);
  if (keys.length === 0) return findTopicById(id);

  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const values = [...Object.values(fields), id];

  const result = await pool.query(
    `UPDATE topics
     SET ${setClauses}, updated_at = NOW()
     WHERE id = $${values.length} AND deleted_at IS NULL
     RETURNING id, subject_id, name, description, is_active, updated_at`,
    values
  );
  return result.rows[0] || null;
};

const deleteTopic = async (id) => {
  const result = await pool.query(
    `UPDATE topics SET deleted_at = NOW(), is_active = false
     WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
    [id]
  );
  return result.rows[0] || null;
};

module.exports = { 
  listTopics, 
  listTopicsPaginated,
  findTopicById, 
  createTopic, 
  updateTopic, 
  deleteTopic 
};