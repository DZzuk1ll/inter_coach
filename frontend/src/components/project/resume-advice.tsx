"use client";

import { Button } from "@/components/ui/button";
import { useResumeAdvice, type ResumeAdvice } from "@/hooks/use-projects";

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  add: { label: "新增", color: "var(--status-success)" },
  modify: { label: "修改", color: "var(--accent-fg)" },
  remove: { label: "删除", color: "var(--status-error)" },
  quantify: { label: "量化", color: "var(--status-warning)" },
};

function AdviceItem({ advice }: { advice: ResumeAdvice }) {
  const typeInfo = TYPE_LABELS[advice.type] || { label: advice.type, color: "var(--foreground-muted)" };

  return (
    <div
      className="rounded-md p-3 space-y-1.5"
      style={{
        background: "var(--surface-secondary)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
          style={{
            color: typeInfo.color,
            background: "var(--surface-tertiary)",
          }}
        >
          {typeInfo.label}
        </span>
        <span
          className="text-[12px] font-medium"
          style={{ color: "var(--foreground-subtle)" }}
        >
          {advice.section}
        </span>
      </div>
      {advice.original && (
        <p
          className="text-[12px] line-through"
          style={{ color: "var(--foreground-subtle)" }}
        >
          {advice.original}
        </p>
      )}
      <p className="text-[12px]" style={{ color: "var(--foreground)" }}>
        {advice.suggestion}
      </p>
      <p className="text-[11px]" style={{ color: "var(--foreground-muted)" }}>
        {advice.reason}
      </p>
    </div>
  );
}

interface ResumeAdviceViewProps {
  projectId: string;
}

export function ResumeAdviceView({ projectId }: ResumeAdviceViewProps) {
  const { data, refetch, isLoading, isFetched } = useResumeAdvice(projectId);

  if (!isFetched) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => refetch()}
        disabled={isLoading}
      >
        {isLoading ? "生成中..." : "生成简历优化建议"}
      </Button>
    );
  }

  const advices = data?.advices || [];

  if (advices.length === 0) {
    return (
      <p
        className="text-[13px]"
        style={{ color: "var(--foreground-muted)" }}
      >
        暂无简历优化建议
      </p>
    );
  }

  return (
    <div
      className="rounded-lg p-5 space-y-3"
      style={{
        background: "var(--surface-primary)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <h3
        className="text-[13px] font-semibold"
        style={{ color: "var(--foreground)" }}
      >
        简历优化建议
      </h3>
      <div className="space-y-2">
        {advices.map((advice, i) => (
          <AdviceItem key={i} advice={advice} />
        ))}
      </div>
    </div>
  );
}
