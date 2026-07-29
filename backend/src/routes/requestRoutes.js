const express = require("express");
const {
  myRequests, createRequest, listRequests, updateRequest, assignRequest, createIncidentFromRequest, placeInShelter, uploadAttachments,
} = require("../controllers/requestController");
const { requireAuth, requireRole } = require("../middleware/auth");
const { upload } = require("../config/upload");

const router = express.Router();

// Citizen
router.get("/mine", requireAuth, requireRole("citizen"), myRequests);
router.post("/", requireAuth, requireRole("citizen"), createRequest);
// Attach photos to a request (owner citizen or admin).
router.post("/:id/attachments", requireAuth, upload.array("photos", 5), uploadAttachments);

// Admin
router.get("/", requireAuth, requireRole("admin"), listRequests);
router.patch("/:id", requireAuth, requireRole("admin"), updateRequest);
router.post("/:id/assign", requireAuth, requireRole("admin"), assignRequest);
router.post("/:id/incident", requireAuth, requireRole("admin"), createIncidentFromRequest);
router.post("/:id/place", requireAuth, requireRole("admin"), placeInShelter);

module.exports = router;
