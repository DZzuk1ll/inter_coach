"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RepoInputProps {
  sourceType: string;
  onSourceTypeChange: (type: string) => void;
  githubUrl: string;
  onGithubUrlChange: (url: string) => void;
  zipFile: File | null;
  onZipFileChange: (file: File | null) => void;
}

export function RepoInput({
  sourceType,
  onSourceTypeChange,
  githubUrl,
  onGithubUrlChange,
  zipFile,
  onZipFileChange,
}: RepoInputProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith(".zip")) {
      onZipFileChange(file);
    }
  }, [onZipFileChange]);

  return (
    <div>
      <Tabs value={sourceType} onValueChange={onSourceTypeChange}>
        <TabsList>
          <TabsTrigger value="github_url">GitHub URL</TabsTrigger>
          <TabsTrigger value="zip_upload">上传 Zip</TabsTrigger>
        </TabsList>

        <TabsContent value="github_url">
          <Input
            placeholder="https://github.com/username/repo"
            value={githubUrl}
            onChange={(e) => onGithubUrlChange(e.target.value)}
          />
        </TabsContent>

        <TabsContent value="zip_upload">
          <div
            className="rounded-md border border-dashed p-5 text-center transition-colors cursor-pointer"
            style={{
              borderColor: isDragOver ? "var(--accent-fg)" : "var(--border-default)",
              background: isDragOver ? "var(--accent-bg)" : "var(--surface-inset)",
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".zip"
              className="hidden"
              id="zip-upload"
              onChange={(e) =>
                onZipFileChange(e.target.files?.[0] || null)
              }
            />
            <label htmlFor="zip-upload" className="cursor-pointer block">
              {zipFile ? (
                <div>
                  <p className="text-[13px] font-medium" style={{ color: "var(--foreground)" }}>
                    {zipFile.name}
                  </p>
                  <p className="text-[12px] mt-0.5" style={{ color: "var(--foreground-subtle)" }}>
                    {(zipFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-[13px]" style={{ color: "var(--foreground-muted)" }}>
                    点击选择或拖拽 .zip 文件
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--foreground-subtle)" }}>
                    最大 50MB
                  </p>
                </div>
              )}
            </label>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
