"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ChatInput } from "@/components/interview/chat-input";
import { ChatMessage } from "@/components/interview/chat-message";
import { PhaseSidebar } from "@/components/interview/phase-sidebar";
import { ReviewReportView } from "@/components/interview/review-report";
import {
  useEndInterview,
  useInterview,
  useSendMessage,
  useSendMessageStream,
} from "@/hooks/use-interviews";
import type { ReviewReport } from "@/types";

export default function InterviewPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: interview, isLoading } = useInterview(id);
  const sendMessage = useSendMessage(id);
  const { send: sendStream, streamingContent, isStreaming } = useSendMessageStream(id);
  const endInterview = useEndInterview(id);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [interview?.messages]);

  if (isLoading) {
    return (
      <div
        className="text-center py-12 text-sm"
        style={{ color: "var(--foreground-muted)" }}
      >
        加载中...
      </div>
    );
  }

  if (!interview) {
    return (
      <div
        className="text-center py-12 text-sm"
        style={{ color: "var(--foreground-muted)" }}
      >
        面试不存在
      </div>
    );
  }

  const isActive = interview.status === "in_progress";
  const reviewReport = interview.config?.review_report as ReviewReport | undefined;

  const handleSend = async (content: string) => {
    try {
      await sendStream(content);
    } catch {
      try {
        await sendMessage.mutateAsync(content);
      } catch (e2) {
        toast.error(e2 instanceof Error ? e2.message : "发送失败");
      }
    }
  };

  const handleEnd = async () => {
    try {
      await endInterview.mutateAsync();
      toast.success("面试已结束");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "结束面试失败");
    }
  };

  return (
    <div className="flex h-screen" style={{ margin: "calc(var(--content-padding-y) * -1) calc(var(--content-padding-x) * -1)" }}>
      {/* Phase sidebar */}
      <PhaseSidebar
        currentPhase={interview.current_phase}
        projectName={undefined}
        startTime={interview.created_at}
        messageCount={interview.messages.length}
        isActive={isActive}
        onEnd={handleEnd}
        endLoading={endInterview.isPending}
      />

      {/* Chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 space-y-1">
          {interview.messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {isStreaming && streamingContent && (
            <ChatMessage
              message={{
                id: "streaming",
                session_id: id,
                role: "interviewer",
                content: streamingContent,
                phase: interview.current_phase,
                metadata_: null,
                created_at: new Date().toISOString(),
              }}
            />
          )}
          {reviewReport && (
            <div className="py-3">
              <ReviewReportView report={reviewReport} />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div
          className="shrink-0 px-4 py-3 md:px-6"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <ChatInput
            onSend={handleSend}
            disabled={!isActive}
            loading={sendMessage.isPending || isStreaming}
          />
        </div>
      </div>
    </div>
  );
}
