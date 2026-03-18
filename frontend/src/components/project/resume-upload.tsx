"use client";

import { Label } from "@/components/ui/label";

interface ResumeUploadProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
}

export function ResumeUpload({ file, onFileChange }: ResumeUploadProps) {
  return (
    <div className="space-y-3">
      <Label>简历 PDF</Label>
      <div className="rounded-lg border-2 border-dashed p-6 text-center">
        <input
          type="file"
          accept=".pdf"
          className="hidden"
          id="resume-upload"
          onChange={(e) => onFileChange(e.target.files?.[0] || null)}
        />
        <label htmlFor="resume-upload" className="cursor-pointer">
          {file ? (
            <p className="text-sm">
              {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
            </p>
          ) : (
            <p className="text-sm text-gray-500">
              点击选择简历 PDF 文件
            </p>
          )}
        </label>
      </div>
    </div>
  );
}
