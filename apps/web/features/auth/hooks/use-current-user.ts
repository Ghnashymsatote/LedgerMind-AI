import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser } from "../api/auth.service";
import { authKeys } from "../auth.keys";
import type { CurrentUser } from "../types/auth.types";

export function useCurrentUser() {
  const client = useQueryClient();

  return useQuery({
    queryKey: authKeys.currentUser,
    queryFn: async ({ signal }) => {
      const previous = client.getQueryData<CurrentUser>(authKeys.currentUser);
      const user = await getCurrentUser(undefined, signal);
      if (previous && previous.id !== user.id) {
        client.removeQueries({ predicate: (query) => query.meta?.protected === true });
        client.getMutationCache().clear();
      }
      return user;
    },
  });
}
