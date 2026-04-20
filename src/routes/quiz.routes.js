const express = require("express");
const router = express.Router();
const quiz = require("../controllers/quiz.controller");
const validate = require("../middleware/validate.middleware");
const { verifyUser } = require("../middleware/auth.middleware");
const { validateStartSession, validateSubmitAnswer } = require("../dto/quiz.dto");

// All quiz routes require a logged-in user
router.use(verifyUser);

router.post  ("/sessions",              validate(validateStartSession), quiz.startSession);
router.get   ("/sessions/:id",          quiz.getSession);
router.get   ("/sessions/:id/validate", quiz.validateSession);
router.get   ("/sessions/:id/next",     quiz.getNextQuestion);
router.post  ("/sessions/:id/answer",   validate(validateSubmitAnswer), quiz.submitAnswer);
router.post  ("/sessions/:id/complete", quiz.completeSession);
router.get   ("/gaps",                  quiz.getGaps);
router.get   ("/my-sessions",           quiz.getMySessions);

module.exports = router;
