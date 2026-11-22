import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { ApiError } from "../api/api-error";

export function createQueryClient() {
  function redirectOnExpiredSession(error: Error) {
    if (typeof window !== "undefined" && error instanceof ApiError && error.status === 401) {
      client.clear();
      window.location.replace("/login");
    }
  }

  const client = new QueryClient({
    queryCache: new QueryCache({ onError: redirectOnExpiredSession }),
    mutationCache: new MutationCache({
      onError(error, _variables, _context, mutation) {
        if (mutation.meta?.protected) redirectOnExpiredSession(error);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => failureCount < 1 &&
          (!(error instanceof ApiError) || error.status === undefined || error.status >= 500),
      },
      mutations: { retry: false, gcTime: 0 },
    },
  });

  return client;
}
