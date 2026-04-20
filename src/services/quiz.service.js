/**
 * quiz.service.js — Adaptive Quiz Engine
 *
 * THE ADAPTIVE LOGIC (matches the schema's branching design):
 *
 *   Questions tree:
 *     root  question  ← served first, tests a concept
 *       └── gap       question  (parent_question_id = root.id, trigger_option = 'B')
 *             └── remedial question (parent_question_id = gap.id,  trigger_option = 'A')
 *
 *   trigger_option means: "if the student picks THIS option on the parent,
 *   serve me (the child) next." It marks which answer pattern exposes a gap.
 *
 * FLOW:
 *   1. Start session  → new quiz_sessions row
 *   2. Next question  → priority (highest → lowest):
 *        1. Open gap question not yet answered
 *        2. Triggered remedial question not yet answered
 *        3. Clone question (after remedial is answered)
 *        4. Next root question in the topic
 *   3. Submit answer  →
 *        a. Log to session_question_log
 *        b. Look for a child question triggered by the chosen option
 *        c. If child is 'gap'      → open a learning_gap
 *        d. If child is 'remedial' → open a remedial_session
 *        e. If gap question answered correctly    → close the learning_gap
 *        f. If remedial answered correctly        → close the learning_gap +
 *                                                   complete remedial_session
 *   4. Complete       → set status = 'completed', calculate score
 */

const pool = require("../config/db");

// ─── SESSION ─────────────────────────────────────────────────────────────────

const startSession = async (userId) => {
  const result = await pool.query(
    `INSERT INTO quiz_sessions (user_id) VALUES ($1)
     RETURNING id, user_id, status, attempt_number, started_at, last_activity_at`,
    [userId]
  );
  return result.rows[0];
};

const updateSessionActivity = async (sessionId) => {
  await pool.query(
    `UPDATE quiz_sessions SET last_activity_at = NOW() WHERE id = $1`,
    [sessionId]
  );
};

const getSession = async (sessionId) => {
  const result = await pool.query(
    `SELECT qs.*,
       (SELECT count(*) FROM session_question_log WHERE session_id = qs.id)               AS total_answered,
       (SELECT count(*) FROM session_question_log WHERE session_id = qs.id AND result = 'correct') AS total_correct
     FROM quiz_sessions qs WHERE qs.id = $1`,
    [sessionId]
  );
  return result.rows[0] || null;
};

/**
 * Validate that a session is still active (in_progress).
 * Throws error if session is abandoned or completed.
 *
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} - Session data if valid
 * @throws {Error} - If session is not in_progress
 */
const validateSessionActive = async (sessionId) => {
  const session = await getSession(sessionId);

  if (!session) {
    const err = new Error("Session not found");
    err.statusCode = 404;
    throw err;
  }

  if (session.status !== "in_progress") {
    const err = new Error(
      `Session is ${session.status}. Cannot submit answers to completed or abandoned sessions.`
    );
    err.statusCode = 403; // Forbidden
    throw err;
  }

  return session;
};

// ─── NEXT QUESTION (adaptive routing) ────────────────────────────────────────

const getNextQuestion = async (sessionId, topicId) => {
  // VALIDATION: Check if session is still active
  await validateSessionActive(sessionId);
  const gapResult = await pool.query(
    `SELECT lg.gap_question_id AS question_id
     FROM learning_gaps lg
     WHERE lg.session_id = $1
       AND lg.status      = 'open'
       AND lg.gap_question_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM session_question_log sql
         WHERE sql.session_id = $1 AND sql.question_id = lg.gap_question_id
       )
     LIMIT 1`,
    [sessionId]
  );

  if (gapResult.rows.length > 0) {
    return { type: "gap", question_id: gapResult.rows[0].question_id };
  }

  // Priority 2 — Triggered remedial question that hasn't been answered yet.
  //
  // A remedial question is triggered when:
  //   • Its parent (gap) question was already answered in this session, AND
  //   • The label of the selected option matches the remedial's trigger_option.
  const remedialResult = await pool.query(
    `SELECT q.id AS question_id
     FROM questions q
     JOIN session_question_log sql
       ON  sql.session_id  = $1
       AND sql.question_id = q.parent_question_id
     JOIN options o
       ON  o.id    = sql.selected_option_id
       AND o.label = q.trigger_option
     WHERE q.question_level = 'remedial'
       AND q.is_active       = true
       AND q.deleted_at      IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM session_question_log sql2
         WHERE sql2.session_id = $1 AND sql2.question_id = q.id
       )
     LIMIT 1`,
    [sessionId]
  );

  if (remedialResult.rows.length > 0) {
    return { type: "remedial", question_id: remedialResult.rows[0].question_id };
  }

  // Priority 3 — Clone questions (reinforcement after remedial)
  //
  // A clone question is triggered when:
  //   • Its grandparent (gap) question was answered incorrectly in this session, AND
  //   • Its parent (remedial) question was answered in this session, AND
  //   • The clone question hasn't been answered yet.
  //
  // This ensures clone appears only after a student fails the gap and attempts remedial.
  const cloneResult = await pool.query(
    `SELECT q.id AS question_id
     FROM questions q
     JOIN questions remedial_q ON remedial_q.id = q.parent_question_id
     JOIN questions gap_q ON gap_q.id = remedial_q.parent_question_id
     JOIN session_question_log gap_log
       ON gap_log.session_id = $1
       AND gap_log.question_id = gap_q.id
       AND gap_log.result = 'incorrect'
     JOIN session_question_log remedial_log
       ON remedial_log.session_id = $1
       AND remedial_log.question_id = remedial_q.id
     WHERE q.question_level = 'clone'
       AND q.is_active       = true
       AND q.deleted_at      IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM session_question_log sql2
         WHERE sql2.session_id = $1 AND sql2.question_id = q.id
       )
     LIMIT 1`,
    [sessionId]
  );

  if (cloneResult.rows.length > 0) {
    return { type: "clone", question_id: cloneResult.rows[0].question_id };
  }

  // Priority 4 — Next unanswered root question for the topic.
  const rootResult = await pool.query(
    `SELECT q.id AS question_id
     FROM questions q
     WHERE q.topic_id       = $1
       AND q.question_level = 'root'
       AND q.is_active       = true
       AND q.deleted_at      IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM session_question_log sql
         WHERE sql.session_id = $2 AND sql.question_id = q.id
       )
     ORDER BY q.created_at ASC
     LIMIT 1`,
    [topicId, sessionId]
  );

  if (rootResult.rows.length > 0) {
    return { type: "root", question_id: rootResult.rows[0].question_id };
  }

  // No questions remain.
  return null;
};

