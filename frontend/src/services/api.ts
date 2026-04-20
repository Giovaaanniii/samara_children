import axios, { type AxiosError } from "axios";

import { useAuthStore } from "../store/authStore";

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
if (!rawApiBaseUrl) {
  throw new Error("VITE_API_BASE_URL is required in root .env");
}
const baseURL = rawApiBaseUrl.replace(/\/$/, "");

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);
