const express = require("express");
const { listIncidents, getIncident, ingestIncidents } = require("../controllers/incidentController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, listIncidents);
// Admin-only: refresh incidents from the live official feeds.
router.post("/ingest", requireAuth, requireRole("admin"), ingestIncidents);
router.get("/:id", requireAuth, getIncident);

module.exports = router;
