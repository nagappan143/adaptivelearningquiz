const topicService = require("../services/topic.service");

exports.list = async (req, res, next) => {
  try {
    if (!req.query.subject_id) {
      return res.status(400).json({ success: false, message: "subject_id query param is required" });
    }
    
    const subject_id = req.query.subject_id;
    const { page, limit } = req.query;
    
    // If pagination params are provided, use paginated version
    if (page || limit) {
      const data = await topicService.listTopicsPaginated({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        subject_id: subject_id
      });
      return res.json({ success: true, ...data });
    }
    
    // Otherwise return all topics (for dropdowns, exports, etc.)
    const data = await topicService.listTopics(subject_id);
    res.json({ success: true, data });
  } catch (err) { 
    next(err); 
  }
};

exports.create = async (req, res, next) => {
  try {
    const data = await topicService.createTopic(req.body, req.admin.id);
    res.status(201).json({ success: true, data });
  } catch (err) { 
    next(err); 
  }
};

exports.update = async (req, res, next) => {
  try {
    const data = await topicService.updateTopic(req.params.id, req.body);
    if (!data) return res.status(404).json({ success: false, message: "Topic not found" });
    res.json({ success: true, data });
  } catch (err) { 
    next(err); 
  }
};

exports.remove = async (req, res, next) => {
  try {
    const data = await topicService.deleteTopic(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Topic not found" });
    res.json({ success: true, message: "Topic deleted" });
  } catch (err) { 
    next(err); 
  }
};