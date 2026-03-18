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
    <div className="flex items-center gap-1">
      {PHASES.map((phase, i) => (
        <div key={phase.id} className="flex items-center">
          <div
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              phase.id === currentPhase
                ? "bg-blue-100 text-blue-700"
                : phase.id < currentPhase
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-400"
            }`}
          >
            {phase.id < currentPhase && <span>&#10003;</span>}
            <span>{phase.name}</span>
          </div>
          {i < PHASES.length - 1 && (
            <div
              className={`mx-1 h-px w-4 ${
                phase.id < currentPhase ? "bg-green-300" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
