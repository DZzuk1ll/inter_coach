"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PhaseIndicator } from "./phase-indicator";

const PHASES = [
  { id: 1, name: "项目概述" },
  { id: 2, name: "技术深挖" },
  { id: 3, name: "设计决策" },
  { id: 4, name: "压力追问" },
];

interface PhaseSidebarProps {
  currentPhase: number;
  projectName?: string;
  startTime?: string;
  messageCount?: number;
  isActive: boolean;
  onEnd?: () => void;
  endLoading?: boolean;
}

export function PhaseSidebar({
  currentPhase,
  projectName,
  startTime,
  messageCount,
  isActive,
  onEnd,
  endLoading,
}: PhaseSidebarProps) {
  return (
    <>
      {/* Desktop: vertical sidebar */}
      <div
        className="hidden md:flex shrink-0 flex-col h-full"
        style={{
          width: "var(--phase-panel-width)",
          borderRight: "1px solid var(--border-subtle)",
          background: "var(--surface-inset)",
        }}
      >
        <div
          className="px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <p
            className="text-[13px] font-semibold truncate"
            style={{ color: "var(--foreground)" }}
          >
            {projectName || "面试进行中"}
          </p>
          {startTime && (
            <p
              className="text-[11px] mt-0.5 tabular-nums"
              style={{ color: "var(--foreground-subtle)" }}
            >
              {new Date(startTime).toLocaleDateString("zh-CN", {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>

        {/* Vertical stepper */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <p
            className="text-[11px] font-medium uppercase tracking-wider mb-3"
            style={{ color: "var(--foreground-subtle)" }}
          >
            面试阶段
          </p>
          <div className="space-y-0">
            {PHASES.map((phase, i) => {
              const isCompleted = phase.id < currentPhase;
              const isCurrent = phase.id === currentPhase;

              return (
                <div key={phase.id} className="flex gap-3">
                  {/* Circle + line */}
                  <div className="flex flex-col items-center">
                    <div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium"
                      style={{
                        background: isCurrent
                          ? "var(--accent-bg-strong)"
                          : isCompleted
                            ? "var(--accent-bg)"
                            : "var(--surface-secondary)",
                        color: isCurrent
                          ? "var(--accent-fg)"
                          : isCompleted
                            ? "var(--accent-fg)"
                            : "var(--foreground-subtle)",
                        border: isCurrent
                          ? "1.5px solid var(--accent-border)"
                          : "1px solid var(--border-subtle)",
                      }}
                    >
                      {isCompleted ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        phase.id
                      )}
                    </div>
                    {i < PHASES.length - 1 && (
                      <div
                        className="w-px flex-1 min-h-[20px]"
                        style={{
                          background: isCompleted
                            ? "var(--accent-border)"
                            : "var(--border-subtle)",
                        }}
                      />
                    )}
                  </div>
                  {/* Label */}
                  <div className="pb-5 pt-0.5">
                    <p
                      className="text-[13px] font-medium"
                      style={{
                        color: isCurrent
                          ? "var(--foreground)"
                          : isCompleted
                            ? "var(--foreground-muted)"
                            : "var(--foreground-subtle)",
                      }}
                    >
                      {phase.name}
                    </p>
                    {isCurrent && (
                      <p
                        className="text-[11px] mt-0.5"
                        style={{ color: "var(--accent-fg)" }}
                      >
                        当前阶段
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom action */}
        <div
          className="shrink-0 px-4 py-3"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          {messageCount !== undefined && (
            <p
              className="text-[11px] mb-2 tabular-nums"
              style={{ color: "var(--foreground-subtle)" }}
            >
              {messageCount} 条消息
            </p>
          )}
          {isActive && onEnd ? (
            <Dialog>
              <DialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                  />
                }
              >
                <span
                  className="text-[13px]"
                  style={{ color: "var(--foreground-muted)" }}
                >
                  结束面试
                </span>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>确认结束面试？</DialogTitle>
                  <DialogDescription>
                    结束后将无法继续回答，面试记录会保存到历史中。
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={onEnd}
                    disabled={endLoading}
                  >
                    确认结束
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded inline-block"
              style={{
                color: "var(--foreground-subtle)",
                background: "var(--surface-secondary)",
              }}
            >
              {isActive ? "面试中" : "只读模式"}
            </span>
          )}
        </div>
      </div>

      {/* Mobile: horizontal bar */}
      <div
        className="md:hidden shrink-0 px-4 py-2"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center justify-between">
          <PhaseIndicator currentPhase={currentPhase} />
          {isActive && onEnd ? (
            <Dialog>
              <DialogTrigger
                render={<Button variant="ghost" size="sm" />}
              >
                <span
                  className="text-[12px]"
                  style={{ color: "var(--foreground-muted)" }}
                >
                  结束
                </span>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>确认结束面试？</DialogTitle>
                  <DialogDescription>
                    结束后将无法继续回答，面试记录会保存到历史中。
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={onEnd} disabled={endLoading}>
                    确认结束
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <span
              className="text-[11px] font-medium px-1.5 py-0.5 rounded"
              style={{
                color: "var(--foreground-subtle)",
                background: "var(--surface-secondary)",
              }}
            >
              只读
            </span>
          )}
        </div>
      </div>
    </>
  );
}
