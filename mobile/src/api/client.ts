import axios, { type AxiosError } from "axios";

import { API_BASE_URL } from "../config";
import { getStoredToken, setStoredToken } from "../lib/storage";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 25_000,
});

api.interceptors.request.use(async (config) => {
  const token = await getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await setStoredToken(null);
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);
