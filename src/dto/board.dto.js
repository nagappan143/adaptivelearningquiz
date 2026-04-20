/**
 * board.dto.js
 * Data validation for board creation and updates
 */

function validateCreateBoard(body) {
  const errors = [];
  const { name, code, description } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    errors.push("name is required and must be a non-empty string");
  }

  if (!code || typeof code !== "string" || !code.trim()) {
    errors.push("code is required and must be a non-empty string");
  }

  return {
    errors,
    value: {
      name: name?.trim(),
      board_code: code?.trim(), // Map 'code' to 'board_code'
      description: description?.trim() || null,
    },
  };
}

function validateUpdateBoard(body) {
  const errors = [];
  const { name, code, description, is_active } = body;

  if (name !== undefined && (!name || !name.trim())) {
    errors.push("name cannot be empty");
  }

  if (code !== undefined && (!code || !code.trim())) {
    errors.push("code cannot be empty");
  }

  if (is_active !== undefined && typeof is_active !== "boolean") {
    errors.push("is_active must be a boolean");
  }

  return {
    errors,
    value: {
      ...(name !== undefined && { name: name.trim() }),
      ...(code !== undefined && { board_code: code.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(is_active !== undefined && { is_active }),
    },
  };
}

module.exports = { validateCreateBoard, validateUpdateBoard };
