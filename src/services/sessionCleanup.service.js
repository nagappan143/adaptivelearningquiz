/**
 * sessionCleanup.service.js
 *
 * Handles automatic cleanup of abandoned quiz sessions.
 * A session is marked as abandoned if:
 *   - Status is 'in_progress'
 *   - Last activity (answer submission) was > 15 minutes ago
 *
 * This runs via cron job every 5 minutes.
 */

const pool = require("../config/db");

/**
 * Mark in_progress sessions as abandoned after X minutes of inactivity.
 *
 * @param {number} inactivityMinutes - Minutes of no activity before abandoning (default: 15)
 * @returns {Promise<Array>} - Array of abandoned session IDs
 */
const markAbandonedSessions = async (inactivityMinutes = 1) => {
  try {
    const result = await pool.query(
      `UPDATE quiz_sessions
       SET status = 'abandoned', completed_at = NOW()
       WHERE status = 'in_progress'
         AND last_activity_at < NOW() - INTERVAL '${inactivityMinutes} minutes'
       RETURNING id, user_id, started_at, last_activity_at`,
      []
    );

    if (result.rows.length > 0) {
      console.log(
        `[Session Cleanup] Marked ${result.rows.length} sessions as abandoned (${inactivityMinutes}min timeout)`
      );
      result.rows.forEach(row => {
        console.log(
          `  - Session ${row.id} (user: ${row.user_id}, inactive since: ${row.last_activity_at})`
        );
      });
    }

    return result.rows;
  } catch (err) {
    console.error("[Session Cleanup] Error marking abandoned sessions:", err);
    throw err;
  }
};

/**
 * Get statistics on session statuses.
 * Useful for monitoring/debugging.
 */
const getSessionStats = async () => {
  try {
    const result = await pool.query(
      `SELECT
         status,
         COUNT(*) as count,
         MIN(started_at) as oldest_started,
         MAX(started_at) as newest_started
       FROM quiz_sessions
       GROUP BY status
       ORDER BY status`
    );
    return result.rows;
  } catch (err) {
    console.error("[Session Cleanup] Error getting session stats:", err);
    throw err;
  }
};

module.exports = {
  markAbandonedSessions,
  getSessionStats,
};
