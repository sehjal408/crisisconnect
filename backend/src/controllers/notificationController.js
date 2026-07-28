const pool = require("../config/db");

// Every user sees only their own notifications, newest first.
async function listNotifications(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT id, type, message, is_read, created_at
         FROM notifications WHERE user_id = $1
        ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    const unreadRes = await pool.query(
      `SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1 AND is_read = false`,
      [req.user.id]
    );
    return res.json({ notifications: rows, unread: unreadRes.rows[0].n });
  } catch (err) {
    return next(err);
  }
}

async function markRead(req, res, next) {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

async function markAllRead(req, res, next) {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
      [req.user.id]
    );
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listNotifications, markRead, markAllRead };
