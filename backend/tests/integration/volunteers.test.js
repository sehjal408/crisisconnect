// Volunteer registration → verification → assignable. Guards the flow where a
// newly-registered volunteer must be admin-verified before appearing for assignment.
const { api, bootDb, registerUser, login, auth } = require("../helpers");

beforeAll(bootDb);

async function registerVolunteer(extra = {}) {
  return registerUser({
    role: "volunteer",
    skills: ["first_aid", "driving"],
    certifications: ["cpr", "drivers_licence"],
    vehicle_available: true,
    ...extra,
  });
}

describe("volunteer registration", () => {
  it("stores skills, certifications and vehicle, starting as 'pending'", async () => {
    const { token } = await registerVolunteer();
    const me = await api.get("/api/v1/volunteers/me").set(auth(token));
    expect(me.status).toBe(200);
    expect(me.body.volunteer).toMatchObject({
      skills: ["first_aid", "driving"],
      certifications: ["cpr", "drivers_licence"],
      vehicle_available: true,
      verification_status: "pending",
    });
  });

  it("lets a volunteer edit their own skills and certifications", async () => {
    const { token } = await registerVolunteer();
    const res = await api.put("/api/v1/volunteers/me").set(auth(token))
      .send({ skills: ["logistics"], certifications: ["food_safe"] });
    expect(res.status).toBe(200);
    expect(res.body.volunteer.skills).toEqual(["logistics"]);
    expect(res.body.volunteer.certifications).toEqual(["food_safe"]);
  });
});

describe("admin verification", () => {
  it("is forbidden for non-admins", async () => {
    const { token } = await registerUser({ role: "citizen" });
    const res = await api.get("/api/v1/volunteers/manage").set(auth(token));
    expect(res.status).toBe(403);
  });

  it("verifies a pending volunteer, making them assignable", async () => {
    const { user } = await registerVolunteer();
    const adminToken = await login("admin@crisisconnect.ca");

    // roster shows the volunteer as pending
    const roster = await api.get("/api/v1/volunteers/manage").set(auth(adminToken));
    expect(roster.status).toBe(200);
    const row = roster.body.volunteers.find((v) => v.user_id === user.id);
    expect(row).toBeDefined();
    expect(row.verification_status).toBe("pending");

    // before verification: not in the assignable list
    const before = await api.get("/api/v1/volunteers").set(auth(adminToken));
    expect(before.body.volunteers.some((v) => v.id === row.id)).toBe(false);

    // verify
    const verify = await api.patch(`/api/v1/volunteers/${row.id}/verification`).set(auth(adminToken)).send({ status: "verified" });
    expect(verify.status).toBe(200);
    expect(verify.body.volunteer.verification_status).toBe("verified");

    // after verification: now assignable
    const after = await api.get("/api/v1/volunteers").set(auth(adminToken));
    expect(after.body.volunteers.some((v) => v.id === row.id)).toBe(true);
  });

  it("rejects an invalid verification status with 400", async () => {
    const { user } = await registerVolunteer();
    const adminToken = await login("admin@crisisconnect.ca");
    const roster = await api.get("/api/v1/volunteers/manage").set(auth(adminToken));
    const row = roster.body.volunteers.find((v) => v.user_id === user.id);
    const res = await api.patch(`/api/v1/volunteers/${row.id}/verification`).set(auth(adminToken)).send({ status: "bogus" });
    expect(res.status).toBe(400);
  });
});
