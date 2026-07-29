// Forces test-safe configuration BEFORE any app module loads.
// Some modules read process.env at import time (triage API key, DB dir), so
// this must run via Jest's `setupFiles` (which executes before the test file).
process.env.NODE_ENV = "test";
process.env.PGLITE_DIR = "memory://"; // throwaway in-memory DB — never touches .pgdata
process.env.AI_TRIAGE = "off";        // deterministic heuristic triage, no network calls
process.env.INGEST_ENABLED = "off";   // never hit live incident feeds in tests
process.env.JWT_SECRET = "test-secret";
process.env.JWT_EXPIRES_IN = "1h";
