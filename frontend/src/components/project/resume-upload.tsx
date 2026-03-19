"use client";

import { useState, useCallback } from "react";

interface ResumeUploadProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
}

export function ResumeUpload({ file, onFileChange }: ResumeUploadProps) {
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
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.name.endsWith(".pdf")) {
      onFileChange(droppedFile);
    }
  }, [onFileChange]);

  return (
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
        accept=".pdf"
        className="hidden"
        id="resume-upload"
        onChange={(e) => onFileChange(e.target.files?.[0] || null)}
      />
      <label htmlFor="resume-upload" className="cursor-pointer block">
        {file ? (
          <div>
            <p className="text-[13px] font-medium" style={{ color: "var(--foreground)" }}>
              {file.name}
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--foreground-subtle)" }}>
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
        ) : (
          <p className="text-[13px]" style={{ color: "var(--foreground-muted)" }}>
            点击选择或拖拽简历 PDF 文件
          </p>
        )}
      </label>
    </div>
  );
}
