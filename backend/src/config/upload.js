// ============================================================
// File uploads (request photo attachments)
// ------------------------------------------------------------
// Stores images on local disk (backend/uploads) for dev/demo — swap the storage
// engine for a cloud bucket (S3 / Cloudinary) when deployed to an ephemeral host.
// Files are served read-only at /api/v1/uploads/<filename> (see app.js).
// ============================================================
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || "").toLowerCase().slice(0, 8);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 }, // 5 MB each, up to 5 files
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) return cb(null, true);
    return cb(new Error("Only image files are allowed"));
  },
});

module.exports = { upload, UPLOAD_DIR };
