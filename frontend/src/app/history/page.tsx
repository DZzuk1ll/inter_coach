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

      {interviews && interviews.length > 0 && (
        <div>
          {/* Table header */}
          <div
            className="hidden sm:grid gap-2 px-3 py-2 text-[11px] font-medium uppercase tracking-wider"
            style={{
              gridTemplateColumns: "1fr 140px 60px 80px",
              color: "var(--table-header-fg)",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <span>项目</span>
            <span>日期</span>
            <span>阶段</span>
            <span className="text-right">状态</span>
          </div>

          {/* Table rows */}
          <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
            {interviews.map((interview) => {
              const status = STATUS_MAP[interview.status] || STATUS_MAP.abandoned;
              return (
                <Link key={interview.id} href={`/history/${interview.id}`}>
                  <div
                    className="grid gap-2 px-3 items-center cursor-pointer transition-colors hover:bg-[--table-row-hover]"
                    style={{
                      gridTemplateColumns: "1fr 140px 60px 80px",
                      height: "40px",
                    }}
                  >
                    <span
                      className="text-[13px] font-medium truncate"
                      style={{ color: "var(--foreground)" }}
                    >
                      {interview.project_name || "未命名项目"}
                    </span>
                    <span
                      className="text-[12px] tabular-nums"
                      style={{ color: "var(--foreground-subtle)" }}
                    >
                      {new Date(interview.created_at).toLocaleDateString("zh-CN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      })}
                    </span>
                    <span
                      className="text-[12px] tabular-nums font-mono"
                      style={{ color: "var(--foreground-subtle)" }}
                    >
                      {interview.current_phase}/4
                    </span>
                    <span className="text-right">
                      <span
                        className="text-[11px] font-medium px-1.5 py-0.5 rounded"
                        style={{
                          color: status.color,
                          background: status.bg,
                        }}
                      >
                        {status.label}
                      </span>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile: card fallback for narrow screens */}
      {interviews && interviews.length > 0 && (
        <div className="sm:hidden space-y-px -mt-4">
          {interviews.map((interview) => {
            const status = STATUS_MAP[interview.status] || STATUS_MAP.abandoned;
            return (
              <Link key={`m-${interview.id}`} href={`/history/${interview.id}`}>
                <div
                  className="flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors hover:bg-[--table-row-hover] rounded-md"
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
      )}
    </div>
  );
}
