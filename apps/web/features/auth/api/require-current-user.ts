import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiBaseUrl } from "@/config/api";
import { createApiClient } from "@/lib/api/api-client";
import { ApiError } from "@/lib/api/api-error";
import { getCurrentUser } from "./auth.service";

export async function requireCurrentUser() {
  const client = createApiClient(apiBaseUrl, { cookie: (await cookies()).toString() });
  try {
    return await getCurrentUser(client);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/login");
    throw error;
  }
}
