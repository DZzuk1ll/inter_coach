"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAnalysisStatus } from "@/hooks/use-projects";

interface AnalysisProgressProps {
  projectId: string;
}

const STATUS_PROGRESS: Record<string, number> = {
  pending: 10,
  analyzing: 60,
  completed: 100,
  failed: 100,
};

export function AnalysisProgress({ projectId }: AnalysisProgressProps) {
  const { data } = useAnalysisStatus(projectId);
  const router = useRouter();

  const status = data?.status || "pending";
  const message = data?.message || "等待分析...";
  const progress = STATUS_PROGRESS[status] || 0;

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{message}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>

        {status === "completed" && (
          <Button
            className="w-full"
            onClick={() => router.push(`/interview/new?project=${projectId}`)}
          >
            开始面试
          </Button>
        )}

        {status === "failed" && (
          <p className="text-sm text-red-500">
            {message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
