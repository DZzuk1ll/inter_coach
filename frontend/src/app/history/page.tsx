"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useInterviews } from "@/hooks/use-interviews";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  in_progress: { label: "进行中", variant: "default" },
  completed: { label: "已完成", variant: "secondary" },
  abandoned: { label: "已放弃", variant: "outline" },
};

export default function HistoryPage() {
  const { data: interviews, isLoading } = useInterviews();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">面试历史</h1>

      {isLoading && (
        <p className="text-gray-500">加载中...</p>
      )}

      {interviews && interviews.length === 0 && (
        <p className="text-gray-500 py-8 text-center">暂无面试记录</p>
      )}

      <div className="space-y-3">
        {interviews?.map((interview) => (
          <Link key={interview.id} href={`/history/${interview.id}`}>
            <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
              <CardContent className="flex items-center justify-between py-4">
                <div className="space-y-1">
                  <p className="font-medium">
                    {interview.project_name || "未命名项目"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(interview.created_at).toLocaleDateString("zh-CN", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">
                    {interview.current_phase}/4
                  </span>
                  <Badge variant={STATUS_MAP[interview.status]?.variant || "outline"}>
                    {STATUS_MAP[interview.status]?.label || interview.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
