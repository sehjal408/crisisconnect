// Service layer.
// Default: talk to the real Express API (PostgreSQL-backed). If the backend is
// unreachable, fall back to the in-browser demo data so the UI never breaks.
// Force pure demo mode with VITE_API=demo.
import api from "./client";
import { demo } from "../data/demo";

const FORCE_DEMO = import.meta.env.VITE_API === "demo";
export const isDemo = FORCE_DEMO;

function currentUserId() {
  try {
    return JSON.parse(localStorage.getItem("crisisconnect_user") || "null")?.id;
  } catch {
    return null;
  }
}

// Try the real API; on a network error (no backend) fall back to demo data.
async function call(realFn, demoFn) {
  if (FORCE_DEMO) return demoFn();
  try {
    return await realFn();
  } catch (e) {
    if (e && e.response) throw e; // real HTTP error (401/400/…) — surface it
    console.warn("[CrisisConnect] backend unreachable — using demo data");
    return demoFn();
  }
}

export const auth = {
  login: (email, password) =>
    call(() => api.post("/auth/login", { email, password }).then((r) => r.data), () => demo.login(email, password)),
  register: (payload) =>
    call(() => api.post("/auth/register", payload).then((r) => r.data), () => demo.register(payload)),
  me: () => call(() => api.get("/auth/me").then((r) => r.data), () => demo.me(currentUserId())),
};

export const incidents = {
  list: (filters) =>
    call(() => api.get("/incidents", { params: filters }).then((r) => r.data.incidents), () => demo.incidents(filters)),
  // Admin: pull the latest from the live official feeds (USGS / BC Wildfire / ECCC).
  ingest: () => api.post("/incidents/ingest").then((r) => r.data.summary),
  // Admin verification queue.
  verify: (id) => api.patch(`/incidents/${id}/verify`).then((r) => r.data.incident),
  dismiss: (id) => api.patch(`/incidents/${id}/dismiss`).then((r) => r.data.incident),
  // Admin cross-source de-duplication.
  dedup: () => api.post("/incidents/dedup").then((r) => r.data.summary),
  unmerge: (id) => api.patch(`/incidents/${id}/unmerge`).then((r) => r.data.incident),
};

export const shelters = {
  list: () => call(() => api.get("/shelters").then((r) => r.data.shelters), () => demo.shelters()),
  // Admin: shelter management.
  create: (payload) => api.post("/shelters", payload).then((r) => r.data.shelter),
  update: (id, patch) => api.put(`/shelters/${id}`, patch).then((r) => r.data.shelter),
};

export const requests = {
  mine: () => call(() => api.get("/requests/mine").then((r) => r.data.requests), () => demo.myRequests(currentUserId())),
  create: (payload) =>
    call(() => api.post("/requests", payload).then((r) => r.data.request), () => demo.createRequest(currentUserId(), payload)),
  all: (filters) =>
    call(() => api.get("/requests", { params: filters }).then((r) => r.data.requests), () => demo.allRequests(filters)),
  setStatus: (id, status) =>
    call(() => api.patch(`/requests/${id}`, { status }).then((r) => r.data.request), () => demo.setRequestStatus(id, status)),
  assign: (id, volunteerId) =>
    call(() => api.post(`/requests/${id}/assign`, { volunteer_id: volunteerId }).then((r) => r.data.assignment), () => demo.assignRequest(id, volunteerId)),
  // Admin: promote a "Not sure / none" request into a new (citizen-sourced) incident and link them.
  createIncident: (id, payload) => api.post(`/requests/${id}/incident`, payload).then((r) => r.data.incident),
  // Admin: place a citizen request into a shelter (consumes beds, links, resolves).
  place: (id, shelterId) => api.post(`/requests/${id}/place`, { shelter_id: shelterId }).then((r) => r.data),
};

export const volunteers = {
  me: () => call(() => api.get("/volunteers/me").then((r) => r.data.volunteer), () => demo.volunteerMe(currentUserId())),
  updateMe: (patch) =>
    call(() => api.put("/volunteers/me", patch).then((r) => r.data.volunteer), () => demo.updateVolunteer(currentUserId(), patch)),
  assignments: () =>
    call(() => api.get("/volunteers/me/assignments").then((r) => r.data.assignments), () => demo.volunteerAssignments(currentUserId())),
  available: () =>
    call(() => api.get("/volunteers", { params: { availability: "available" } }).then((r) => r.data.volunteers), () => demo.availableVolunteers()),
};

export const assignments = {
  update: (id, status) =>
    call(() => api.patch(`/assignments/${id}`, { status }).then((r) => r.data.assignment), () => demo.updateAssignment(id, status)),
};

export const dashboard = {
  summary: () => call(() => api.get("/dashboard/summary").then((r) => r.data), () => demo.dashboardSummary()),
  analytics: () => call(() => api.get("/dashboard/analytics").then((r) => r.data), () => null),
};

// In-app notifications (per-user). Polled by the sidebar bell.
export const notifications = {
  list: () => call(() => api.get("/notifications").then((r) => r.data), () => ({ notifications: [], unread: 0 })),
  markRead: (id) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.post("/notifications/read-all").then((r) => r.data),
};

// Public, unauthenticated network status — powers the live sign-in backdrop.
export const network = {
  pulse: () =>
    call(
      () => api.get("/public/pulse").then((r) => r.data),
      () => {
        const inc = demo.incidents() || [];
        return {
          counts: {
            incidents: inc.length,
            critical: inc.filter((i) => i.severity === "critical").length,
            feeds: 7,
            shelters_open: 3,
          },
          points: inc.map(({ type, severity, latitude, longitude }) => ({ type, severity, latitude, longitude })),
        };
      }
    ),
};
