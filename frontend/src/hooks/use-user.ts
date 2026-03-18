"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import type { User } from "@/types";
import { api } from "@/lib/api";

export function useUser() {
  return useQuery({
    queryKey: ["user"],
    queryFn: () => api.get<User>("/api/users/me"),
  });
}

export function useDeleteUser() {
  return useMutation({
    mutationFn: () => api.delete("/api/users/me"),
  });
}
