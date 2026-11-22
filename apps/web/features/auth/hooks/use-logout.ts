import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "../api/auth.service";

export function useLogout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess() {
      client.clear();
      window.location.replace("/login");
    },
  });
}
