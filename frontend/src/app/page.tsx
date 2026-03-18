"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AnalysisProgress } from "@/components/project/analysis-progress";
import { JdInput } from "@/components/project/jd-input";
import { RepoInput } from "@/components/project/repo-input";
import { ResumeUpload } from "@/components/project/resume-upload";
import { useLLMConfig } from "@/hooks/use-llm-config";
import { useCreateProject } from "@/hooks/use-projects";

export default function HomePage() {
  const { configured } = useLLMConfig();
  const createProject = useCreateProject();

  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState("github_url");
  const [githubUrl, setGithubUrl] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState("");
  const [submittedProjectId, setSubmittedProjectId] = useState<string | null>(
    null,
  );

  const handleSubmit = async () => {
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
  };

  if (!configured) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">InterviewCoach</h1>
        <Alert>
          <AlertDescription>
            请先在{" "}
            <Link href="/settings" className="underline font-medium">
              设置页
            </Link>{" "}
            配置 LLM API，然后再开始使用。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (submittedProjectId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">项目分析中</h1>
        <AnalysisProgress projectId={submittedProjectId} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">新建面试项目</h1>

      <Card>
        <CardHeader>
          <CardTitle>项目信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="project-name">项目名称</Label>
            <Input
              id="project-name"
              placeholder="例如：电商平台后端"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <RepoInput
            sourceType={sourceType}
            onSourceTypeChange={setSourceType}
            githubUrl={githubUrl}
            onGithubUrlChange={setGithubUrl}
            zipFile={zipFile}
            onZipFileChange={setZipFile}
          />

          <ResumeUpload file={resumeFile} onFileChange={setResumeFile} />

          <JdInput value={jdText} onChange={setJdText} />

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={createProject.isPending}
          >
            {createProject.isPending ? "创建中..." : "提交并开始分析"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
