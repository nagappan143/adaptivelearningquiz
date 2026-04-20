const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /quiz/sessions — start a new session
function validateStartSession(body) {
  const errors = [];
  const { topic_id } = body;

  if (!topic_id || !UUID_RE.test(topic_id))
    errors.push("topic_id must be a valid UUID");

  return { errors, value: { topic_id } };
}

// POST /quiz/sessions/:id/answer
function validateSubmitAnswer(body) {
  const errors = [];
  const { question_id, selected_option_id, time_taken_ms } = body;

  if (!question_id || !UUID_RE.test(question_id))
    errors.push("question_id must be a valid UUID");

  if (selected_option_id !== undefined && selected_option_id !== null &&
      !UUID_RE.test(selected_option_id))
    errors.push("selected_option_id must be a valid UUID or null (skipped)");

  if (time_taken_ms !== undefined && (typeof time_taken_ms !== "number" || time_taken_ms < 0))
    errors.push("time_taken_ms must be a non-negative number");

  return {
    errors,
    value: {
      question_id,
      selected_option_id: selected_option_id || null,
      time_taken_ms: time_taken_ms || null,
    },
  };
}

module.exports = { validateStartSession, validateSubmitAnswer };
