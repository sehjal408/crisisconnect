require("dotenv").config();
const app = require("./app");
const { initDb } = require("./config/init");
const { runMigrations } = require("./config/migrate");
const { startIngestion } = require("./services/ingest");

const PORT = process.env.PORT || 4000;

initDb()
  .then(async (seeded) => {
    console.log(seeded ? "Database initialized + seeded (embedded PostgreSQL)." : "Database ready.");
    await runMigrations();  // additive, idempotent schema tweaks for existing DBs
    await startIngestion(); // Week 9 live feeds: ensure schema, optional boot run + refresh
    app.listen(PORT, () => {
      console.log(`CrisisConnect API listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database initialization failed:", err);
    process.exit(1);
  });
