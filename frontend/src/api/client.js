import axios from "axios";

const api = axios.create({
  baseURL: "/api/v1",
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
