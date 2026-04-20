const express = require("express");
const router = express.Router();
const question = require("../controllers/question.controller");
const validate = require("../middleware/validate.middleware");
const { verifyAdmin } = require("../middleware/auth.middleware");
const { validateCreateQuestion, validateUpdateQuestion } = require("../dto/question.dto");

// List is public so the quiz engine (or students) can browse questions by topic
router.get("/",       question.list);
router.post("/",      verifyAdmin, validate(validateCreateQuestion), question.create);
router.put("/:id",    verifyAdmin, validate(validateUpdateQuestion), question.update);
router.delete("/:id", verifyAdmin, question.remove);

module.exports = router;
