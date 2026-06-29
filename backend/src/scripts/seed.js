// Initializes + seeds the database (schema, reference data, demo users, sample
// requests). With the embedded PostgreSQL engine this is also done automatically
// on first server start; run it manually with:  npm run seed
require("dotenv").config();
const { initDb, DEMO_PASSWORD } = require("../config/init");

initDb()
  .then((seeded) => {
    console.log(seeded ? `Seeded demo data (password: ${DEMO_PASSWORD}).` : "Database already initialized.");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
