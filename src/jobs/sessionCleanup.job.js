/**
 * jobs/sessionCleanup.job.js
 *
 * Cron job that periodically checks and marks abandoned quiz sessions.
 *
 * SCHEDULE: Every 5 minutes
 * TIMEOUT: 15 minutes of inactivity (configured in sessionCleanup.service)
 *
 * How it works:
 *   1. Runs every 5 minutes automatically
 *   2. Finds all sessions where:
 *      - Status = 'in_progress'
 *      - last_activity_at < NOW - 15 minutes
 *   3. Updates them to status = 'abandoned' and sets completed_at = NOW()
 *   4. Logs results to console
 */

const cron = require("node-cron");
const { markAbandonedSessions } = require("../services/sessionCleanup.service");

/**
 * Initialize the session cleanup cron job.
 * Should be called once on server startup.
 */
const initSessionCleanupJob = () => {
  // Run every 5 minutes: "*/5 * * * *"
  // Structure: minute | hour | day | month | day-of-week
  const job = cron.schedule("*/5 * * * *", async () => {
    try {
      // 15-minute timeout: sessions inactive for > 15 minutes are abandoned
      await markAbandonedSessions(15);
    } catch (err) {
      console.error("[Cron Job Error] Session cleanup failed:", err.message);
    }
  });

  console.log("[Server Startup] Session cleanup cron job initialized");
  console.log("  ✓ Runs every 5 minutes");
  console.log("  ✓ Marks sessions abandoned after 15 minutes of inactivity");

  return job;
};

module.exports = { initSessionCleanupJob };
