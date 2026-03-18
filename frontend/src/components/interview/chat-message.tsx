"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Message } from "@/types";
import { Badge } from "@/components/ui/badge";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isInterviewer = message.role === "interviewer";

  return (
    <div
      className={`flex ${isInterviewer ? "justify-start" : "justify-end"}`}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isInterviewer
            ? "bg-white border border-gray-200"
            : "bg-blue-500 text-white"
        }`}
      >
        {isInterviewer && (
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">
              AI 面试官
            </span>
            <Badge variant="outline" className="text-[10px] px-1 py-0">
              AI 生成
            </Badge>
          </div>
        )}

        <div
          className={`prose prose-sm max-w-none ${
            isInterviewer ? "" : "prose-invert"
          }`}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || "");
                const codeStr = String(children).replace(/\n$/, "");

                if (match) {
                  return (
                    <SyntaxHighlighter
                      style={oneLight}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{
                        fontSize: "12px",
                        borderRadius: "6px",
                      }}
                    >
                      {codeStr}
                    </SyntaxHighlighter>
                  );
                }

                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        <div className="mt-1 text-[10px] opacity-50">
          {new Date(message.created_at).toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
}
