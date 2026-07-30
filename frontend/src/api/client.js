import axios from "axios";

// In development the Vite dev-server proxies /api → the backend, so a relative
// base works. In production the frontend and backend are separate origins, so
// set VITE_API_URL to the backend's URL (e.g. https://crisisconnect-api.onrender.com).
export const API_BASE = import.meta.env.VITE_API_URL || "";

// Build an absolute URL for a server asset (e.g. an uploaded photo whose path is
// stored as "/api/v1/uploads/..."). Leaves already-absolute URLs untouched.
export const mediaUrl = (path) =>
  !path ? path : /^https?:\/\//.test(path) ? path : `${API_BASE}${path}`;

const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("crisisconnect_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Expired / invalid session: clear it and send the user to sign in again, instead
// of leaving actions stuck "loading". (Login errors stay on the login page.)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !window.location.pathname.startsWith("/login")) {
      localStorage.removeItem("crisisconnect_token");
      localStorage.removeItem("crisisconnect_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
