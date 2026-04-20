/**
 * board.controller.js
 * Request handlers for board CRUD operations
 */

const boardService = require("../services/board.service");

/**
 * GET /api/v1/boards
 * List boards with optional pagination and active/inactive filtering
 *
 * Query params:
 *   page        {number}  - Page number (default: 1)
 *   limit       {number}  - Items per page (default: 10)
 *   is_active   {boolean} - "true" for active tab, "false" for inactive tab (default: true)
 *
 * Examples:
 *   GET /api/v1/boards                          → all boards, no pagination
 *   GET /api/v1/boards?page=1&limit=10          → active boards, page 1
 *   GET /api/v1/boards?page=2&limit=10&is_active=false → inactive boards, page 2
 */
exports.list = async (req, res, next) => {
  try {
    const { page, limit, is_active } = req.query;

    // If pagination params are provided, use paginated version
    if (page || limit) {
      // Parse is_active: default to true (active tab)
      // Accepts "true"/"false" string from query param
      const isActive = is_active === "false" ? false : true;

      const data = await boardService.listBoardsPaginated({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        is_active: isActive,
      });

      return res.json({ success: true, ...data });
    }

    // Otherwise return all boards (for dropdowns, exports, etc.)
    const data = await boardService.listBoards();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/boards/:id
 * Get a specific board by ID
 */
exports.getById = async (req, res, next) => {
  try {
    const data = await boardService.findBoardById(req.params.id);
    if (!data) {
      return res.status(404).json({ success: false, message: "Board not found" });
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/boards/:id/with-grades
 * Get a board with all its grades
 */
exports.getWithGrades = async (req, res, next) => {
  try {
    const data = await boardService.getBoardWithGrades(req.params.id);
    if (!data) {
      return res.status(404).json({ success: false, message: "Board not found" });
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/boards
 * Create a new board
 * Requires: admin authentication
 * Body: { name, code, description }
 */
exports.create = async (req, res, next) => {
  try {
    // req.admin is set by verifyAdmin middleware
    // Contains: { id, role, iat, exp }
    const data = await boardService.createBoard(req.body, req.admin.id);
    res.status(201).json({ success: true, data });
  } catch (err) {
    // Handle unique constraint violations
    if (err.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Board with this name or code already exists",
      });
    }
    next(err);
  }
};

/**
 * PUT /api/v1/boards/:id
 * Update a board
 * Requires: admin authentication
 * Body: { name?, code?, description?, is_active? }
 */
exports.update = async (req, res, next) => {
  try {
    const data = await boardService.updateBoard(req.params.id, req.body);
    if (!data) {
      return res.status(404).json({ success: false, message: "Board not found" });
    }
    res.json({ success: true, data });
  } catch (err) {
    // Handle unique constraint violations
    if (err.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Board with this name or code already exists",
      });
    }
    next(err);
  }
};

/**
 * DELETE /api/v1/boards/:id
 * Soft-delete a board (set is_active = false)
 * Requires: admin authentication
 */
exports.remove = async (req, res, next) => {
  try {
    const data = await boardService.deactivateBoard(req.params.id);
    if (!data) {
      return res.status(404).json({ success: false, message: "Board not found" });
    }
    res.json({ success: true, message: "Board deactivated", data });
  } catch (err) {
    next(err);
  }
};