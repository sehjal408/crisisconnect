require("dotenv").config();
const app = require("./app");
const { initDb } = require("./config/init");

const PORT = process.env.PORT || 4000;

initDb()
  .then((seeded) => {
    console.log(seeded ? "Database initialized + seeded (embedded PostgreSQL)." : "Database ready.");
    app.listen(PORT, () => {
      console.log(`CrisisConnect API listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database initialization failed:", err);
    process.exit(1);
  });
