const express = require("express");
const {
  myRequests, createRequest, listRequests, updateRequest, assignRequest,
} = require("../controllers/requestController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Citizen
router.get("/mine", requireAuth, requireRole("citizen"), myRequests);
router.post("/", requireAuth, requireRole("citizen"), createRequest);

// Admin
router.get("/", requireAuth, requireRole("admin"), listRequests);
router.patch("/:id", requireAuth, requireRole("admin"), updateRequest);
router.post("/:id/assign", requireAuth, requireRole("admin"), assignRequest);

module.exports = router;
