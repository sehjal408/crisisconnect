// ============================================================
// Demo data layer
// Lets the entire app run with realistic, seeded data when no
// backend/database is connected. Mutations persist to
// localStorage so a live demo feels real across reloads.
// Switch to the real API by setting VITE_API=real (see services.js).
// ============================================================

const KEY = "crisisconnect_demo_v3";
const PASSWORD = "Password123!";

function seed() {
  return {
    users: [
      { id: 1, name: "Dana Whitfield", email: "admin@crisisconnect.ca", phone: "604-555-0100", role: "admin" },
      { id: 2, name: "Jordan Lee", email: "volunteer@crisisconnect.ca", phone: "604-555-0101", role: "volunteer" },
      { id: 3, name: "Sam Rivera", email: "citizen@crisisconnect.ca", phone: "604-555-0102", role: "citizen" },
      { id: 4, name: "Priya Sharma", email: "priya@crisisconnect.ca", phone: "604-555-0110", role: "volunteer" },
      { id: 5, name: "Marcus Bell", email: "marcus@crisisconnect.ca", phone: "604-555-0111", role: "volunteer" },
    ],
    incidents: [
      { id: 1, title: "Wildfire near Lytton", type: "wildfire", severity: "critical", status: "verified", latitude: 50.2306, longitude: -121.5816, source: "BC Wildfire Service", description: "Fast-moving wildfire approaching a residential area; evacuation alert in effect.", updated_at: hoursAgo(1) },
      { id: 2, title: "Fraser River flood watch — Delta", type: "flood", severity: "high", status: "verified", latitude: 49.0847, longitude: -123.0587, source: "Environment Canada", description: "Rising water levels along the Fraser River; low-lying areas at risk.", updated_at: hoursAgo(3) },
      { id: 3, title: "Highway 1 closure — mudslide", type: "road_closure", severity: "medium", status: "verified", latitude: 49.3358, longitude: -121.8033, source: "DriveBC", description: "Highway 1 closed eastbound near Hope due to a mudslide.", updated_at: hoursAgo(5) },
      { id: 4, title: "Air quality advisory — Surrey", type: "air_quality", severity: "low", status: "verified", latitude: 49.1913, longitude: -122.849, source: "Metro Vancouver", description: "Wildfire smoke is affecting regional air quality.", updated_at: hoursAgo(8) },
      { id: 5, title: "Evacuation order — Sumas Prairie", type: "evacuation", severity: "high", status: "verified", latitude: 49.0726, longitude: -122.1037, source: "City of Abbotsford", description: "Mandatory evacuation order issued for the Sumas Prairie area.", updated_at: hoursAgo(2) },
      { id: 6, title: "Minor earthquake — Vancouver Island", type: "earthquake", severity: "medium", status: "verified", latitude: 49.65, longitude: -124.93, source: "U.S. Geological Survey", description: "Magnitude 4.1 earthquake recorded offshore; no damage reported.", updated_at: hoursAgo(12) },
      { id: 7, title: "Windstorm warning — Metro Vancouver", type: "weather", severity: "medium", status: "pending", latitude: 49.2827, longitude: -123.1207, source: "Environment Canada", description: "Strong winds expected overnight; possible power outages.", updated_at: hoursAgo(1) },
      { id: 8, title: "Wildfire smoke — Hope", type: "wildfire", severity: "low", status: "verified", latitude: 49.383, longitude: -121.441, source: "BC Wildfire Service", description: "Smoke drifting into the Fraser Canyon from regional fires.", updated_at: hoursAgo(20) },
    ],
    shelters: [
      { id: 1, name: "Guildford Recreation Centre", address: "15105 105 Ave, Surrey, BC", latitude: 49.1894, longitude: -122.8094, capacity: 40, occupied_beds: 18, pet_friendly: true, accessibility_support: true, medical_support: true, status: "open" },
      { id: 2, name: "Cloverdale Arena", address: "6090 176 St, Surrey, BC", latitude: 49.1053, longitude: -122.7297, capacity: 40, occupied_beds: 40, pet_friendly: false, accessibility_support: true, medical_support: false, status: "full" },
      { id: 3, name: "Newton Community Hall", address: "13730 72 Ave, Surrey, BC", latitude: 49.1217, longitude: -122.8508, capacity: 60, occupied_beds: 12, pet_friendly: true, accessibility_support: false, medical_support: true, status: "open" },
      { id: 4, name: "Fleetwood Community Centre", address: "15996 84 Ave, Surrey, BC", latitude: 49.1496, longitude: -122.7849, capacity: 50, occupied_beds: 9, pet_friendly: true, accessibility_support: true, medical_support: false, status: "open" },
      { id: 5, name: "Sunnyside Elementary", address: "12888 21A Ave, Surrey, BC", latitude: 49.0186, longitude: -122.8434, capacity: 30, occupied_beds: 0, pet_friendly: false, accessibility_support: false, medical_support: false, status: "closed" },
    ],
    volunteers: [
      { id: 1, user_id: 2, skills: ["first_aid", "driving", "translation_fr"], availability: "available", vehicle_available: true, verification_status: "verified" },
      { id: 2, user_id: 4, skills: ["first_aid", "counselling"], availability: "available", vehicle_available: false, verification_status: "verified" },
      { id: 3, user_id: 5, skills: ["driving", "logistics", "search_rescue"], availability: "busy", vehicle_available: true, verification_status: "verified" },
    ],
    requests: [
      { id: 1, citizen_id: 3, incident_id: 2, shelter_id: null, request_type: "shelter", description: "Family of four needs a place to stay after flood evacuation.", address: "Ladner, Delta, BC", latitude: 49.0847, longitude: -123.0587, affected_count: 4, status: "reviewed", created_at: hoursAgo(2) },
      { id: 2, citizen_id: 3, incident_id: 1, shelter_id: null, request_type: "medical", description: "Elderly neighbour needs oxygen and medication; smoke is heavy.", address: "Lytton, BC", latitude: 50.2306, longitude: -121.5816, affected_count: 1, status: "assigned", created_at: hoursAgo(4) },
      { id: 3, citizen_id: 3, incident_id: 5, shelter_id: null, request_type: "transportation", description: "No vehicle to leave the evacuation zone.", address: "Sumas Prairie, Abbotsford, BC", latitude: 49.0726, longitude: -122.1037, affected_count: 2, status: "pending", created_at: hoursAgo(1) },
      { id: 4, citizen_id: 3, incident_id: 4, shelter_id: null, request_type: "water", description: "Need bottled water; tap water advisory in effect.", address: "Newton, Surrey, BC", latitude: 49.1217, longitude: -122.8508, affected_count: 3, status: "in_progress", created_at: hoursAgo(6) },
    ],
    assignments: [
      { id: 1, request_id: 2, volunteer_id: 1, status: "accepted", assigned_at: hoursAgo(3), completed_at: null },
      { id: 2, request_id: 4, volunteer_id: 1, status: "in_progress", assigned_at: hoursAgo(5), completed_at: null },
    ],
    seq: { users: 5, incidents: 8, shelters: 5, volunteers: 3, requests: 4, assignments: 2 },
  };
}

