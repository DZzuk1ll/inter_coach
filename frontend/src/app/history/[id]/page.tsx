"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "@/components/interview/chat-message";
import { PhaseSidebar } from "@/components/interview/phase-sidebar";
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
    <div className="flex h-screen" style={{ margin: "calc(var(--content-padding-y) * -1) calc(var(--content-padding-x) * -1)" }}>
      {/* Phase sidebar */}
      <PhaseSidebar
        currentPhase={interview.current_phase}
        projectName={undefined}
        startTime={interview.created_at}
        messageCount={interview.messages.length}
        isActive={false}
      />

      {/* Chat area (read-only) */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Back button */}
        <div
          className="shrink-0 px-4 py-2 md:px-6 flex items-center"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <Link href="/history">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              <span className="text-[13px]">返回历史</span>
            </Button>
          </Link>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 space-y-1">
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
    </div>
  );
}
