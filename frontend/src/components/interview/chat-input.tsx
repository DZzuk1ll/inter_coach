"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

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

  const canSend = !disabled && !loading && content.trim().length > 0;

  return (
    <div className="max-w-[720px] mx-auto">
      <div
        className="flex items-end gap-2 rounded-lg p-1.5 transition-shadow focus-within:shadow-[0_0_0_1px_var(--accent-border)]"
        style={{
          background: "var(--surface-secondary)",
          border: "1px solid var(--border-default)",
        }}
      >
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "面试已结束" : "输入你的回答..."}
          disabled={disabled || loading}
          rows={2}
          className="flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-[13px] leading-relaxed outline-none placeholder:text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            color: "var(--foreground)",
            fontFamily: "var(--font-geist-sans), sans-serif",
          }}
        />
        <Button
          onClick={handleSend}
          disabled={!canSend}
          size="sm"
          className="shrink-0"
        >
          {loading ? (
            <span className="flex items-center gap-1">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20 20" />
              </svg>
              发送中
            </span>
          ) : (
            "发送"
          )}
        </Button>
      </div>
      <p
        className="mt-1 text-[11px] text-center"
        style={{ color: "var(--foreground-subtle)" }}
      >
        Enter 发送 &middot; Shift+Enter 换行
      </p>
    </div>
  );
}
