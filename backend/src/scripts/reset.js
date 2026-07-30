// ============================================================
// Reset the database to CLEAN demo data
// ------------------------------------------------------------
// Wipes every table and restores only the seeded demo accounts + sample data —
// i.e. a pristine, demo-ready database. Use it after test data has piled up
// (e.g. before a demo) instead of redeploying (redeploying does NOT reset data).
//
//   cd backend
//   npm run db:reset
//
// DESTRUCTIVE: this deletes ALL current data. It targets whichever database the
// env points at (local PGlite by default, or your hosted Postgres if DB_DRIVER=pg
// + DATABASE_URL are set).
// ============================================================
require("dotenv").config();
const db = require("../config/db");
const { initDb, DEMO_PASSWORD } = require("../config/init");
const { runMigrations } = require("../config/migrate");

(async () => {
  await db.ready;
  console.log("[reset] Dropping all data…");
  // Drop and recreate the schema — the cleanest, table-agnostic wipe.
  await db.exec(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
  console.log("[reset] Re-seeding fresh demo data…");
  await initDb();        // schema.sql + seed + demo users
  await runMigrations(); // idempotent tweaks (safe no-ops on a fresh schema)
  console.log(`[reset] Done — clean demo data restored. Login password: ${DEMO_PASSWORD}`);
  process.exit(0);
})().catch((err) => {
  console.error("[reset] failed:", err);
  process.exit(1);
});
