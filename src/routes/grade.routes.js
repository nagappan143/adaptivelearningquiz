const express = require("express");
const router = express.Router();
const grade = require("../controllers/grade.controller");
const validate = require("../middleware/validate.middleware");
const { verifyAdmin } = require("../middleware/auth.middleware");
const { validateCreateGrade, validateUpdateGrade } = require("../dto/grade.dto");

router.get("/",       grade.list);                                          // public
router.post("/",      verifyAdmin, validate(validateCreateGrade), grade.create);
router.put("/:id",    verifyAdmin, validate(validateUpdateGrade), grade.update);
router.delete("/:id", verifyAdmin, grade.remove);

module.exports = router;
