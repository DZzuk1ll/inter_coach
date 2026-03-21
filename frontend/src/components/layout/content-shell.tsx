"use client";

import { useSidebar } from "@/contexts/sidebar-context";

interface ContentShellProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

export function ContentShell({ children, noPadding }: ContentShellProps) {
  const { collapsed } = useSidebar();

  const marginLeft = collapsed
    ? "var(--sidebar-width-collapsed)"
    : "var(--sidebar-width-expanded)";

  return (
    <main
      className="sidebar-transition flex-1 min-w-0 max-md:ml-0"
      style={{ marginLeft }}
    >
      <div
        className="h-full"
        style={
          noPadding
            ? undefined
            : {
                padding: `var(--content-padding-y) var(--content-padding-x)`,
              }
        }
      >
        {children}
      </div>
    </main>
  );
}
