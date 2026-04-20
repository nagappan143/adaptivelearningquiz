const quizService     = require("../services/quiz.service");
const questionService = require("../services/question.service");

// POST /quiz/sessions
exports.startSession = async (req, res, next) => {
  try {
    // topic_id comes from validated body; user id from JWT
    const session = await quizService.startSession(req.user.id);
    // Store topic_id in the response so the client can pass it back on /next
    res.status(201).json({
      success: true,
      message: "Session started. Pass topic_id when requesting the next question.",
      data: { ...session, topic_id: req.body.topic_id },
    });
  } catch (err) { next(err); }
};

// GET /quiz/sessions/:id/next?topic_id=...
exports.getNextQuestion = async (req, res, next) => {
  try {
    const { id: sessionId } = req.params;
    const { topic_id } = req.query;

    if (!topic_id)
      return res.status(400).json({ success: false, message: "topic_id query param required" });

    const next = await quizService.getNextQuestion(sessionId, topic_id);

    if (!next) {
      return res.json({
        success: true,
        message: "No more questions. You may complete the session.",
        data: null,
      });
    }

    // Fetch full question with options (is_correct hidden from client)
    const question = await questionService.getQuestionWithOptions(next.question_id);

    res.json({ success: true, data: question });
  } catch (err) { next(err); }
};

// POST /quiz/sessions/:id/answer
exports.submitAnswer = async (req, res, next) => {
  try {
    const result = await quizService.submitAnswer(
      req.params.id,
      req.user.id,
      req.body
    );
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// POST /quiz/sessions/:id/complete
exports.completeSession = async (req, res, next) => {
  try {
    const data = await quizService.completeSession(req.params.id);
    if (!data)
      return res.status(400).json({ success: false, message: "Session not found or already completed" });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// GET /quiz/sessions/:id
exports.getSession = async (req, res, next) => {
  try {
    const data = await quizService.getSession(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Session not found" });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// GET /quiz/sessions/:id/validate  — Check if session is still active
exports.validateSession = async (req, res, next) => {
  try {
    const session = await quizService.validateSessionActive(req.params.id);
    res.json({
      success: true,
      message: "Session is active",
      data: {
        id: session.id,
        status: session.status,
        is_active: session.status === 'in_progress'
      }
    });
  } catch (err) { next(err); }
};

// GET /quiz/gaps  — user's personal gap history
exports.getGaps = async (req, res, next) => {
  try {
    const data = await quizService.getUserGaps(req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// GET /quiz/my-sessions  — user's own quiz history with topic names
exports.getMySessions = async (req, res, next) => {
  try {
    const data = await quizService.getMySessionsWithTopics(req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
