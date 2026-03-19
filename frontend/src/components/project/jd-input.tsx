"use client";

import { Textarea } from "@/components/ui/textarea";

interface JdInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function JdInput({ value, onChange }: JdInputProps) {
  return (
    <Textarea
      placeholder="粘贴职位描述内容..."
      rows={5}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
