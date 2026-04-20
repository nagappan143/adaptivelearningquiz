const express = require("express");
const router = express.Router();
const subject = require("../controllers/subject.controller");
const validate = require("../middleware/validate.middleware");
const { verifyAdmin } = require("../middleware/auth.middleware");
const { validateCreateSubject, validateUpdateSubject } = require("../dto/subject.dto");

router.get("/",       subject.list);                                            // public, ?grade_id=
router.post("/",      verifyAdmin, validate(validateCreateSubject), subject.create);
router.put("/:id",    verifyAdmin, validate(validateUpdateSubject), subject.update);
router.delete("/:id", verifyAdmin, subject.remove);

module.exports = router;
