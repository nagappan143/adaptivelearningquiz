const express = require("express");
const router = express.Router();
const topic = require("../controllers/topic.controller");
const validate = require("../middleware/validate.middleware");
const { verifyAdmin } = require("../middleware/auth.middleware");
const { validateCreateTopic, validateUpdateTopic } = require("../dto/topic.dto");

router.get("/",       topic.list);                                          // public, ?subject_id=
router.post("/",      verifyAdmin, validate(validateCreateTopic), topic.create);
router.put("/:id",    verifyAdmin, validate(validateUpdateTopic), topic.update);
router.delete("/:id", verifyAdmin, topic.remove);

module.exports = router;
