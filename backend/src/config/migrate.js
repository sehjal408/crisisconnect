// ============================================================
// Idempotent schema migrations
// ------------------------------------------------------------
// The database is initialized once from schema.sql (see init.js) and then
// persists to backend/.pgdata, so schema.sql changes don't reach an existing
// database. This module applies additive, idempotent tweaks on every boot
// (IF NOT EXISTS / DROP-then-ADD), so both fresh and existing DBs converge.
// ============================================================
const db = require("./db");

async function runMigrations() {
  await db.ready;

  // Week 10 admin verification — provenance of citizen-reported incidents and a
  // pointer used by cross-source de-duplication. Plain INTEGER (no inline FK) so
  // the ALTER is safe on every engine; the join logic doesn't rely on the FK.
  await db.exec(`
    ALTER TABLE incidents ADD COLUMN IF NOT EXISTS reported_by   INTEGER;
    ALTER TABLE incidents ADD COLUMN IF NOT EXISTS duplicate_of  INTEGER;
    ALTER TABLE incidents ADD COLUMN IF NOT EXISTS keep_distinct BOOLEAN DEFAULT false;
  `);

  // Allow 'dismissed' so an admin can reject a false/irrelevant incident.
  await db.exec(`
    ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_status_check;
    ALTER TABLE incidents ADD CONSTRAINT incidents_status_check
      CHECK (status IN ('pending','verified','dismissed','assigned','in_progress','resolved','closed'));
  `);

  console.log("[migrate] schema migrations applied.");
}

module.exports = { runMigrations };
