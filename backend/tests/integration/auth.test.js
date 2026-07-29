// Auth + account: registration, login, profile update, password change.
const { api, bootDb, registerUser, login, auth, SEEDED } = require("../helpers");

beforeAll(bootDb);

describe("POST /auth/register", () => {
  it("registers a citizen and returns a token + user", async () => {
    const { res } = await registerUser({ name: "Ada Citizen" });
    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ name: "Ada Citizen", role: "citizen" });
    expect(res.body.user).not.toHaveProperty("password_hash");
  });

  it("rejects a duplicate email with 409", async () => {
    const email = `dup_${Date.now()}@example.com`;
    await registerUser({ email });
    const { res } = await registerUser({ email });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("rejects a password shorter than 8 characters", async () => {
    const { res } = await registerUser({ password: "short" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a missing role", async () => {
    const res = await api.post("/api/v1/auth/register").send({ name: "No Role", email: `nr_${Date.now()}@example.com`, password: "Password123!" });
    expect(res.status).toBe(400);
  });
});

describe("POST /auth/login", () => {
  it("logs in a seeded account", async () => {
    const res = await api.post("/api/v1/auth/login").send({ email: SEEDED.admin, password: "Password123!" });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("admin");
  });

  it("rejects a wrong password with 401", async () => {
    const res = await api.post("/api/v1/auth/login").send({ email: SEEDED.admin, password: "wrong" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });
});

describe("account self-service", () => {
  it("returns the signed-in user from /auth/me", async () => {
    const { token, user } = await registerUser();
    const res = await api.get("/api/v1/auth/me").set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
  });

  it("updates name and phone via PUT /auth/me", async () => {
    const { token } = await registerUser();
    const res = await api.put("/api/v1/auth/me").set(auth(token)).send({ name: "Renamed", phone: "604-555-0000" });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ name: "Renamed", phone: "604-555-0000" });
  });

  it("rejects an unauthenticated profile update with 401", async () => {
    const res = await api.put("/api/v1/auth/me").send({ name: "Nope" });
    expect(res.status).toBe(401);
  });

  describe("POST /auth/password", () => {
    it("changes the password with the correct current password", async () => {
      const { token, body } = await registerUser();
      const change = await api.post("/api/v1/auth/password").set(auth(token))
        .send({ current_password: "Password123!", new_password: "BrandNew123!" });
      expect(change.status).toBe(204);
      // old password no longer works, new one does
      expect((await api.post("/api/v1/auth/login").send({ email: body.email, password: "Password123!" })).status).toBe(401);
      expect((await api.post("/api/v1/auth/login").send({ email: body.email, password: "BrandNew123!" })).status).toBe(200);
    });

    it("rejects a wrong current password with 400", async () => {
      const { token } = await registerUser();
      const res = await api.post("/api/v1/auth/password").set(auth(token))
        .send({ current_password: "WRONG", new_password: "BrandNew123!" });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_PASSWORD");
    });
  });
});
