const getPagination = (page = 1, limit = 10) => {
  const safeLimit = Math.min(limit, 50);
  const offset = (page - 1) * safeLimit;

  return { limit: safeLimit, offset };
};

module.exports = { getPagination };