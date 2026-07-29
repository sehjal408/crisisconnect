// Jest configuration for the CrisisConnect backend test suite.
// - No code transform: tests are plain CommonJS and the app runs on Node
//   directly, so the embedded PGlite database (loaded via dynamic import) works
//   without any ESM/babel plumbing.
// - setupEnv runs first to force test-safe settings (in-memory DB, offline AI).
module.exports = {
  testEnvironment: "node",
  transform: {},
  setupFiles: ["<rootDir>/tests/setupEnv.js"],
  testMatch: ["<rootDir>/tests/**/*.test.js"],
  testTimeout: 30000,
  // PGlite (WASM) is heavy to spin up per file; run serially for stability.
  maxWorkers: 1,
  clearMocks: true,
};
