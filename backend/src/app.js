const express = require("express");
const cors = require("cors");
const apiRoutes = require("./routes");
const { UPLOAD_DIR } = require("./config/upload");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

const app = express();

// Allow all origins by default (simple for a demo). In production you can lock
// this down to your frontend's URL(s) by setting CORS_ORIGIN (comma-separated).
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
  : undefined;
app.use(cors(corsOrigins ? { origin: corsOrigins } : undefined));
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));

// Uploaded request photos, served read-only (reachable via the frontend proxy).
app.use("/api/v1/uploads", express.static(UPLOAD_DIR));

app.use("/api/v1", apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
