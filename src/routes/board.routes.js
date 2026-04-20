/**
 * board.routes.js
 * API routes for board CRUD operations
 */

const express = require("express");
const router = express.Router();
const boardController = require("../controllers/board.controller");
const validate = require("../middleware/validate.middleware");
const { verifyAdmin } = require("../middleware/auth.middleware");
const { validateCreateBoard, validateUpdateBoard } = require("../dto/board.dto");

/**
 * Public routes
 */
router.get("/", boardController.list); // GET /api/v1/boards

/**
 * Get a specific board (public)
 */
router.get("/:id", boardController.getById); // GET /api/v1/boards/:id

/**
 * Get a board with all its grades (public)
 */
router.get("/:id/with-grades", boardController.getWithGrades); // GET /api/v1/boards/:id/with-grades

/**
 * Admin-only routes
 */
router.post("/", verifyAdmin, validate(validateCreateBoard), boardController.create); // POST /api/v1/boards
router.put("/:id", verifyAdmin, validate(validateUpdateBoard), boardController.update); // PUT /api/v1/boards/:id
router.delete("/:id", verifyAdmin, boardController.remove); // DELETE /api/v1/boards/:id

module.exports = router;
