const express = require("express");
const { pulse } = require("../controllers/publicController");

const router = express.Router();

// Unauthenticated network status (aggregate counts + public incident dots only).
router.get("/pulse", pulse);

module.exports = router;
