const express = require("express");
const { listShelters, createShelter, updateShelter } = require("../controllers/shelterController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, listShelters);
// Admin: shelter management (occupancy, status, details, add).
router.post("/", requireAuth, requireRole("admin"), createShelter);
router.put("/:id", requireAuth, requireRole("admin"), updateShelter);

module.exports = router;
