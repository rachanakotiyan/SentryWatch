import axios from "axios";

export const TOKEN_KEY = "sentrywatch_token";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const isAuthRequest = config.url?.startsWith("/auth/");
  const token = isAuthRequest ? null : localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  }
);

export default api;
