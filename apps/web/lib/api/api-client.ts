import { ApiError } from "./api-error";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: object;
  signal?: AbortSignal;
};

const requestFailed = "The request could not be completed.";

export function createApiClient(baseUrl: string, defaultHeaders?: HeadersInit) {
  return {
    async request<T>(path: `/${string}`, { method = "GET", body, signal }: RequestOptions = {}): Promise<T> {
      const headers = new Headers(defaultHeaders);
      headers.set("Accept", "application/json");
      const formData = body instanceof FormData;
      if (body !== undefined && !formData) headers.set("Content-Type", "application/json");

      let response: Response;
      let raw: string;
      try {
        response = await fetch(baseUrl.replace(/\/+$/, "") + path, {
          method,
          headers,
          body: formData ? body : body === undefined ? undefined : JSON.stringify(body),
          credentials: "same-origin",
          cache: "no-store",
          signal,
        });
        raw = await response.text();
      } catch (error) {
        if (signal?.aborted) throw error;
        throw new ApiError(requestFailed);
      }

      if (response.status === 204 || response.status === 205) return undefined as T;

      let data: unknown;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new ApiError(requestFailed, response.status);
      }

      if (!response.ok) {
        const message = data && typeof data === "object" && "error" in data && typeof data.error === "string"
          ? data.error
          : requestFailed;
        throw new ApiError(message, response.status);
      }

      return data as T;
    },
  };
}

export const apiClient = createApiClient("/api");
