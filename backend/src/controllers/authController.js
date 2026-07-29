const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const { signToken } = require("../utils/jwt");

const PUBLIC_FIELDS = "id, name, email, phone, role, created_at";

async function register(req, res, next) {
  try {
    const { name, email, password, phone, role } = req.body;
    // Volunteer-only profile fields (ignored for citizens).
    const skills = Array.isArray(req.body.skills) ? req.body.skills : [];
    const certifications = Array.isArray(req.body.certifications) ? req.body.certifications : [];
    const vehicle_available = !!req.body.vehicle_available;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "name, email, password and role are required" } });
    }
    if (!["citizen", "volunteer"].includes(role)) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "role must be 'citizen' or 'volunteer'" } });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Password must be at least 8 characters" } });
    }

    // Friendly duplicate-email check (avoids a raw unique-constraint 500).
    const existing = await pool.query(`SELECT 1 FROM users WHERE email = $1`, [email]);
    if (existing.rows.length) {
      return res.status(409).json({ error: { code: "EMAIL_TAKEN", message: "An account with this email already exists" } });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, phone, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${PUBLIC_FIELDS}`,
      [name, email, passwordHash, phone || null, role]
    );

    const user = result.rows[0];

    if (role === "volunteer") {
      await pool.query(
        `INSERT INTO volunteers (user_id, skills, certifications, vehicle_available)
         VALUES ($1, $2, $3, $4)`,
        [user.id, skills, certifications, vehicle_available]
      );
    }

    const token = signToken(user);
    return res.status(201).json({ token, user });
  } catch (err) {
    return next(err);
  }
}

// Update the signed-in user's own account details (name / phone).
async function updateProfile(req, res, next) {
  try {
    const { name, phone } = req.body;
    if (name != null && !String(name).trim()) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Name cannot be empty" } });
    }
    const result = await pool.query(
      `UPDATE users SET
         name  = COALESCE($1, name),
         phone = COALESCE($2, phone)
       WHERE id = $3
       RETURNING ${PUBLIC_FIELDS}`,
      [name?.trim() ?? null, phone ?? null, req.user.id]
    );
    return res.json({ user: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}

// Change the signed-in user's password (requires the current password).
async function changePassword(req, res, next) {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "current_password and new_password are required" } });
    }
    if (String(new_password).length < 8) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "New password must be at least 8 characters" } });
    }
    const result = await pool.query(`SELECT password_hash FROM users WHERE id = $1`, [req.user.id]);
    const row = result.rows[0];
    if (!row) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found" } });
    }
    const match = await bcrypt.compare(current_password, row.password_hash);
    if (!match) {
      return res.status(400).json({ error: { code: "INVALID_PASSWORD", message: "Current password is incorrect" } });
    }
    const passwordHash = await bcrypt.hash(new_password, 10);
    await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, req.user.id]);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "email and password are required" } });
    }

    const result = await pool.query(
      `SELECT id, name, email, phone, role, password_hash FROM users WHERE email = $1`,
      [email]
    );
    const row = result.rows[0];

    if (!row) {
      return res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
    }

    const match = await bcrypt.compare(password, row.password_hash);
    if (!match) {
      return res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
    }

    const user = { id: row.id, name: row.name, email: row.email, phone: row.phone, role: row.role };
    const token = signToken(user);
    return res.json({ token, user });
  } catch (err) {
    return next(err);
  }
}

async function me(req, res, next) {
  try {
    const result = await pool.query(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1`, [req.user.id]);
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found" } });
    }
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
}

function logout(req, res) {
  // Stateless JWT — client discards the token. Placeholder for future refresh-token revocation.
  return res.status(204).send();
}

module.exports = { register, login, me, logout, updateProfile, changePassword };
