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
import { useEndInterview, useInterview, useSendMessage } from "@/hooks/use-interviews";

export default function InterviewPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: interview, isLoading } = useInterview(id);
  const sendMessage = useSendMessage(id);
  const endInterview = useEndInterview(id);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [interview?.messages]);

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>;
  }

  if (!interview) {
    return <div className="text-center py-12 text-gray-500">面试不存在</div>;
  }

  const isActive = interview.status === "in_progress";

  const handleSend = async (content: string) => {
    try {
      await sendMessage.mutateAsync(content);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "发送失败");
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
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <PhaseIndicator currentPhase={interview.current_phase} />

        {isActive && (
          <Dialog>
            <DialogTrigger
              render={<Button variant="outline" size="sm" />}
            >
              结束面试
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
          <span className="text-sm text-gray-500">面试已结束</span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {interview.messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t pt-4">
        <ChatInput
          onSend={handleSend}
          disabled={!isActive}
          loading={sendMessage.isPending}
        />
      </div>
    </div>
  );
}
