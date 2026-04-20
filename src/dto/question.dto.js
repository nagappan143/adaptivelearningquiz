/**
 * question.dto.js
 *
 * Questions have two parts validated together:
 *   1. The question row itself
 *   2. Its options (must be exactly A/B/C/D, exactly one correct)
 *
 * Gap and remedial questions MUST supply parent_question_id + trigger_option
 * because that's how the adaptive engine knows when to serve them.
 */

const UUID_RE     = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEVELS      = ["root", "gap", "remedial", "clone"];
const BLOOM       = ["remember", "understand", "apply", "analyse", "evaluate"];
const DIFFICULTY  = ["easy", "medium", "hard"];
const LABELS      = ["A", "B", "C", "D"];

function validateCreateQuestion(body) {
  const errors = [];
  const {
    topic_id, question_level, parent_question_id, trigger_option,
    stem, image_url, explanation, bloom_level, difficulty, options,
  } = body;

  if (!topic_id || !UUID_RE.test(topic_id))
    errors.push("topic_id must be a valid UUID");

  if (!question_level || !LEVELS.includes(question_level))
    errors.push(`question_level must be one of: ${LEVELS.join(", ")}`);

  // non-root questions must be linked to a parent
  if (question_level !== "root") {
    if (!parent_question_id || !UUID_RE.test(parent_question_id))
      errors.push("parent_question_id (UUID) is required for gap/remedial/clone questions");
    // clone fires unconditionally after a remedial — no trigger_option needed
    if (question_level !== "clone") {
      if (!trigger_option || !LABELS.includes(trigger_option))
        errors.push("trigger_option (A/B/C/D) is required for gap/remedial questions");
    }
  }

  if (!stem || typeof stem !== "string" || !stem.trim())
    errors.push("stem (question text) is required");

  if (!bloom_level || !BLOOM.includes(bloom_level))
    errors.push(`bloom_level must be one of: ${BLOOM.join(", ")}`);

  if (difficulty && !DIFFICULTY.includes(difficulty))
    errors.push(`difficulty must be one of: ${DIFFICULTY.join(", ")}`);

  // Validate options array
  if (!Array.isArray(options) || options.length !== 4) {
    errors.push("options must be an array of exactly 4 items");
  } else {
    const seenLabels = new Set();
    let correctCount = 0;

    options.forEach((opt, i) => {
      if (!opt.label || !LABELS.includes(opt.label))
        errors.push(`options[${i}].label must be one of: A, B, C, D`);
      else if (seenLabels.has(opt.label))
        errors.push(`duplicate label '${opt.label}' in options`);
      else
        seenLabels.add(opt.label);

      if (!opt.option_text || !String(opt.option_text).trim())
        errors.push(`options[${i}].option_text is required`);

      if (opt.is_correct === true) correctCount++;
    });

    if (correctCount !== 1)
      errors.push("exactly one option must have is_correct: true");
  }

  return {
    errors,
    value: {
      topic_id,
      question_level,
      parent_question_id: parent_question_id || null,
      trigger_option: trigger_option || null,
      stem: stem?.trim(),
      image_url: image_url?.trim() || null,
      explanation: explanation?.trim() || null,
      bloom_level,
      difficulty: difficulty || "medium",
      options: (options || []).map(o => ({
        label: o.label,
        option_text: String(o.option_text).trim(),
        is_correct: o.is_correct === true,
      })),
    },
  };
}

function validateUpdateQuestion(body) {
  const errors = [];
  const { stem, image_url, explanation, bloom_level, difficulty, is_active } = body;

  if (stem !== undefined && (!stem || !stem.trim()))
    errors.push("stem cannot be empty");

  if (bloom_level !== undefined && !BLOOM.includes(bloom_level))
    errors.push(`bloom_level must be one of: ${BLOOM.join(", ")}`);

  if (difficulty !== undefined && !DIFFICULTY.includes(difficulty))
    errors.push(`difficulty must be one of: ${DIFFICULTY.join(", ")}`);

  if (is_active !== undefined && typeof is_active !== "boolean")
    errors.push("is_active must be a boolean");

  return {
    errors,
    value: {
      ...(stem !== undefined       && { stem: stem.trim() }),
      ...(image_url !== undefined  && { image_url: image_url?.trim() || null }),
      ...(explanation !== undefined && { explanation: explanation?.trim() || null }),
      ...(bloom_level !== undefined && { bloom_level }),
      ...(difficulty !== undefined  && { difficulty }),
      ...(is_active !== undefined   && { is_active }),
    },
  };
}

module.exports = { validateCreateQuestion, validateUpdateQuestion };
