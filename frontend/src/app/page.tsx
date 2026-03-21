"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnalysisProgress } from "@/components/project/analysis-progress";
import { DisclaimerDialog } from "@/components/project/disclaimer-dialog";
import { JdInput } from "@/components/project/jd-input";
import { RepoInput } from "@/components/project/repo-input";
import { ResumeUpload } from "@/components/project/resume-upload";
import { useLLMConfig } from "@/hooks/use-llm-config";
import { useCreateProject } from "@/hooks/use-projects";

export default function HomePage() {
  const { configured } = useLLMConfig();
  const createProject = useCreateProject();
  const router = useRouter();

  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState("github_url");
  const [githubUrl, setGithubUrl] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState("");
  const [submittedProjectId, setSubmittedProjectId] = useState<string | null>(
    null,
  );
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);

  const doSubmit = useCallback(async () => {
    if (!configured) {
      toast.error("请先在设置页配置 LLM API");
      router.push("/settings");
      return;
    }
    if (!name.trim()) {
      toast.error("请输入项目名称");
      return;
    }
    if (sourceType === "github_url" && !githubUrl.trim()) {
      toast.error("请输入 GitHub URL");
      return;
    }
    if (sourceType === "zip_upload" && !zipFile) {
      toast.error("请上传 zip 文件");
      return;
    }
    if (!resumeFile) {
      toast.error("请上传简历 PDF");
      return;
    }
    if (!jdText.trim()) {
      toast.error("请输入岗位 JD");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("source_type", sourceType);
    formData.append("jd_text", jdText);
    formData.append("resume_file", resumeFile);

    if (sourceType === "github_url") {
      formData.append("github_url", githubUrl);
    } else if (zipFile) {
      formData.append("zip_file", zipFile);
    }

    try {
      const project = await createProject.mutateAsync(formData);
      setSubmittedProjectId(project.id);
      toast.success("项目已创建，开始分析...");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "创建项目失败");
    }
  }, [configured, name, sourceType, githubUrl, zipFile, resumeFile, jdText, router, createProject]);

  const handleSubmit = async () => {
    const accepted = localStorage.getItem("disclaimer_accepted");
    if (!accepted) {
      setPendingSubmit(true);
      setShowDisclaimer(true);
      return;
    }
    await doSubmit();
  };

  const handleDisclaimerAccepted = useCallback(() => {
    setShowDisclaimer(false);
    if (pendingSubmit) {
      setPendingSubmit(false);
      doSubmit();
    }
  }, [pendingSubmit, doSubmit]);

  const isSubmitted = !!submittedProjectId;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
      {showDisclaimer && (
        <DisclaimerDialog onAccepted={handleDisclaimerAccepted} />
      )}

      {/* Left column: form */}
      <div className="space-y-6 min-w-0">
        <h1
          className="text-lg font-semibold tracking-tight"
          style={{ color: "var(--foreground)" }}
        >
          新建面试项目
        </h1>

        <div
          className="rounded-lg p-5 space-y-5"
          style={{
            background: "var(--surface-primary)",
            border: "1px solid var(--border-subtle)",
            opacity: isSubmitted ? 0.6 : 1,
            pointerEvents: isSubmitted ? "none" : undefined,
          }}
        >
          {/* Step 1: Project Name */}
          <div className="space-y-1.5">
            <div className="flex items-baseline gap-2">
              <span
                className="text-[11px] font-medium tabular-nums"
                style={{ color: "var(--foreground-subtle)" }}
              >
                01
              </span>
              <Label htmlFor="project-name">项目名称</Label>
            </div>
            <Input
              id="project-name"
              placeholder="例如：电商平台后端"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitted}
            />
          </div>

          <div style={{ height: "1px", background: "var(--border-subtle)" }} />

          {/* Step 2: Code Repo */}
          <div className="space-y-1.5">
            <div className="flex items-baseline gap-2">
              <span
                className="text-[11px] font-medium tabular-nums"
                style={{ color: "var(--foreground-subtle)" }}
              >
                02
              </span>
              <Label>代码仓库</Label>
            </div>
            <RepoInput
              sourceType={sourceType}
              onSourceTypeChange={setSourceType}
              githubUrl={githubUrl}
              onGithubUrlChange={setGithubUrl}
              zipFile={zipFile}
              onZipFileChange={setZipFile}
            />
          </div>

          <div style={{ height: "1px", background: "var(--border-subtle)" }} />

          {/* Step 3: Resume */}
          <div className="space-y-1.5">
            <div className="flex items-baseline gap-2">
              <span
                className="text-[11px] font-medium tabular-nums"
                style={{ color: "var(--foreground-subtle)" }}
              >
                03
              </span>
              <Label>简历</Label>
            </div>
            <ResumeUpload file={resumeFile} onFileChange={setResumeFile} />
          </div>

          <div style={{ height: "1px", background: "var(--border-subtle)" }} />

          {/* Step 4: JD */}
          <div className="space-y-1.5">
            <div className="flex items-baseline gap-2">
              <span
                className="text-[11px] font-medium tabular-nums"
                style={{ color: "var(--foreground-subtle)" }}
              >
                04
              </span>
              <Label>岗位 JD</Label>
            </div>
            <JdInput value={jdText} onChange={setJdText} />
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={createProject.isPending || isSubmitted}
          >
            {createProject.isPending ? "创建中..." : "提交并开始分析"}
          </Button>
        </div>
      </div>

      {/* Right column: summary / analysis progress */}
      <div className="hidden lg:block">
        {isSubmitted ? (
          <div className="space-y-4">
            <h2
              className="text-[13px] font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              项目分析中
            </h2>
            <AnalysisProgress projectId={submittedProjectId!} />
          </div>
        ) : (
          <div
            className="rounded-lg p-4 space-y-3 sticky top-6"
            style={{
              background: "var(--surface-inset)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <p
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: "var(--foreground-subtle)" }}
            >
              项目摘要
            </p>
            <div className="space-y-2">
              <SummaryRow
                label="项目名称"
                value={name.trim() || "—"}
              />
              <SummaryRow
                label="仓库来源"
                value={
                  sourceType === "github_url"
                    ? githubUrl.trim() || "未填写"
                    : zipFile?.name || "未上传"
                }
              />
              <SummaryRow
                label="简历"
                value={resumeFile?.name || "未上传"}
              />
              <SummaryRow
                label="JD"
                value={
                  jdText.trim()
                    ? `${jdText.trim().length} 字`
                    : "未填写"
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile: analysis progress shown inline below form */}
      {isSubmitted && (
        <div className="lg:hidden space-y-4">
          <h2
            className="text-[13px] font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            项目分析中
          </h2>
          <AnalysisProgress projectId={submittedProjectId!} />
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span
        className="text-[12px] shrink-0"
        style={{ color: "var(--foreground-subtle)" }}
      >
        {label}
      </span>
      <span
        className="text-[12px] text-right truncate"
        style={{ color: "var(--foreground-muted)" }}
      >
        {value}
      </span>
    </div>
  );
}
