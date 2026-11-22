import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login } from "../api/auth.service";

export function useLogin() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: login,
    onSuccess() {
      client.clear();
      window.location.replace("/suppliers");
    },
  });
}
