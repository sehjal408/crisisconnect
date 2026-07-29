const express = require("express");
const cors = require("cors");
const apiRoutes = require("./routes");
const { UPLOAD_DIR } = require("./config/upload");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));

// Uploaded request photos, served read-only (reachable via the frontend proxy).
app.use("/api/v1/uploads", express.static(UPLOAD_DIR));

app.use("/api/v1", apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
