const express    = require("express");
const router     = express.Router();
const reports    = require("../controllers/reports.controller");
const { verifyAdmin } = require("../middleware/auth.middleware");

// All report routes are admin-only
router.use(verifyAdmin);

router.get("/summary", reports.getSummary);
router.get("/gap-reports", reports.getGapReports);

module.exports = router;
