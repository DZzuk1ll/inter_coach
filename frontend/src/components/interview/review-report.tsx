"use client";

import type { ReviewReport } from "@/types";

interface ReviewReportProps {
  report: ReviewReport;
}

function ScoreBar({ score, max = 10 }: { score: number; max?: number }) {
  const pct = (score / max) * 100;
  return (
    <div
      className="h-1.5 w-full rounded-full overflow-hidden"
      style={{ background: "var(--progress-track)" }}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${pct}%`,
          background: "var(--progress-fill)",
        }}
      />
    </div>
  );
}

export function ReviewReportView({ report }: ReviewReportProps) {
  return (
    <div
      className="rounded-lg p-5 space-y-5"
      style={{
        background: "var(--surface-primary)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <h3
          className="text-[13px] font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          面试复盘报告
        </h3>
        <div className="flex items-baseline gap-1">
          <span
            className="text-[20px] font-semibold tabular-nums"
            style={{ color: "var(--accent-fg)" }}
          >
            {report.overall_score}
          </span>
          <span
            className="text-[12px]"
            style={{ color: "var(--foreground-subtle)" }}
          >
            /10
          </span>
        </div>
      </div>

      {/* Summary */}
      <p
        className="text-[13px] leading-relaxed"
        style={{ color: "var(--foreground-muted)" }}
      >
        {report.summary}
      </p>

      {/* Dimension Scores */}
      <div className="space-y-3">
        {report.dimensions.map((dim) => (
          <div key={dim.key} className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span
                className="text-[12px] font-medium"
                style={{ color: "var(--foreground)" }}
              >
                {dim.label}
              </span>
              <span
                className="text-[12px] tabular-nums font-mono"
                style={{ color: "var(--foreground-subtle)" }}
              >
                {dim.score}/10
              </span>
            </div>
            <ScoreBar score={dim.score} />
            <p
              className="text-[11px]"
              style={{ color: "var(--foreground-subtle)" }}
            >
              {dim.comment}
            </p>
          </div>
        ))}
      </div>

      <div style={{ height: "1px", background: "var(--border-subtle)" }} />

      {/* Strengths & Improvements */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4
            className="text-[12px] font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            表现亮点
          </h4>
          <ul className="space-y-1">
            {report.strengths.map((s, i) => (
              <li
                key={i}
                className="text-[12px] leading-relaxed"
                style={{ color: "var(--foreground-muted)" }}
              >
                <span style={{ color: "var(--status-success)" }}>+</span> {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2">
          <h4
            className="text-[12px] font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            改进建议
          </h4>
          <ul className="space-y-1">
            {report.improvements.map((s, i) => (
              <li
                key={i}
                className="text-[12px] leading-relaxed"
                style={{ color: "var(--foreground-muted)" }}
              >
                <span style={{ color: "var(--status-warning)" }}>-</span> {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
