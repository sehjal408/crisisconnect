const express = require("express");

const authRoutes = require("./authRoutes");
const incidentRoutes = require("./incidentRoutes");
const shelterRoutes = require("./shelterRoutes");
const requestRoutes = require("./requestRoutes");
const assignmentRoutes = require("./assignmentRoutes");
const dashboardRoutes = require("./dashboardRoutes");
const volunteerRoutes = require("./volunteerRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/incidents", incidentRoutes);
router.use("/shelters", shelterRoutes);
router.use("/requests", requestRoutes);
router.use("/assignments", assignmentRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/volunteers", volunteerRoutes);

module.exports = router;
