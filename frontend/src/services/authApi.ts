import type {
  LoginRequest,
  TokenResponse,
  User,
  UserCreate,
  UserUpdate,
  VkLoginUrlResponse,
} from "../types";

import { api } from "./api";

export const authApi = {
  login: (body: LoginRequest) =>
    api.post<TokenResponse>("/auth/login", body),

  vkLoginUrl: (redirect?: string) =>
    api.get<VkLoginUrlResponse>("/auth/vk/login-url", {
      params: redirect ? { redirect } : undefined,
    }),

  vkExchange: (body: { code: string; state: string }) =>
    api.post<TokenResponse>("/auth/vk/exchange", body),

  register: (body: UserCreate) => api.post<User>("/auth/register", body),

  me: () => api.get<User>("/auth/me"),

  updateMe: (body: UserUpdate) => api.put<User>("/auth/me", body),
};
