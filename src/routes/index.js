const express = require("express");
const router = express.Router();

router.use("/auth",      require("./auth.routes"));
router.use("/boards",    require("./board.routes"));
router.use("/grades",    require("./grade.routes"));
router.use("/subjects",  require("./subject.routes"));
router.use("/topics",    require("./topic.routes"));
router.use("/questions", require("./question.routes"));
router.use("/quiz",      require("./quiz.routes"));
router.use("/reports",   require("./reports.routes"));

router.get("/health", (_req, res) =>
  res.json({ success: true, status: "up", timestamp: new Date().toISOString() })
);

module.exports = router;
