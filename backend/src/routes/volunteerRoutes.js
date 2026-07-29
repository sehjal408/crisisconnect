const express = require("express");
const { getMe, updateMe, listVolunteers, myAssignments, listAllVolunteers, setVerification } = require("../controllers/volunteerController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Admin: list volunteers (verified, for assignment)
router.get("/", requireAuth, requireRole("admin"), listVolunteers);
// Admin: full roster + verification management
router.get("/manage", requireAuth, requireRole("admin"), listAllVolunteers);
router.patch("/:id/verification", requireAuth, requireRole("admin"), setVerification);

// Volunteer self-service
router.get("/me", requireAuth, requireRole("volunteer"), getMe);
router.put("/me", requireAuth, requireRole("volunteer"), updateMe);
router.get("/me/assignments", requireAuth, requireRole("volunteer"), myAssignments);

module.exports = router;