function hoursAgo(h) {
  return new Date(Date.now() - h * 3600 * 1000).toISOString();
}

let db;

function loadOrSeed() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return seed();
}
function commit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* ignore */
  }
}

db = loadOrSeed();
commit();

export function resetDemo() {
  localStorage.removeItem(KEY);
  db = seed();
  commit();
}

const delay = (ms = 280) => new Promise((r) => setTimeout(r, ms));
const clone = (x) => JSON.parse(JSON.stringify(x));

function withBeds(s) {
  return { ...s, available_beds: Math.max(0, s.capacity - s.occupied_beds) };
}
function userById(id) {
  return db.users.find((u) => u.id === id);
}

// (Automatic AI triage is the Week 9 layer — for the Week 8 MVP, triage is manual.)

// ---- demo service implementations ----------------------------------------
export const demo = {
  async login(email, password) {
    await delay();
    const user = db.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
    if (!user || password !== PASSWORD) {
      const err = new Error("Invalid email or password");
      err.code = "INVALID_CREDENTIALS";
      throw err;
    }
    return { token: `demo.${user.id}.${Date.now()}`, user: clone(user) };
  },

  async register(payload) {
    await delay();
    const { name, email, password, phone, role } = payload;
    if (db.users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) {
      const err = new Error("An account with this email already exists");
      err.code = "DUPLICATE";
      throw err;
    }
    const id = ++db.seq.users;
    const user = { id, name, email, phone: phone || null, role };
    db.users.push(user);
    if (role === "volunteer") {
      db.volunteers.push({
        id: ++db.seq.volunteers, user_id: id,
        skills: payload.skills || [], certifications: payload.certifications || [],
        availability: "unavailable", vehicle_available: !!payload.vehicle_available,
        verification_status: "pending",
      });
    }
    commit();
    return { token: `demo.${id}.${Date.now()}`, user: clone(user) };
  },

  async updateProfile(userId, patch) {
    await delay(150);
    const u = userById(userId);
    if (!u) throw new Error("Not found");
    if (patch.name != null) u.name = patch.name;
    if (patch.phone != null) u.phone = patch.phone;
    commit();
    return clone(u);
  },

  async changePassword() {
    await delay(150);
    return true; // demo mode: passwords aren't persisted
  },

  async me(userId) {
    await delay(120);
    const u = userById(userId);
    if (!u) throw new Error("Not found");
    return { user: clone(u) };
  },

  async incidents(filters = {}) {
    await delay(200);
    let rows = db.incidents.slice();
    if (filters.type) rows = rows.filter((r) => r.type === filters.type);
    if (filters.severity) rows = rows.filter((r) => r.severity === filters.severity);
    if (filters.status) rows = rows.filter((r) => r.status === filters.status);
    rows.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    return clone(rows);
  },

  async shelters() {
    await delay(200);
    return clone(db.shelters.map(withBeds).sort((a, b) => a.name.localeCompare(b.name)));
  },

  async myRequests(userId) {
    await delay(200);
    return clone(db.requests.filter((r) => r.citizen_id === userId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
  },

  async createRequest(userId, payload) {
    await delay();
    const id = ++db.seq.requests;
    const base = {
      id, citizen_id: userId, incident_id: payload.incident_id || null, shelter_id: null,
      request_type: payload.request_type, description: payload.description,
      address: payload.address || null, latitude: payload.latitude || null, longitude: payload.longitude || null,
      affected_count: payload.affected_count || 1, status: "pending", created_at: new Date().toISOString(),
    };
    db.requests.push(base);
    commit();
    return clone(base);
  },

  async allRequests(filters = {}) {
    await delay(220);
    let rows = db.requests.slice();
    if (filters.status) rows = rows.filter((r) => r.status === filters.status);
    rows = rows.map((r) => ({
      ...r,
      citizen_name: userById(r.citizen_id)?.name,
      incident_title: db.incidents.find((i) => i.id === r.incident_id)?.title || null,
      assignment: db.assignments.find((a) => a.request_id === r.id) || null,
    }));
    rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return clone(rows);
  },

  async setRequestStatus(id, status) {
    await delay(160);
    const r = db.requests.find((x) => x.id === id);
    if (!r) throw new Error("Not found");
    r.status = status;
    commit();
    return clone(r);
  },

  async assignRequest(id, volunteerId) {
    await delay();
    const r = db.requests.find((x) => x.id === id);
    if (!r) throw new Error("Not found");
    r.status = "assigned";
    let a = db.assignments.find((x) => x.request_id === id);
    if (a) {
      a.volunteer_id = volunteerId;
      a.status = "assigned";
    } else {
      a = { id: ++db.seq.assignments, request_id: id, volunteer_id: volunteerId, status: "assigned", assigned_at: new Date().toISOString(), completed_at: null };
      db.assignments.push(a);
    }
    commit();
    return clone(a);
  },

  async volunteerMe(userId) {
    await delay(150);
    const v = db.volunteers.find((x) => x.user_id === userId);
    const u = userById(userId);
    if (!v) throw new Error("Not found");
    return clone({ ...v, name: u?.name, email: u?.email, phone: u?.phone });
  },

  async updateVolunteer(userId, patch) {
    await delay(150);
    const v = db.volunteers.find((x) => x.user_id === userId);
    if (!v) throw new Error("Not found");
    if (patch.availability) v.availability = patch.availability;
    if (patch.skills) v.skills = patch.skills;
    if (patch.certifications) v.certifications = patch.certifications;
    if (patch.vehicle_available != null) v.vehicle_available = patch.vehicle_available;
    commit();
    return clone(v);
  },

  async manageVolunteers() {
    await delay(180);
    return clone(
      db.volunteers
        .map((v) => {
          const u = userById(v.user_id);
          return { ...v, name: u?.name, email: u?.email, phone: u?.phone, created_at: u?.created_at };
        })
        .sort((a, b) => (b.verification_status === "pending") - (a.verification_status === "pending"))
    );
  },

  async setVerification(id, status) {
    await delay(150);
    const v = db.volunteers.find((x) => x.id === id);
    if (!v) throw new Error("Not found");
    v.verification_status = status;
    commit();
    return clone(v);
  },

  async volunteerAssignments(userId) {
    await delay(200);
    const v = db.volunteers.find((x) => x.user_id === userId);
    if (!v) return [];
    const rows = db.assignments
      .filter((a) => a.volunteer_id === v.id)
      .map((a) => {
        const req = db.requests.find((r) => r.id === a.request_id);
        return { ...a, request: req ? { ...req, citizen_name: userById(req.citizen_id)?.name } : null };
      })
      .sort((x, y) => new Date(y.assigned_at) - new Date(x.assigned_at));
    return clone(rows);
  },

  async updateAssignment(id, status) {
    await delay(160);
    const a = db.assignments.find((x) => x.id === id);
    if (!a) throw new Error("Not found");
    a.status = status;
    if (status === "completed") a.completed_at = new Date().toISOString();
    const req = db.requests.find((r) => r.id === a.request_id);
    if (req) {
      if (status === "in_progress") req.status = "in_progress";
      if (status === "completed") req.status = "resolved";
      if (status === "accepted") req.status = "assigned";
    }
    commit();
    return clone(a);
  },

  async availableVolunteers() {
    await delay(150);
    return clone(
      db.volunteers
        .filter((v) => v.verification_status === "verified")
        .map((v) => ({ ...v, name: userById(v.user_id)?.name }))
    );
  },

  async dashboardSummary() {
    await delay(200);
    const active = db.incidents.filter((i) => !["resolved", "closed"].includes(i.status)).length;
    const openReq = db.requests.filter((r) => !["resolved", "closed"].includes(r.status)).length;
    const availVol = db.volunteers.filter((v) => v.availability === "available").length;
    const cap = db.shelters.reduce((s, x) => s + x.capacity, 0);
    const beds = db.shelters.reduce((s, x) => s + Math.max(0, x.capacity - x.occupied_beds), 0);
    return {
      active_incidents: active,
      open_requests: openReq,
      available_volunteers: availVol,
      shelter_capacity: cap,
      shelter_available_beds: beds,
    };
  },
};

export const DEMO_PASSWORD = PASSWORD;
