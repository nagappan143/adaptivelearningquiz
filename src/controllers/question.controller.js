const questionService = require("../services/question.service");

exports.list = async (req, res, next) => {
  try {
    if (!req.query.topic_id)
      return res.status(400).json({ success: false, message: "topic_id query param is required" });
    const data = await questionService.listQuestions(req.query.topic_id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const data = await questionService.createQuestion(req.body, req.admin.id);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const data = await questionService.updateQuestion(req.params.id, req.body);
    if (!data) return res.status(404).json({ success: false, message: "Question not found" });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const data = await questionService.deleteQuestion(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Question not found" });
    res.json({ success: true, message: "Question deleted" });
  } catch (err) { next(err); }
};
