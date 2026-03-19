"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "@/components/interview/chat-message";
import { PhaseIndicator } from "@/components/interview/phase-indicator";
import { ReviewReportView } from "@/components/interview/review-report";
import { useInterview } from "@/hooks/use-interviews";
import type { ReviewReport } from "@/types";

export default function HistoryDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: interview, isLoading } = useInterview(id);

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
        记录不存在
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Link href="/history">
            <Button variant="ghost" size="sm">
              <span className="text-[13px]">&larr; 返回历史</span>
            </Button>
          </Link>
          <PhaseIndicator currentPhase={interview.current_phase} />
        </div>
        <div className="text-right space-y-0.5">
          <p
            className="text-[12px] tabular-nums"
            style={{ color: "var(--foreground-subtle)" }}
          >
            {new Date(interview.created_at).toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p
            className="text-[11px] font-medium px-1.5 py-0.5 rounded inline-block"
            style={{
              color: "var(--foreground-subtle)",
              background: "var(--surface-secondary)",
            }}
          >
            只读模式
          </p>
        </div>
      </div>

      <div className="space-y-1 pb-8">
        {interview.messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {(interview.config?.review_report as ReviewReport | undefined) && (
          <div className="py-3">
            <ReviewReportView
              report={interview.config!.review_report as ReviewReport}
            />
          </div>
        )}
      </div>
    </div>
  );
}
