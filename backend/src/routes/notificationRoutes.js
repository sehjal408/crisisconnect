const express = require("express");
const { listNotifications, markRead, markAllRead } = require("../controllers/notificationController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Every authenticated user manages their own notifications.
router.get("/", requireAuth, listNotifications);
router.post("/read-all", requireAuth, markAllRead);
router.patch("/:id/read", requireAuth, markRead);

module.exports = router;
