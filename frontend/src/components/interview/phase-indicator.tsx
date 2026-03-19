"use client";

const PHASES = [
  { id: 1, name: "项目概述" },
  { id: 2, name: "技术深挖" },
  { id: 3, name: "设计决策" },
  { id: 4, name: "压力追问" },
];

interface PhaseIndicatorProps {
  currentPhase: number;
}

export function PhaseIndicator({ currentPhase }: PhaseIndicatorProps) {
  return (
    <div className="flex items-center gap-0.5">
      {PHASES.map((phase, i) => {
        const isCompleted = phase.id < currentPhase;
        const isCurrent = phase.id === currentPhase;
        const isFuture = phase.id > currentPhase;

        return (
          <div key={phase.id} className="flex items-center">
            <div
              className="flex items-center gap-1 px-2 py-0.5 text-[12px] font-medium rounded"
              style={{
                background: isCurrent
                  ? "var(--accent-bg)"
                  : isCompleted
                    ? "var(--surface-secondary)"
                    : "transparent",
                color: isCurrent
                  ? "var(--accent-fg)"
                  : isCompleted
                    ? "var(--foreground-muted)"
                    : "var(--foreground-subtle)",
                border: isCurrent
                  ? "1px solid var(--accent-border)"
                  : "1px solid transparent",
              }}
            >
              {isCompleted && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M2 5L4 7L8 3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              {isCurrent && (
                <span
                  className="inline-block w-1 h-1 rounded-full"
                  style={{ background: "var(--accent-fg)" }}
                />
              )}
              <span>{phase.name}</span>
            </div>
            {i < PHASES.length - 1 && (
              <div
                className="mx-0.5 h-px w-3"
                style={{
                  background: isCompleted
                    ? "var(--foreground-subtle)"
                    : "var(--border-default)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
