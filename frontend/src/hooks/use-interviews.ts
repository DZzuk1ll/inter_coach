"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Interview, InterviewListItem, Message } from "@/types";
import { api } from "@/lib/api";

export function useCreateInterview(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.post<Interview>(`/api/projects/${projectId}/interviews`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
    },
  });
}

export function useInterview(id: string | null) {
  return useQuery({
    queryKey: ["interview", id],
    queryFn: () => api.get<Interview>(`/api/interviews/${id}`),
    enabled: !!id,
  });
}

export function useInterviews() {
  return useQuery({
    queryKey: ["interviews"],
    queryFn: () => api.get<InterviewListItem[]>("/api/interviews"),
  });
}

export function useSendMessage(interviewId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) =>
      api.post<Message>(`/api/interviews/${interviewId}/messages`, {
        content,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview", interviewId] });
    },
  });
}

export function useEndInterview(interviewId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.post<Interview>(`/api/interviews/${interviewId}/end`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview", interviewId] });
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
    },
  });
}
