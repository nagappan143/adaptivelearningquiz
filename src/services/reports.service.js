/**
 * reports.service.js — Admin Reporting Engine
 *
 * Provides aggregated data for the admin's Gap Reports dashboard.
 *
 * GAP REPORT QUERY LOGIC:
 *   A quiz session does not store subject/grade/board directly. We derive
 *   the "primary subject" for each session by looking at which subject
 *   the majority of answered questions belong to (via the chain:
 *   session_question_log → questions → topics → subjects → grade → boards).
 *
 *   The CTE `session_subject_counts` counts questions per subject per session.
 *   `session_primary_subject` picks the subject with the highest count
 *   (DISTINCT ON + ORDER BY count DESC) to represent each session.
 *
 * FILTERS (all optional, combinable):
 *   board_id   — filter sessions whose primary subject belongs to this board
 *   grade_id   — filter sessions whose primary subject belongs to this grade
 *   subject_id — filter sessions for this specific subject
 */

const pool = require("../config/db");

/**
 * Get summary statistics for dashboard
 * @returns {Promise<Object>}
 */
const getSummaryStats = async () => {
  // Get counts for all entities
  const [boardsResult, gradesResult, subjectsResult, topicsResult, questionsResult] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active
      FROM boards
    `),
    pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active
      FROM grades
    `),
    pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active
      FROM subjects
    `),
    pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active
      FROM topics
    `),
    pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) FILTER (WHERE question_type = 'single') as single_correct,
        COUNT(*) FILTER (WHERE question_type = 'multiple') as multiple_correct,
        COUNT(*) FILTER (WHERE difficulty = 'easy') as easy,
        COUNT(*) FILTER (WHERE difficulty = 'medium') as medium,
        COUNT(*) FILTER (WHERE difficulty = 'hard') as hard,
        COUNT(*) FILTER (WHERE question_level = 'root') as root,
        COUNT(*) FILTER (WHERE question_level = 'gap') as gap,
        COUNT(*) FILTER (WHERE question_level = 'remedial') as remedial,
        COUNT(*) FILTER (WHERE question_level = 'clone') as clone
      FROM questions
    `)
  ]);

  return {
    boards: {
      total: parseInt(boardsResult.rows[0].total),
      active: parseInt(boardsResult.rows[0].active)
    },
    grades: {
      total: parseInt(gradesResult.rows[0].total),
      active: parseInt(gradesResult.rows[0].active)
    },
    subjects: {
      total: parseInt(subjectsResult.rows[0].total),
      active: parseInt(subjectsResult.rows[0].active)
    },
    topics: {
      total: parseInt(topicsResult.rows[0].total),
      active: parseInt(topicsResult.rows[0].active)
    },
    questions: {
      total: parseInt(questionsResult.rows[0].total),
      active: parseInt(questionsResult.rows[0].active),
      single_correct: parseInt(questionsResult.rows[0].single_correct),
      multiple_correct: parseInt(questionsResult.rows[0].multiple_correct),
      easy: parseInt(questionsResult.rows[0].easy),
      medium: parseInt(questionsResult.rows[0].medium),
      hard: parseInt(questionsResult.rows[0].hard),
      root: parseInt(questionsResult.rows[0].root),
      gap: parseInt(questionsResult.rows[0].gap),
      remedial: parseInt(questionsResult.rows[0].remedial),
      clone: parseInt(questionsResult.rows[0].clone)
    }
  };
};

/**
 * Get all completed quiz sessions enriched with student and subject info.
 *
 * @param {Object} filters
 * @param {string} [filters.board_id]
 * @param {string} [filters.grade_id]
 * @param {string} [filters.subject_id]
 * @returns {Promise<Array>}
 */
const getGapReports = async ({ board_id, grade_id, subject_id } = {}) => {
  const params = [];
  const conditions = [];

  if (board_id) {
    params.push(board_id);
    conditions.push(`sps.board_id = $${params.length}`);
  }
  if (grade_id) {
    params.push(grade_id);
    conditions.push(`sps.grade_id = $${params.length}`);
  }
  if (subject_id) {
    params.push(subject_id);
    conditions.push(`sps.subject_id = $${params.length}`);
  }

  const filterClause =
    conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";

  const query = `
    WITH session_subject_counts AS (
      -- Count how many questions from each subject were answered in each session
      SELECT
        sgl.session_id,
        s.id    AS subject_id,
        s.name  AS subject_name,
        g.id    AS grade_id,
        g.name  AS grade_name,
        b.id    AS board_id,
        b.name  AS board_name,
        COUNT(*) AS q_count
      FROM session_question_log sgl
      JOIN questions q ON q.id = sgl.question_id
      JOIN topics t    ON t.id  = q.topic_id
      JOIN subjects s  ON s.id  = t.subject_id
      JOIN grade g     ON g.id  = s.grade_id
      JOIN boards b    ON b.id  = g.board_id
      GROUP BY
        sgl.session_id,
        s.id, s.name,
        g.id, g.name,
        b.id, b.name
    ),
    session_primary_subject AS (
      -- Pick the subject with the most answered questions as the session's primary subject
      SELECT DISTINCT ON (session_id)
        session_id AS qs_id,
        subject_id,
        subject_name,
        grade_id,
        grade_name,
        board_id,
        board_name
      FROM session_subject_counts
      ORDER BY session_id, q_count DESC
    )
    SELECT
      qs.id                                                                  AS session_id,
      u.name                                                                 AS student_name,
      u.email                                                                AS student_email,
      ROUND(qs.score::NUMERIC, 2)                                            AS score,
      EXTRACT(EPOCH FROM (qs.completed_at - qs.started_at))::INTEGER         AS duration_seconds,
      qs.completed_at                                                         AS quiz_taken_at,
      sps.subject_name,
      sps.grade_name,
      sps.board_name,
      sps.subject_id,
      sps.grade_id,
      sps.board_id
    FROM quiz_sessions qs
    JOIN users u                     ON u.id      = qs.user_id AND u.deleted_at IS NULL
    JOIN session_primary_subject sps ON sps.qs_id = qs.id
    WHERE qs.status = 'completed'
    ${filterClause}
    ORDER BY qs.completed_at DESC
  `;

  const result = await pool.query(query, params);
  return result.rows;
};

module.exports = { getGapReports };
