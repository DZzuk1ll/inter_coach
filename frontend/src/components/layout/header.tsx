"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useLLMConfig } from "@/hooks/use-llm-config";

const NAV_ITEMS = [
  { href: "/", label: "首页" },
  { href: "/history", label: "历史" },
  { href: "/settings", label: "设置" },
];

export function Header() {
  const pathname = usePathname();
  const { configured } = useLLMConfig();
  const { theme, setTheme } = useTheme();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: "var(--surface-primary)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div className="mx-auto flex h-11 max-w-[960px] items-center justify-between px-5">
        <Link
          href="/"
          className="text-[13px] font-semibold tracking-tight"
          style={{ color: "var(--foreground)" }}
        >
          InterviewCoach
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative px-2.5 py-1 text-[13px] font-medium transition-colors"
              style={{
                color: isActive(item.href)
                  ? "var(--foreground)"
                  : "var(--foreground-muted)",
                borderRadius: "var(--radius-md)",
                background: isActive(item.href)
                  ? "var(--surface-secondary)"
                  : "transparent",
              }}
            >
              {item.label}
            </Link>
          ))}

          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="ml-2 flex h-7 w-7 items-center justify-center rounded-md transition-colors"
            style={{ color: "var(--foreground-muted)" }}
            aria-label="Toggle theme"
          >
            <Sun className="hidden h-3.5 w-3.5 dark:block" />
            <Moon className="block h-3.5 w-3.5 dark:hidden" />
          </button>

          <div className="flex items-center gap-1.5 pl-2"
            style={{ borderLeft: "1px solid var(--border-subtle)" }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{
                background: configured
                  ? "var(--status-success)"
                  : "var(--status-error)",
              }}
            />
            <span
              className="text-[11px]"
              style={{ color: "var(--foreground-subtle)" }}
            >
              {configured ? "LLM" : "未配置"}
            </span>
          </div>
        </nav>
      </div>
    </header>
  );
}
