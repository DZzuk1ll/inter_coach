"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useCreateInterview } from "@/hooks/use-interviews";

function NewInterviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");
  const extraProjects = searchParams.get("extra");
  const createInterview = useCreateInterview(projectId || "");
  const triggered = useRef(false);

  useEffect(() => {
    if (!projectId) {
      toast.error("缺少项目参数");
      router.replace("/");
      return;
    }

    if (triggered.current) return;
    triggered.current = true;

    const additionalIds = extraProjects
      ? extraProjects.split(",").filter(Boolean)
      : undefined;

    createInterview
      .mutateAsync(additionalIds)
      .then((interview) => {
        router.replace(`/interview/${interview.id}`);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "创建面试失败");
        router.replace("/");
      });
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="text-center py-12 text-sm"
      style={{ color: "var(--foreground-muted)" }}
    >
      正在创建面试...
    </div>
  );
}

export default function NewInterviewPage() {
  return (
    <Suspense
      fallback={
        <div
          className="text-center py-12 text-sm"
          style={{ color: "var(--foreground-muted)" }}
        >
          加载中...
        </div>
      }
    >
      <NewInterviewContent />
    </Suspense>
  );
}
