"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChatInput } from "@/components/interview/chat-input";
import { ChatMessage } from "@/components/interview/chat-message";
import { PhaseIndicator } from "@/components/interview/phase-indicator";
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
    } catch (e) {
      // Fallback to non-streaming
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
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Header Bar */}
      <div
        className="flex items-center justify-between pb-3 mb-3"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <PhaseIndicator currentPhase={interview.current_phase} />

        {isActive && (
          <Dialog>
            <DialogTrigger
              render={<Button variant="ghost" size="sm" />}
            >
              <span className="text-[13px]" style={{ color: "var(--foreground-muted)" }}>
                结束面试
              </span>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>确认结束面试？</DialogTitle>
                <DialogDescription>
                  结束后将无法继续回答，面试记录会保存到历史中。
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={handleEnd}>
                  确认结束
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {!isActive && (
          <span
            className="text-[12px] font-medium px-2 py-0.5 rounded"
            style={{
              color: "var(--foreground-subtle)",
              background: "var(--surface-secondary)",
            }}
          >
            面试已结束
          </span>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto py-2 space-y-1">
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

      {/* Input Area */}
      <div
        className="pt-3 mt-1"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <ChatInput
          onSend={handleSend}
          disabled={!isActive}
          loading={sendMessage.isPending || isStreaming}
        />
      </div>
    </div>
  );
}
