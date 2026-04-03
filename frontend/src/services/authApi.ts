import type { LoginRequest, TokenResponse, User, UserCreate, UserUpdate } from "../types";

import { api } from "./api";

export const authApi = {
  login: (body: LoginRequest) =>
    api.post<TokenResponse>("/auth/login", body),

  register: (body: UserCreate) => api.post<User>("/auth/register", body),

  me: () => api.get<User>("/auth/me"),

  updateMe: (body: UserUpdate) => api.put<User>("/auth/me", body),
};