// ─── SUBMIT ANSWER ───────────────────────────────────────────────────────────

const submitAnswer = async (sessionId, userId, { question_id, selected_option_id, time_taken_ms }) => {
  // VALIDATION: Check if session is still active
  await validateSessionActive(sessionId);

  // Get the question (with level) and the selected option (to know label + correctness)
  const qResult = await pool.query(
    `SELECT q.id, q.question_level, q.topic_id,
            o.label AS selected_label, o.is_correct AS is_correct
     FROM questions q
     LEFT JOIN options o ON o.id = $2
     WHERE q.id = $1`,
    [question_id, selected_option_id]
  );

  if (!qResult.rows[0]) throw Object.assign(new Error("Question not found"), { statusCode: 404 });

  const { question_level, topic_id, selected_label, is_correct } = qResult.rows[0];

  const result_enum = !selected_option_id
    ? "skipped"
    : is_correct ? "correct" : "incorrect";

  // Determine sequence order for this session
  const seqResult = await pool.query(
    `SELECT COALESCE(MAX(sequence_order), 0) + 1 AS next_seq
     FROM session_question_log WHERE session_id = $1`,
    [sessionId]
  );
  const sequence_order = seqResult.rows[0].next_seq;

  // Log the answer
  await pool.query(
    `INSERT INTO session_question_log
       (session_id, question_id, sequence_order, selected_option_id, result, time_taken_ms, answered_at)
     VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
    [sessionId, question_id, sequence_order, selected_option_id, result_enum, time_taken_ms]
  );

  // UPDATE: Track activity — user is still active
  await updateSessionActivity(sessionId);

  let gapCreated       = false;
  let gapClosed        = false;
  let remedialTriggered = false;

  if (selected_label) {
    // ── Step A: look for a child question triggered by the chosen option ──────
    const childResult = await pool.query(
      `SELECT id, question_level FROM questions
       WHERE parent_question_id = $1
         AND trigger_option      = $2
         AND is_active           = true
         AND deleted_at          IS NULL
       LIMIT 1`,
      [question_id, selected_label]
    );

    if (childResult.rows.length > 0) {
      const child = childResult.rows[0];

      if (child.question_level === "gap") {
        // Wrong answer on a root question — open a learning gap.
        await pool.query(
          `INSERT INTO learning_gaps
             (session_id, user_id, topic_id, root_question_id, gap_question_id, status)
           VALUES ($1,$2,$3,$4,$5,'open')`,
          [sessionId, userId, topic_id, question_id, child.id]
        );
        gapCreated = true;
      }

      if (child.question_level === "remedial") {
        // Wrong answer on a gap question — record a remedial session.
        const parentGapResult = await pool.query(
          `SELECT id FROM learning_gaps
           WHERE session_id     = $1
             AND gap_question_id = $2
             AND status          = 'open'
           LIMIT 1`,
          [sessionId, question_id]
        );
        if (parentGapResult.rows.length > 0) {
          await pool.query(
            `INSERT INTO remedial_sessions (gap_id) VALUES ($1)`,
            [parentGapResult.rows[0].id]
          );
          remedialTriggered = true;
        }
      }
    }

    // ── Step B: handle gap question answered correctly ───────────────────────
    if (question_level === "gap" && is_correct) {
      await pool.query(
        `UPDATE learning_gaps
         SET status                = 'closed',
             resolved_in_session_id = $1,
             updated_at             = NOW()
         WHERE session_id      = $1
           AND gap_question_id = $2
           AND status          = 'open'`,
        [sessionId, question_id]
      );
      gapClosed = true;
    }

    // ── Step C: handle remedial question answered correctly ──────────────────
    //
    // A remedial's parent is the gap question.
    // Close the learning gap that owns that gap question and mark the
    // remedial_session as complete.
    if (question_level === "remedial" && is_correct) {
      const parentResult = await pool.query(
        `SELECT parent_question_id FROM questions WHERE id = $1`,
        [question_id]
      );

      if (parentResult.rows.length > 0) {
        const gapQuestionId = parentResult.rows[0].parent_question_id;

        await pool.query(
          `UPDATE learning_gaps
           SET status                = 'closed',
               resolved_in_session_id = $1,
               updated_at             = NOW()
           WHERE session_id      = $1
             AND gap_question_id = $2
             AND status          = 'open'`,
          [sessionId, gapQuestionId]
        );

        // Mark the remedial_session row as completed.
        await pool.query(
          `UPDATE remedial_sessions rs
           SET completed_at = NOW()
           FROM learning_gaps lg
           WHERE rs.gap_id          = lg.id
             AND lg.session_id      = $1
             AND lg.gap_question_id = $2`,
          [sessionId, gapQuestionId]
        );

        gapClosed = true;
      }
    }
  }

  return {
    result: result_enum,
    is_correct: !!is_correct,
    gapCreated,
    gapClosed,
    remedialTriggered,
  };
};

// ─── COMPLETE SESSION ────────────────────────────────────────────────────────

const completeSession = async (sessionId) => {
  // Calculate score: correct / total * 100
  const scoreResult = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE result = 'correct') AS correct,
       COUNT(*) AS total
     FROM session_question_log WHERE session_id = $1`,
    [sessionId]
  );

  const { correct, total } = scoreResult.rows[0];
  const score = total > 0 ? ((correct / total) * 100).toFixed(2) : 0;

  const result = await pool.query(
    `UPDATE quiz_sessions
     SET status = 'completed', score = $1, completed_at = NOW(), last_activity_at = NOW()
     WHERE id = $2 AND status = 'in_progress'
     RETURNING id, status, score, completed_at`,
    [score, sessionId]
  );
  return result.rows[0] || null;
};

