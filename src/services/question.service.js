/**
 * question.service.js
 *
 * ✅ Supports ROOT → GAP → REMEDIAL → CLONE flow
 * ✅ clone_of added
 * ✅ No breaking changes
 */

const pool = require("../config/db");

/**
 * List questions by topic
 */
const listQuestions = async (topic_id) => {
  const result = await pool.query(
    `SELECT q.id, q.topic_id, q.stem, q.question_level, q.parent_question_id,
            q.trigger_option, q.clone_of,
            q.bloom_level, q.difficulty, q.explanation,
            q.image_url, q.is_active, q.created_at,
            COALESCE(
              json_agg(
                json_build_object(
                  'id',          o.id,
                  'label',       o.label,
                  'option_text', o.option_text,
                  'is_correct',  o.is_correct
                )
                ORDER BY o.label
              ) FILTER (WHERE o.id IS NOT NULL),
              '[]'
            ) AS options
     FROM questions q
     LEFT JOIN options o ON o.question_id = q.id
     WHERE q.topic_id = $1
       AND q.is_active = true
       AND q.deleted_at IS NULL
     GROUP BY q.id
     ORDER BY q.question_level, q.created_at`,
    [topic_id]
  );
  return result.rows;
};

/**
 * Create Question (Supports clone)
 */
const createQuestion = async (
  {
    topic_id,
    question_level,
    parent_question_id,
    trigger_option,
    clone_of, // ✅ NEW
    stem,
    image_url,
    explanation,
    bloom_level,
    difficulty,
    options,
  },
  adminId
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const qResult = await client.query(
      `INSERT INTO questions
        (topic_id, question_level, parent_question_id, trigger_option,
         clone_of,
         stem, image_url, explanation, bloom_level, difficulty, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id, topic_id, question_level, stem, bloom_level, difficulty, created_at`,
      [
        topic_id,
        question_level,
        parent_question_id || null,
        trigger_option || null,
        clone_of || null,
        stem,
        image_url,
        explanation,
        bloom_level,
        difficulty,
        adminId,
      ]
    );

    const question = qResult.rows[0];

    const insertedOptions = [];

    for (const opt of options) {
      const oResult = await client.query(
        `INSERT INTO options (question_id, label, option_text, is_correct, created_by)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING id, label, option_text, is_correct`,
        [question.id, opt.label, opt.option_text, opt.is_correct, adminId]
      );

      insertedOptions.push(oResult.rows[0]);
    }

    await client.query("COMMIT");

    return { ...question, options: insertedOptions };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Update Question
 */
const updateQuestion = async (id, fields) => {
  const keys = Object.keys(fields);
  if (keys.length === 0) return getQuestionWithAnswers(id);

  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const values = [...Object.values(fields), id];

  const result = await pool.query(
    `UPDATE questions
     SET ${setClauses}, updated_at = NOW()
     WHERE id = $${values.length} AND deleted_at IS NULL
     RETURNING id, topic_id, question_level, stem, bloom_level, difficulty, is_active, updated_at`,
    values
  );

  return result.rows[0] || null;
};

/**
 * Soft Delete
 */
const deleteQuestion = async (id) => {
  const result = await pool.query(
    `UPDATE questions
     SET deleted_at = NOW(), is_active = false
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id`,
    [id]
  );

  return result.rows[0] || null;
};

/**
 * Get Question for USER (NO correct answer)
 */
const getQuestionWithOptions = async (id) => {
  const result = await pool.query(
    `SELECT
       q.id,
       q.stem,
       q.question_level,
       q.bloom_level,
       q.difficulty,
       q.parent_question_id,
       q.clone_of,
       CASE
         WHEN q.question_level = 'root'     THEN NULL
         WHEN q.question_level = 'gap'      THEN q.parent_question_id
         WHEN q.question_level = 'remedial' THEN pq.parent_question_id
         WHEN q.question_level = 'clone'    THEN q.clone_of
       END AS root_question_id,
       COALESCE(
         (SELECT json_agg(json_build_object('id', qi_sub.id, 'url', qi_sub.image_url) ORDER BY qi_sub.sequence_order)
          FROM question_images qi_sub
          WHERE qi_sub.question_id = q.id AND qi_sub.deleted_at IS NULL),
         json_build_array()
       ) AS images,
       json_agg(
         json_build_object(
           'id', o.id,
           'label', o.label,
           'option_text', o.option_text,
           'images', COALESCE(oi.images, json_build_array())
         )
         ORDER BY o.label
       ) AS options
     FROM questions q
     LEFT JOIN questions pq ON pq.id = q.parent_question_id
     JOIN options o ON o.question_id = q.id
     LEFT JOIN LATERAL (
       SELECT json_agg(
         json_build_object('id', oi_sub.id, 'url', oi_sub.image_url)
         ORDER BY oi_sub.sequence_order
       ) as images
       FROM option_images oi_sub
       WHERE oi_sub.option_id = o.id AND oi_sub.deleted_at IS NULL
     ) oi ON TRUE
     WHERE q.id = $1
     GROUP BY q.id, pq.parent_question_id`,
    [id]
  );

  return result.rows[0] || null;
};

/**
 * Get Question WITH answers (Admin/internal)
 */
const getQuestionWithAnswers = async (id) => {
  const result = await pool.query(
    `SELECT q.*, 
            json_agg(
              json_build_object(
                'id', o.id,
                'label', o.label,
                'option_text', o.option_text,
                'is_correct', o.is_correct
              )
              ORDER BY o.label
            ) AS options
     FROM questions q
     JOIN options o ON o.question_id = q.id
     WHERE q.id = $1
     GROUP BY q.id`,
    [id]
  );

  return result.rows[0] || null;
};

/**
 * ✅ NEW: Get CLONE question for a ROOT
 */
const getCloneQuestion = async (rootId) => {
  const result = await pool.query(
    `SELECT * FROM questions
     WHERE question_level = 'clone'
       AND clone_of = $1
       AND is_active = true
       AND deleted_at IS NULL
     LIMIT 1`,
    [rootId]
  );

  return result.rows[0] || null;
};

module.exports = {
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getQuestionWithOptions,
  getQuestionWithAnswers,
  getCloneQuestion, // ✅ added
};