const express = require("express");
const { getSummary, getAnalytics } = require("../controllers/dashboardController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/summary", requireAuth, requireRole("admin"), getSummary);
router.get("/analytics", requireAuth, requireRole("admin"), getAnalytics);

module.exports = router;
