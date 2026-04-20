const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateCreateTopic(body) {
  const errors = [];
  const { subject_id, name, description } = body;

  if (!subject_id || !UUID_RE.test(subject_id))
    errors.push("subject_id must be a valid UUID");

  if (!name || typeof name !== "string" || !name.trim())
    errors.push("name is required");

  return {
    errors,
    value: {
      subject_id,
      name: name?.trim(),
      description: description?.trim() || null,
    },
  };
}

function validateUpdateTopic(body) {
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

module.exports = { validateCreateTopic, validateUpdateTopic };
