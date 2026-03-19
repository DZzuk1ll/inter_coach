"use client";

import Link from "next/link";
import { useInterviews } from "@/hooks/use-interviews";

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  in_progress: { label: "进行中", color: "var(--accent-fg)", bg: "var(--accent-bg)" },
  completed: { label: "已完成", color: "var(--foreground-muted)", bg: "var(--surface-secondary)" },
  abandoned: { label: "已放弃", color: "var(--foreground-subtle)", bg: "var(--surface-tertiary)" },
};

export default function HistoryPage() {
  const { data: interviews, isLoading } = useInterviews();

  return (
    <div className="space-y-4">
      <h1
        className="text-lg font-semibold tracking-tight"
        style={{ color: "var(--foreground)" }}
      >
        面试历史
      </h1>

      {isLoading && (
        <p className="text-sm" style={{ color: "var(--foreground-muted)" }}>
          加载中...
        </p>
      )}

      {interviews && interviews.length === 0 && (
        <p
          className="text-sm py-8 text-center"
          style={{ color: "var(--foreground-muted)" }}
        >
          暂无面试记录
        </p>
      )}

      <div className="space-y-px">
        {interviews?.map((interview) => {
          const status = STATUS_MAP[interview.status] || STATUS_MAP.abandoned;
          return (
            <Link key={interview.id} href={`/history/${interview.id}`}>
              <div
                className="flex items-center justify-between px-3 py-2.5 transition-colors cursor-pointer rounded-md group"
                style={{
                  border: "1px solid transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--surface-secondary)";
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "transparent";
                }}
              >
                <div className="space-y-0.5 min-w-0 flex-1">
                  <p
                    className="text-[13px] font-medium truncate"
                    style={{ color: "var(--foreground)" }}
                  >
                    {interview.project_name || "未命名项目"}
                  </p>
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
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span
                    className="text-[12px] tabular-nums font-mono"
                    style={{ color: "var(--foreground-subtle)" }}
                  >
                    {interview.current_phase}/4
                  </span>
                  <span
                    className="text-[11px] font-medium px-1.5 py-0.5 rounded"
                    style={{
                      color: status.color,
                      background: status.bg,
                    }}
                  >
                    {status.label}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
