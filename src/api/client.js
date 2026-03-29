import axios from "axios";

const BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001";

export const api = axios.create({
  baseURL: `${BASE}/api/admin`,
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("admin_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
