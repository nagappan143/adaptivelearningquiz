const express = require("express");
const router = express.Router();
const countryController = require("../controllers/country.controller");

// Public — no auth needed, anyone can fetch the country list for registration forms
router.get("/", countryController.getCountries);

module.exports = router;
