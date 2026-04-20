function validateCreateGrade(body) {
  const errors = [];
  const { board_id, name, description } = body;

  if (!board_id || typeof board_id !== "string" || !board_id.trim())
    errors.push("board_id is required");

  if (!name || typeof name !== "string" || !name.trim())
    errors.push("name is required");

  return {
    errors,
    value: {
      board_id: board_id?.trim(),
      name: name?.trim(),
      description: description?.trim() || null,
    },
  };
}

function validateUpdateGrade(body) {
  const errors = [];
  const { name, description, is_active } = body;

  if (name !== undefined && (!name || !name.trim()))
    errors.push("name cannot be empty");

  if (is_active !== undefined && typeof is_active !== "boolean")
    errors.push("is_active must be a boolean");

  return {
    errors,
    value: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(is_active !== undefined && { is_active }),
    },
  };
}

module.exports = { validateCreateGrade, validateUpdateGrade };
