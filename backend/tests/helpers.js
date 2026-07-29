// Shared test helpers: boot a fresh in-memory DB and drive the real HTTP API.
const request = require("supertest");
const app = require("../src/app");
const { initDb } = require("../src/config/init");
const { runMigrations } = require("../src/config/migrate");

const api = request(app);

// Initialise + seed the throwaway database (schema.sql, seed data, demo users),
// then apply idempotent migrations — mirrors what server.js does on boot, minus
// the live feed ingestion. Call once per test file in beforeAll.
async function bootDb() {
  await initDb();
  await runMigrations();
}

// Register a user via the public endpoint and return { token, user }.
async function registerUser(overrides = {}) {
  const suffix = Math.random().toString(36).slice(2, 8);
  const body = {
    name: "Test User",
    email: `user_${suffix}@example.com`,
    password: "Password123!",
    role: "citizen",
    ...overrides,
  };
  const res = await api.post("/api/v1/auth/register").send(body);
  return { res, body, ...res.body };
}

// Log in an existing (seeded) account and return its bearer token.
async function login(email, password = "Password123!") {
  const res = await api.post("/api/v1/auth/login").send({ email, password });
  return res.body.token;
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

// Seeded demo accounts (created by initDb).
const SEEDED = {
  admin: "admin@crisisconnect.ca",
  volunteer: "volunteer@crisisconnect.ca",
  citizen: "citizen@crisisconnect.ca",
};

module.exports = { api, app, bootDb, registerUser, login, auth, SEEDED };
