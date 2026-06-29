const express = require("express");
const { listIncidents, getIncident } = require("../controllers/incidentController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, listIncidents);
router.get("/:id", requireAuth, getIncident);

module.exports = router;
