"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ResumeAdviceView } from "@/components/project/resume-advice";
import { useAnalysisStatus } from "@/hooks/use-projects";

interface AnalysisProgressProps {
  projectId: string;
}

export function AnalysisProgress({ projectId }: AnalysisProgressProps) {
  const { data } = useAnalysisStatus(projectId);
  const router = useRouter();

  const status = data?.status || "pending";
  const message = data?.message || "等待分析...";
  const progress = data?.progress ?? 5;

  return (
    <div
      className="rounded-lg p-5 space-y-4"
      style={{
        background: "var(--surface-primary)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="text-[13px]" style={{ color: "var(--foreground)" }}>
            {message}
          </span>
          <span
            className="text-[12px] tabular-nums font-mono"
            style={{ color: "var(--foreground-subtle)" }}
          >
            {progress}%
          </span>
        </div>
        {/* Custom progress bar using design tokens */}
        <div
          className="h-1 w-full rounded-full overflow-hidden"
          style={{ background: "var(--progress-track)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: status === "failed" ? "var(--status-error)" : "var(--progress-fill)",
            }}
          />
        </div>
      </div>

      {status === "completed" && (
        <div className="space-y-3">
          <Button
            className="w-full"
            onClick={() => router.push(`/interview/new?project=${projectId}`)}
          >
            开始面试
          </Button>
          <ResumeAdviceView projectId={projectId} />
        </div>
      )}

      {status === "failed" && (
        <p className="text-[13px]" style={{ color: "var(--status-error)" }}>
          {message}
        </p>
      )}
    </div>
  );
}
