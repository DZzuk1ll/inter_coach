"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AnalysisStatus, Project, ProjectListItem } from "@/types";
import { api } from "@/lib/api";

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get<ProjectListItem[]>("/api/projects"),
  });
}

export function useProject(id: string | null) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: () => api.get<Project>(`/api/projects/${id}`),
    enabled: !!id,
  });
}

export function useAnalysisStatus(projectId: string | null) {
  return useQuery({
    queryKey: ["analysis-status", projectId],
    queryFn: () =>
      api.get<AnalysisStatus>(`/api/projects/${projectId}/analysis-status`),
    enabled: !!projectId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "completed" || status === "failed") return false;
      return 2000;
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) =>
      api.upload<Project>("/api/projects", formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
