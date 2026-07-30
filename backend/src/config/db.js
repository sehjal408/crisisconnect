// ============================================================
// Database access
// ------------------------------------------------------------
// By default CrisisConnect runs on an EMBEDDED PostgreSQL engine (PGlite — the
// real PostgreSQL compiled to WebAssembly), so the app uses a genuine Postgres
// database with no server to install. Data persists to backend/.pgdata.
//
// To use a normal PostgreSQL server instead, set DB_DRIVER=pg in .env and the
// usual PG* connection variables; the rest of the code is unchanged because both
// drivers expose the same query() / connect() interface.
// ============================================================
const path = require("path");

const USE_PG = process.env.DB_DRIVER === "pg";

let backend; // exposes query(text, params) and connect()

if (USE_PG) {
  const { Pool } = require("pg");
  // Accept either a single DATABASE_URL (what Neon/Render/Supabase provide) or
  // the individual PG* env vars. Enable SSL for hosted databases that require it
  // by setting PGSSL=require (Render's *internal* URL doesn't need it).
  const useSsl = /^(require|true|1)$/i.test(process.env.PGSSL || "");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || undefined,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });
  pool.on("error", (err) => {
    console.error("Unexpected error on idle PostgreSQL client", err);
    process.exit(1);
  });
  backend = {
    query: (text, params) => pool.query(text, params),
    connect: () => pool.connect(),
    ready: Promise.resolve(),
    exec: (sql) => pool.query(sql),
  };
} else {
  const DATA_DIR = process.env.PGLITE_DIR || path.join(__dirname, "..", "..", ".pgdata");
  let db = null;
  const ready = (async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    db = new PGlite(DATA_DIR);
    await db.waitReady;
    return db;
  })();
  backend = {
    query: async (text, params) => {
      await ready;
      return db.query(text, params || []);
    },
    // single-connection shim — BEGIN/COMMIT run as plain statements (PGlite is
    // an in-process engine, so this is fine for the app's transactions).
    connect: async () => {
      await ready;
      return {
        query: (text, params) => db.query(text, params || []),
        release: () => {},
      };
    },
    ready,
    exec: async (sql) => {
      await ready;
      return db.exec(sql);
    },
  };
}

module.exports = backend;
