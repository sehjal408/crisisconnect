const express = require("express");
const { listShelters } = require("../controllers/shelterController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, listShelters);

module.exports = router;
