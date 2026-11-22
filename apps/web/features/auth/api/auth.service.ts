import { apiClient } from "@/lib/api/api-client";
import type { CurrentUser, LoginInput } from "../types/auth.types";

export function getCurrentUser(client = apiClient, signal?: AbortSignal) {
  return client.request<CurrentUser>("/auth/me", { signal });
}

export function login(credentials: LoginInput) {
  return apiClient.request<CurrentUser>("/auth/login", { method: "POST", body: credentials });
}

export function logout() {
  return apiClient.request<void>("/auth/logout", { method: "POST" });
}
