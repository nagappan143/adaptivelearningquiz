/**
 * reports.controller.js — Admin Report Endpoints
 *
 * All routes here require verifyAdmin middleware (enforced in reports.routes.js).
 */

const reportsService = require("../services/reports.service");

/**
 * GET /api/v1/reports/summary
 *
 * Returns summary statistics for dashboard
 */
exports.getSummary = async (req, res, next) => {
  try {
    const data = await reportsService.getSummaryStats();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/reports/gap-reports
 *
 * Query params (all optional, combinable):
 *   board_id   — UUID of a board
 *   grade_id   — UUID of a grade
 *   subject_id — UUID of a subject
 *
 * Returns completed quiz sessions enriched with student info and subject hierarchy.
 */
exports.getGapReports = async (req, res, next) => {
  try {
    const { board_id, grade_id, subject_id } = req.query;

    const data = await reportsService.getGapReports({
      board_id:   board_id   || null,
      grade_id:   grade_id   || null,
      subject_id: subject_id || null,
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
