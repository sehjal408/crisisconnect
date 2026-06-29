const express = require("express");
const { updateAssignment } = require("../controllers/assignmentController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.patch("/:id", requireAuth, requireRole("volunteer"), updateAssignment);

module.exports = router;
