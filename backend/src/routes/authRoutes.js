const express = require("express");
const { register, login, me, logout, updateProfile, changePassword } = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, me);
router.put("/me", requireAuth, updateProfile);
router.post("/password", requireAuth, changePassword);

module.exports = router;
