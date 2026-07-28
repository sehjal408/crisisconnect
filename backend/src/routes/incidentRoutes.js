const express = require("express");
const { listIncidents, getIncident, ingestIncidents, dedupIncidents, verifyIncident, dismissIncident, unmergeIncident } = require("../controllers/incidentController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, listIncidents);
// Admin-only: refresh incidents from the live official feeds.
router.post("/ingest", requireAuth, requireRole("admin"), ingestIncidents);
// Admin-only: run cross-source de-duplication on demand.
router.post("/dedup", requireAuth, requireRole("admin"), dedupIncidents);
// Admin-only: verification queue actions.
router.patch("/:id/verify", requireAuth, requireRole("admin"), verifyIncident);
router.patch("/:id/dismiss", requireAuth, requireRole("admin"), dismissIncident);
router.patch("/:id/unmerge", requireAuth, requireRole("admin"), unmergeIncident);
router.get("/:id", requireAuth, getIncident);

module.exports = router;