// ─── GAPS ────────────────────────────────────────────────────────────────────

/**
 * Get all quiz sessions for a user, enriched with the primary topic name.
 * The topic is derived from the questions answered (the topic with the most
 * answered questions in that session is chosen as the primary topic).
 * Sessions with no answered questions still appear with topic_name = null.
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
const getMySessionsWithTopics = async (userId) => {
  const result = await pool.query(
    `WITH session_primary_topic AS (
       SELECT DISTINCT ON (sgl.session_id)
         sgl.session_id,
         t.id   AS topic_id,
         t.name AS topic_name,
         COUNT(*) AS q_count
       FROM session_question_log sgl
       JOIN questions q ON q.id = sgl.question_id
       JOIN topics t    ON t.id = q.topic_id
       GROUP BY sgl.session_id, t.id, t.name
       ORDER BY sgl.session_id, COUNT(*) DESC
     )
     SELECT
       qs.id,
       qs.status,
       ROUND(qs.score::NUMERIC, 2)                                           AS score,
       qs.started_at,
       qs.completed_at,
       EXTRACT(EPOCH FROM (qs.completed_at - qs.started_at))::INTEGER        AS duration_seconds,
       COALESCE(spt.topic_name, 'Unknown Topic')                             AS topic_name
     FROM quiz_sessions qs
     LEFT JOIN session_primary_topic spt ON spt.session_id = qs.id
     WHERE qs.user_id = $1
     ORDER BY qs.started_at DESC`,
    [userId]
  );
  return result.rows;
};

const getUserGaps = async (userId) => {
  const result = await pool.query(
    `SELECT lg.id, lg.status, lg.created_at,
            t.name AS topic_name,
            rq.stem AS root_question,
            gq.stem AS gap_question
     FROM learning_gaps lg
     JOIN topics t    ON t.id  = lg.topic_id
     JOIN questions rq ON rq.id = lg.root_question_id
     LEFT JOIN questions gq ON gq.id = lg.gap_question_id
     WHERE lg.user_id = $1
     ORDER BY lg.created_at DESC`,
    [userId]
  );
  return result.rows;
};

module.exports = {
  startSession,
  getSession,
  validateSessionActive,
  getNextQuestion,
  submitAnswer,
  completeSession,
  getUserGaps,
  getMySessionsWithTopics,
  updateSessionActivity,
};
