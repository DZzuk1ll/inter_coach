"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

export function ChatInput({ onSend, disabled, loading }: ChatInputProps) {
  const [content, setContent] = useState("");

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setContent("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? "面试已结束" : "输入你的回答... (Shift+Enter 换行)"}
        disabled={disabled || loading}
        rows={2}
        className="resize-none"
      />
      <Button
        onClick={handleSend}
        disabled={disabled || loading || !content.trim()}
        className="self-end"
      >
        {loading ? "发送中..." : "发送"}
      </Button>
    </div>
  );
}
