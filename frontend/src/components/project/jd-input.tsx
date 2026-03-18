"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface JdInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function JdInput({ value, onChange }: JdInputProps) {
  return (
    <div className="space-y-3">
      <Label>岗位 JD（职位描述）</Label>
      <Textarea
        placeholder="粘贴职位描述内容..."
        rows={6}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
