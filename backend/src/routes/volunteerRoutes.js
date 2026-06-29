const express = require("express");
const { getMe, updateMe, listVolunteers, myAssignments } = require("../controllers/volunteerController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Admin: list volunteers (for assignment)
router.get("/", requireAuth, requireRole("admin"), listVolunteers);

// Volunteer self-service
router.get("/me", requireAuth, requireRole("volunteer"), getMe);
router.put("/me", requireAuth, requireRole("volunteer"), updateMe);
router.get("/me/assignments", requireAuth, requireRole("volunteer"), myAssignments);

module.exports = router;
