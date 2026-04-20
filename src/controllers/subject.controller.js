const subjectService = require("../services/subject.service");

exports.list = async (req, res, next) => {
  try {
    const grade_id = req.query.grade_id || null;
    const { page, limit } = req.query;
    
    // If pagination params are provided, use paginated version
    if (page || limit) {
      const data = await subjectService.listSubjectsPaginated({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        grade_id: grade_id
      });
      return res.json({ success: true, ...data });
    }
    
    // Otherwise return all subjects (for dropdowns, exports, etc.)
    const data = await subjectService.listSubjects(grade_id);
    res.json({ success: true, data });
  } catch (err) { 
    next(err); 
  }
};

exports.create = async (req, res, next) => {
  try {
    const data = await subjectService.createSubject(req.body, req.admin.id);
    res.status(201).json({ success: true, data });
  } catch (err) { 
    next(err); 
  }
};

exports.update = async (req, res, next) => {
  try {
    const data = await subjectService.updateSubject(req.params.id, req.body);
    if (!data) return res.status(404).json({ success: false, message: "Subject not found" });
    res.json({ success: true, data });
  } catch (err) { 
    next(err); 
  }
};

exports.remove = async (req, res, next) => {
  try {
    const data = await subjectService.deleteSubject(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Subject not found" });
    res.json({ success: true, message: "Subject deleted" });
  } catch (err) { 
    next(err); 
  }
};