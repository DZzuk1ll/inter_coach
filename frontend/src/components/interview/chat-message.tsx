"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Message } from "@/types";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isInterviewer = message.role === "interviewer";

  return (
    <div
      className={`flex ${isInterviewer ? "justify-start" : "justify-end"}`}
      style={{ padding: "3px 0" }}
    >
      <div
        className="max-w-[720px] rounded-md px-3.5 py-2.5"
        style={{
          background: isInterviewer
            ? "var(--chat-interviewer-bg)"
            : "var(--chat-candidate-bg)",
          color: isInterviewer ? "var(--foreground)" : "var(--chat-candidate-fg)",
        }}
      >
        {isInterviewer && (
          <div
            className="mb-1.5 flex items-center gap-1.5"
            style={{ color: "var(--foreground-subtle)" }}
          >
            <span className="text-[11px] font-medium">
              面试官
            </span>
            <span
              className="text-[10px] px-1 py-px rounded"
              style={{
                background: "var(--surface-tertiary)",
                color: "var(--foreground-subtle)",
              }}
            >
              AI
            </span>
          </div>
        )}

        <div
          className="prose prose-sm max-w-none"
          style={{ fontSize: "13px", lineHeight: "1.6" }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || "");
                const codeStr = String(children).replace(/\n$/, "");

                if (match) {
                  return (
                    <div
                      className="my-2 overflow-hidden rounded"
                      style={{
                        border: "1px solid var(--code-border)",
                      }}
                    >
                      <div
                        className="flex items-center justify-between px-3 py-1"
                        style={{
                          background: "var(--surface-tertiary)",
                          borderBottom: "1px solid var(--code-border)",
                        }}
                      >
                        <span
                          className="text-[11px] font-mono"
                          style={{ color: "var(--foreground-subtle)" }}
                        >
                          {match[1]}
                        </span>
                      </div>
                      <SyntaxHighlighter
                        style={isInterviewer ? oneLight : oneDark}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{
                          fontSize: "12px",
                          lineHeight: "1.5",
                          margin: 0,
                          padding: "10px 12px",
                          background: "var(--code-bg)",
                          border: "none",
                          borderRadius: 0,
                        }}
                      >
                        {codeStr}
                      </SyntaxHighlighter>
                    </div>
                  );
                }

                return (
                  <code
                    className="text-[12px] font-mono px-1 py-0.5 rounded"
                    style={{
                      background: isInterviewer
                        ? "var(--surface-tertiary)"
                        : "var(--accent-bg-strong)",
                    }}
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        <div
          className="mt-1.5 text-[10px] tabular-nums"
          style={{
            color: "var(--foreground-subtle)",
          }}
        >
          {new Date(message.created_at).toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
}
