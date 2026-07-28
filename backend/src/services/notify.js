// ============================================================
// Notifications
// ------------------------------------------------------------
// Single choke-point for all in-app notifications. Every notification in the app
// flows through notify() / notifyAdmins(), so adding another channel later (email,
// SMS via Twilio, web/mobile push) is a one-line change here — no call-site edits.
// Best-effort by design: a notification never blocks or breaks the action.
// ============================================================
const db = require("../config/db");

async function notify(userId, type, message) {
  if (!userId) return;
  try {
    await db.query(
      `INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)`,
      [userId, type, message]
    );
    // Future scope: also dispatch to email / SMS / push here.
  } catch (e) {
    console.warn("[notify] failed:", e.message);
  }
}

async function notifyAdmins(type, message) {
  try {
    const { rows } = await db.query(`SELECT id FROM users WHERE role = 'admin'`);
    await Promise.all(rows.map((r) => notify(r.id, type, message)));
  } catch (e) {
    console.warn("[notify] admins failed:", e.message);
  }
}

// Returns an admin alert string when a shelter crosses into "nearly full" (>=90%)
// or "full", comparing its previous and new state — or null (no alert). Only fires
// on the crossing, so admins aren't spammed while a shelter stays full.
function capacityMessage(prev, next) {
  if (!next || !next.capacity) return null;
  const pPct = prev.capacity ? prev.occupied_beds / prev.capacity : 0;
  const nPct = next.occupied_beds / next.capacity;
  const free = next.capacity - next.occupied_beds;
  if (prev.status !== "full" && next.status === "full") {
    return `Shelter "${next.name}" is now FULL (0 of ${next.capacity} beds free).`;
  }
  if (pPct < 0.9 && nPct >= 0.9 && next.status !== "full") {
    return `Shelter "${next.name}" is nearly full — ${free} of ${next.capacity} beds left.`;
  }
  return null;
}

module.exports = { notify, notifyAdmins, capacityMessage };
