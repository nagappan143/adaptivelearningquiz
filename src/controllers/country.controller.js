/**
 * country.controller.js
 * Passes errors to error.middleware via next() instead of swallowing them.
 */
const pool = require("../config/db");

exports.getCountries = async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT countryid, country_name, country_code FROM countries ORDER BY country_name"
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};
