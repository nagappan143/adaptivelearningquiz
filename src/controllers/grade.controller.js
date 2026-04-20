const gradeService = require("../services/grade.service");

exports.list = async (req, res, next) => {
  try {
    const boardId = req.query.board_id || null;
    const { page, limit } = req.query;
    
    console.log('[Grade Controller] list() - board_id query param:', boardId);
    console.log('[Grade Controller] list() - pagination params:', { page, limit });
    console.log('[Grade Controller] list() - full query:', req.query);
    
    // If pagination params are provided, use paginated version
    if (page || limit) {
      const data = await gradeService.listGradesPaginated({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        boardId: boardId
      });
      console.log('[Grade Controller] list() - returning paginated response:', {
        page: data.page,
        limit: data.limit,
        total: data.total,
        totalPages: data.totalPages,
        dataLength: data.data.length
      });
      return res.json({ success: true, ...data });
    }
    
    // Otherwise return all grades (for dropdowns, exports, etc.)
    const data = await gradeService.listGrades(boardId);
    console.log('[Grade Controller] list() - returning', data.length, 'grades (non-paginated)');
    res.json({ success: true, data });
  } catch (err) { 
    next(err); 
  }
};

exports.create = async (req, res, next) => {
  try {
    const data = await gradeService.createGrade(req.body, req.admin.id);
    res.status(201).json({ success: true, data });
  } catch (err) {
    // Handle invalid grade format
    if (err.code === "INVALID_GRADE_FORMAT") {
      return res.status(400).json({
        success: false,
        message: err.message,
        example: "Valid formats: Grade-1, Grade-2, Grade-3, ..., Grade-199"
      });
    }
    // Handle duplicate grade error
    if (err.code === "DUPLICATE_GRADE") {
      return res.status(409).json({
        success: false,
        message: err.message,
      });
    }
    // Handle unique constraint violations from database (backup)
    if (err.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Grade with this name already exists for this board",
      });
    }
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const data = await gradeService.updateGrade(req.params.id, req.body);
    if (!data) return res.status(404).json({ success: false, message: "Grade not found" });
    res.json({ success: true, data });
  } catch (err) {
    if (err.code === "INVALID_GRADE_FORMAT") {
      return res.status(400).json({
        success: false,
        message: err.message,
        example: "Valid formats: Grade-1, Grade-2, Grade-3, ..., Grade-199"
      });
    }
    if (err.code === "DUPLICATE_GRADE") {
      return res.status(409).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const data = await gradeService.deactivateGrade(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Grade not found" });
    res.json({ success: true, message: "Grade deactivated" });
  } catch (err) { 
    next(err); 
  }
};