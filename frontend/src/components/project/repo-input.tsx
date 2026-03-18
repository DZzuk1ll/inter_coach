"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  return (
    <div className="space-y-3">
      <Label>代码仓库</Label>
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
          <div className="rounded-lg border-2 border-dashed p-6 text-center">
            <input
              type="file"
              accept=".zip"
              className="hidden"
              id="zip-upload"
              onChange={(e) =>
                onZipFileChange(e.target.files?.[0] || null)
              }
            />
            <label htmlFor="zip-upload" className="cursor-pointer">
              {zipFile ? (
                <p className="text-sm">
                  {zipFile.name} ({(zipFile.size / 1024 / 1024).toFixed(1)} MB)
                </p>
              ) : (
                <p className="text-sm text-gray-500">
                  点击选择或拖拽 .zip 文件（最大 50MB）
                </p>
              )}
            </label>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
