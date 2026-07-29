// Request lifecycle: create → AI triage score → admin status changes.
// Includes a regression guard for the resolved_at logic (the bug that made
// "Mark reviewed" hang with a 500).
const { api, bootDb, registerUser, login, auth } = require("../helpers");

beforeAll(bootDb);

async function createRequest(token, body = {}) {
  return api.post("/api/v1/requests").set(auth(token)).send({
    request_type: "medical",
    description: "Elderly neighbour needs insulin urgently",
    affected_count: 1,
    ...body,
  });
}

describe("citizen creates a request", () => {
  it("assigns an AI triage priority score and pending status", async () => {
    const { token } = await registerUser({ role: "citizen" });
    const res = await createRequest(token);
    expect(res.status).toBe(201);
    expect(res.body.request.status).toBe("pending");
    expect(res.body.request.priority_score).toBeGreaterThanOrEqual(0);
    expect(res.body.request.priority_score).toBeLessThanOrEqual(100);
  });

  it("requires request_type and description", async () => {
    const { token } = await registerUser({ role: "citizen" });
    const res = await api.post("/api/v1/requests").set(auth(token)).send({ request_type: "medical" });
    expect(res.status).toBe(400);
  });

  it("forbids a non-citizen from creating a request", async () => {
    const adminToken = await login("admin@crisisconnect.ca");
    const res = await createRequest(adminToken);
    expect(res.status).toBe(403);
  });
});

describe("admin updates request status", () => {
  it("sets resolved_at when resolved and clears it when reopened", async () => {
    const { token } = await registerUser({ role: "citizen" });
    const created = await createRequest(token);
    const id = created.body.request.id;
    const adminToken = await login("admin@crisisconnect.ca");

    // resolve → resolved_at is set (this is the query that previously 500'd)
    const resolved = await api.patch(`/api/v1/requests/${id}`).set(auth(adminToken)).send({ status: "resolved" });
    expect(resolved.status).toBe(200);
    expect(resolved.body.request.status).toBe("resolved");
    expect(resolved.body.request.resolved_at).not.toBeNull();

    // reopen (reviewed) → resolved_at cleared
    const reopened = await api.patch(`/api/v1/requests/${id}`).set(auth(adminToken)).send({ status: "reviewed" });
    expect(reopened.status).toBe(200);
    expect(reopened.body.request.status).toBe("reviewed");
    expect(reopened.body.request.resolved_at).toBeNull();
  });

  it("rejects an invalid status value with 400", async () => {
    const { token } = await registerUser({ role: "citizen" });
    const created = await createRequest(token);
    const adminToken = await login("admin@crisisconnect.ca");
    const res = await api.patch(`/api/v1/requests/${created.body.request.id}`).set(auth(adminToken)).send({ status: "not_a_status" });
    expect(res.status).toBe(400);
  });
});
