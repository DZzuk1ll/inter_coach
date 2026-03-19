"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Interview, InterviewListItem, Message } from "@/types";
import { api } from "@/lib/api";

export function useCreateInterview(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (additionalProjectIds?: string[]) =>
      api.post<Interview>(`/api/projects/${projectId}/interviews`,
        additionalProjectIds?.length
          ? { additional_project_ids: additionalProjectIds }
          : undefined,
      ),
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

export function useSendMessageStream(interviewId: string) {
  const queryClient = useQueryClient();
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef(false);

  const send = useCallback(
    async (content: string) => {
      setIsStreaming(true);
      setStreamingContent("");
      abortRef.current = false;

      try {
        await api.stream(
          `/api/interviews/${interviewId}/messages/stream`,
          { content },
          (chunk) => {
            if (!abortRef.current) {
              setStreamingContent((prev) => prev + chunk);
            }
          },
          (event) => {
            if (event === "done") {
              queryClient.invalidateQueries({
                queryKey: ["interview", interviewId],
              });
            }
          },
        );
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
      }
    },
    [interviewId, queryClient],
  );

  return { send, streamingContent, isStreaming };
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
