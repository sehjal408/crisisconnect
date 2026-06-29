const express = require("express");
const { getSummary } = require("../controllers/dashboardController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/summary", requireAuth, requireRole("admin"), getSummary);

module.exports = router;
