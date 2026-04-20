const axios = require("axios");
const pool = require("../config/db");

exports.syncCountries = async () => {

  // 🔹 third-party API call
  const response = await axios.get(
    "http://192.168.0.48:2503/api/v1/auth/countries"
  );

  if (!response.data.success) {
    throw new Error("API failed");
  }

  const countries = response.data.data;

  for (const c of countries) {
    await pool.query(
      `
      INSERT INTO countries
      (country_id, country_name, country_code, country_short_code)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (country_id)
      DO UPDATE SET
        country_name = EXCLUDED.country_name,
        country_code = EXCLUDED.country_code
      `,
      [
        c.countryID,
        c.countryName,
        c.countryCode,
        c.countryNameCode,
      ]
    );
  }

  return "Countries synced successfully";
};