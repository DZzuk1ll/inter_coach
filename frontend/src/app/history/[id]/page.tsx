"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "@/components/interview/chat-message";
import { PhaseIndicator } from "@/components/interview/phase-indicator";
import { useInterview } from "@/hooks/use-interviews";

export default function HistoryDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: interview, isLoading } = useInterview(id);

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>;
  }

  if (!interview) {
    return <div className="text-center py-12 text-gray-500">记录不存在</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Link href="/history">
            <Button variant="ghost" size="sm">&larr; 返回历史</Button>
          </Link>
          <PhaseIndicator currentPhase={interview.current_phase} />
        </div>
        <div className="text-sm text-gray-500">
          <p>
            {new Date(interview.created_at).toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p className="text-right">只读模式</p>
        </div>
      </div>

      <div className="space-y-4 pb-8">
        {interview.messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
      </div>
    </div>
  );
}
